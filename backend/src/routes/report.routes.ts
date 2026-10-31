import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  triggerDailyReport,
  triggerMonthlyReport,
  getMonthlyReportPreview,
  getCalendarSnapshots,
  getDailySnapshotByDate,
  clearMonthRecords,
} from '../controllers/report.controller';

const router = Router();

router.use(requireAuth);

router.post('/send-daily-report', triggerDailyReport);
router.post('/send-monthly-report', triggerMonthlyReport);
router.get('/monthly-report-preview', getMonthlyReportPreview);
router.get('/calendar-snapshots', getCalendarSnapshots);
router.get('/daily-snapshot/:date', getDailySnapshotByDate);
router.delete('/clear-month-records', clearMonthRecords);

export default router;
