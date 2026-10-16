const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ owner: 1, email: 1 }, { unique: true });
customerSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);
