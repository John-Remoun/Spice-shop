import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createSaleSchema } from '../validators/production.validators';
import { createSale, listSales, addSalePayment, getCustomerLedger, deleteSale, bulkPayCustomer } from '../controllers/sale.controller';
import { UserRole } from '../types/enums';

const router = Router();

router.use(requireAuth, requireRole(UserRole.SUPER_ADMIN));

router.get('/', listSales);
router.get('/customer-ledger/:phone', getCustomerLedger);
router.post('/', validate(createSaleSchema), createSale);
router.post('/bulk-pay', bulkPayCustomer);
router.patch('/:id/pay', addSalePayment);
router.delete('/:id', deleteSale);

export default router;
