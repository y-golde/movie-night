"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = exports.verifyPassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 10;
/**
 * Hash a password
 */
const hashPassword = async (password) => {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
/**
 * Verify a password against a hash
 */
const verifyPassword = async (password, hash) => {
    return bcrypt_1.default.compare(password, hash);
};
exports.verifyPassword = verifyPassword;
/**
 * Validate password (minimum 6 characters)
 */
const validatePassword = (password) => {
    return password.length >= 6;
};
exports.validatePassword = validatePassword;
