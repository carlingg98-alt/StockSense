// REQUIREMENT [Core Req 1 - Database and Data Modeling]: seeded sample data. Run with `npm run seed`.
// Command-line seeding: npm run seed   (this DELETES existing data first)
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const seedDatabase = require('./seedDatabase');

connectDB()
  .then(() => seedDatabase())
  .then((summary) => {
    console.log(summary);
    return mongoose.disconnect();
  })
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Seeding failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
