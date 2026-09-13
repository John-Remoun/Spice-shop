import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  getFavoriteCustomers,
  toggleFavoriteCustomer,
  removeFavoriteCustomer,
} from '../controllers/favoriteCustomer.controller';
import { UserRole } from '../types/enums';

const router = Router();

router.use(requireAuth, requireRole(UserRole.SUPER_ADMIN));

router.get('/', getFavoriteCustomers);
router.post('/toggle', toggleFavoriteCustomer);
router.delete('/:phone', removeFavoriteCustomer);

export default router;
