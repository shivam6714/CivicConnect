const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');

/**
 * Normalizes and validates photographic evidence URLs.
 * Rejects invalid, empty, or ephemeral blob URLs, and prepends API base URL for /uploads paths.
 */
export function getAccessibleImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  const trimmed = imageUrl.trim();
  if (
    trimmed === '' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed.startsWith('blob:')
  ) {
    return null;
  }

  if (trimmed.startsWith('/uploads/')) {
    return `${API_BASE_URL}${trimmed}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return null;
}
