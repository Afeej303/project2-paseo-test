const express = require('express');
const { body, param, validationResult } = require('express-validator');
const multer = require('multer');
const FaultReport = require('../models/FaultReport');
const Factory = require('../models/Factory');
const RepairRequest = require('../models/RepairRequest');
const auth = require('../middleware/auth');
const { isFactoryOrAdmin } = require('../middleware/roles');

const router = express.Router();

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/fault-reports/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mpeg', 'audio/mpeg', 'audio/wav'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

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

// @route   POST /api/fault-reports
// @desc    Create a new fault report
// @access  Private (Factory)
router.post('/', [
  auth,
  isFactoryOrAdmin,
  body('machineName').trim().notEmpty(),
  body('faultDescription').trim().notEmpty(),
  body('urgency').optional().isIn(['critical', 'high', 'medium', 'low']),
  body('symptoms').optional().isArray(),
  handleValidation
], async (req, res) => {
  try {
    const faultReportData = req.body;

    // Get factory ID
    let factory;
    if (req.userRole === 'admin') {
      const factoryId = req.body.factoryId;
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

    // Create fault report
    const faultReport = new FaultReport({
      factoryId: factory._id,
      reportedBy: req.userId,
      machineInfo: {
        name: faultReportData.machineName,
        brand: faultReportData.brand,
        model: faultReportData.model,
        serialNumber: faultReportData.serialNumber
      },
      faultDescription: faultReportData.faultDescription,
      symptoms: faultReportData.symptoms || [],
      urgency: faultReportData.urgency || 'medium',
      hasStoppedProduction: faultReportData.hasStoppedProduction || false,
      preferredVisitTime: faultReportData.preferredVisitTime,
      safetyInstructions: faultReportData.safetyInstructions,
      accessInstructions: faultReportData.accessInstructions
    });

    await faultReport.save();

    // Note: File uploads would be handled separately via upload.array('media')

    res.status(201).json({
      success: true,
      message: 'Fault report submitted successfully',
      data: faultReport
    });
  } catch (error) {
    console.error('Create fault report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit fault report',
      error: error.message
    });
  }
});

// @route   POST /api/fault-reports/:id/media
// @desc    Upload media for a fault report
// @access  Private (Factory)
router.post('/:id/media', [
  auth,
  isFactoryOrAdmin,
  param('id').isMongoId(),
  upload.array('media', 5),
  handleValidation
], async (req, res) => {
  try {
    const { id } = req.params;

    const faultReport = await FaultReport.findById(id);
    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Fault report not found'
      });
    }

    // Check authorization
    if (req.userRole !== 'admin') {
      const factory = await Factory.findOne({ userId: req.userId });
      if (!factory || faultReport.factoryId.toString() !== factory._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add media to this fault report'
        });
      }
    }

    // Process uploaded files
    const media = req.files.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'image' : 
            file.mimetype.startsWith('video/') ? 'video' : 'audio',
      url: `/uploads/fault-reports/${file.filename}`
    }));

    faultReport.media.push(...media);
    await faultReport.save();

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      data: faultReport.media
    });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
      error: error.message
    });
  }
});

// @route   GET /api/fault-reports
// @desc    Get fault reports (filtered by role)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.userRole === 'factory') {
      const factory = await Factory.findOne({ userId: req.userId });
      if (factory) {
        query.factoryId = factory._id;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Factory profile not found'
        });
      }
    } else if (req.userRole === 'technician') {
      query.assignedTechnicianId = req.userId;
    }

    // Optional filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.urgency) {
      query.urgency = req.query.urgency;
    }

    const faultReports = await FaultReport.find(query)
      .populate('factoryId', 'companyName contactPerson')
      .populate('assignedTechnicianId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: faultReports
    });
  } catch (error) {
    console.error('Get fault reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fault reports',
      error: error.message
    });
  }
});

// @route   GET /api/fault-reports/:id
// @desc    Get fault report by ID
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId(),
  handleValidation
], async (req, res) => {
  try {
    const faultReport = await FaultReport.findById(req.params.id)
      .populate('factoryId', 'companyName contactPerson contactPhone address')
      .populate('reportedBy', 'email')
      .populate('assignedTechnicianId', 'firstName lastName phone specializations');

    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Fault report not found'
      });
    }

    // Authorization check
    if (req.userRole === 'factory') {
      const factory = await Factory.findOne({ userId: req.userId });
      if (faultReport.factoryId._id.toString() !== factory._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this fault report'
        });
      }
    }

    res.json({
      success: true,
      data: faultReport
    });
  } catch (error) {
    console.error('Get fault report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fault report',
      error: error.message
    });
  }
});

// @route   PUT /api/fault-reports/:id/status
// @desc    Update fault report status
// @access  Private (Factory, Technician, Admin)
router.put('/:id/status', [
  auth,
  param('id').isMongoId(),
  body('status').isIn(['submitted', 'in_progress', 'resolved', 'cancelled']),
  handleValidation
], async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;

    const faultReport = await FaultReport.findById(req.params.id);
    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Fault report not found'
      });
    }

    faultReport.status = status;
    if (status === 'resolved') {
      faultReport.resolvedAt = Date.now();
      faultReport.resolutionNotes = resolutionNotes;
    }

    await faultReport.save();

    res.json({
      success: true,
      message: 'Fault report status updated',
      data: faultReport
    });
  } catch (error) {
    console.error('Update fault report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// @route   PUT /api/fault-reports/:id/assign
// @desc    Assign technician to fault report
// @access  Private (Admin)
router.put('/:id/assign', [
  auth,
  param('id').isMongoId(),
  body('technicianId').isMongoId(),
  handleValidation
], async (req, res) => {
  try {
    const { technicianId } = req.body;

    const faultReport = await FaultReport.findByIdAndUpdate(
      req.params.id,
      { assignedTechnicianId: technicianId, status: 'in_progress' },
      { new: true }
    ).populate('assignedTechnicianId', 'firstName lastName');

    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Fault report not found'
      });
    }

    res.json({
      success: true,
      message: 'Technician assigned successfully',
      data: faultReport
    });
  } catch (error) {
    console.error('Assign technician error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign technician',
      error: error.message
    });
  }
});

module.exports = router;