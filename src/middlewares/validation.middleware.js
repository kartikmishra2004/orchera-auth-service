import { body, validationResult } from 'express-validator';
import { ApiError } from '../utils/error.util.js';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        throw new ApiError(400, errorMessages.join(', '));
    }

    next();
};

/**
 * Validation rules for user registration
 */
export const registerValidation = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    body('avatar')
        .optional()
        .isURL().withMessage('Avatar must be a valid URL'),

    handleValidationErrors
];

/**
 * Validation rules for user login
 */
export const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),

    handleValidationErrors
];

/**
 * Validation rules for refresh token
 */
export const refreshTokenValidation = [
    body('refreshToken')
        .notEmpty().withMessage('Refresh token is required'),

    handleValidationErrors
];

/**
 * Validation rules for updating user profile
 */
export const updateProfileValidation = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),

    body('avatar')
        .optional()
        .isURL().withMessage('Avatar must be a valid URL'),

    handleValidationErrors
];

/**
 * Validation rules for password change
 */
export const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    handleValidationErrors
];