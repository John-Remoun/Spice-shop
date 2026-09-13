import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  listPackaging,
  getPackaging,
  createPackaging,
  updatePackaging,
  deletePackaging,
  purchasePackaging,
} from '../controllers/packaging.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listPackaging);
router.get('/:id', getPackaging);
router.post('/', createPackaging);
router.put('/:id', updatePackaging);
router.delete('/:id', deletePackaging);
router.post('/:id/purchase', purchasePackaging);

export default router;
