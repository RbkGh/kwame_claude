# PDF Last-Page Extractor

Extracts the last page from PDF files and saves as new PDFs.

## Install

```bash
npm install
```

## CLI Usage

```bash
# Single file
node index.js document.pdf

# Multiple files
node index.js file1.pdf file2.pdf file3.pdf

# With options
node index.js *.pdf --concurrency=3 --output=./output
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--concurrency=N` | Max parallel operations | 5 |
| `--output=DIR` | Output directory | Same as input |

### Output Naming

Files are named: `{original}_mandate_{ddmmyyyy}.pdf`

Example: `invoice.pdf` → `invoice_mandate_16012026.pdf`

## Programmatic Usage

```javascript
const { extractLastPage, processMultiplePdfs } = require('./src/extractor');

// Single file
const result = await extractLastPage('/path/to/file.pdf', '/output/dir');
// Returns: { inputPath, outputPath, totalPages, success }

// Multiple files
const batch = await processMultiplePdfs(
  ['/path/to/file1.pdf', '/path/to/file2.pdf'],
  {
    concurrency: 5,          // Max parallel operations
    outputDir: '/output',    // Output directory (null = same as input)
    continueOnError: true,   // Keep processing if one fails
    onProgress: (current, total, result) => {
      console.log(`${current}/${total}: ${result.success ? 'OK' : 'FAILED'}`);
    }
  }
);
// Returns: { results, succeeded, failed, errors }
```

## Error Handling

```javascript
const { PdfNotFoundError, PdfCorruptError, PdfEmptyError } = require('./src/errors');

try {
  await extractLastPage('/path/to/file.pdf');
} catch (err) {
  if (err instanceof PdfNotFoundError) {
    console.log('File not found:', err.filePath);
  } else if (err instanceof PdfCorruptError) {
    console.log('Invalid PDF:', err.filePath);
  } else if (err instanceof PdfEmptyError) {
    console.log('PDF has no pages:', err.filePath);
  }
}
```

## Run Tests

```bash
npm test                 # Run tests
npm run test:coverage    # Run with coverage report
```
