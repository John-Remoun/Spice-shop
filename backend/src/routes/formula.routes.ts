import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  listFormulas,
  getFormula,
  getFormulaCost,
  createFormula,
  updateFormula,
  deleteFormula,
} from '../controllers/formula.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listFormulas);
router.get('/:id', getFormula);
router.get('/:id/cost', getFormulaCost);
router.post('/', createFormula);
router.put('/:id', updateFormula);
router.delete('/:id', deleteFormula);

export default router;
