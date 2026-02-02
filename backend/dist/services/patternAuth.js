"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePattern = exports.verifyPattern = exports.hashPattern = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 10;
/**
 * Hash a pattern sequence (e.g., "1-5-9-3-7")
 */
const hashPattern = async (pattern) => {
    return bcrypt_1.default.hash(pattern, SALT_ROUNDS);
};
exports.hashPattern = hashPattern;
/**
 * Verify a pattern against a hash
 */
const verifyPattern = async (pattern, hash) => {
    return bcrypt_1.default.compare(pattern, hash);
};
exports.verifyPattern = verifyPattern;
/**
 * Validate pattern format (minimum 4 dots, valid sequence)
 */
const validatePattern = (pattern) => {
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
exports.validatePattern = validatePattern;
