import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // the business (Setting._id) this user belongs to; scopes all their data
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Setting', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // usernames stay globally unique so login needs no business selector
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin', 'manager'], required: true },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, 10);
};

userSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    username: this.username,
    role: this.role,
    active: this.active,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
