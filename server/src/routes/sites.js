import { Router } from 'express';
import {
  listSites,
  createSite,
  getSiteDetail,
  addWell,
  addTank,
  addFlowmeter
} from '../controllers/siteController.js';

const router = Router();

router.get('/', listSites);
router.post('/', createSite);
router.get('/:siteId', getSiteDetail);
router.post('/:siteId/wells', addWell);
router.post('/:siteId/tanks', addTank);
router.post('/:siteId/flowmeters', addFlowmeter);

export default router;
