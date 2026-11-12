const mongoose = require('mongoose');
console.log('Mongoose version:', mongoose.version);
try {
  // Try to connect to a dummy URI
  await mongoose.connect('mongodb://localhost:27017/test');
  console.log('Connection attempt succeeded');
} catch (e) {
  console.log('Connection attempt failed as expected');
}
