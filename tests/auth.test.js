const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Authentication', () => {
  it('should hash password before saving', async () => {
    const user = new User({
      email: 'test@example.com',
      password: 'password123',
      role: 'factory'
    });
    await user.save();
    
    const foundUser = await User.findOne({ email: 'test@example.com' });
    expect(foundUser.password).not.toBe('password123');
    
    const isMatch = await foundUser.comparePassword('password123');
    expect(isMatch).toBe(true);
    
    const isNoMatch = await foundUser.comparePassword('wrongpassword');
    expect(isNoMatch).toBe(false);
  });

  it('should generate JWT token with correct payload', async () => {
    const user = new User({
      email: 'jwt@example.com',
      password: 'password123',
      role: 'technician'
    });
    await user.save();
    
    const token = user.generateAuthToken();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    expect(decoded).toHaveProperty('userId', user._id.toString());
    expect(decoded).toHaveProperty('email', 'jwt@example.com');
    expect(decoded).toHaveProperty('role', 'technician');
  });
});
