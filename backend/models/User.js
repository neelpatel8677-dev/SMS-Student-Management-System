const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: ['student', 'faculty'], // Admin is handled via environment variables (ADMIN_EMAIL)
    default: 'student',
    lowercase: true, // ✅ Auto-converts 'Faculty' -> 'faculty' to prevent enum errors
    trim: true
  },
  
  // 🎓 Student Specific Fields (Safe conditional required execution)
  rollNo: {
    type: String,
    required: function() { 
      const currentRole = this.role || (this.getUpdate && this.getUpdate().$set && this.getUpdate().$set.role);
      return currentRole === 'student'; 
    },
    trim: true
  },
  course: {
    type: String,
    required: function() { 
      const currentRole = this.role || (this.getUpdate && this.getUpdate().$set && this.getUpdate().$set.role);
      return currentRole === 'student'; 
    },
    trim: true
  },
  branch: {
    type: String,
    required: function() { 
      const currentRole = this.role || (this.getUpdate && this.getUpdate().$set && this.getUpdate().$set.role);
      return currentRole === 'student'; 
    },
    trim: true
  },
  year: {
    type: Number,
    required: function() { 
      const currentRole = this.role || (this.getUpdate && this.getUpdate().$set && this.getUpdate().$set.role);
      return currentRole === 'student'; 
    }
  },
  
  // 👨‍🏫 Faculty Specific Fields
  department: {
    type: String,
    required: function() { 
      const currentRole = this.role || (this.getUpdate && this.getUpdate().$set && this.getUpdate().$set.role);
      return currentRole === 'faculty'; 
    },
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
/*const mongoose = require('mongoose');

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
*/
