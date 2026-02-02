"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await User_1.User.findById(decoded.userId).select('-patternHash');
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        req.userId = decoded.userId;
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
