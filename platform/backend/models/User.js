const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'teacher', 'management'],
      message: 'Role must be student, teacher, or management'
    },
    default: 'student'
  },
  
  // Profile Details
  profileImage: { type: String, default: null },
  phone: { type: String },
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },

  // Student-specific fields
  studentInfo: {
    rollNumber: { type: String, sparse: true },
    registrationNumber: { type: String, sparse: true },
    class: { type: mongoose.Schema.Types.Mixed }, // Can be ObjectId or string (e.g., "10-A")
    section: { type: String, uppercase: true },
    admissionDate: Date,
    guardianName: String,
    guardianPhone: String,
    guardianEmail: String,
    faceEmbedding: { type: [Number], select: false },
    faceRegistered: { type: Boolean, default: false },
    faceRegistrationId: { type: String, default: null }
  },

  // Teacher-specific fields
  teacherInfo: {
    employeeId: { type: String, sparse: true },
    department: String,
    qualification: String,
    specialization: String,
    experience: Number,
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    assignedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    joiningDate: Date
  },

  // Management-specific fields
  managementInfo: {
    employeeId: String,
    designation: String,
    department: String,
    accessLevel: { type: String, enum: ['admin', 'principal', 'coordinator'], default: 'coordinator' }
  },

  // Account Status
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  lastLogin: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (only for fields without unique/sparse already defined)
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'studentInfo.class': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Alias for backward compatibility
userSchema.methods.matchPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
