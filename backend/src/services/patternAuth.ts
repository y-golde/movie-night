import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a pattern sequence (e.g., "1-5-9-3-7")
 */
export const hashPattern = async (pattern: string): Promise<string> => {
  return bcrypt.hash(pattern, SALT_ROUNDS);
};

/**
 * Verify a pattern against a hash
 */
export const verifyPattern = async (pattern: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(pattern, hash);
};

/**
 * Validate pattern format (minimum 4 dots, valid sequence)
 */
export const validatePattern = (pattern: string): boolean => {
  const parts = pattern.split('-').map(Number);
  
  // Minimum 4 dots
  if (parts.length < 4) {
    return false;
  }
  
  // All parts should be numbers between 1-9
  if (parts.some(num => isNaN(num) || num < 1 || num > 9)) {
    return false;
  }
  
  // No duplicates
  if (new Set(parts).size !== parts.length) {
    return false;
  }
  
  return true;
};
