import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  listRawMaterials,
  getRawMaterial,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  purchaseRawMaterial,
} from '../controllers/rawMaterial.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listRawMaterials);
router.get('/:id', getRawMaterial);
router.post('/', createRawMaterial);
router.put('/:id', updateRawMaterial);
router.delete('/:id', deleteRawMaterial);
router.post('/:id/purchase', purchaseRawMaterial);

export default router;
