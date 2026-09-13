import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  listFinishedProducts,
  getFinishedProduct,
  createFinishedProduct,
  updateFinishedProduct,
  deleteFinishedProduct,
} from '../controllers/finishedProduct.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listFinishedProducts);
router.get('/:id', getFinishedProduct);
router.post('/', createFinishedProduct);
router.put('/:id', updateFinishedProduct);
router.delete('/:id', deleteFinishedProduct);

export default router;
