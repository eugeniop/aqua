import { Router } from 'express';
import {
  recordTankLevel,
  recordFlowmeterReading,
  recordWellMeasurement
} from '../controllers/readingController.js';

const router = Router();

router.post('/tanks/:tankId/readings', recordTankLevel);
router.post('/flowmeters/:flowmeterId/readings', recordFlowmeterReading);
router.post('/wells/:wellId/measurements', recordWellMeasurement);

export default router;
