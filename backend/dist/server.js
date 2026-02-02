"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Middleware
app.use((0, cors_1.default)({ origin: FRONTEND_URL, credentials: true }));
app.use(express_1.default.json());
// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || '';
mongoose_1.default
    .connect(MONGODB_URI)
    .then(() => {
    console.log('Connected to MongoDB');
})
    .catch((error) => {
    console.error('MongoDB connection error:', error);
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const movies_1 = __importDefault(require("./routes/movies"));
const cycles_1 = __importDefault(require("./routes/cycles"));
const votes_1 = __importDefault(require("./routes/votes"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const items_1 = __importDefault(require("./routes/items"));
const admin_1 = __importDefault(require("./routes/admin"));
const movieHistory_1 = __importDefault(require("./routes/movieHistory"));
app.use('/api/auth', auth_1.default);
app.use('/api/movies', movies_1.default);
app.use('/api/cycles', cycles_1.default);
app.use('/api/votes', votes_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/items', items_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/movie-history', movieHistory_1.default);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
