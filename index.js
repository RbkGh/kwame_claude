#!/usr/bin/env node

const path = require('path');
const { processMultiplePdfs } = require('./src/extractor');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('PDF Last-Page Extractor');
    console.log('');
    console.log('Usage: node index.js <pdf1> [pdf2] [pdf3] ... [options]');
    console.log('');
    console.log('Options:');
    console.log('  --concurrency=N   Maximum parallel operations (default: 5)');
    console.log('  --output=DIR      Output directory (default: same as input)');
    console.log('  --help, -h        Show this help message');
    console.log('');
    console.log('Output files are named: {original}_mandate_{ddmmyyyy}.pdf');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const options = { concurrency: 5, outputDir: null };
  const pdfPaths = [];

  for (const arg of args) {
    if (arg.startsWith('--concurrency=')) {
      options.concurrency = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--output=')) {
      options.outputDir = path.resolve(arg.split('=')[1]);
    } else {
      pdfPaths.push(path.resolve(arg));
    }
  }

  if (pdfPaths.length === 0) {
    console.error('Error: No PDF files specified');
    process.exit(1);
  }

  console.log(`Processing ${pdfPaths.length} PDF(s) with concurrency=${options.concurrency}`);

  const result = await processMultiplePdfs(pdfPaths, {
    ...options,
    onProgress: (current, total, res) => {
      const status = res.success ? 'OK' : 'FAILED';
      console.log(`[${current}/${total}] ${status}: ${path.basename(res.inputPath)}`);
    }
  });

  console.log('');
  console.log(`Completed: ${result.succeeded} succeeded, ${result.failed} failed`);

  if (result.failed > 0) {
    console.log('');
    console.log('Errors:');
    result.errors.forEach(err => {
      console.error(`  - ${path.basename(err.filePath)}: ${err.message}`);
    });
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
