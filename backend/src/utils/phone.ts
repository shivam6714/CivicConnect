/**
 * Utilities for normalizing and validating Indian mobile telephone numbers.
 * CivicConnect targets citizens in Jammu, Jammu & Kashmir (India country code +91).
 */

const INDIAN_MOBILE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;

/**
 * Validates whether the given string is a valid Indian mobile number.
 * Valid Indian mobile numbers are 10 digits starting with digits 6, 7, 8, or 9.
 */
export function isValidIndianMobile(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return INDIAN_MOBILE_REGEX.test(cleaned);
}

/**
 * Normalizes an Indian mobile number into standard E.164 format (+91XXXXXXXXXX).
 * Throws an Error if the number format is invalid.
 */
export function normalizeIndianMobile(phone: string): string {
  if (!isValidIndianMobile(phone)) {
    throw new Error(`Invalid Indian mobile phone number: "${phone}". Expected 10 digits starting with 6-9.`);
  }

  const digitsOnly = phone.replace(/\D/g, '');
  const tenDigit = digitsOnly.slice(-10);
  return `+91${tenDigit}`;
}

/**
 * Masks a phone number for safe logging and display, preventing PII leaks.
 * Example: +919876543210 -> +91******3210
 */
export function maskPhoneNumber(phone: string): string {
  if (phone.length < 6) return '******';
  const prefix = phone.slice(0, 3);
  const suffix = phone.slice(-4);
  return `${prefix}******${suffix}`;
}
