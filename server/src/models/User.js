import mongoose from 'mongoose';

const VALID_ROLES = ['superadmin', 'admin', 'field-operator', 'analyst'];
const SUPPORTED_LANGUAGES = ['en', 'sw'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    preferredLanguage: {
      type: String,
      enum: SUPPORTED_LANGUAGES,
      default: 'en'
    },
    role: {
      type: String,
      enum: [...VALID_ROLES, ''],
      default: ''
    },
    enabled: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export { VALID_ROLES, SUPPORTED_LANGUAGES };

export default mongoose.model('User', userSchema);
