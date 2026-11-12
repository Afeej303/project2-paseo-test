const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  specializations: [{
    type: String,
    enum: [
      'electrical',
      'mechanical',
      'CNC',
      'PLC',
      'robotics',
      'HVAC',
      'hydraulics',
      'pneumatics',
      'welding',
      'other'
    ]
  }],
  brands: [String], // e.g., ['Siemens', 'Fanuc', 'Allen-Bradley']
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    documentUrl: String
  }],
  experience: {
    years: Number,
    description: String
  },
  serviceArea: {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    radius: {
      type: Number,
      default: 50 // kilometers
    },
    cities: [String]
  },
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'offline'
    },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '18:00' }
    },
    serviceDays: {
      type: [Number], // 0=Sunday, 1=Monday, etc.
      default: [1, 2, 3, 4, 5]
    },
    emergencyAvailable: {
      type: Boolean,
      default: false
    }
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  totalJobs: {
    type: Number,
    default: 0
  },
  completedJobs: {
    type: Number,
    default: 0
  },
  verificationDocuments: [{
    type: {
      type: String,
      enum: ['identity', 'certification', 'insurance', 'other']
    },
    documentUrl: String,
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  bio: String,
  hourlyRate: Number,
  travelRatePerKm: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index for location-based queries
technicianSchema.index({ 'serviceArea.location': '2dsphere' });

// Update timestamp on save
technicianSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Technician', technicianSchema);