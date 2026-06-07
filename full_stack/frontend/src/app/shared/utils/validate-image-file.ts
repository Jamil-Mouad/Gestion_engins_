/** Max upload size = 5 MB (mirrors FileStorageService.MAX_FILE_SIZE_BYTES). */
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed MIME types (mirrors FileStorageService.ALLOWED_CONTENT_TYPES). */
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/**
 * Validates an image file before upload.
 * Returns a human-readable error string, or `null` if the file is valid.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Format non supporté. Utilisez PNG, JPEG ou WebP.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `Fichier trop volumineux (max 5 Mo, reçu ${(file.size / 1024 / 1024).toFixed(1)} Mo).`;
  }
  return null;
}
