import TankLevelLog from '../models/TankLevelLog.js';
import FlowmeterReading from '../models/FlowmeterReading.js';
import WellMeasurement from '../models/WellMeasurement.js';

const sanitizeBody = ({ recordedAt, operator, comment }) => ({
  recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
  operator,
  comment
});

export const recordTankLevel = async (req, res) => {
  try {
    const { tankId } = req.params;
    const { level, operator, comment, recordedAt } = req.body;
    if (level == null || !operator) {
      return res.status(400).json({ message: 'Level and operator are required' });
    }

    const payload = { ...sanitizeBody({ recordedAt, operator, comment }), tank: tankId, level };
    const reading = await TankLevelLog.create(payload);
    res.status(201).json({
      id: reading._id.toString(),
      tank: tankId,
      level: reading.level,
      operator: reading.operator,
      comment: reading.comment ?? '',
      recordedAt: reading.recordedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to record tank level', error: error.message });
  }
};

export const recordFlowmeterReading = async (req, res) => {
  try {
    const { flowmeterId } = req.params;
    const { instantaneousFlow, totalizedVolume, operator, comment, recordedAt } = req.body;
    if (instantaneousFlow == null || totalizedVolume == null || !operator) {
      return res
        .status(400)
        .json({ message: 'Instantaneous flow, totalized volume and operator are required' });
    }

    const payload = {
      ...sanitizeBody({ recordedAt, operator, comment }),
      flowmeter: flowmeterId,
      instantaneousFlow,
      totalizedVolume
    };
    const reading = await FlowmeterReading.create(payload);
    res.status(201).json({
      id: reading._id.toString(),
      flowmeter: flowmeterId,
      instantaneousFlow: reading.instantaneousFlow,
      totalizedVolume: reading.totalizedVolume,
      operator: reading.operator,
      comment: reading.comment ?? '',
      recordedAt: reading.recordedAt
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Unable to record flowmeter reading', error: error.message });
  }
};

export const recordWellMeasurement = async (req, res) => {
  try {
    const { wellId } = req.params;
    const { depth, operator, comment, recordedAt } = req.body;
    if (depth == null || !operator) {
      return res.status(400).json({ message: 'Depth and operator are required' });
    }

    const payload = { ...sanitizeBody({ recordedAt, operator, comment }), well: wellId, depth };
    const measurement = await WellMeasurement.create(payload);
    res.status(201).json({
      id: measurement._id.toString(),
      well: wellId,
      depth: measurement.depth,
      operator: measurement.operator,
      comment: measurement.comment ?? '',
      recordedAt: measurement.recordedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to record well measurement', error: error.message });
  }
};
