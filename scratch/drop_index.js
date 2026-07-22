const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dropStaleIndexes = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not defined in env.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");
    
    // Check indexes
    const indexes = await mongoose.connection.db.collection('users').indexes();
    console.log("Current indexes on users:", indexes);

    const hasUsernameIndex = indexes.some(idx => idx.name === 'username_1');
    if (hasUsernameIndex) {
      await mongoose.connection.db.collection('users').dropIndex('username_1');
      console.log("Successfully dropped stale unique index 'username_1'!");
    } else {
      console.log("Index 'username_1' does not exist in users collection.");
    }
  } catch (err) {
    console.error("Failed to drop index:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
};

dropStaleIndexes();
