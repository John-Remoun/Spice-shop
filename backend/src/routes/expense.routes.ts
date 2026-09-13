import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  addExpense,
  getExpensesByMonth,
  deleteExpense,
} from '../controllers/expense.controller';

const router = Router();

router.use(requireAuth);

router.post('/', addExpense);
router.get('/', getExpensesByMonth);
router.delete('/:id', deleteExpense);

export default router;
