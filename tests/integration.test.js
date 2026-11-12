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
    it('should allow creating first admin when no admin exists', async () => {
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
  });
});

const RepairRequest = require('../src/models/RepairRequest');
const FaultReport = require('../src/models/FaultReport');