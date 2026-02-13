import express from 'express';
import {
    register,
    login,
    refreshToken,
    logout,
    logoutAll,
    getCurrentUser,
    updateProfile,
    changePassword,
    deleteAccount,
    googleAuth,
    googleCallback
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
    registerValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
    googleAuthValidation,
} from '../middlewares/validation.middleware.js';
import { authLimiter, passwordLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.get('/google', authLimiter, googleAuth);
router.get('/google/callback', googleCallback);
router.get('/refresh-token', refreshToken);
router.post('/logout', logout);

// Protected routes
router.use(authenticate); // All routes below this require authentication

router.get('/me', getCurrentUser);
router.patch('/profile', updateProfileValidation, updateProfile);
router.post('/change-password', passwordLimiter, changePasswordValidation, changePassword);
router.post('/logout-all', logoutAll);
router.delete('/account', deleteAccount);

export default router;