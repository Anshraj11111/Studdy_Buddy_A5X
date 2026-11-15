/**
 * Sanitize user input to prevent regex injection attacks
 * Escapes all special regex characters
 * @param {string} input - User input string
 * @returns {string} - Sanitized string safe for regex
 */
export const escapeRegex = (input) => {
  if (typeof input !== 'string') return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
