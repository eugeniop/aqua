import mongoose from 'mongoose';

const flowmeterReadingSchema = new mongoose.Schema(
  {
    flowmeter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flowmeter',
      required: true
    },
    operator: {
      type: String,
      required: true,
      trim: true
    },
    instantaneousFlow: {
      type: Number,
      required: true,
      min: 0
    },
    totalizedVolume: {
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

export default mongoose.model('FlowmeterReading', flowmeterReadingSchema);
