import webpush from 'web-push';
import RawMaterial from '../models/RawMaterial';
import Packaging from '../models/Packaging';
import FinishedProduct from '../models/FinishedProduct';
import User from '../models/User';

const vapidConfigured = Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
);

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
}

/**
 * Fire-and-forget: checks the given raw materials / packaging / finished
 * products against their configured thresholds and dispatches push alerts to active Super Admins.
 * Email sending has been restricted to explicit manual triggers only per user configuration.
 */
export async function queueLowStockCheck(args: {
  rawMaterialIds?: string[];
  packagingIds?: string[];
  finishedProductIds?: string[];
}) {
  setImmediate(async () => {
    try {
      const lowItems: { name: string; stock: number; unit: string; threshold: number }[] = [];

      if (args.rawMaterialIds?.length) {
        const materials = await RawMaterial.find({
          _id: { $in: args.rawMaterialIds },
          $expr: { $lte: ['$stockBase', '$lowStockThresholdBase'] },
        });
        materials.forEach((m) =>
          lowItems.push({ name: m.name, stock: m.stockBase, unit: m.baseUnit, threshold: m.lowStockThresholdBase })
        );
      }

      if (args.packagingIds?.length) {
        const pkgs = await Packaging.find({
          _id: { $in: args.packagingIds },
          $expr: { $lte: ['$stockPcs', '$lowStockThresholdPcs'] },
        });
        pkgs.forEach((p) =>
          lowItems.push({ name: p.name, stock: p.stockPcs, unit: 'pcs', threshold: p.lowStockThresholdPcs })
        );
      }

      if (args.finishedProductIds?.length) {
        const products = await FinishedProduct.find({
          _id: { $in: args.finishedProductIds },
          $expr: { $lte: ['$stockUnits', '$lowStockThresholdUnits'] },
        });
        products.forEach((p) =>
          lowItems.push({ name: p.name, stock: p.stockUnits, unit: 'pcs', threshold: p.lowStockThresholdUnits })
        );
      }

      if (lowItems.length === 0) return;

      const admins = await User.find({ isActive: true });
      await dispatchPush(
        admins,
        'Low stock alert',
        lowItems.map((i) => `${i.name}: ${i.stock}${i.unit} left`).join(', ')
      );
    } catch (err) {
      console.error('[alert.service] low-stock check failed:', err);
    }
  });
}

export async function queueSaleAlert(args: { total: number; currency: string; performedByName: string }) {
  setImmediate(async () => {
    try {
      const admins = await User.find({ isActive: true });
      const message = `${args.performedByName} recorded a sale of ${args.total} ${args.currency}`;
      await dispatchPush(admins, 'Sale completed', message);
    } catch (err) {
      console.error('[alert.service] sale alert failed:', err);
    }
  });
}

async function dispatchPush(
  admins: { pushSubscriptions: { endpoint: string; keys: { p256dh: string; auth: string } }[] }[],
  title: string,
  body: string
) {
  if (!vapidConfigured) return;
  const payload = JSON.stringify({ title, body });

  const sends = admins.flatMap((admin) =>
    admin.pushSubscriptions.map((sub) => webpush.sendNotification(sub, payload).catch(() => null))
  );
  await Promise.allSettled(sends);
}
