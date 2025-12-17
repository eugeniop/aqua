import mongoose from 'mongoose';

const VALID_ROLES = ['superadmin', 'admin', 'field-operator', 'analyst'];
const SUPPORTED_LANGUAGES = ['en', 'sw'];
const DEFAULT_TIME_ZONE = 'Africa/Dar_es_Salaam';

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
    preferredTimeZone: {
      type: String,
      trim: true,
      default: DEFAULT_TIME_ZONE
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

export { DEFAULT_TIME_ZONE, VALID_ROLES, SUPPORTED_LANGUAGES };

export default mongoose.model('User', userSchema);
