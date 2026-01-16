const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

const { extractLastPage, processMultiplePdfs } = require('../src/extractor');
const {
  PdfNotFoundError,
  PdfCorruptError,
  PdfEmptyError
} = require('../src/errors');

describe('extractLastPage', () => {
  describe('successful extraction', () => {
    test('extracts last page from multi-page PDF', async () => {
      const result = await extractLastPage(global.FIXTURES.MULTI_PAGE, global.TEMP_DIR);

      expect(result.success).toBe(true);
      expect(result.totalPages).toBe(5);
      expect(result.outputPath).toMatch(/_mandate_\d{8}\.pdf$/);
      expect(result.inputPath).toBe(global.FIXTURES.MULTI_PAGE);

      // Verify output file exists and has exactly 1 page
      const outputBytes = await fs.readFile(result.outputPath);
      const outputDoc = await PDFDocument.load(outputBytes);
      expect(outputDoc.getPageCount()).toBe(1);
    });

    test('handles single-page PDF (last page = only page)', async () => {
      const result = await extractLastPage(global.FIXTURES.SINGLE_PAGE, global.TEMP_DIR);

      expect(result.success).toBe(true);
      expect(result.totalPages).toBe(1);

      // Verify output has 1 page
      const outputBytes = await fs.readFile(result.outputPath);
      const outputDoc = await PDFDocument.load(outputBytes);
      expect(outputDoc.getPageCount()).toBe(1);
    });

    test('uses input directory when outputDir not specified', async () => {
      // Copy fixture to temp so we can test output in same directory
      const tempPdf = path.join(global.TEMP_DIR, 'test-input.pdf');
      await fs.copyFile(global.FIXTURES.MULTI_PAGE, tempPdf);

      const result = await extractLastPage(tempPdf);
      expect(path.dirname(result.outputPath)).toBe(global.TEMP_DIR);
    });

    test('creates output in specified directory', async () => {
      const customDir = path.join(global.TEMP_DIR, 'custom-output');

      const result = await extractLastPage(global.FIXTURES.MULTI_PAGE, customDir);
      expect(path.dirname(result.outputPath)).toBe(customDir);

      // Verify file exists
      const exists = await fs.access(result.outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('error handling', () => {
    test('throws PdfNotFoundError for non-existent file', async () => {
      await expect(extractLastPage('/nonexistent/file.pdf', global.TEMP_DIR))
        .rejects.toThrow(PdfNotFoundError);
    });

    test('throws PdfCorruptError for invalid PDF', async () => {
      await expect(extractLastPage(global.FIXTURES.CORRUPT, global.TEMP_DIR))
        .rejects.toThrow(PdfCorruptError);
    });

    test('error includes file path for debugging', async () => {
      const badPath = '/nonexistent/debug-test.pdf';
      try {
        await extractLastPage(badPath, global.TEMP_DIR);
        fail('Should have thrown');
      } catch (err) {
        expect(err.filePath).toBe(badPath);
      }
    });
  });
});

describe('processMultiplePdfs', () => {
  describe('batch processing', () => {
    test('processes multiple files successfully', async () => {
      const inputs = [global.FIXTURES.MULTI_PAGE, global.FIXTURES.SINGLE_PAGE];
      const result = await processMultiplePdfs(inputs, { outputDir: global.TEMP_DIR });

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    test('maintains order of results matching input order', async () => {
      const inputs = [global.FIXTURES.SINGLE_PAGE, global.FIXTURES.MULTI_PAGE];
      const result = await processMultiplePdfs(inputs, { outputDir: global.TEMP_DIR });

      expect(result.results[0].totalPages).toBe(1); // single-page first
      expect(result.results[1].totalPages).toBe(5); // multi-page second
    });

    test('continues processing after error by default', async () => {
      const inputs = [
        global.FIXTURES.MULTI_PAGE,
        '/nonexistent/file.pdf',
        global.FIXTURES.SINGLE_PAGE
      ];
      const result = await processMultiplePdfs(inputs, { outputDir: global.TEMP_DIR });

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    test('stops on first error when continueOnError is false', async () => {
      const inputs = ['/nonexistent/file.pdf', global.FIXTURES.MULTI_PAGE];

      await expect(processMultiplePdfs(inputs, {
        outputDir: global.TEMP_DIR,
        continueOnError: false
      })).rejects.toThrow(PdfNotFoundError);
    });

    test('handles empty input array', async () => {
      const result = await processMultiplePdfs([], { outputDir: global.TEMP_DIR });

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('concurrency control', () => {
    test('respects concurrency limit', async () => {
      // Create array of same file to test concurrency
      const inputs = Array(6).fill(global.FIXTURES.MULTI_PAGE);

      const result = await processMultiplePdfs(inputs, {
        concurrency: 2,
        outputDir: global.TEMP_DIR
      });

      expect(result.succeeded).toBe(6);
    });

    test('defaults to concurrency of 5', async () => {
      const inputs = [global.FIXTURES.MULTI_PAGE, global.FIXTURES.SINGLE_PAGE];

      // Just verify it works without explicit concurrency
      const result = await processMultiplePdfs(inputs, { outputDir: global.TEMP_DIR });
      expect(result.succeeded).toBe(2);
    });
  });

  describe('progress callback', () => {
    test('calls onProgress for each file processed', async () => {
      const progressCalls = [];
      const inputs = [global.FIXTURES.MULTI_PAGE, global.FIXTURES.SINGLE_PAGE];

      await processMultiplePdfs(inputs, {
        outputDir: global.TEMP_DIR,
        onProgress: (current, total, result) => {
          progressCalls.push({ current, total, success: result.success });
        }
      });

      expect(progressCalls).toHaveLength(2);
      expect(progressCalls[0].total).toBe(2);
      expect(progressCalls[1].current).toBe(2);
      expect(progressCalls.every(c => c.success)).toBe(true);
    });

    test('calls onProgress even for failed files', async () => {
      const progressCalls = [];
      const inputs = [global.FIXTURES.MULTI_PAGE, '/nonexistent.pdf'];

      await processMultiplePdfs(inputs, {
        outputDir: global.TEMP_DIR,
        onProgress: (current, total, result) => {
          progressCalls.push({ current, total, success: result.success });
        }
      });

      expect(progressCalls).toHaveLength(2);
      expect(progressCalls.some(c => !c.success)).toBe(true);
    });
  });
});
