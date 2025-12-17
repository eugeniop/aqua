import mongoose from 'mongoose';

const operatorSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    selectedSite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('OperatorSession', operatorSessionSchema);
