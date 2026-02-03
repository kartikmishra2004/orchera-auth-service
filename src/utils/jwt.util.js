import jwt from 'jsonwebtoken';
import config from '../config/config.js';

/**
 * Generate access token
 * @param {Object} payload - User payload
 * @returns {String} JWT access token
 */
export const generateAccessToken = (payload) => {
    return jwt.sign(
        payload,
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiresIn }
    );
};

/**
 * Generate refresh token
 * @param {Object} payload - User payload
 * @returns {String} JWT refresh token
 */
export const generateRefreshToken = (payload) => {
    return jwt.sign(
        payload,
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Object containing both tokens
 */
export const generateTokens = (user) => {
    const payload = {
        userId: user._id.toString(),
        email: user.email
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return { accessToken, refreshToken };
};

/**
 * Verify access token
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.accessSecret);
    } catch (error) {
        throw new Error('Invalid or expired access token');
    }
};

/**
 * Verify refresh token
 * @param {String} token - JWT refresh token
 * @returns {Object} Decoded token payload
 */
export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
};

/**
 * Decode token without verification (for inspection)
 * @param {String} token - JWT token
 * @returns {Object} Decoded token
 */
export const decodeToken = (token) => {
    return jwt.decode(token);
};