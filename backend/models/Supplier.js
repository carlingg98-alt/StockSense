const mongoose = require('mongoose');

// REQUIREMENT [Core Req 1 - Database and Data Modeling]: collection 2 of 5 (Supplier).
// Schema rules used: required, unique, match (regex for phone / email), min, max, default, Boolean.
const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Supplier name must be at least 2 characters'],
      maxlength: [80, 'Supplier name must be at most 80 characters'],
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true,
      maxlength: [80, 'Contact person must be at most 80 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9+\-() ]{7,20}$/, 'Enter a valid phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^$|^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    // REQUIREMENT [Data Processing and Business Logic]: lead time is an input of the reorder logic (services/forecastService.js) and of the PO expected date.
    // How many days the supplier takes to deliver. Used by the reorder logic.
    leadTimeDays: {
      type: Number,
      required: [true, 'Lead time is required'],
      min: [0, 'Lead time cannot be negative'],
      max: [90, 'Lead time cannot be more than 90 days'],
      default: 3,
    },
    isActive: { type: Boolean, default: true },
  },
  // REQUIREMENT [Core Req 1 - Database and Data Modeling]: timestamps.
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
