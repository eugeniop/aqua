import TankLevelLog from '../models/TankLevelLog.js';
import FlowmeterReading from '../models/FlowmeterReading.js';
import WellMeasurement from '../models/WellMeasurement.js';

const sanitizeBody = ({ recordedAt, operator, comment }) => ({
  recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
  operator,
  comment
});

const parsePagination = (query) => {
  const pageValue = Number.parseInt(query.page, 10);
  const limitValue = Number.parseInt(query.limit, 10);

  const page = Number.isNaN(pageValue) || pageValue < 1 ? 1 : pageValue;
  const limitCandidate = Number.isNaN(limitValue) || limitValue < 1 ? 10 : limitValue;
  const limit = Math.min(limitCandidate, 50);

  return { page, limit };
};

const formatHistoryEntry = (doc) => ({
  id: doc._id.toString(),
  recordedAt: doc.recordedAt,
  operator: doc.operator,
  comment: doc.comment ?? '',
  level: doc.level ?? undefined,
  instantaneousFlow: doc.instantaneousFlow ?? undefined,
  totalizedVolume: doc.totalizedVolume ?? undefined,
  depth: doc.depth ?? undefined
});

const buildHistoryResponse = (items, total, page, limit) => ({
  items: items.map(formatHistoryEntry),
  total,
  page,
  limit
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

export const listTankReadings = async (req, res) => {
  try {
    const { tankId } = req.params;
    const { page, limit } = parsePagination(req.query ?? {});
    const skip = (page - 1) * limit;

    const [readings, total] = await Promise.all([
      TankLevelLog.find({ tank: tankId })
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(limit),
      TankLevelLog.countDocuments({ tank: tankId })
    ]);

    res.json(buildHistoryResponse(readings, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load tank readings', error: error.message });
  }
};

export const listFlowmeterReadings = async (req, res) => {
  try {
    const { flowmeterId } = req.params;
    const { page, limit } = parsePagination(req.query ?? {});
    const skip = (page - 1) * limit;

    const [readings, total] = await Promise.all([
      FlowmeterReading.find({ flowmeter: flowmeterId })
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(limit),
      FlowmeterReading.countDocuments({ flowmeter: flowmeterId })
    ]);

    res.json(buildHistoryResponse(readings, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load flowmeter readings', error: error.message });
  }
};

export const listWellMeasurements = async (req, res) => {
  try {
    const { wellId } = req.params;
    const { page, limit } = parsePagination(req.query ?? {});
    const skip = (page - 1) * limit;

    const [measurements, total] = await Promise.all([
      WellMeasurement.find({ well: wellId })
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(limit),
      WellMeasurement.countDocuments({ well: wellId })
    ]);

    res.json(buildHistoryResponse(measurements, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load well measurements', error: error.message });
  }
};
