import { verifyAccessToken } from '../utils/jwt.util.js';
import { ApiError } from '../utils/error.util.js';
import User from '../models/user.model.js';

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'Authentication token is required');
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            throw new ApiError(401, 'Authentication token is required');
        }

        // Verify token
        const decoded = verifyAccessToken(token);

        // Check if user still exists
        const user = await User.findById(decoded.userId).select('-password -refreshToken');

        if (!user) {
            throw new ApiError(401, 'User no longer exists');
        }

        // Attach user to request object
        req.user = user;
        req.userId = decoded.userId;

        next();
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }
        next(new ApiError(401, 'Invalid or expired token'));
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];

        if (token) {
            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.userId).select('-password -refreshToken');

            if (user) {
                req.user = user;
                req.userId = decoded.userId;
            }
        }

        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};