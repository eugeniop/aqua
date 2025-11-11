import { Router } from 'express';
import {
  recordTankLevel,
  recordFlowmeterReading,
  recordWellMeasurement,
  listTankReadings,
  listFlowmeterReadings,
  listWellMeasurements
} from '../controllers/readingController.js';

const router = Router();

router.get('/tanks/:tankId/readings', listTankReadings);
router.post('/tanks/:tankId/readings', recordTankLevel);
router.get('/flowmeters/:flowmeterId/readings', listFlowmeterReadings);
router.post('/flowmeters/:flowmeterId/readings', recordFlowmeterReading);
router.get('/wells/:wellId/measurements', listWellMeasurements);
router.post('/wells/:wellId/measurements', recordWellMeasurement);

export default router;
