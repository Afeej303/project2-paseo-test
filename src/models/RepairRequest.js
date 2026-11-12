const mongoose = require('mongoose');

const repairRequestSchema = new mongoose.Schema({
  faultReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FaultReport',
    required: true
  },
  factoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factory',
    required: true
  },
  factoryContactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  technicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Technician'
  },
  status: {
    type: String,
    enum: [
      'pending',
      'accepted',
      'rejected',
      'confirmed',
      'traveling',
      'arrived',
      'diagnosing',
      'repairing',
      'waiting_parts',
      'completed',
      'cancelled'
    ],
    default: 'pending'
  },
  urgency: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  requestedVisitTime: {
    type: Date
  },
  estimatedArrivalTime: Date,
  quotation: {
    estimatedCost: Number,
    currency: { type: String, default: 'USD' },
    estimatedDuration: Number, // in hours
    partsNeeded: [String],
    notes: String,
    submittedAt: Date,
    approvedByFactory: Boolean,
    approvedAt: Date
  },
  actualArrivalTime: Date,
  diagnosis: {
    findings: String,
    recommendedActions: [String],
    additionalParts: [String],
    additionalCost: Number
  },
  workPerformed: [{
    description: String,
    duration: Number, // in minutes
    partsUsed: [{
      name: String,
      quantity: Number,
      cost: Number
    }]
  }],
  completion: {
    completedAt: Date,
    totalCost: Number,
    notes: String,
    beforePhotos: [String],
    afterPhotos: [String],
    serviceReportUrl: String
  },
  factoryApproval: {
    approved: Boolean,
    approvedAt: Date,
    approvedBy: mongoose.Schema.Types.ObjectId,
    notes: String
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'invoiced', 'paid', 'disputed'],
      default: 'pending'
    },
    invoiceUrl: String,
    paidAt: Date,
    paymentMethod: String,
    amount: Number
  },
  review: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  },
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
repairRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('RepairRequest', repairRequestSchema);