const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Technician = require('../models/Technician');
const RepairRequest = require('../models/RepairRequest');
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

router.use(auth, isAdmin);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/technicians/:id/verify
router.put('/technicians/:id/verify', async (req, res) => {
  try {
    const { isVerified } = req.body;
    const tech = await Technician.findByIdAndUpdate(req.params.id, { isVerified }, { new: true });
    if (!tech) return res.status(404).json({ success: false, message: 'Technician not found' });
    // Also update User profile
    await User.findByIdAndUpdate(tech.userId, { isVerified });
    res.json({ success: true, data: tech });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/repair-requests
router.get('/repair-requests', async (req, res) => {
  try {
    const { status, urgency } = req.query;
    const query = {};
    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    
    const requests = await RepairRequest.find(query);
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [userCounts, requestCounts] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      RepairRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);
    res.json({ success: true, data: { userCounts, requestCounts } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
