"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminPassword_1 = require("../middleware/adminPassword");
const User_1 = require("../models/User");
const router = express_1.default.Router();
// Verify admin password (doesn't require authentication, doesn't grant admin status, just verifies access)
router.post('/verify-password', async (req, res) => {
    try {
        const { password } = req.body;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
            return res.status(500).json({ error: 'Admin password not configured' });
        }
        if (!password || password !== adminPassword) {
            return res.status(401).json({ error: 'Invalid admin password' });
        }
        res.json({
            success: true,
            message: 'Admin access granted',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create new user (protected by admin password, but doesn't require authentication)
router.post('/users', adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || !username.trim()) {
            return res.status(400).json({ error: 'Username required' });
        }
        const existingUser = await User_1.User.findOne({ username: username.trim() });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const user = new User_1.User({
            username: username.trim(),
            isAdmin: false,
            preferences: {
                genres: [],
                favoriteMovieIds: [],
            },
        });
        await user.save();
        res.status(201).json({
            id: user._id,
            username: user.username,
            displayName: user.displayName,
            displayNameColor: user.displayNameColor,
            hasPattern: !!user.patternHash,
            createdAt: user.createdAt,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get all users (requires admin password but not authentication)
router.get('/users', adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const users = await User_1.User.find().sort({ createdAt: -1 });
        res.json(users.map(u => ({
            _id: u._id,
            username: u.username,
            displayName: u.displayName,
            displayNameColor: u.displayNameColor,
            avatar: u.avatar,
            hasPattern: !!u.patternHash,
            createdAt: u.createdAt,
        })));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Reset user pattern (requires admin password but not authentication)
router.post('/users/:id/reset-pattern', adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Clear pattern hash to force pattern reset
        user.patternHash = undefined;
        await user.save();
        res.json({
            id: user._id,
            username: user.username,
            message: 'Pattern reset successfully. User must set a new pattern.',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete user (requires admin password but not authentication)
router.delete('/users/:id', adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await User_1.User.findByIdAndDelete(userId);
        res.json({
            message: 'User deleted successfully',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
