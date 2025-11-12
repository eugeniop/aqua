import { Router } from 'express';
import {
  recordTankLevel,
  recordFlowmeterReading,
  recordWellMeasurement,
  listTankReadings,
  listFlowmeterReadings,
  listWellMeasurements,
  deleteTankReading,
  deleteFlowmeterReading,
  deleteWellMeasurement
} from '../controllers/readingController.js';

const router = Router();

router.get('/tanks/:tankId/readings', listTankReadings);
router.post('/tanks/:tankId/readings', recordTankLevel);
router.delete('/tanks/:tankId/readings/:readingId', deleteTankReading);
router.get('/flowmeters/:flowmeterId/readings', listFlowmeterReadings);
router.post('/flowmeters/:flowmeterId/readings', recordFlowmeterReading);
router.delete('/flowmeters/:flowmeterId/readings/:readingId', deleteFlowmeterReading);
router.get('/wells/:wellId/measurements', listWellMeasurements);
router.post('/wells/:wellId/measurements', recordWellMeasurement);
router.delete('/wells/:wellId/measurements/:measurementId', deleteWellMeasurement);

export default router;
