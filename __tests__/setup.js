const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TEMP_DIR = path.join(__dirname, 'temp');

// Export paths for use in tests
global.FIXTURES = {
  SINGLE_PAGE: path.join(FIXTURES_DIR, 'sample-single.pdf'),
  MULTI_PAGE: path.join(FIXTURES_DIR, 'sample-multi.pdf'),
  CORRUPT: path.join(FIXTURES_DIR, 'sample-corrupt.pdf')
};
global.TEMP_DIR = TEMP_DIR;

beforeAll(async () => {
  await fs.mkdir(FIXTURES_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });

  // Create single-page PDF with identifiable content
  const singlePageDoc = await PDFDocument.create();
  const page1 = singlePageDoc.addPage([612, 792]);
  page1.drawText('Single Page PDF - Page 1', {
    x: 50,
    y: 700,
    size: 24,
    color: rgb(0, 0, 0)
  });
  await fs.writeFile(
    global.FIXTURES.SINGLE_PAGE,
    await singlePageDoc.save()
  );

  // Create multi-page PDF (5 pages) with identifiable content
  const multiPageDoc = await PDFDocument.create();
  for (let i = 1; i <= 5; i++) {
    const page = multiPageDoc.addPage([612, 792]);
    page.drawText(`Multi Page PDF - Page ${i}`, {
      x: 50,
      y: 700,
      size: 24,
      color: rgb(0, 0, 0)
    });
  }
  await fs.writeFile(
    global.FIXTURES.MULTI_PAGE,
    await multiPageDoc.save()
  );

  // Create corrupt PDF (invalid bytes)
  await fs.writeFile(
    global.FIXTURES.CORRUPT,
    Buffer.from('not a valid pdf file content')
  );
});

afterAll(async () => {
  // Cleanup temp files
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

afterEach(async () => {
  // Clean temp directory between tests
  try {
    const files = await fs.readdir(TEMP_DIR);
    await Promise.all(
      files.map(file => fs.unlink(path.join(TEMP_DIR, file)))
    );
  } catch {
    // Ignore cleanup errors
  }
});
