const express = require('express');
const { body, param, validationResult } = require('express-validator');
const RepairRequest = require('../models/RepairRequest');
const FaultReport = require('../models/FaultReport');
const Factory = require('../models/Factory');
const Technician = require('../models/Technician');
const auth = require('../middleware/auth');
const { authorize, isFactory, isTechnician, isAdmin } = require('../middleware/roles');
const { notify } = require('../services/notifications');

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

// @route   POST /api/repair-requests
// @desc    Create repair request from fault report
// @access  Private (Factory)
router.post('/', [
  auth,
  isFactory,
  body('faultReportId').isMongoId(),
  handleValidation
], async (req, res) => {
  try {
    const { faultReportId, urgency, isEmergency } = req.body;

    // Verify fault report exists and belongs to factory
    const faultReport = await FaultReport.findById(faultReportId);
    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Fault report not found'
      });
    }

    const factory = await Factory.findOne({ userId: req.userId });
    if (!factory) {
      return res.status(404).json({
        success: false,
        message: 'Factory profile not found'
      });
    }

    if (faultReport.factoryId.toString() !== factory._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create request for this fault report'
      });
    }

    // Check for existing repair request
    const existingRequest = await RepairRequest.findOne({ faultReportId });
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Repair request already exists for this fault report'
      });
    }

    const repairRequest = new RepairRequest({
      faultReportId,
      factoryId: factory._id,
      factoryContactId: req.userId,
      urgency: urgency || faultReport.urgency,
      isEmergency: isEmergency || false,
      requestedVisitTime: faultReport.preferredVisitTime
    });

    await repairRequest.save();

    res.status(201).json({
      success: true,
      message: 'Repair request created successfully',
      data: repairRequest
    });
  } catch (error) {
    console.error('Create repair request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create repair request',
      errors: [{ message: error.message }]
    });
  }
});

// @route   GET /api/repair-requests
// @desc    Get repair requests (filtered by role)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.userRole === 'factory') {
      const factory = await Factory.findOne({ userId: req.userId });
      if (!factory) {
        return res.status(404).json({
          success: false,
          message: 'Factory profile not found'
        });
      }
      query.factoryId = factory._id;
    } else if (req.userRole === 'technician') {
      const technician = await Technician.findOne({ userId: req.userId });
      if (!technician) {
        return res.json({ success: true, data: [] });
      }
      query.technicianId = technician._id;
    }

    // Status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    const repairRequests = await RepairRequest.find(query)
      .populate('factoryId', 'companyName contactPerson contactPhone')
      .populate('factoryContactId', 'email')
      .populate('faultReportId', 'machineInfo faultDescription urgency')
      .populate('technicianId', 'firstName lastName specializations ratings')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: repairRequests
    });
  } catch (error) {
    console.error('Get repair requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get repair requests',
      errors: [{ message: error.message }]
    });
  }
});

// @route   GET /api/repair-requests/:id
// @desc    Get repair request by ID
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId(),
  handleValidation
], async (req, res) => {
  try {
    const repairRequest = await RepairRequest.findById(req.params.id)
      .populate('factoryId', 'companyName contactPerson contactPhone address')
      .populate('factoryContactId', 'email')
      .populate('faultReportId', 'machineInfo faultDescription symptoms media safetyInstructions')
      .populate('technicianId', 'firstName lastName phone specializations ratings');

    if (!repairRequest) {
      return res.status(404).json({
        success: false,
        message: 'Repair request not found'
      });
    }

    res.json({
      success: true,
      data: repairRequest
    });
  } catch (error) {
    console.error('Get repair request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get repair request',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/repair-requests/:id/accept
// @desc    Technician accepts a repair request
// @access  Private (Technician)
router.post('/:id/accept', [
  auth,
  isTechnician,
  param('id').isMongoId(),
  body('estimatedArrivalTime').isISO8601(),
  handleValidation
], async (req, res) => {
  try {
    const { estimatedArrivalTime } = req.body;

    const repairRequest = await RepairRequest.findById(req.params.id);
    if (!repairRequest) {
      return res.status(404).json({
        success: false,
        message: 'Repair request not found'
      });
    }

    if (repairRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request is not pending'
      });
    }

    // Get technician profile
    const technician = await Technician.findOne({ userId: req.userId });
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    if (repairRequest.technicianId && repairRequest.technicianId.toString() !== technician._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this repair request'
      });
    }

    repairRequest.technicianId = technician._id;
    repairRequest.status = 'accepted';
    repairRequest.estimatedArrivalTime = estimatedArrivalTime;
    await repairRequest.save();

    await notify(repairRequest.factoryContactId, {
      type: 'status_update',
      message: 'Technician accepted repair request',
      relatedId: repairRequest._id
    });

    res.json({
      success: true,
      message: 'Repair request accepted',
      data: repairRequest
    });
  } catch (error) {
    console.error('Accept repair request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept request',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/repair-requests/:id/reject
// @desc    Technician rejects a repair request
// @access  Private (Technician)
router.post('/:id/reject', [
  auth,
  isTechnician,
  param('id').isMongoId(),
  body('reason').trim().notEmpty(),
  handleValidation
], async (req, res) => {
  try {
    const { reason } = req.body;

    const repairRequest = await RepairRequest.findById(req.params.id);
    if (!repairRequest) {
      return res.status(404).json({
        success: false,
        message: 'Repair request not found'
      });
    }

    const technician = await Technician.findOne({ userId: req.userId });
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    if (repairRequest.technicianId && repairRequest.technicianId.toString() !== technician._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this repair request'
      });
    }

    if (repairRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request is not pending'
      });
    }

    repairRequest.status = 'rejected';
    await repairRequest.save();

    await notify(repairRequest.factoryContactId, {
      type: 'status_update',
      message: 'Technician rejected repair request',
      relatedId: repairRequest._id
    });

    res.json({
      success: true,
      message: 'Repair request rejected',
      data: repairRequest
    });
  } catch (error) {
    console.error('Reject repair request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      errors: [{ message: error.message }]
    });
  }
});

