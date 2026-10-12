// Entry point: load environment variables, connect to MongoDB, then start listening.
// REQUIREMENT [Core Req 2 - REST API]: environment variables (PORT, MONGO_URI) are read from the .env file.
// The .env file is ignored by Git (see .gitignore) and backend/.env.example is committed instead.
require('dotenv').config({ quiet: true });

const app = require('./app');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Category = require('./models/Category');
const seedDatabase = require('./seed/seedDatabase');

// REQUIREMENT [Core Req 2 - REST API]: PORT comes from the environment, with 5000 as a fallback.
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  // REQUIREMENT [Core Req 1 - Database and Data Modeling]: seeded sample data, so the app looks complete during the demonstration.
  // A brand-new database gets the sample store automatically, so the app never opens empty.
  const [products, categories] = await Promise.all([Product.countDocuments(), Category.countDocuments()]);
  if (products === 0 && categories === 0) {
    console.log('The database is empty. Loading the sample store...');
    console.log(await seedDatabase());
  }

  app.listen(PORT, () => {
    console.log(`StockSense API running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Could not start the API:', error.message);
  if (/ENOTFOUND|ECONNREFUSED|querySrv|whitelist|IP|authentication|bad auth/i.test(error.message)) {
    console.error('Check MONGO_URI in backend/.env: the username, the password, and that your IP is allowed in Atlas > Network Access.');
  }
  process.exit(1);
});
