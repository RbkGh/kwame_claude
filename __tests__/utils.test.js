const {
  formatDateDDMMYYYY,
  generateOutputFilename,
  validatePdfPath
} = require('../src/utils');

describe('formatDateDDMMYYYY', () => {
  test('formats date with single digit day and month with leading zeros', () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(formatDateDDMMYYYY(date)).toBe('05012026');
  });

  test('formats date with double digit day and month correctly', () => {
    const date = new Date(2026, 11, 25); // Dec 25, 2026
    expect(formatDateDDMMYYYY(date)).toBe('25122026');
  });

  test('formats specific date correctly', () => {
    const date = new Date(2026, 0, 16); // Jan 16, 2026
    expect(formatDateDDMMYYYY(date)).toBe('16012026');
  });
});

describe('generateOutputFilename', () => {
  const fixedDate = new Date(2026, 0, 16); // Jan 16, 2026

  test('generates correct filename format', () => {
    const result = generateOutputFilename('/path/to/invoice.pdf', fixedDate);
    expect(result).toBe('invoice_mandate_16012026.pdf');
  });

  test('handles filenames with multiple dots', () => {
    const result = generateOutputFilename('/path/to/doc.v2.final.pdf', fixedDate);
    expect(result).toBe('doc.v2.final_mandate_16012026.pdf');
  });

  test('handles filenames with spaces', () => {
    const result = generateOutputFilename('/path/to/my document.pdf', fixedDate);
    expect(result).toBe('my document_mandate_16012026.pdf');
  });

  test('handles filenames with special characters', () => {
    const result = generateOutputFilename('/path/to/report_2026-Q1.pdf', fixedDate);
    expect(result).toBe('report_2026-Q1_mandate_16012026.pdf');
  });

  test('uses current date by default', () => {
    const result = generateOutputFilename('/path/to/test.pdf');
    expect(result).toMatch(/^test_mandate_\d{8}\.pdf$/);
  });

  test('extracts basename correctly from full path', () => {
    const result = generateOutputFilename('/very/deep/nested/path/to/file.pdf', fixedDate);
    expect(result).toBe('file_mandate_16012026.pdf');
  });
});

describe('validatePdfPath', () => {
  test('returns valid for existing PDF file', async () => {
    const result = await validatePdfPath(global.FIXTURES.MULTI_PAGE);
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  test('returns invalid for non-existent file', async () => {
    const result = await validatePdfPath('/nonexistent/path/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('returns invalid for non-PDF extension', async () => {
    const result = await validatePdfPath('/path/to/file.txt');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not a PDF');
  });

  test('handles uppercase PDF extension', async () => {
    const result = await validatePdfPath('/nonexistent/FILE.PDF');
    // Should fail because file doesn't exist, not because of extension
    expect(result.error).toContain('not found');
  });
});
