import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Verify a password against a hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Validate password (minimum 6 characters)
 */
export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};
