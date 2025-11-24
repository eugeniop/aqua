import TankLevelLog from '../models/TankLevelLog.js';
import FlowmeterReading from '../models/FlowmeterReading.js';
import WellMeasurement from '../models/WellMeasurement.js';
import { isAdmin, isFieldOperator } from '../middleware/auth.js';

const sanitizeBody = ({ recordedAt, operator, comment }) => ({
  recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
  operator,
  comment
});

const canRecordEntries = (req) => isAdmin(req) || isFieldOperator(req);

const resolveOperatorName = (req, providedOperator) => {
  const provided = (providedOperator || '').trim();
  if (isAdmin(req)) {
    return provided || req.user?.name || '';
  }
  return req.user?.name || '';
};

const canDeleteEntry = (req, entryOperator) => {
  if (isAdmin(req)) {
    return true;
  }
  if (isFieldOperator(req)) {
    const currentOperator = req.user?.name || '';
    return currentOperator && entryOperator && entryOperator.trim() === currentOperator;
  }
  return false;
};

const parsePagination = (query) => {
  const pageValue = Number.parseInt(query.page, 10);
  const limitValue = Number.parseInt(query.limit, 10);

  const page = Number.isNaN(pageValue) || pageValue < 1 ? 1 : pageValue;
  const limitCandidate = Number.isNaN(limitValue) || limitValue < 1 ? 10 : limitValue;
  const limit = Math.min(limitCandidate, 500);

  return { page, limit };
};

