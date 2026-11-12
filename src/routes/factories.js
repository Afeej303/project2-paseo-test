const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Factory = require('../models/Factory');
const auth = require('../middleware/auth');
const { isFactoryOrAdmin } = require('../middleware/roles');

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

// @route   GET /api/factories/profile
// @desc    Get current factory's profile
// @access  Private (Factory, Admin)
router.get('/profile', auth, isFactoryOrAdmin, async (req, res) => {
  try {
    let factory;
    
    if (req.userRole === 'admin') {
      // Admin can get any factory profile
      const factoryId = req.query.id;
      if (!factoryId) {
        return res.status(400).json({
          success: false,
          message: 'Factory ID required'
        });
      }
      factory = await Factory.findById(factoryId).populate('userId', 'email isVerified isActive');
    } else {
      factory = await Factory.findOne({ userId: req.userId }).populate('userId', 'email isVerified isActive');
    }

    if (!factory) {
      return res.status(404).json({
        success: false,
        message: 'Factory profile not found'
      });
    }

    res.json({
      success: true,
      data: factory
    });
  } catch (error) {
    console.error('Get factory profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get factory profile',
      errors: [{ message: error.message }]
    });
  }
});

// @route   PUT /api/factories/profile
// @desc    Update factory profile
// @access  Private (Factory, Admin)
router.put('/profile', [
  auth,
  isFactoryOrAdmin,
  body('companyName').optional().trim().notEmpty(),
  body('contactPerson').optional().trim().notEmpty(),
  body('contactPhone').optional().trim().notEmpty(),
  handleValidation
], async (req, res) => {
  try {
    const updateData = req.body;

    let factory;
    if (req.userRole === 'admin') {
      const factoryId = req.query.id;
      if (!factoryId) {
        return res.status(400).json({
          success: false,
          message: 'Factory ID required'
        });
      }
      factory = await Factory.findByIdAndUpdate(factoryId, updateData, { new: true, runValidators: true });
    } else {
      // Filter out sensitive fields for factory users
      const { isVerified, userId, createdAt, updatedAt, ...safeUpdateData } = updateData;
      factory = await Factory.findOneAndUpdate(
        { userId: req.userId },
        safeUpdateData,
        { new: true, runValidators: true }
      );
    }

    if (!factory) {
      return res.status(404).json({
        success: false,
        message: 'Factory profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Factory profile updated successfully',
      data: factory
    });
  } catch (error) {
    console.error('Update factory profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update factory profile',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/factories/machines
// @desc    Add machine to factory inventory
// @access  Private (Factory, Admin)
router.post('/machines', [
  auth,
  isFactoryOrAdmin,
  body('name').trim().notEmpty(),
  body('brand').optional().trim(),
  body('model').optional().trim(),
  body('serialNumber').optional().trim(),
  handleValidation
], async (req, res) => {
  try {
    const machineData = req.body;
    
    let factory;
    if (req.userRole === 'admin') {
      const factoryId = req.query.id;
      if (!factoryId) {
        return res.status(400).json({
          success: false,
          message: 'Factory ID required'
        });
      }
      factory = await Factory.findById(factoryId);
    } else {
      factory = await Factory.findOne({ userId: req.userId });
    }

    if (!factory) {
      return res.status(404).json({
        success: false,
        message: 'Factory profile not found'
      });
    }

    factory.machines.push(machineData);
    await factory.save();

    res.status(201).json({
      success: true,
      message: 'Machine added successfully',
      data: factory.machines
    });
  } catch (error) {
    console.error('Add machine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add machine',
      errors: [{ message: error.message }]
    });
  }
});

// @route   PUT /api/factories/machines/:machineId
// @desc    Update machine in inventory
// @access  Private (Factory, Admin)
router.put('/machines/:machineId', [
  auth,
  isFactoryOrAdmin,
  param('machineId').isMongoId(),
  handleValidation
], async (req, res) => {
  try {
    const { machineId } = req.params;
    const updateData = req.body;

    let factory;
    if (req.userRole === 'admin') {
      const factoryId = req.query.id;
      factory = await Factory.findById(factoryId);
    } else {
      factory = await Factory.findOne({ userId: req.userId });
    }

    if (!factory) {
      return res.status(404).json({
        success: false,
        message: 'Factory profile not found'
      });
    }

    const machineIndex = factory.machines.findIndex(m => m._id.toString() === machineId);
    if (machineIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    factory.machines[machineIndex] = { ...factory.machines[machineIndex].toObject(), ...updateData };
    await factory.save();

    res.json({
      success: true,
      message: 'Machine updated successfully',
      data: factory.machines[machineIndex]
    });
  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update machine',
      errors: [{ message: error.message }]
    });
  }
});

// @route   DELETE /api/factories/machines/:machineId
// @desc    Remove machine from inventory
// @access  Private (Factory, Admin)
router.delete('/machines/:machineId', [
  auth,
  isFactoryOrAdmin,
  param('machineId').isMongoId(),
  handleValidation
], async (req, res) => {
  try {
    const { machineId } = req.params;

    let factory;
    if (req.userRole === 'admin') {
      const factoryId = req.query.id;
      factory = await Factory.findById(factoryId);
    } else {
      factory = await Factory.findOne({ userId: req.userId });
    }

    if (!factory) {
      return res.status(404).json({
        success: false,
        message: 'Factory profile not found'
      });
    }

    const machineIndex = factory.machines.findIndex(m => m._id.toString() === machineId);
    if (machineIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    factory.machines.splice(machineIndex, 1);
    await factory.save();

    res.json({
      success: true,
      message: 'Machine removed successfully'
    });
  } catch (error) {
    console.error('Remove machine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove machine',
      errors: [{ message: error.message }]
    });
  }
});

// @route   GET /api/factories
// @desc    Get all factories (Admin only)
// @access  Private (Admin)
router.get('/', auth, isFactoryOrAdmin, async (req, res) => {
  try {
    const factories = await Factory.find().populate('userId', 'email isVerified isActive lastLogin');
    
    res.json({
      success: true,
      data: factories
    });
  } catch (error) {
    console.error('Get factories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get factories',
      errors: [{ message: error.message }]
    });
  }
});

module.exports = router;