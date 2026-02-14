import User from '../models/user.model.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.util.js';
import { ApiError, catchAsync, sendSuccessResponse } from '../utils/error.util.js';
import config from '../config/config.js';
import crypto from "crypto";

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

    // Save refresh token to database (Multiple sessions)
    user.refreshTokens = [{ token: refreshToken }];
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

    // Save refresh token to database (Handle multiple sessions)
    // Limit to 5 sessions
    const MAX_SESSIONS = 5;
    if (user.refreshTokens.length >= MAX_SESSIONS) {
        user.refreshTokens.shift(); // Remove oldest session
    }
    user.refreshTokens.push({ token: refreshToken });
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
    const user = await User.findById(decoded.userId);

    if (!user) {
        throw new ApiError(401, 'User not found');
    }

    // Check if the refresh token exists in the user's sessions
    const tokenIndex = user.refreshTokens.findIndex(rt => rt.token === refreshToken);
    if (tokenIndex === -1) {
        throw new ApiError(403, 'Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Rotate the refresh token: replace the old one with the new one
    user.refreshTokens[tokenIndex] = { token: tokens.refreshToken };
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
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        await User.findOneAndUpdate(
            { 'refreshTokens.token': refreshToken },
            { $pull: { refreshTokens: { token: refreshToken } } }
        );
    }

    res.clearCookie("refreshToken", config.cookieOptions);

    sendSuccessResponse(res, null, 'Logout successful');
});

/**
 * Logout from all sessions
 * @route POST /api/auth/logout-all
 */
export const logoutAll = catchAsync(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        res.clearCookie("refreshToken", config.cookieOptions);
        return sendSuccessResponse(res, null, "Logged out from all sessions");
    }

    await User.findOneAndUpdate(
        { 'refreshTokens.token': refreshToken },
        { $set: { refreshTokens: [] } }
    );

    res.clearCookie("refreshToken", config.cookieOptions);

    sendSuccessResponse(res, null, 'Logged out from all sessions');
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

    // Clear all refresh tokens to force re-login on all devices
    user.refreshTokens = [];
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

/**
 * Google OAuth login
 * @route GET /api/auth/google
 */

export const googleAuth = catchAsync(async (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");

    res.cookie("oauth_state", state, {
        httpOnly: true,
        sameSite: "lax",
    });

    const url =
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: process.env.GOOGLE_CALLBACK_URI,
            response_type: "code",
            scope: "openid email profile",
            access_type: "offline",
            state,
            prompt: "consent",
        });

    res.redirect(url);
});

/**
 * Google callback
 * @route GET /api/auth/google/callback
 */

export const googleCallback = catchAsync(async (req, res) => {
    const { code, state } = req.query;

    if (state !== req.cookies.oauth_state) {
        res.clearCookie("oauth_state");
        throw new ApiError(400, "Invalid OAuth state");
    }

    if (!code) {
        throw new ApiError(400, "No code provided");
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
            redirect_uri: process.env.GOOGLE_CALLBACK_URI,
        }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
        throw new ApiError(400, "Failed to get access token from Google");
    }

    // Get user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    const googleUser = await userRes.json();

    if (!userRes.ok || !googleUser.email) {
        throw new ApiError(400, "Failed to fetch Google user info");
    }

    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
        user = await User.create({
            fullName: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.picture,
            authProvider: "google",
        });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    const MAX_SESSIONS = 5;
    if (user.refreshTokens.length >= MAX_SESSIONS) {
        user.refreshTokens.shift();
    }

    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.cookie("refreshToken", refreshToken, config.cookieOptions);
    res.clearCookie("oauth_state");

    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
});