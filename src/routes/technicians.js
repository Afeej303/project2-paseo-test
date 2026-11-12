const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Technician = require('../models/Technician');
const auth = require('../middleware/auth');
const { isTechnicianOrAdmin } = require('../middleware/roles');

const router = express.Router();

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

router.get('/profile', auth, isTechnicianOrAdmin, async (req, res) => {
  try {
    let technician;
    
    if (req.userRole === 'admin') {
      const technicianId = req.query.id;
      if (!technicianId) {
        return res.status(400).json({
          success: false,
          message: 'Technician ID required'
        });
      }
      technician = await Technician.findById(technicianId).populate('userId', 'email isVerified isActive');
    } else {
      technician = await Technician.findOne({ userId: req.userId }).populate('userId', 'email isVerified isActive');
    }

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Technician profile retrieved successfully',
      data: technician
    });
  } catch (error) {
    console.error('Get technician profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get technician profile',
      errors: [{ message: error.message }]
    });
  }
});

router.put('/profile', [
  auth,
  isTechnicianOrAdmin,
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().trim().notEmpty(),
  handleValidation
], async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    let technician;
    if (req.userRole === 'admin') {
      const technicianId = req.query.id;
      if (!technicianId) {
        return res.status(400).json({
          success: false,
          message: 'Technician ID required'
        });
      }
      const updateData = { firstName, lastName, phone };
      technician = await Technician.findByIdAndUpdate(technicianId, updateData, { new: true, runValidators: true });
    } else {
      const updateData = { firstName, lastName, phone };
      technician = await Technician.findOneAndUpdate(
        { userId: req.userId },
        updateData,
        { new: true, runValidators: true }
      );
    }

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Technician profile updated successfully',
      data: technician
    });
  } catch (error) {
    console.error('Update technician profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update technician profile',
      errors: [{ message: error.message }]
    });
  }
});

router.put('/availability', [
  auth,
  isTechnicianOrAdmin,
  body('status').optional().isIn(['available', 'busy', 'offline']),
  handleValidation
], async (req, res) => {
  try {
    const { status, workingHours, serviceDays, emergencyAvailable } = req.body;

    const updateData = {};
    if (status) updateData['availability.status'] = status;
    if (workingHours) updateData['availability.workingHours'] = workingHours;
    if (serviceDays) updateData['availability.serviceDays'] = serviceDays;
    if (typeof emergencyAvailable === 'boolean') updateData['availability.emergencyAvailable'] = emergencyAvailable;

    let technician;
    if (req.userRole === 'admin') {
      const technicianId = req.query.id;
      technician = await Technician.findByIdAndUpdate(technicianId, updateData, { new: true });
    } else {
      technician = await Technician.findOneAndUpdate({ userId: req.userId }, updateData, { new: true });
    }

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: technician.availability
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability',
      errors: [{ message: error.message }]
    });
  }
});

router.put('/specializations', [
  auth,
  isTechnicianOrAdmin,
  body('specializations').isArray(),
  handleValidation
], async (req, res) => {
  try {
    const { specializations, brands } = req.body;

    let technician;
    if (req.userRole === 'admin') {
      const technicianId = req.query.id;
      const updateData = { specializations, brands };
      technician = await Technician.findByIdAndUpdate(technicianId, updateData, { new: true });
    } else {
      technician = await Technician.findOneAndUpdate(
        { userId: req.userId },
        { specializations, brands },
        { new: true }
      );
    }

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Specializations updated successfully',
      data: {
        specializations: technician.specializations,
        brands: technician.brands
      }
    });
  } catch (error) {
    console.error('Update specializations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update specializations',
      errors: [{ message: error.message }]
    });
  }
});

router.put('/service-area', [
  auth,
  isTechnicianOrAdmin,
  body('coordinates').isArray({ min: 2, max: 2 }),
  body('radius').optional().isNumeric(),
  body('cities').optional().isArray(),
  handleValidation
], async (req, res) => {
  try {
    const { coordinates, radius, cities } = req.body;

    const updateData = {
      serviceArea: {
        location: {
          type: 'Point',
          coordinates
        },
        radius: radius || 50,
        cities: cities || []
      }
    };

    let technician;
    if (req.userRole === 'admin') {
      const technicianId = req.query.id;
      technician = await Technician.findByIdAndUpdate(technicianId, updateData, { new: true });
    } else {
      technician = await Technician.findOneAndUpdate({ userId: req.userId }, updateData, { new: true });
    }

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Service area updated successfully',
      data: technician.serviceArea
    });
  } catch (error) {
    console.error('Update service area error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service area',
      errors: [{ message: error.message }]
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { specialization, city, available, emergency, coordinates, radius } = req.query;

    const query = { isVerified: true };

    if (specialization) {
      query.specializations = specialization;
    }

    if (city) {
      query['serviceArea.cities'] = city;
    }

    if (available === 'true') {
      query['availability.status'] = 'available';
    }

    if (emergency === 'true') {
      query['availability.emergencyAvailable'] = true;
    }

    let techniciansQuery = Technician.find(query).select('-verificationDocuments').sort({ 'ratings.average': -1, totalJobs: -1 });

    if (coordinates && radius) {
      const [lng, lat] = coordinates.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        const locationQuery = {
          'serviceArea.location': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat]
              },
              $maxDistance: Math.min(parseInt(radius), 500) * 1000
            }
          }
        };
        techniciansQuery = Technician.find({ ...query, ...locationQuery }).select('-verificationDocuments').sort({ 'ratings.average': -1, totalJobs: -1 });
      }
    }

    const technicians = await techniciansQuery.populate('userId', 'email');

    res.json({
      success: true,
      message: 'Technicians retrieved successfully',
      data: technicians
    });
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get technicians',
      errors: [{ message: error.message }]
    });
  }
});

router.get('/:id', [
  param('id').isMongoId(),
  handleValidation
], async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id)
      .select('-verificationDocuments')
      .populate('userId', 'email');

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    res.json({
      success: true,
      message: 'Technician retrieved successfully',
      data: technician
    });
  } catch (error) {
    console.error('Get technician error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get technician',
      errors: [{ message: error.message }]
    });
  }
});

module.exports = router;