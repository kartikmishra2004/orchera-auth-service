import { ApiError } from '../utils/error.util.js';
import config from '../config/config.js';

/**
 * Handle Mongoose Cast Error
 */
const handleCastError = (error) => {
    const message = `Invalid ${error.path}: ${error.value}`;
    return new ApiError(400, message);
};

/**
 * Handle Mongoose Duplicate Key Error
 */
const handleDuplicateKeyError = (error) => {
    const field = Object.keys(error.keyValue)[0];
    const message = `${field} already exists. Please use another value`;
    return new ApiError(409, message);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationError = (error) => {
    const errors = Object.values(error.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new ApiError(400, message);
};

/**
 * Handle JWT Error
 */
const handleJWTError = () => {
    return new ApiError(401, 'Invalid token. Please log in again');
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
    return new ApiError(401, 'Your token has expired. Please log in again');
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }
    // Programming or unknown error: don't leak error details
    else {
        console.error('ERROR:', err);
        res.status(500).json({
            success: false,
            message: 'Something went wrong'
        });
    }
};

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (config.env === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Mongoose bad ObjectId
        if (err.name === 'CastError') error = handleCastError(error);

        // Mongoose duplicate key
        if (err.code === 11000) error = handleDuplicateKeyError(error);

        // Mongoose validation error
        if (err.name === 'ValidationError') error = handleValidationError(error);

        // JWT error
        if (err.name === 'JsonWebTokenError') error = handleJWTError();

        // JWT expired
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    }
};

export default errorHandler;