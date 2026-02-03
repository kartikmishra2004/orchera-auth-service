import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * Health check endpoint
 * @route GET /api/health
 */
router.get('/health', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };

    res.status(200).json(healthcheck);
});

/**
 * Root endpoint
 * @route GET /api
 */
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Auth Service API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth'
        }
    });
});

export default router;