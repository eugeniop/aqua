import mongoose from 'mongoose';

const tankLevelLogSchema = new mongoose.Schema(
  {
    tank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tank',
      required: true
    },
    operator: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: Number,
      required: true,
      min: 0
    },
    comment: {
      type: String,
      trim: true
    },
    recordedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('TankLevelLog', tankLevelLogSchema);
