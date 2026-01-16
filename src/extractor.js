const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const pLimit = require('p-limit');

const { generateOutputFilename, validatePdfPath } = require('./utils');
const {
  PdfNotFoundError,
  PdfCorruptError,
  PdfEmptyError,
  PdfWriteError
} = require('./errors');

/**
 * Extract the last page from a single PDF file
 * @param {string} inputPath - Absolute path to source PDF
 * @param {string} outputDir - Directory to write output PDF (defaults to same as input)
 * @returns {Promise<{inputPath: string, outputPath: string, totalPages: number, success: boolean}>}
 */
async function extractLastPage(inputPath, outputDir = null) {
  // Validate input exists
  const validation = await validatePdfPath(inputPath);
  if (!validation.valid) {
    throw new PdfNotFoundError(inputPath);
  }

  // Read source PDF
  let pdfBytes;
  try {
    pdfBytes = await fs.readFile(inputPath);
  } catch (err) {
    throw new PdfNotFoundError(inputPath);
  }

  // Load with pdf-lib
  let srcDoc;
  try {
    srcDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true
    });
  } catch (err) {
    throw new PdfCorruptError(inputPath, err);
  }

  // Get page count and validate
  const pageCount = srcDoc.getPageCount();
  if (pageCount === 0) {
    throw new PdfEmptyError(inputPath);
  }

  // Create new document and copy last page
  const destDoc = await PDFDocument.create();
  const lastPageIndex = pageCount - 1;
  const [copiedPage] = await destDoc.copyPages(srcDoc, [lastPageIndex]);
  destDoc.addPage(copiedPage);

  // Generate output path
  const outputFilename = generateOutputFilename(inputPath);
  const outputDirectory = outputDir || path.dirname(inputPath);
  const outputPath = path.join(outputDirectory, outputFilename);

  // Ensure output directory exists
  await fs.mkdir(outputDirectory, { recursive: true });

  // Save to disk
  try {
    const destBytes = await destDoc.save();
    await fs.writeFile(outputPath, destBytes);
  } catch (err) {
    throw new PdfWriteError(outputPath, err);
  }

  return {
    inputPath,
    outputPath,
    totalPages: pageCount,
    success: true
  };
}

/**
 * Process multiple PDFs with concurrency control
 * @param {string[]} inputPaths - Array of PDF file paths
 * @param {Object} options - Processing options
 * @param {number} options.concurrency - Max concurrent operations (default: 5)
 * @param {string} options.outputDir - Output directory (default: same as input)
 * @param {boolean} options.continueOnError - Continue processing if one file fails (default: true)
 * @param {function} options.onProgress - Progress callback (current, total, result)
 * @returns {Promise<{results: Array, succeeded: number, failed: number, errors: Array}>}
 */
async function processMultiplePdfs(inputPaths, options = {}) {
  const {
    concurrency = 5,
    outputDir = null,
    continueOnError = true,
    onProgress = null
  } = options;

  if (inputPaths.length === 0) {
    return { results: [], succeeded: 0, failed: 0, errors: [] };
  }

  const limit = pLimit(concurrency);
  const results = [];
  const errors = [];
  let completed = 0;

  const tasks = inputPaths.map((inputPath, index) =>
    limit(async () => {
      try {
        const result = await extractLastPage(inputPath, outputDir);
        results[index] = result;

        if (onProgress) {
          onProgress(++completed, inputPaths.length, result);
        }

        return result;
      } catch (err) {
        const errorResult = {
          inputPath,
          outputPath: null,
          totalPages: 0,
          success: false,
          error: err
        };
        results[index] = errorResult;
        errors.push(err);

        if (onProgress) {
          onProgress(++completed, inputPaths.length, errorResult);
        }

        if (!continueOnError) {
          throw err;
        }

        return errorResult;
      }
    })
  );

  await Promise.all(tasks);

  return {
    results,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    errors
  };
}

module.exports = {
  extractLastPage,
  processMultiplePdfs
};
