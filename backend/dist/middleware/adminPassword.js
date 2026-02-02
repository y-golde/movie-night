"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdminPassword = void 0;
const verifyAdminPassword = (req, res, next) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const providedPassword = req.headers['x-admin-password'];
    if (!adminPassword) {
        res.status(500).json({ error: 'Admin password not configured' });
        return;
    }
    if (!providedPassword || providedPassword !== adminPassword) {
        res.status(403).json({ error: 'Invalid admin password' });
        return;
    }
    next();
};
exports.verifyAdminPassword = verifyAdminPassword;
