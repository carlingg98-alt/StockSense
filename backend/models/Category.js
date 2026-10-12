const mongoose = require('mongoose');

// REQUIREMENT [Core Req 1 - Database and Data Modeling]: collection 1 of 5 (Category).
// Schema rules used: required, unique, trim, minlength, maxlength, default. Custom messages become the 400 error text.
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [40, 'Category name must be at most 40 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description must be at most 200 characters'],
      default: '',
    },
  },
  // REQUIREMENT [Core Req 1 - Database and Data Modeling]: timestamps (createdAt, updatedAt).
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
