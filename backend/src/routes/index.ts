import { Router } from 'express';
import authRoutes from './auth.routes';
import productionBatchRoutes from './productionBatch.routes';
import saleRoutes from './sale.routes';
import rawMaterialRoutes from './rawMaterial.routes';
import packagingRoutes from './packaging.routes';
import formulaRoutes from './formula.routes';
import finishedProductRoutes from './finishedProduct.routes';
import settingRoutes from './setting.routes';
import userRoutes from './user.routes';
import reportRoutes from './report.routes';
import favoriteCustomerRoutes from './favoriteCustomer.routes';
import expenseRoutes from './expense.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/production-batches', productionBatchRoutes);
router.use('/sales', saleRoutes);
router.use('/raw-materials', rawMaterialRoutes);
router.use('/packaging', packagingRoutes);
router.use('/formulas', formulaRoutes);
router.use('/finished-products', finishedProductRoutes);
router.use('/settings', settingRoutes);
router.use('/users', userRoutes);
router.use('/reports', reportRoutes);
router.use('/favorite-customers', favoriteCustomerRoutes);
router.use('/expenses', expenseRoutes);

export default router;
