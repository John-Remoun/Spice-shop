import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createProductionBatchSchema } from '../validators/production.validators';
import { createProductionBatch, listProductionBatches } from '../controllers/productionBatch.controller';
import { UserRole } from '../types/enums';

const router = Router();

router.use(requireAuth, requireRole(UserRole.SUPER_ADMIN));

router.get('/', listProductionBatches);
router.post('/', validate(createProductionBatchSchema), createProductionBatch);

export default router;
