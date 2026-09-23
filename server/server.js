const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const collabRoutes = require('./routes/collabRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const guideRoutes = require('./routes/guideRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const lifecycleRoutes = require('./routes/lifecycleRoutes');
const demoRoutes = require('./routes/demoRoutes');
const ideaRoutes = require('./routes/ideaRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fs = require('fs');

// Static directory for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static frontend assets if public folder exists
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ProjectHub API Server is running clean', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/collaboration', collabRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/lifecycle', lifecycleRoutes);
app.use('/api/demo', demoRoutes);

// Single Page Application (SPA) Fallback Route for Frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexHtmlPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }
  next();
});

// Error Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production' || require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 ProjectHub Express Backend Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
