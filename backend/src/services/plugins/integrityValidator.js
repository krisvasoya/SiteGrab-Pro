// backend/src/services/plugins/integrityValidator.js
// Modular asset integrity validation. Safe to delete.

/**
 * Validates the download buffer against expected mime types and magic signatures.
 * Throws descriptive errors if file content appears empty or corrupted.
 */
function validateIntegrity(buffer, url) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Downloaded file is empty (0 bytes).');
  }

  const cleanUrl = url.split('?')[0].toLowerCase();
  
  // 1. Soft-404 HTML check for CSS and JS
  if (cleanUrl.endsWith('.css') || cleanUrl.endsWith('.js')) {
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 500)).trim().toLowerCase();
    if (text.startsWith('<!doctype') || text.includes('<html') || text.includes('<head')) {
      throw new Error('Soft-404 error: HTML page returned instead of stylesheet/script.');
    }
  }

  // 2. Image magic bytes verification
  if (/\.(png|jpe?g|gif|webp)$/i.test(cleanUrl) && buffer.length < 10) {
    throw new Error('Image file is corrupted (file too small).');
  }

  if (cleanUrl.endsWith('.png') && buffer.length >= 4) {
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    if (!isPng) throw new Error('File integrity check failed: PNG file lacks valid signature.');
  }

  if ((cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) && buffer.length >= 2) {
    const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8;
    if (!isJpg) throw new Error('File integrity check failed: JPEG file lacks valid signature.');
  }

  if (cleanUrl.endsWith('.gif') && buffer.length >= 3) {
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    if (!isGif) throw new Error('File integrity check failed: GIF file lacks valid signature.');
  }
}

module.exports = { validateIntegrity };
