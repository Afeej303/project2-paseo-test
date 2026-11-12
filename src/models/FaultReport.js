const mongoose = require('mongoose');

const faultReportSchema = new mongoose.Schema({
  factoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factory',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  machineInfo: {
    name: { type: String, required: true },
    brand: String,
    model: String,
    serialNumber: String
  },
  faultDescription: {
    type: String,
    required: true
  },
  symptoms: [String],
  urgency: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  hasStoppedProduction: {
    type: Boolean,
    default: false
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio']
    },
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  preferredVisitTime: {
    type: Date
  },
  safetyInstructions: String,
  accessInstructions: String,
  status: {
    type: String,
    enum: ['submitted', 'in_progress', 'resolved', 'cancelled'],
    default: 'submitted'
  },
  assignedTechnicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Technician'
  },
  resolvedAt: Date,
  resolutionNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
faultReportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FaultReport', faultReportSchema);