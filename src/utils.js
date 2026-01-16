const fs = require('fs').promises;
const path = require('path');

/**
 * Format date as ddmmyyyy
 * @param {Date} date
 * @returns {string}
 */
function formatDateDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

/**
 * Generate output filename with mandate pattern
 * @param {string} originalPath - Original PDF file path
 * @param {Date} date - Date to use (default: current date)
 * @returns {string} Formatted filename: {name}_mandate_{ddmmyyyy}.pdf
 */
function generateOutputFilename(originalPath, date = new Date()) {
  const basename = path.basename(originalPath, '.pdf');
  const dateStr = formatDateDDMMYYYY(date);
  return `${basename}_mandate_${dateStr}.pdf`;
}

/**
 * Validate that a path points to an existing PDF file
 * @param {string} filePath
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function validatePdfPath(filePath) {
  if (!filePath.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'File is not a PDF (must end with .pdf)' };
  }

  try {
    await fs.access(filePath);
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: `File not found: ${filePath}` };
  }
}

module.exports = {
  formatDateDDMMYYYY,
  generateOutputFilename,
  validatePdfPath
};
