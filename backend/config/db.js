const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// True when .env has no real connection string yet (missing, or still the example text).
function hasNoRealUri(uri) {
  return !uri || uri.includes('<username>') || uri.includes('<password>');
}

// Fallback for development: start a MongoDB that lives inside this project (backend/.data).
// It lets the app run before MongoDB Atlas is set up. The first start downloads MongoDB once.
async function startLocalDatabase() {
  const { MongoMemoryServer } = require('mongodb-memory-server');

  const dbPath = path.join(__dirname, '..', '.data');
  fs.mkdirSync(dbPath, { recursive: true });

  console.log('No MONGO_URI found in .env, so a local development database is starting.');
  console.log('The first run downloads MongoDB (about 600 MB unpacked). This can take a few minutes...');

  const lockFile = path.join(dbPath, 'mongod.lock');

  try {
    const localServer = await MongoMemoryServer.create({
      instance: { dbName: 'stocksense', dbPath, storageEngine: 'wiredTiger' },
    });

    // Shut the local database down cleanly when the API stops (Ctrl + C)
    const stop = async () => {
      await mongoose.disconnect();
      await localServer.stop({ doCleanup: false }); // keep the files so data survives restarts
      process.exit(0);
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);

    return localServer.getUri('stocksense');
  } catch (error) {
    // REQUIREMENT [Project Stability]: when a previous MongoMemoryServer session crashes or is left running,
    // the stale lock file blocks a new start on Windows. Remove that stale lock and retry once.
    if (error && error.message && /DBPathInUse|lock file/i.test(error.message) && fs.existsSync(lockFile)) {
      console.warn('A stale MongoDB lock file was found. Removing it so the local test database can restart cleanly.');
      try {
        fs.unlinkSync(lockFile);
      } catch (cleanupError) {
        console.warn('Could not remove the stale lock file automatically:', cleanupError.message);
      }

      const localServer = await MongoMemoryServer.create({
        instance: { dbName: 'stocksense', dbPath, storageEngine: 'wiredTiger' },
      });

      const stop = async () => {
        await mongoose.disconnect();
        await localServer.stop({ doCleanup: false });
        process.exit(0);
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);

      return localServer.getUri('stocksense');
    }

    throw error;
  }
}

// REQUIREMENT [Core Req 1 - Database and Data Modeling] / Required Technologies: MongoDB Atlas + Mongoose.
// MONGO_URI from .env is the Atlas connection string. mongoose.connect() opens the connection.
async function connectDB() {
  let uri = process.env.MONGO_URI;
  let usingLocal = false;

  if (hasNoRealUri(uri)) {
    uri = await startLocalDatabase();
    usingLocal = true;
  }

  await mongoose.connect(uri);
  console.log(usingLocal ? 'Connected to the local development database (backend/.data)' : 'MongoDB connected');
  if (usingLocal) {
    console.log('For submission, put your MongoDB Atlas connection string in backend/.env as MONGO_URI.');
  }
}

module.exports = connectDB;