const parseDateRange = (query) => {
  const parse = (value) => {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  return {
    from: parse(query.from),
    to: parse(query.to)
  };
};

const buildHistoryFilter = (baseFilter, query) => {
  const filter = { ...baseFilter };
  const operator = (query.operator || '').trim();
  if (operator) {
    filter.operator = operator;
  }
  const { from, to } = parseDateRange(query);
  if (from || to) {
    filter.recordedAt = {};
    if (from) {
      filter.recordedAt.$gte = from;
    }
    if (to) {
      filter.recordedAt.$lte = to;
    }
  }
  return filter;
};

const listOperatorsFor = async (Model, baseFilter) => {
  const operators = await Model.distinct('operator', baseFilter);
  return operators
    .map((name) => (name || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
};

const parseSortOrder = (query) => (query.order === 'asc' ? 1 : -1);

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

const buildHistoryResponse = (items, total, page, limit, operators = []) => ({
  items: items.map(formatHistoryEntry),
  total,
  page,
  limit,
  operators
});

export const recordTankLevel = async (req, res) => {
  try {
    if (!canRecordEntries(req)) {
      return res.status(403).json({ message: 'You are not authorised to record tank readings' });
    }

    const { tankId } = req.params;
    const { level, comment, recordedAt, operator: providedOperator } = req.body;
    const operator = resolveOperatorName(req, providedOperator);

    if (level == null) {
      return res.status(400).json({ message: 'Level is required' });
    }

    if (!operator) {
      return res.status(400).json({ message: 'Operator name is required' });
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
    if (!canRecordEntries(req)) {
      return res
        .status(403)
        .json({ message: 'You are not authorised to record flowmeter readings' });
    }

    const { flowmeterId } = req.params;
    const {
      instantaneousFlow,
      totalizedVolume,
      comment,
      recordedAt,
      operator: providedOperator
    } = req.body;
    const operator = resolveOperatorName(req, providedOperator);

    if (instantaneousFlow == null || totalizedVolume == null) {
      return res
        .status(400)
        .json({ message: 'Instantaneous flow and totalized volume are required' });
    }

    if (!operator) {
      return res.status(400).json({ message: 'Operator name is required' });
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
    if (!canRecordEntries(req)) {
      return res
        .status(403)
        .json({ message: 'You are not authorised to record well measurements' });
    }

    const { wellId } = req.params;
    const { depth, comment, recordedAt, operator: providedOperator } = req.body;
    const operator = resolveOperatorName(req, providedOperator);

    if (depth == null) {
      return res.status(400).json({ message: 'Depth is required' });
    }

    if (!operator) {
      return res.status(400).json({ message: 'Operator name is required' });
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
    const query = req.query ?? {};
    const { page, limit } = parsePagination(query);
    const skip = (page - 1) * limit;
    const sortOrder = parseSortOrder(query);
    const baseFilter = { tank: tankId };
    const filter = buildHistoryFilter(baseFilter, query);

    const [readings, total, operators] = await Promise.all([
      TankLevelLog.find(filter)
        .sort({ recordedAt: sortOrder })
        .skip(skip)
        .limit(limit),
      TankLevelLog.countDocuments(filter),
      listOperatorsFor(TankLevelLog, baseFilter)
    ]);

    res.json(buildHistoryResponse(readings, total, page, limit, operators));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load tank readings', error: error.message });
  }
};

export const listFlowmeterReadings = async (req, res) => {
  try {
    const { flowmeterId } = req.params;
    const query = req.query ?? {};
    const { page, limit } = parsePagination(query);
    const skip = (page - 1) * limit;
    const sortOrder = parseSortOrder(query);
    const baseFilter = { flowmeter: flowmeterId };
    const filter = buildHistoryFilter(baseFilter, query);

    const [readings, total, operators] = await Promise.all([
      FlowmeterReading.find(filter)
        .sort({ recordedAt: sortOrder })
        .skip(skip)
        .limit(limit),
      FlowmeterReading.countDocuments(filter),
      listOperatorsFor(FlowmeterReading, baseFilter)
    ]);

    res.json(buildHistoryResponse(readings, total, page, limit, operators));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load flowmeter readings', error: error.message });
  }
};

export const listWellMeasurements = async (req, res) => {
  try {
    const { wellId } = req.params;
    const query = req.query ?? {};
    const { page, limit } = parsePagination(query);
    const skip = (page - 1) * limit;
    const sortOrder = parseSortOrder(query);
    const baseFilter = { well: wellId };
    const filter = buildHistoryFilter(baseFilter, query);

    const [measurements, total, operators] = await Promise.all([
      WellMeasurement.find(filter)
        .sort({ recordedAt: sortOrder })
        .skip(skip)
        .limit(limit),
      WellMeasurement.countDocuments(filter),
      listOperatorsFor(WellMeasurement, baseFilter)
    ]);

    res.json(buildHistoryResponse(measurements, total, page, limit, operators));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load well measurements', error: error.message });
  }
};

export const deleteTankReading = async (req, res) => {
  try {
    const { tankId, readingId } = req.params;
    const reading = await TankLevelLog.findOne({ _id: readingId, tank: tankId });
    if (!reading) {
      return res.status(404).json({ message: 'Tank reading not found' });
    }
    if (!canDeleteEntry(req, reading.operator)) {
      return res.status(403).json({ message: 'You are not authorised to delete this reading' });
    }
    await reading.deleteOne();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete tank reading', error: error.message });
  }
};

export const deleteFlowmeterReading = async (req, res) => {
  try {
    const { flowmeterId, readingId } = req.params;
    const reading = await FlowmeterReading.findOne({
      _id: readingId,
      flowmeter: flowmeterId
    });
    if (!reading) {
      return res.status(404).json({ message: 'Flowmeter reading not found' });
    }
    if (!canDeleteEntry(req, reading.operator)) {
      return res.status(403).json({ message: 'You are not authorised to delete this reading' });
    }
    await reading.deleteOne();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete flowmeter reading', error: error.message });
  }
};

export const deleteWellMeasurement = async (req, res) => {
  try {
    const { wellId, measurementId } = req.params;
    const measurement = await WellMeasurement.findOne({ _id: measurementId, well: wellId });
    if (!measurement) {
      return res.status(404).json({ message: 'Well measurement not found' });
    }
    if (!canDeleteEntry(req, measurement.operator)) {
      return res
        .status(403)
        .json({ message: 'You are not authorised to delete this measurement' });
    }
    await measurement.deleteOne();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete well measurement', error: error.message });
  }
};
