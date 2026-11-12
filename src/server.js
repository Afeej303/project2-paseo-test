const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Ensure the uploads directory exists before Multer writes to it
const uploadsRoot = path.join(__dirname, '..', 'uploads');
const faultReportUploadsDir = path.join(uploadsRoot, 'fault-reports');
fs.mkdirSync(faultReportUploadsDir, { recursive: true });

// Middleware
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// First admin bootstrap
const bootstrapAdmin = async () => {
  const User = require('./models/User');
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  
  if (!initialAdminEmail || !initialAdminPassword) {
    return;
  }
  
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log('Admin user already exists, skipping bootstrap');
    return;
  }
  
  const admin = new User({
    email: initialAdminEmail,
    password: initialAdminPassword,
    role: 'admin',
    isVerified: true,
    isActive: true
  });
  
  await admin.save();
  console.log(`First admin created: ${initialAdminEmail}`);
};

// Routes
const authRoutes = require('./routes/auth');
const factoryRoutes = require('./routes/factories');
const technicianRoutes = require('./routes/technicians');
const faultReportRoutes = require('./routes/faultReports');
const repairRequestRoutes = require('./routes/repairRequests');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/factories', factoryRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/fault-reports', faultReportRoutes);
app.use('/api/repair-requests', repairRequestRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static file serving for uploads
app.use('/uploads', express.static(uploadsRoot));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: process.env.NODE_ENV === 'development' ? [{ message: err.message }] : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  await connectDB();
  await bootstrapAdmin();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;