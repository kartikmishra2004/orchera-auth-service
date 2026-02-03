import express from 'express';
import {
    register,
    login,
    refreshToken,
    logout,
    getCurrentUser,
    updateProfile,
    changePassword,
    deleteAccount
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
    registerValidation,
    loginValidation,
    refreshTokenValidation,
    updateProfileValidation,
    changePasswordValidation
} from '../middlewares/validation.middleware.js';
import { authLimiter, passwordLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh-token', refreshTokenValidation, refreshToken);

// Protected routes
router.use(authenticate); // All routes below this require authentication

router.post('/logout', logout);
router.get('/me', getCurrentUser);
router.patch('/profile', updateProfileValidation, updateProfile);
router.post('/change-password', passwordLimiter, changePasswordValidation, changePassword);
router.delete('/account', deleteAccount);

export default router;