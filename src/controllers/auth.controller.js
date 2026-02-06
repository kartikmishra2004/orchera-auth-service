import User from '../models/user.model.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.util.js';
import { ApiError, catchAsync, sendSuccessResponse } from '../utils/error.util.js';
import config from '../config/config.js';

/**
 * Register a new user
 * @route POST /api/auth/register
 */
export const register = catchAsync(async (req, res) => {
    const { fullName, email, password, avatar } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ApiError(409, 'Email already registered');
    }

    // Create user
    const user = await User.create({
        fullName,
        email,
        password,
        avatar: avatar || ''
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, config.cookieOptions);

    // Send response
    sendSuccessResponse(
        res,
        {
            user: user.toPublicJSON(),
            accessToken,
        },
        'User registered successfully',
        201
    );
});

/**
 * Login user
 * @route POST /api/auth/login
 */
export const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        throw new ApiError(401, 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, config.cookieOptions);

    // Send response
    sendSuccessResponse(res, {
        user: user.toPublicJSON(),
        accessToken,
    }, 'Login successful');
});

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 */
export const refreshToken = catchAsync(async (req, res) => {
    // Read refresh token from httpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        throw new ApiError(401, 'Refresh token not found');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and validate refresh token
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user) {
        throw new ApiError(401, 'User not found');
    }

    if (user.refreshToken !== refreshToken) {
        throw new ApiError(403, 'Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Save new refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Update refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, config.cookieOptions);

    // Send new access token
    sendSuccessResponse(
        res,
        { accessToken: tokens.accessToken, user: user.toPublicJSON() },
        'Token refreshed successfully'
    );
});

/**
 * Logout user
 * @route POST /api/auth/logout
 */
export const logout = catchAsync(async (req, res) => {
    const userId = req.userId;

    // Clear refresh token from database
    await User.findByIdAndUpdate(userId, {
        $unset: { refreshToken: 1 }
    });

    sendSuccessResponse(res, null, 'Logout successful');
});

/**
 * Get current user profile
 * @route GET /api/auth/me
 */
export const getCurrentUser = catchAsync(async (req, res) => {
    const user = req.user;

    sendSuccessResponse(res, {
        user: user.toPublicJSON()
    }, 'User profile retrieved successfully');
});

/**
 * Update user profile
 * @route PATCH /api/auth/profile
 */
export const updateProfile = catchAsync(async (req, res) => {
    const userId = req.userId;
    const { fullName, avatar } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    sendSuccessResponse(res, {
        user: user.toPublicJSON()
    }, 'Profile updated successfully');
});

/**
 * Change user password
 * @route POST /api/auth/change-password
 */
export const changePassword = catchAsync(async (req, res) => {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Clear refresh token to force re-login
    user.refreshToken = undefined;
    await user.save();

    sendSuccessResponse(res, null, 'Password changed successfully. Please login again');
});

/**
 * Delete user account
 * @route DELETE /api/auth/account
 */
export const deleteAccount = catchAsync(async (req, res) => {
    const userId = req.userId;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    sendSuccessResponse(res, null, 'Account deleted successfully');
});