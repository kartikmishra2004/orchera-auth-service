import dotenv from 'dotenv/config';

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/orchera-auth-service',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    }
  },

  jwt: {
    accessSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },

  bcrypt: {
    saltRounds: 12,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    ameSite: "none",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
};

export default config;