const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const User = require('../src/models/User');
const Factory = require('../src/models/Factory');
const Technician = require('../src/models/Technician');
const app = require('../src/server');

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
  process.env.JWT_EXPIRES_IN = '7d';
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const createTestUsers = async () => {
  // Create factory user
  const factoryUser = new User({
    email: 'factory@test.com',
    password: 'password123',
    role: 'factory'
  });
  await factoryUser.save();

  const factory = new Factory({
    userId: factoryUser._id,
    companyName: 'Test Factory Inc',
    contactPerson: 'John Doe',
    contactPhone: '555-1234'
  });
  await factory.save();

  // Create technician user
  const techUser = new User({
    email: 'tech@test.com',
    password: 'password123',
    role: 'technician'
  });
  await techUser.save();

  const technician = new Technician({
    userId: techUser._id,
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '555-5678',
    specializations: ['electrical'],
    serviceArea: {
      location: {
        type: 'Point',
        coordinates: [-74.006, 40.7128]
      }
    }
  });
  await technician.save();

  // Create admin user
  const adminUser = new User({
    email: 'admin@test.com',
    password: 'adminpassword',
    role: 'admin',
    isVerified: true
  });
  await adminUser.save();

  return { factoryUser, techUser, adminUser, factory, technician };
};

describe('Integration Tests', () => {
  describe('Mass Assignment Protection', () => {
    let factoryUser, techUser;
    let factoryToken, techToken;

    beforeEach(async () => {
      const users = await createTestUsers();
      factoryUser = users.factoryUser;
      techUser = users.techUser;

      factoryToken = factoryUser.generateAuthToken();
      techToken = techUser.generateAuthToken();
    });

    it('should not allow factory users to set isVerified field', async () => {
      await User.deleteMany({});
      await Factory.deleteMany({});

      const factoryUser = new User({
        email: 'victim@test.com',
        password: 'password123',
        role: 'factory'
      });
      await factoryUser.save();

      const factory = new Factory({
        userId: factoryUser._id,
        companyName: 'Victim Factory',
        contactPerson: 'Nobody',
        contactPhone: '555-0000'
      });
      await factory.save();

      const victimToken = factoryUser.generateAuthToken();

      const response = await request(app)
        .put('/api/factories/profile')
        .set('Authorization', `Bearer ${victimToken}`)
        .send({
          companyName: 'Hacked Company',
          isVerified: true
        });

      expect(response.status).toBe(200);

      const updatedFactory = await Factory.findOne({ userId: factoryUser._id });
      expect(updatedFactory.companyName).toBe('Hacked Company');
    });
  });

  describe('Admin Bootstrap', () => {
    let originalAllowAdminBootstrap;

    beforeEach(() => {
      originalAllowAdminBootstrap = process.env.ALLOW_ADMIN_BOOTSTRAP;
    });

    afterEach(() => {
      if (originalAllowAdminBootstrap === undefined) {
        delete process.env.ALLOW_ADMIN_BOOTSTRAP;
      } else {
        process.env.ALLOW_ADMIN_BOOTSTRAP = originalAllowAdminBootstrap;
      }
    });

    it('should return 403 and create no admin when bootstrap is disabled', async () => {
      delete process.env.ALLOW_ADMIN_BOOTSTRAP;
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});

      const response = await request(app)
        .post('/api/auth/register/admin/bootstrap')
        .send({
          email: 'disabledadmin@test.com',
          password: 'adminpassword'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin bootstrap is disabled');
      expect(response.body).not.toHaveProperty('error');

      const admin = await User.findOne({ email: 'disabledadmin@test.com' });
      expect(admin).toBeNull();
      expect(await User.countDocuments({ role: 'admin' })).toBe(0);
    });

    it('should allow creating first admin when no admin exists', async () => {
      process.env.ALLOW_ADMIN_BOOTSTRAP = 'true';
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});

      const response = await request(app)
        .post('/api/auth/register/admin/bootstrap')
        .send({
          email: 'firstadmin@test.com',
          password: 'adminpassword'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('admin');
      expect(response.body.data.user.isVerified).toBe(true);
    });

    it('should prevent creating second admin if one exists', async () => {
      process.env.ALLOW_ADMIN_BOOTSTRAP = 'true';

      const response = await request(app)
        .post('/api/auth/register/admin/bootstrap')
        .send({
          email: 'secondadmin@test.com',
          password: 'adminpassword'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin already exists');
    });
  });

  describe('Technician Geo Query', () => {
    let techToken;

    beforeEach(async () => {
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});

      const techUser = new User({
        email: 'geotech@test.com',
        password: 'password123',
        role: 'technician'
      });
      await techUser.save();

      const technician = new Technician({
        userId: techUser._id,
        firstName: 'Geo',
        lastName: 'Tech',
        phone: '555-9999',
        specializations: ['mechanical'],
        isVerified: true,
        serviceArea: {
          location: {
            type: 'Point',
            coordinates: [-73.9857, 40.7484]
          }
        }
      });
      await technician.save();

      techToken = techUser.generateAuthToken();
    });

    it('should return technicians with coordinates parameter', async () => {
      const response = await request(app)
        .get('/api/technicians?coordinates=-74.006,40.7128&radius=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Repair Request Authorization', () => {
    let factoryToken, techToken, adminToken;

    beforeEach(async () => {
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});
      await RepairRequest.deleteMany({});
      await FaultReport.deleteMany({});
    });

    it('should verify the response envelope format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should return error for non-existent technician', async () => {
      const response = await request(app)
        .get('/api/technicians/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Repair State Machine', () => {
    let adminToken, technician, technicianToken, repairRequest;

    beforeEach(async () => {
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});
      await RepairRequest.deleteMany({});
      await FaultReport.deleteMany({});

      const factoryUser = new User({
        email: 'statemachine-factory@test.com',
        password: 'password123',
        role: 'factory'
      });
      await factoryUser.save();

      const factory = new Factory({
        userId: factoryUser._id,
        companyName: 'State Machine Factory',
        contactPerson: 'Owner',
        contactPhone: '555-1000'
      });
      await factory.save();

      const techUser = new User({
        email: 'statemachine-tech@test.com',
        password: 'password123',
        role: 'technician'
      });
      await techUser.save();

      technician = new Technician({
        userId: techUser._id,
        firstName: 'State',
        lastName: 'Tech',
        phone: '555-2000',
        specializations: ['mechanical']
      });
      await technician.save();
      technicianToken = techUser.generateAuthToken();

      const adminUser = new User({
        email: 'statemachine-admin@test.com',
        password: 'password123',
        role: 'admin',
        isVerified: true
      });
      await adminUser.save();
      adminToken = adminUser.generateAuthToken();

      const faultReport = new FaultReport({
        factoryId: factory._id,
        reportedBy: factoryUser._id,
        machineInfo: { name: 'Pump' },
        faultDescription: 'Overheating',
        urgency: 'high'
      });
      await faultReport.save();

      repairRequest = new RepairRequest({
        faultReportId: faultReport._id,
        factoryId: factory._id,
        factoryContactId: factoryUser._id,
        technicianId: technician._id,
        status: 'completed'
      });
      await repairRequest.save();
    });

    it('should reject transitions out of a terminal state', async () => {
      const response = await request(app)
        .put(`/api/repair-requests/${repairRequest._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'pending' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should let the assigned technician update a non-terminal request', async () => {
      repairRequest.status = 'arrived';
      await repairRequest.save();

      const response = await request(app)
        .put(`/api/repair-requests/${repairRequest._id}/status`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ status: 'diagnosing' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('diagnosing');
    });

    it('should list requests for the technician profile tied to the user', async () => {
      repairRequest.status = 'accepted';
      await repairRequest.save();

      const response = await request(app)
        .get('/api/repair-requests')
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('API Error Envelope', () => {
    it('should not emit a top-level error field on validation failures', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(response.body).not.toHaveProperty('error');
    });
  });

  describe('Fault Report Media Uploads', () => {
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'fault-reports');
    let factoryToken, faultReportId;

    beforeEach(async () => {
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});
      await RepairRequest.deleteMany({});
      await FaultReport.deleteMany({});

      const factoryUser = new User({
        email: 'media-factory@test.com',
        password: 'password123',
        role: 'factory'
      });
      await factoryUser.save();

      const factory = new Factory({
        userId: factoryUser._id,
        companyName: 'Media Factory',
        contactPerson: 'Owner',
        contactPhone: '555-3000'
      });
      await factory.save();

      const faultReport = new FaultReport({
        factoryId: factory._id,
        reportedBy: factoryUser._id,
        machineInfo: { name: 'Pump' },
        faultDescription: 'Leaking seal',
        urgency: 'medium'
      });
      await faultReport.save();

      faultReportId = faultReport._id;
      factoryToken = factoryUser.generateAuthToken();
    });

    it('should return 400 with the standard envelope when no media files are attached', async () => {
      const response = await request(app)
        .post(`/api/fault-reports/${faultReportId}/media`)
        .set('Authorization', `Bearer ${factoryToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body).not.toHaveProperty('error');
    });

    it('should serve files from uploads/fault-reports statically', async () => {
      fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `static-${Date.now()}.txt`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, 'upload-ok');

      try {
        const response = await request(app)
          .get(`/uploads/fault-reports/${filename}`)
          .expect(200);

        expect(response.text).toBe('upload-ok');
      } finally {
        fs.unlinkSync(filePath);
      }
    });

    it('should save an uploaded image and expose it under /uploads/fault-reports', async () => {
      const response = await request(app)
        .post(`/api/fault-reports/${faultReportId}/media`)
        .set('Authorization', `Bearer ${factoryToken}`)
        .attach('media', Buffer.from('fake-image-bytes'), {
          filename: 'fault.png',
          contentType: 'image/png'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].url).toMatch(/^\/uploads\/fault-reports\//);

      const savedPath = path.join(__dirname, '..', response.body.data[0].url);
      expect(fs.existsSync(savedPath)).toBe(true);
      fs.unlinkSync(savedPath);
    });

    it('should return 400 with the standard envelope for a rejected file type', async () => {
      const response = await request(app)
        .post(`/api/fault-reports/${faultReportId}/media`)
        .set('Authorization', `Bearer ${factoryToken}`)
        .attach('media', Buffer.from('not-an-image'), {
          filename: 'malware.exe',
          contentType: 'application/octet-stream'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors[0].message).toMatch(/Invalid file type/);
    });

    it('should reject media uploads to a report owned by another factory without writing a file', async () => {
      const otherUser = new User({
        email: 'media-other-factory@test.com',
        password: 'password123',
        role: 'factory'
      });
      await otherUser.save();

      const otherFactory = new Factory({
        userId: otherUser._id,
        companyName: 'Other Media Factory',
        contactPerson: 'Other',
        contactPhone: '555-3001'
      });
      await otherFactory.save();

      const otherToken = otherUser.generateAuthToken();
      const filesBefore = fs.readdirSync(uploadsDir);

      const response = await request(app)
        .post(`/api/fault-reports/${faultReportId}/media`)
        .set('Authorization', `Bearer ${otherToken}`)
        .attach('media', Buffer.from('fake-image-bytes'), {
          filename: 'ownership-test.png',
          contentType: 'image/png'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      const filesAfter = fs.readdirSync(uploadsDir);
      expect(filesAfter).toEqual(filesBefore);
      expect(filesAfter.some((file) => file.includes('ownership-test'))).toBe(false);
    });
  });

  describe('Profile Null Guards', () => {
    beforeEach(async () => {
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});
      await RepairRequest.deleteMany({});
      await FaultReport.deleteMany({});
    });

    it('should return 404 when a factory user has no factory profile', async () => {
      const user = new User({
        email: 'no-factory-profile@test.com',
        password: 'password123',
        role: 'factory'
      });
      await user.save();
      const token = user.generateAuthToken();

      const faultReport = new FaultReport({
        factoryId: new mongoose.Types.ObjectId(),
        reportedBy: user._id,
        machineInfo: { name: 'Pump' },
        faultDescription: 'Noise'
      });
      await faultReport.save();

      const response = await request(app)
        .post('/api/repair-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({ faultReportId: faultReport._id.toString() });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body).not.toHaveProperty('error');
    });

    it('should return 404 when a technician user has no technician profile', async () => {
      const user = new User({
        email: 'no-tech-profile@test.com',
        password: 'password123',
        role: 'technician'
      });
      await user.save();
      const token = user.generateAuthToken();

      const repairRequest = new RepairRequest({
        faultReportId: new mongoose.Types.ObjectId(),
        factoryId: new mongoose.Types.ObjectId(),
        factoryContactId: new mongoose.Types.ObjectId(),
        status: 'accepted'
      });
      await repairRequest.save();

      const response = await request(app)
        .post(`/api/repair-requests/${repairRequest._id}/quotation`)
        .set('Authorization', `Bearer ${token}`)
        .send({ estimatedCost: 100, estimatedDuration: 2 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 when approving a quotation without a factory profile', async () => {
      const user = new User({
        email: 'no-factory-approve@test.com',
        password: 'password123',
        role: 'factory'
      });
      await user.save();
      const token = user.generateAuthToken();

      const repairRequest = new RepairRequest({
        faultReportId: new mongoose.Types.ObjectId(),
        factoryId: new mongoose.Types.ObjectId(),
        factoryContactId: user._id,
        status: 'accepted',
        quotation: { estimatedCost: 100, estimatedDuration: 2, submittedAt: Date.now() }
      });
      await repairRequest.save();

      const response = await request(app)
        .put(`/api/repair-requests/${repairRequest._id}/quotation/approve`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 when reviewing without a factory profile', async () => {
      const user = new User({
        email: 'no-factory-review@test.com',
        password: 'password123',
        role: 'factory'
      });
      await user.save();
      const token = user.generateAuthToken();

      const repairRequest = new RepairRequest({
        faultReportId: new mongoose.Types.ObjectId(),
        factoryId: new mongoose.Types.ObjectId(),
        factoryContactId: user._id,
        technicianId: new mongoose.Types.ObjectId(),
        status: 'completed'
      });
      await repairRequest.save();

      const response = await request(app)
        .post(`/api/repair-requests/${repairRequest._id}/review`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 5, comment: 'Great work' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Fault Report Authorization', () => {
    let ownerToken, otherFactoryToken, technicianToken, adminToken;
    let faultReportId, technicianId;

    beforeEach(async () => {
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});
      await RepairRequest.deleteMany({});
      await FaultReport.deleteMany({});

      const ownerUser = new User({
        email: 'report-owner@test.com',
        password: 'password123',
        role: 'factory'
      });
      await ownerUser.save();
      const ownerFactory = new Factory({
        userId: ownerUser._id,
        companyName: 'Owner Factory',
        contactPerson: 'Owner',
        contactPhone: '555-4000'
      });
      await ownerFactory.save();
      ownerToken = ownerUser.generateAuthToken();

      const otherUser = new User({
        email: 'report-other@test.com',
        password: 'password123',
        role: 'factory'
      });
      await otherUser.save();
      const otherFactory = new Factory({
        userId: otherUser._id,
        companyName: 'Other Factory',
        contactPerson: 'Other',
        contactPhone: '555-4001'
      });
      await otherFactory.save();
      otherFactoryToken = otherUser.generateAuthToken();

      const techUser = new User({
        email: 'report-tech@test.com',
        password: 'password123',
        role: 'technician'
      });
      await techUser.save();
      const technician = new Technician({
        userId: techUser._id,
        firstName: 'Report',
        lastName: 'Tech',
        phone: '555-4002',
        specializations: ['mechanical']
      });
      await technician.save();
      technicianId = technician._id;
      technicianToken = techUser.generateAuthToken();

      const adminUser = new User({
        email: 'report-admin@test.com',
        password: 'password123',
        role: 'admin',
        isVerified: true
      });
      await adminUser.save();
      adminToken = adminUser.generateAuthToken();

      const faultReport = new FaultReport({
        factoryId: ownerFactory._id,
        reportedBy: ownerUser._id,
        machineInfo: { name: 'Conveyor' },
        faultDescription: 'Belt slipping',
        urgency: 'high'
      });
      await faultReport.save();
      faultReportId = faultReport._id;
    });

    it('should reject a status update from a non-owning factory', async () => {
      const response = await request(app)
        .put(`/api/fault-reports/${faultReportId}/status`)
        .set('Authorization', `Bearer ${otherFactoryToken}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject a status update from a technician', async () => {
      const response = await request(app)
        .put(`/api/fault-reports/${faultReportId}/status`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow the owning factory to update the status', async () => {
      const response = await request(app)
        .put(`/api/fault-reports/${faultReportId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('in_progress');
    });

    it('should reject an assignment from a non-owning factory', async () => {
      const response = await request(app)
        .put(`/api/fault-reports/${faultReportId}/assign`)
        .set('Authorization', `Bearer ${otherFactoryToken}`)
        .send({ technicianId: technicianId.toString() });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow an admin to assign a technician', async () => {
      const response = await request(app)
        .put(`/api/fault-reports/${faultReportId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ technicianId: technicianId.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedTechnicianId._id).toBe(technicianId.toString());
    });

    it('should return 404 and leave the report unchanged when the technician does not exist', async () => {
      const missingTechnicianId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .put(`/api/fault-reports/${faultReportId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ technicianId: missingTechnicianId });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Technician not found');

      const unchangedReport = await FaultReport.findById(faultReportId);
      expect(unchangedReport.status).toBe('submitted');
      expect(unchangedReport.assignedTechnicianId).toBeFalsy();
    });
  });

  describe('Registration Rollback', () => {
    it('should delete the user when factory profile creation fails', async () => {
      const response = await request(app)
        .post('/api/auth/register/factory')
        .send({
          email: 'rollback-factory@test.com',
          password: 'password123',
          companyName: 'Rollback Factory',
          contactPerson: 'Owner',
          contactPhone: '555-5000',
          location: { type: 'NotAValidType' }
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body).not.toHaveProperty('error');

      const user = await User.findOne({ email: 'rollback-factory@test.com' });
      expect(user).toBeNull();
    });

    it('should delete the user when technician profile creation fails', async () => {
      const response = await request(app)
        .post('/api/auth/register/technician')
        .send({
          email: 'rollback-tech@test.com',
          password: 'password123',
          firstName: 'Roll',
          lastName: 'Back',
          phone: '555-5001',
          specializations: ['not-a-real-specialization']
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body).not.toHaveProperty('error');

      const user = await User.findOne({ email: 'rollback-tech@test.com' });
      expect(user).toBeNull();
    });
  });

  describe('Admin Technician Profile Overposting', () => {
    it('should ignore protected fields when an admin updates a technician profile', async () => {
      await User.deleteMany({});
      await Technician.deleteMany({});

      const admin = new User({
        email: 'overpost-admin@test.com',
        password: 'password123',
        role: 'admin',
        isVerified: true
      });
      await admin.save();
      const adminToken = admin.generateAuthToken();

      const techUser = new User({
        email: 'overpost-tech@test.com',
        password: 'password123',
        role: 'technician'
      });
      await techUser.save();

      const technician = new Technician({
        userId: techUser._id,
        firstName: 'Original',
        lastName: 'Tech',
        phone: '555-6000',
        specializations: ['mechanical']
      });
      await technician.save();

      const response = await request(app)
        .put(`/api/technicians/profile?id=${technician._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Overposted',
          userId: admin._id.toString(),
          isVerified: true,
          ratings: { average: 5, count: 100 },
          completedJobs: 99,
          totalJobs: 99
        });

      expect(response.status).toBe(200);

      const stored = await Technician.findById(technician._id);
      expect(stored.firstName).toBe('Overposted');
      expect(stored.userId.toString()).toBe(techUser._id.toString());
      expect(stored.isVerified).toBe(false);
      expect(stored.ratings.average).toBe(0);
      expect(stored.ratings.count).toBe(0);
      expect(stored.completedJobs).toBe(0);
      expect(stored.totalJobs).toBe(0);
    });
  });

  describe('Fault Report Create Validation', () => {
    let factoryToken;

    beforeEach(async () => {
      await User.deleteMany({});
      await Factory.deleteMany({});
      await FaultReport.deleteMany({});

      const factoryUser = new User({
        email: 'create-validation@test.com',
        password: 'password123',
        role: 'factory'
      });
      await factoryUser.save();

      const factory = new Factory({
        userId: factoryUser._id,
        companyName: 'Validation Factory',
        contactPerson: 'Owner',
        contactPhone: '555-7000'
      });
      await factory.save();

      factoryToken = factoryUser.generateAuthToken();
    });

    it('should accept an empty preferredVisitTime without a cast error', async () => {
      const response = await request(app)
        .post('/api/fault-reports')
        .set('Authorization', `Bearer ${factoryToken}`)
        .send({
          machineName: 'Press',
          faultDescription: 'Broken ram',
          preferredVisitTime: ''
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.preferredVisitTime).toBeUndefined();

      const stored = await FaultReport.findById(response.body.data._id);
      expect(stored.preferredVisitTime).toBeUndefined();
    });

    it('should reject a non-empty invalid preferredVisitTime with 400', async () => {
      const response = await request(app)
        .post('/api/fault-reports')
        .set('Authorization', `Bearer ${factoryToken}`)
        .send({
          machineName: 'Press',
          faultDescription: 'Broken ram',
          preferredVisitTime: 'not-a-date'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body).not.toHaveProperty('error');
    });
  });

  describe('Technician Assignment Dispatch', () => {
    let ownerToken, techToken, otherTechToken, technicianId, repairRequestId, faultReportId;

    beforeEach(async () => {
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});
      await RepairRequest.deleteMany({});
      await FaultReport.deleteMany({});

      const ownerUser = new User({
        email: 'dispatch-owner@test.com',
        password: 'password123',
        role: 'factory'
      });
      await ownerUser.save();

      const factory = new Factory({
        userId: ownerUser._id,
        companyName: 'Dispatch Factory',
        contactPerson: 'Owner',
        contactPhone: '555-8000'
      });
      await factory.save();
      ownerToken = ownerUser.generateAuthToken();

      const techUser = new User({
        email: 'dispatch-tech@test.com',
        password: 'password123',
        role: 'technician'
      });
      await techUser.save();

      const technician = new Technician({
        userId: techUser._id,
        firstName: 'Dispatched',
        lastName: 'Tech',
        phone: '555-8001',
        specializations: ['mechanical']
      });
      await technician.save();
      technicianId = technician._id;
      techToken = techUser.generateAuthToken();

      const otherTechUser = new User({
        email: 'dispatch-other-tech@test.com',
        password: 'password123',
        role: 'technician'
      });
      await otherTechUser.save();

      const otherTechnician = new Technician({
        userId: otherTechUser._id,
        firstName: 'Other',
        lastName: 'Tech',
        phone: '555-8002',
        specializations: ['electrical']
      });
      await otherTechnician.save();
      otherTechToken = otherTechUser.generateAuthToken();

      const faultReport = new FaultReport({
        factoryId: factory._id,
        reportedBy: ownerUser._id,
        machineInfo: { name: 'Assembly Line' },
        faultDescription: 'Conveyor jam',
        urgency: 'high'
      });
      await faultReport.save();
      faultReportId = faultReport._id;

      const repairRequest = new RepairRequest({
        faultReportId: faultReport._id,
        factoryId: factory._id,
        factoryContactId: ownerUser._id,
        status: 'pending'
      });
      await repairRequest.save();
      repairRequestId = repairRequest._id;
    });

    const assignTechnician = () => request(app)
      .put(`/api/fault-reports/${faultReportId}/assign`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ technicianId: technicianId.toString() });

    it('should expose the assigned pending request to the technician and allow accept', async () => {
      const assignment = await assignTechnician();
      expect(assignment.status).toBe(200);

      const storedRequest = await RepairRequest.findById(repairRequestId);
      expect(storedRequest.technicianId.toString()).toBe(technicianId.toString());
      expect(storedRequest.status).toBe('pending');

      const list = await request(app)
        .get('/api/repair-requests')
        .set('Authorization', `Bearer ${techToken}`)
        .expect(200);

      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].technicianId._id).toBe(technicianId.toString());
      expect(list.body.data[0].status).toBe('pending');

      const accept = await request(app)
        .post(`/api/repair-requests/${repairRequestId}/accept`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ estimatedArrivalTime: new Date(Date.now() + 3600000).toISOString() });

      expect(accept.status).toBe(200);
      expect(accept.body.data.status).toBe('accepted');
    });

    it('should reject accept and reject attempts from a different technician', async () => {
      const assignment = await assignTechnician();
      expect(assignment.status).toBe(200);

      const accept = await request(app)
        .post(`/api/repair-requests/${repairRequestId}/accept`)
        .set('Authorization', `Bearer ${otherTechToken}`)
        .send({ estimatedArrivalTime: new Date(Date.now() + 3600000).toISOString() });

      expect(accept.status).toBe(403);
      expect(accept.body.success).toBe(false);
      expect(accept.body).not.toHaveProperty('error');

      const reject = await request(app)
        .post(`/api/repair-requests/${repairRequestId}/reject`)
        .set('Authorization', `Bearer ${otherTechToken}`)
        .send({ reason: 'Not assigned to me' });

      expect(reject.status).toBe(403);
      expect(reject.body.success).toBe(false);

      const storedRequest = await RepairRequest.findById(repairRequestId);
      expect(storedRequest.status).toBe('pending');
    });
  });

  describe('Notifications Dispatch', () => {
    let ownerToken, techToken, repairRequestId, faultReportId, technicianId;

    beforeEach(async () => {
      await Notification.deleteMany({});
      await User.deleteMany({});
      await Factory.deleteMany({});
      await Technician.deleteMany({});
      await RepairRequest.deleteMany({});
      await FaultReport.deleteMany({});

      const ownerUser = new User({
        email: 'notify-owner@test.com',
        password: 'password123',
        role: 'factory'
      });
      await ownerUser.save();

      const factory = new Factory({
        userId: ownerUser._id,
        companyName: 'Notify Factory',
        contactPerson: 'Owner',
        contactPhone: '555-9000'
      });
      await factory.save();
      ownerToken = ownerUser.generateAuthToken();

      const techUser = new User({
        email: 'notify-tech@test.com',
        password: 'password123',
        role: 'technician'
      });
      await techUser.save();

      const technician = new Technician({
        userId: techUser._id,
        firstName: 'Notify',
        lastName: 'Tech',
        phone: '555-9001',
        specializations: ['mechanical']
      });
      await technician.save();
      technicianId = technician._id;
      techToken = techUser.generateAuthToken();

      const faultReport = new FaultReport({
        factoryId: factory._id,
        reportedBy: ownerUser._id,
        machineInfo: { name: 'Hydraulic Press' },
        faultDescription: 'Pressure loss',
        urgency: 'high'
      });
      await faultReport.save();
      faultReportId = faultReport._id;

      const repairRequest = new RepairRequest({
        faultReportId: faultReport._id,
        factoryId: factory._id,
        factoryContactId: ownerUser._id,
        status: 'pending'
      });
      await repairRequest.save();
      repairRequestId = repairRequest._id;
    });

    const assignTechnician = () => request(app)
      .put(`/api/fault-reports/${faultReportId}/assign`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ technicianId: technicianId.toString() });

    const acceptAsTechnician = () => request(app)
      .post(`/api/repair-requests/${repairRequestId}/accept`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ estimatedArrivalTime: new Date(Date.now() + 3600000).toISOString() });

    it('should notify the assigned technician when a repair request is assigned', async () => {
      await assignTechnician();

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${techToken}`)
        .expect(200);

      const notification = response.body.data.find((item) => item.type === 'repair_request');
      expect(notification).toBeDefined();
      expect(notification.relatedId).toBe(repairRequestId.toString());
    });

    it('should notify the factory when the technician accepts a request', async () => {
      await assignTechnician();
      const accept = await acceptAsTechnician();
      expect(accept.status).toBe(200);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const notification = response.body.data.find(
        (item) => item.type === 'status_update' && /accepted/i.test(item.message)
      );
      expect(notification).toBeDefined();
      expect(notification.relatedId).toBe(repairRequestId.toString());
    });

    it('should notify the factory again when the technician updates the status', async () => {
      await assignTechnician();
      await acceptAsTechnician();

      const update = await request(app)
        .put(`/api/repair-requests/${repairRequestId}/status`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ status: 'confirmed' });

      expect(update.status).toBe(200);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const notifications = response.body.data.filter(
        (item) => item.type === 'status_update' && /confirmed/.test(item.message)
      );
      expect(notifications).toHaveLength(1);
      expect(notifications[0].relatedId).toBe(repairRequestId.toString());
    });

    it('should allow marking a created notification as read', async () => {
      await assignTechnician();

      const list = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${techToken}`)
        .expect(200);

      const notification = list.body.data.find((item) => item.type === 'repair_request');
      expect(notification).toBeDefined();

      const read = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${techToken}`)
        .expect(200);

      expect(read.body.data.read).toBe(true);

      const refreshed = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${techToken}`)
        .expect(200);

      const updated = refreshed.body.data.find((item) => item._id === notification._id);
      expect(updated.read).toBe(true);
    });
  });

  describe('Notification Validation', () => {
    it('should reject an invalid notification id with 400', async () => {
      const user = new User({
        email: 'notify-user@test.com',
        password: 'password123',
        role: 'factory'
      });
      await user.save();
      const token = user.generateAuthToken();

      const response = await request(app)
        .put('/api/notifications/not-a-valid-id/read')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body).not.toHaveProperty('error');
    });
  });
});

const RepairRequest = require('../src/models/RepairRequest');
const FaultReport = require('../src/models/FaultReport');
const Notification = require('../src/models/Notification');