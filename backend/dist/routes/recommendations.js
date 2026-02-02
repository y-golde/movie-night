"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const aiRecommendations_1 = require("../services/aiRecommendations");
const router = express_1.default.Router();
// Get recommendations for current user
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const recommendations = await (0, aiRecommendations_1.generateRecommendations)(req.userId, limit);
        res.json(recommendations);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Generate weekly recommendations (admin only, or cron job)
router.post('/generate', auth_1.authenticate, admin_1.requireAdmin, async (req, res) => {
    try {
        await (0, aiRecommendations_1.generateWeeklyRecommendations)();
        res.json({ message: 'Recommendations generated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
