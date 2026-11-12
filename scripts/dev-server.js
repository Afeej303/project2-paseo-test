const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../src/server');
const http = require('http');

async function start() {
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  
  // Re-connect mongoose with the new URI
  await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB Memory Server connected:', process.env.MONGODB_URI);

  const PORT = process.env.PORT || 3000;
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
