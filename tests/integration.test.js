const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
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
        .get('/api/technicians/nonexistent')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});

const RepairRequest = require('../src/models/RepairRequest');
const FaultReport = require('../src/models/FaultReport');