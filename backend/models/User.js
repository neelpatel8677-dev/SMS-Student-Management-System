const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'faculty'], // Removed 'admin' from the database roles
    default: 'student'
  },
  // Student Specific Fields
  rollNo: {
    type: String,
    required: function() { return this.role === 'student'; },
    trim: true
  },
  course: {
    type: String,
    required: function() { return this.role === 'student'; },
    trim: true
  },
  branch: {
    type: String,
    required: function() { return this.role === 'student'; },
    trim: true
  },
  year: {
    type: Number,
    required: function() { return this.role === 'student'; }
  },
  // Faculty Specific Fields
  department: {
    type: String,
    required: function() { return this.role === 'faculty'; },
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
