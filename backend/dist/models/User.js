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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const UserSchema = new mongoose_1.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    patternHash: {
        type: String,
        required: false,
    },
    displayName: {
        type: String,
        required: false,
        trim: true,
    },
    displayNameColor: {
        type: String,
        required: false,
        default: '#000000',
    },
    avatar: {
        type: String,
        required: false,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    preferences: {
        genres: {
            type: [String],
            default: [],
        },
        favoriteMovieIds: {
            type: [Number],
            default: [],
        },
        optionalText: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
// Method to compare pattern
UserSchema.methods.comparePattern = async function (pattern) {
    if (!this.patternHash)
        return false;
    return bcrypt_1.default.compare(pattern, this.patternHash);
};
exports.User = mongoose_1.default.model('User', UserSchema);
