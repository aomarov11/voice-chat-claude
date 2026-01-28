require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');
const basicAuth = require('./middleware/auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:"]  // Allow blob URLs for audio playback
    }
  }
}));

// CORS configuration
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware (protects all routes)
app.use(basicAuth);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', apiRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Check for API key
if (!process.env.CLAUDE_API_KEY) {
  console.error('ERROR: CLAUDE_API_KEY is not set in environment variables');
  console.error('Please create a .env file with your API key');
  process.exit(1);
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
