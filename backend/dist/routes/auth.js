"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = require("../models/User");
const patternAuth_1 = require("../services/patternAuth");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Check if username exists and has pattern set
router.post('/check-username', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || !username.trim()) {
            return res.status(400).json({ error: 'Username required' });
        }
        const user = await User_1.User.findOne({ username: username.trim() });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            hasPattern: !!user.patternHash,
            avatar: user.avatar,
        });
    }
    catch (error) {
        console.error('Check username error:', error);
        res.status(500).json({ error: error.message || 'Failed to check username' });
    }
});
// Set pattern and display name for user (first time)
router.post('/set-pattern', async (req, res) => {
    try {
        const { username, pattern, confirmPattern, displayName, displayNameColor, avatar } = req.body;
        if (!username || !pattern || !confirmPattern) {
            return res.status(400).json({ error: 'Username, pattern, and confirmation required' });
        }
        if (pattern !== confirmPattern) {
            return res.status(400).json({ error: 'Patterns do not match' });
        }
        if (!(0, patternAuth_1.validatePattern)(pattern)) {
            return res.status(400).json({ error: 'Invalid pattern. Must connect at least 4 dots.' });
        }
        const user = await User_1.User.findOne({ username: username.trim() });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.patternHash) {
            return res.status(400).json({ error: 'Pattern already set. Use login instead.' });
        }
        user.patternHash = await (0, patternAuth_1.hashPattern)(pattern);
        if (displayName && displayName.trim()) {
            user.displayName = displayName.trim();
        }
        if (displayNameColor) {
            user.displayNameColor = displayNameColor;
        }
        if (avatar) {
            user.avatar = avatar;
        }
        await user.save();
        const token = (0, auth_1.generateToken)(user._id.toString());
        return res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                displayName: user.displayName,
                displayNameColor: user.displayNameColor,
                avatar: user.avatar,
                isAdmin: user.isAdmin,
                needsOnboarding: !user.preferences.genres.length && !user.preferences.favoriteMovieIds.length,
            },
        });
    }
    catch (error) {
        console.error('Set pattern error:', error);
        res.status(500).json({ error: error.message || 'Failed to set pattern' });
    }
});
// Login with pattern
router.post('/login', async (req, res) => {
    try {
        const { username, pattern } = req.body;
        if (!username || !pattern) {
            return res.status(400).json({ error: 'Username and pattern required' });
        }
        const user = await User_1.User.findOne({ username: username.trim() });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user.patternHash) {
            return res.status(400).json({ error: 'Pattern not set. Please set your pattern first.' });
        }
        const isValid = await user.comparePattern(pattern);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid pattern' });
        }
        const token = (0, auth_1.generateToken)(user._id.toString());
        return res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                displayName: user.displayName,
                displayNameColor: user.displayNameColor,
                isAdmin: user.isAdmin,
                avatar: user.avatar,
                needsOnboarding: !user.preferences.genres.length && !user.preferences.favoriteMovieIds.length,
            },
        });
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: error.message || 'Authentication failed' });
    }
});
// Get current user
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await User_1.User.findById(req.userId).select('-patternHash');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: user._id,
            username: user.username,
            displayName: user.displayName,
            displayNameColor: user.displayNameColor,
            isAdmin: user.isAdmin,
            avatar: user.avatar,
            preferences: user.preferences,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update user avatar
router.put('/avatar', auth_1.authenticate, async (req, res) => {
    try {
        const { avatar } = req.body;
        const user = await User_1.User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.avatar = avatar;
        await user.save();
        res.json({
            id: user._id,
            username: user.username,
            avatar: user.avatar,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update user preferences
router.put('/preferences', auth_1.authenticate, async (req, res) => {
    try {
        const { preferences, avatar } = req.body;
        const user = await User_1.User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (preferences) {
            if (preferences.genres) {
                user.preferences.genres = preferences.genres;
            }
            if (preferences.favoriteMovieIds) {
                user.preferences.favoriteMovieIds = preferences.favoriteMovieIds;
            }
            if (preferences.optionalText !== undefined) {
                user.preferences.optionalText = preferences.optionalText;
            }
        }
        if (avatar) {
            user.avatar = avatar;
        }
        await user.save();
        res.json({
            id: user._id,
            username: user.username,
            preferences: user.preferences,
            avatar: user.avatar,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