// @route   PUT /api/repair-requests/:id/status
// @desc    Update repair request status
// @access  Private (Technician, Factory, Admin)
router.put('/:id/status', [
  auth,
  param('id').isMongoId(),
  body('status').isIn(['pending', 'accepted', 'rejected', 'confirmed', 'traveling', 'arrived', 'diagnosing', 'repairing', 'waiting_parts', 'completed', 'cancelled']),
  handleValidation
], async (req, res) => {
  try {
    const { status, notes } = req.body;

    const repairRequest = await RepairRequest.findById(req.params.id);
    if (!repairRequest) {
      return res.status(404).json({
        success: false,
        message: 'Repair request not found'
      });
    }

    // Authorization check: verify user owns this request or is admin
    const factory = req.userRole === 'factory' ? await Factory.findOne({ userId: req.userId }) : null;
    const technician = req.userRole === 'technician' ? await Technician.findOne({ userId: req.userId }) : null;
    const isOwner = req.userRole === 'factory' && factory && repairRequest.factoryId.toString() === factory._id.toString();
    const isAssignedTechnician = req.userRole === 'technician' && technician && repairRequest.technicianId && repairRequest.technicianId.toString() === technician._id.toString();
    const isAdminUser = req.userRole === 'admin';

    if (!isOwner && !isAssignedTechnician && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this repair request'
      });
    }

    // Terminal states cannot transition to anything else
    const terminalStates = ['rejected', 'completed', 'cancelled'];
    if (terminalStates.includes(repairRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Repair request is already in terminal state ${repairRequest.status}`
      });
    }

    // Transition rules
    const validTransitions = {
      pending: ['accepted', 'rejected', 'cancelled'],
      accepted: ['confirmed', 'rejected', 'cancelled'],
      confirmed: ['traveling', 'cancelled'],
      traveling: ['arrived', 'cancelled'],
      arrived: ['diagnosing'],
      diagnosing: ['repairing', 'waiting_parts', 'cancelled'],
      waiting_parts: ['repairing', 'cancelled'],
      repairing: ['completed']
    };

    // Rejected and completed are terminal states - only allow certain roles to set them
    if (status === 'rejected' && !isAssignedTechnician && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned technician or admin can reject this request'
      });
    }

    if (status === 'completed' && !isAssignedTechnician && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned technician or admin can complete this request'
      });
    }

    if (validTransitions[repairRequest.status] && !validTransitions[repairRequest.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${repairRequest.status} to ${status}`
      });
    }

    repairRequest.status = status;

    if (status === 'arrived') {
      repairRequest.actualArrivalTime = Date.now();
    }

    if (status === 'completed') {
      repairRequest.completion = {
        completedAt: Date.now(),
        notes: notes
      };
    }

    await repairRequest.save();

    let recipientId = null;
    if (req.userRole === 'technician') {
      recipientId = repairRequest.factoryContactId;
    } else if ((req.userRole === 'factory' || req.userRole === 'admin') && repairRequest.technicianId) {
      const assignedTechnician = await Technician.findById(repairRequest.technicianId);
      if (assignedTechnician) {
        recipientId = assignedTechnician.userId;
      }
    }

    if (recipientId && recipientId.toString() !== req.userId.toString()) {
      await notify(recipientId, {
        type: 'status_update',
        message: `Repair request status updated to ${status}`,
        relatedId: repairRequest._id
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: repairRequest
    });
  } catch (error) {
    console.error('Update repair request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/repair-requests/:id/quotation
// @desc    Submit quotation for repair
// @access  Private (Technician)
router.post('/:id/quotation', [
  auth,
  isTechnician,
  param('id').isMongoId(),
  body('estimatedCost').isNumeric(),
  body('estimatedDuration').isNumeric(),
  handleValidation
], async (req, res) => {
  try {
    const { estimatedCost, estimatedDuration, partsNeeded, notes } = req.body;

    const repairRequest = await RepairRequest.findById(req.params.id);
    if (!repairRequest) {
      return res.status(404).json({
        success: false,
        message: 'Repair request not found'
      });
    }

    const technician = await Technician.findOne({ userId: req.userId });
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    if (!repairRequest.technicianId || repairRequest.technicianId.toString() !== technician._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    repairRequest.quotation = {
      estimatedCost,
      estimatedDuration,
      partsNeeded: partsNeeded || [],
      notes: notes,
      submittedAt: Date.now()
    };

    await repairRequest.save();

    res.json({
      success: true,
      message: 'Quotation submitted',
      data: repairRequest.quotation
    });
  } catch (error) {
    console.error('Submit quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quotation',
      errors: [{ message: error.message }]
    });
  }
});

// @route   PUT /api/repair-requests/:id/quotation/approve
// @desc    Factory approves quotation
// @access  Private (Factory)
router.put('/:id/quotation/approve', [
  auth,
  isFactory,
  param('id').isMongoId(),
  handleValidation
], async (req, res) => {
  try {
    const repairRequest = await RepairRequest.findById(req.params.id);
    if (!repairRequest) {
      return res.status(404).json({
        success: false,
        message: 'Repair request not found'
      });
    }

    const factory = await Factory.findOne({ userId: req.userId });
    if (!factory) {
      return res.status(404).json({
        success: false,
        message: 'Factory profile not found'
      });
    }

    if (repairRequest.factoryId.toString() !== factory._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!repairRequest.quotation || !repairRequest.quotation.submittedAt) {
      return res.status(400).json({
        success: false,
        message: 'No quotation has been submitted for this request'
      });
    }

    if (!repairRequest.factoryApproval) {
      repairRequest.factoryApproval = {};
    }

    repairRequest.quotation.approvedByFactory = true;
    repairRequest.quotation.approvedAt = Date.now();
    repairRequest.factoryApproval.approved = true;
    repairRequest.factoryApproval.approvedAt = Date.now();
    repairRequest.factoryApproval.approvedBy = req.userId;
    await repairRequest.save();

    res.json({
      success: true,
      message: 'Quotation approved',
      data: repairRequest
    });
  } catch (error) {
    console.error('Approve quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve quotation',
      errors: [{ message: error.message }]
    });
  }
});

// @route   POST /api/repair-requests/:id/review
// @desc    Factory submits review
// @access  Private (Factory)
router.post('/:id/review', [
  auth,
  isFactory,
  param('id').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim(),
  handleValidation
], async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const repairRequest = await RepairRequest.findById(req.params.id);
    if (!repairRequest) {
      return res.status(404).json({
        success: false,
        message: 'Repair request not found'
      });
    }

    if (repairRequest.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed requests'
      });
    }

    const factory = await Factory.findOne({ userId: req.userId });
    if (!factory) {
      return res.status(404).json({
        success: false,
        message: 'Factory profile not found'
      });
    }

    if (repairRequest.factoryId.toString() !== factory._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!repairRequest.technicianId) {
      return res.status(400).json({
        success: false,
        message: 'No technician is assigned to this request'
      });
    }

    const technician = await Technician.findById(repairRequest.technicianId);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    repairRequest.review = {
      rating,
      comment,
      submittedAt: Date.now()
    };

    await repairRequest.save();

    // Update technician ratings
    if (!technician.ratings) {
      technician.ratings = { average: 0, count: 0 };
    }
    const newRating = ((technician.ratings.average * technician.ratings.count) + rating) / (technician.ratings.count + 1);
    technician.ratings.average = Math.round(newRating * 10) / 10;
    technician.ratings.count += 1;
    technician.completedJobs = (technician.completedJobs || 0) + 1;
    await technician.save();

    res.json({
      success: true,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      errors: [{ message: error.message }]
    });
  }
});

module.exports = router;