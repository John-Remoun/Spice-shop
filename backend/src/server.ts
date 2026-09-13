import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';
import { initCronJobs } from './services/cron.service';

const PORT = Number(process.env.PORT || 4000);

async function main() {
  await connectDB();
  initCronJobs();
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal startup error:', err);
  process.exit(1);
});
