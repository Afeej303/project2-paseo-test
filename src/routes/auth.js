const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Factory = require('../models/Factory');
const Technician = require('../models/Technician');
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

const router = express.Router();

// Validation middleware
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @route   POST /api/auth/register/factory
// @desc    Register a new factory
// @access  Public
router.post('/register/factory', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('companyName').trim().notEmpty(),
  body('contactPerson').trim().notEmpty(),
  body('contactPhone').trim().notEmpty(),
  handleValidation
], async (req, res) => {
  let user;
  try {
    const { email, password, companyName, contactPerson, contactPhone, ...factoryData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    user = new User({
      email,
      password,
      role: 'factory'
    });

    await user.save();

    // Create factory profile
    const factory = new Factory({
      userId: user._id,
      companyName,
      contactPerson,
      contactPhone,
      ...factoryData
    });

    await factory.save();

    // Generate token
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Factory registered successfully',
      data: {
        user: user.toJSON(),
        factory: factory,
        token
      }
    });
  } catch (error) {
    if (user && user._id) {
      try {
        await User.findByIdAndDelete(user._id);
      } catch (rollbackError) {
        console.error('Factory registration rollback failed:', rollbackError);
      }
    }
    console.error('Factory registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/auth/register/technician
// @desc    Register a new technician
// @access  Public
router.post('/register/technician', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('phone').trim().notEmpty(),
  handleValidation
], async (req, res) => {
  let user;
  try {
    const { email, password, firstName, lastName, phone, ...technicianData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    user = new User({
      email,
      password,
      role: 'technician'
    });

    await user.save();

    // Create technician profile
    const technician = new Technician({
      userId: user._id,
      firstName,
      lastName,
      phone,
      ...technicianData
    });

    await technician.save();

    // Generate token
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Technician registered successfully',
      data: {
        user: user.toJSON(),
        technician: technician,
        token
      }
    });
  } catch (error) {
    if (user && user._id) {
      try {
        await User.findByIdAndDelete(user._id);
      } catch (rollbackError) {
        console.error('Technician registration rollback failed:', rollbackError);
      }
    }
    console.error('Technician registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/auth/register/admin
// @desc    Register a new admin (restricted)
// @access  Private (Admin only)
router.post('/register/admin', [
  auth,
  isAdmin,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  handleValidation
], async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create admin user
    const user = new User({
      email,
      password,
      role: 'admin',
      isVerified: true
    });

    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/auth/register/admin/bootstrap
// @desc    Create the first admin user (only works when no admins exist)
// @access  Public
router.post('/register/admin/bootstrap', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  handleValidation
], async (req, res) => {
  try {
    if (process.env.ALLOW_ADMIN_BOOTSTRAP !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'Admin bootstrap is disabled'
      });
    }

    // Check if any admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin already exists. Use existing admin to create new admins.'
      });
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create admin user
    const user = new User({
      email,
      password,
      role: 'admin',
      isVerified: true
    });

    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully. You are now the platform administrator.',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Admin bootstrap error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidation
], async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Get profile data based on role
    let profileData = {};
    if (user.role === 'factory') {
      profileData = await Factory.findOne({ userId: user._id });
    } else if (user.role === 'technician') {
      profileData = await Technician.findOne({ userId: user._id });
    }

    // Generate token
    const token = user.generateAuthToken();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        profile: profileData,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      errors: [{ message: error.message }]
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // Get profile data based on role
    let profileData = {};
    if (req.userRole === 'factory') {
      profileData = await Factory.findOne({ userId: req.userId });
    } else if (req.userRole === 'technician') {
      profileData = await Technician.findOne({ userId: req.userId });
    }

    res.json({
      success: true,
      data: {
        user: req.user.toJSON(),
        profile: profileData
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  // In a stateless JWT setup, logout is handled client-side
  // For enhanced security, you could implement a token blacklist
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;