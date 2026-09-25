import { z } from 'zod';

export const createProductionBatchSchema = z.object({
  body: z.object({
    formulaId: z.string().length(24, 'formulaId must be a valid Mongo ObjectId'),
    quantityToProduce: z.number().int().positive(),
    note: z.string().max(500).optional(),
  }),
});

export const createSaleSchema = z.object({
  body: z
    .object({
      lines: z
        .array(
          z.object({
            finishedProductId: z.string().optional(),
            finishedProduct: z.string().optional(),
            rawMaterialId: z.string().optional(),
            rawMaterial: z.string().optional(),
            itemType: z.enum(['finishedProduct', 'rawMaterial']).optional(),
            quantity: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
            unit: z.string().optional(),
            unitPriceOverride: z.number().nonnegative().optional(),
          })
        )
        .min(1, 'يجب إضافة عنصر واحد على الأقل في السلة'),
      discount: z.number().nonnegative().optional(),
      customerName: z.string().max(200).optional(),
      customerPhone: z.string().max(50).optional(),
      note: z.string().max(500).optional(),
      paymentStatus: z.enum(['PAID', 'UNPAID', 'PARTIAL']).optional(),
      paidAmount: z.number().nonnegative().optional(),
    })
    .refine(
      (data) => {
        const name = (data.customerName || '').trim();
        const phone = (data.customerPhone || '').trim();
        if ((name && !phone) || (!name && phone)) {
          return false;
        }
        return true;
      },
      {
        message: 'عند إدخال اسم العميل يجب إدخال رقم الهاتف، والعكس صحيح (أو تركهما فارغين)',
      }
    ),
});

export const logPurchaseSchema = z.object({
  body: z.object({
    quantity: z.number().positive(),
    unit: z.enum(['ml', 'l', 'g', 'kg', 'pcs']),
    totalCost: z.number().nonnegative(),
    supplier: z.string().max(200).optional(),
    note: z.string().max(500).optional(),
  }),
});
