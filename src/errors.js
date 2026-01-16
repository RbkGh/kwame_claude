class PdfExtractionError extends Error {
  constructor(message, filePath, cause = null) {
    super(message);
    this.name = 'PdfExtractionError';
    this.filePath = filePath;
    this.cause = cause;
  }
}

class PdfNotFoundError extends PdfExtractionError {
  constructor(filePath) {
    super(`PDF file not found: ${filePath}`, filePath);
    this.name = 'PdfNotFoundError';
  }
}

class PdfCorruptError extends PdfExtractionError {
  constructor(filePath, cause = null) {
    super(`PDF file is corrupt or invalid: ${filePath}`, filePath, cause);
    this.name = 'PdfCorruptError';
  }
}

class PdfEmptyError extends PdfExtractionError {
  constructor(filePath) {
    super(`PDF has no pages: ${filePath}`, filePath);
    this.name = 'PdfEmptyError';
  }
}

class PdfWriteError extends PdfExtractionError {
  constructor(filePath, cause = null) {
    super(`Failed to write PDF: ${filePath}`, filePath, cause);
    this.name = 'PdfWriteError';
  }
}

module.exports = {
  PdfExtractionError,
  PdfNotFoundError,
  PdfCorruptError,
  PdfEmptyError,
  PdfWriteError
};
