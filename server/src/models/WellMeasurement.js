import mongoose from 'mongoose';

const wellMeasurementSchema = new mongoose.Schema(
  {
    well: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Well',
      required: true
    },
    operator: {
      type: String,
      required: true,
      trim: true
    },
    depth: {
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

export default mongoose.model('WellMeasurement', wellMeasurementSchema);
