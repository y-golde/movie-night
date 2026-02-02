"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovieHistory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RatingSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    movieId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Movie',
        required: false,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        required: true,
        minlength: 50,
    },
});
const GatheringRatingSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
    },
});
const MovieHistorySchema = new mongoose_1.Schema({
    movieIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Movie',
        }],
    candidates: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Movie',
        }],
    watchedDate: {
        type: Date,
        required: true,
    },
    hostId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    location: {
        type: String,
    },
    ratings: [RatingSchema],
    gatheringRatings: [GatheringRatingSchema],
    averageRating: {
        type: Number,
        default: 0,
    },
    averageGatheringRating: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['upcoming', 'watched'],
        default: 'upcoming',
    },
});
// Calculate average ratings before saving
MovieHistorySchema.pre('save', function (next) {
    try {
        if (this.ratings && this.ratings.length > 0) {
            const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
            this.averageRating = sum / this.ratings.length;
        }
        if (this.gatheringRatings && this.gatheringRatings.length > 0) {
            const sum = this.gatheringRatings.reduce((acc, rating) => acc + rating.rating, 0);
            this.averageGatheringRating = sum / this.gatheringRatings.length;
        }
        if (next && typeof next === 'function') {
            next();
        }
    }
    catch (error) {
        if (next && typeof next === 'function') {
            next(error);
        }
    }
});
exports.MovieHistory = mongoose_1.default.model('MovieHistory', MovieHistorySchema);
