const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import configurations
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeWebSocket } = require('./socket/socketManager');
const auctionEndService = require('./services/auctionEndService');
const { testRedisConnection, showRedisConfig } = require('./utils/redisTest');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authenticateToken, authorize } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctions');
const bidRoutes = require('./routes/bids');
const sellerRoutes = require('./routes/seller');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5100;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Tap2Win API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);

// Public auction routes (optional auth)
app.use('/api/auctions', auctionRoutes);

// Protected routes with role-based access
app.use('/api/bids', authenticateToken, bidRoutes);
app.use('/api/seller', authenticateToken, authorize(['seller', 'admin']), sellerRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../public')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    // Don't serve React app for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    
    // Serve React app for all other routes
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Connect to Redis
    await connectRedis();
    
    // Test Upstash Redis connection and show configuration
    showRedisConfig();
    await testRedisConnection();
    
    // Create HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`🔗 WebSocket URL: ws://localhost:${PORT}/ws`);
    });

    // Initialize WebSocket server
    initializeWebSocket(server);
    console.log('✅ WebSocket server initialized');

    // Start auction end service
    auctionEndService.start();
    console.log('✅ Auction End Service started');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();
