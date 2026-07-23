const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Environment validator
const { validateEnv } = require('./config/env');
validateEnv();

// Custom Security & Swagger docs
const { sanitizeNoSQL } = require('./middleware/securityMiddleware');
const { setupSwaggerDocs } = require('./config/swagger');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const goalRoutes = require('./routes/goalRoutes');
const taskRoutes = require('./routes/taskRoutes');
const studySessionRoutes = require('./routes/studySessionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const quizRoutes = require('./routes/quizRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const chatRoutes = require('./routes/chatRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const searchRoutes = require('./routes/searchRoutes');

// Errors Middleware
const errorHandler = require('./middleware/errorMiddleware');

const app = express();

// Set security headers
app.use(helmet());

// Enable compression (gzip)
app.use(compression());

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration (allowing credential pass-through cookies)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Prevent NoSQL Query Injection attacks
app.use(sanitizeNoSQL);

// Global Request Rate Limiter (100 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api', globalLimiter);

// Specific Auth Brute Force Limiter (15 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.'
  }
});
app.use('/api/auth/login', authLimiter);

// Setup Swagger API Documentation UI
setupSwaggerDocs(app);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/study-session', studySessionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);

// Fallback Route for undefined paths
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Requested endpoint ${req.originalUrl} not found on this server.`
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;
