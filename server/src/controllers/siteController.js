import Site from '../models/Site.js';
import Well from '../models/Well.js';
import Tank from '../models/Tank.js';
import Flowmeter from '../models/Flowmeter.js';
import TankLevelLog from '../models/TankLevelLog.js';
import FlowmeterReading from '../models/FlowmeterReading.js';
import WellMeasurement from '../models/WellMeasurement.js';

const formatDoc = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  location: doc.location ?? null,
  capacity: doc.capacity ?? null,
  site: doc.site ? doc.site.toString() : undefined
});

const formatReading = (doc) =>
  doc
    ? {
        id: doc._id.toString(),
        recordedAt: doc.recordedAt,
        operator: doc.operator,
        comment: doc.comment ?? '',
        level: doc.level ?? undefined,
        instantaneousFlow: doc.instantaneousFlow ?? undefined,
        totalizedVolume: doc.totalizedVolume ?? undefined,
        depth: doc.depth ?? undefined
      }
    : null;

const latestMapFor = async (Model, key, ids) => {
  if (!ids.length) {
    return new Map();
  }

  const pipeline = [
    { $match: { [key]: { $in: ids } } },
    { $sort: { recordedAt: -1 } },
    { $group: { _id: `$${key}`, doc: { $first: '$$ROOT' } } }
  ];

  const entries = await Model.aggregate(pipeline);
  const map = new Map();
  for (const entry of entries) {
    map.set(entry._id.toString(), entry.doc);
  }
  return map;
};

export const listSites = async (_req, res) => {
  try {
    const sites = await Site.find().sort({ name: 1 });
    res.json(
      sites.map((site) => ({
        id: site._id.toString(),
        name: site.name,
        location: site.location ?? null
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Unable to load sites', error: error.message });
  }
};

export const createSite = async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const site = await Site.create({ name, location });
    res.status(201).json({
      id: site._id.toString(),
      name: site.name,
      location: site.location ?? null
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create site', error: error.message });
  }
};

export const getSiteDetail = async (req, res) => {
  try {
    const { siteId } = req.params;
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    const [wells, tanks, flowmeters] = await Promise.all([
      Well.find({ site: siteId }).sort({ name: 1 }),
      Tank.find({ site: siteId }).sort({ name: 1 }),
      Flowmeter.find({ site: siteId }).sort({ name: 1 })
    ]);

    const [tankLatest, flowmeterLatest, wellLatest] = await Promise.all([
      latestMapFor(
        TankLevelLog,
        'tank',
        tanks.map((tank) => tank._id)
      ),
      latestMapFor(
        FlowmeterReading,
        'flowmeter',
        flowmeters.map((flowmeter) => flowmeter._id)
      ),
      latestMapFor(
        WellMeasurement,
        'well',
        wells.map((well) => well._id)
      )
    ]);

    res.json({
      id: site._id.toString(),
      name: site.name,
      location: site.location ?? null,
      wells: wells.map((well) => ({
        ...formatDoc(well),
        latestMeasurement: formatReading(wellLatest.get(well._id.toString()) ?? null)
      })),
      tanks: tanks.map((tank) => ({
        ...formatDoc(tank),
        latestReading: formatReading(tankLatest.get(tank._id.toString()) ?? null)
      })),
      flowmeters: flowmeters.map((flowmeter) => ({
        ...formatDoc(flowmeter),
        latestReading: formatReading(flowmeterLatest.get(flowmeter._id.toString()) ?? null)
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load site details', error: error.message });
  }
};

export const addWell = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { name, location } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const well = await Well.create({ site: siteId, name, location });
    res.status(201).json({ ...formatDoc(well) });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create well', error: error.message });
  }
};

export const addTank = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { name, capacity } = req.body;
    if (!name || capacity == null) {
      return res.status(400).json({ message: 'Name and capacity are required' });
    }

    const tank = await Tank.create({ site: siteId, name, capacity });
    res.status(201).json({ ...formatDoc(tank) });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create tank', error: error.message });
  }
};

export const addFlowmeter = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { name, location } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const flowmeter = await Flowmeter.create({ site: siteId, name, location });
    res.status(201).json({ ...formatDoc(flowmeter) });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create flowmeter', error: error.message });
  }
};
