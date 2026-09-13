import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { listUsers, createUser, updateProfile, deleteUser } from '../controllers/user.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listUsers);
router.post('/', createUser);
router.put('/profile', updateProfile);
router.delete('/:id', deleteUser);

export default router;
