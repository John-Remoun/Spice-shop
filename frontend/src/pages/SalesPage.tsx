import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Trash2,
  ShoppingCart,
  User,
  Printer,
  X,
  Leaf,
  Package,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  CreditCard,
  Check,
  Phone,
  Send,
  Search,
  FileText,
  BookOpen,
  Star,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { Pagination } from '@/components/Pagination';
import { usePagination } from '@/hooks/usePagination';

interface FavoriteCustomerRecord {
  _id: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
}

interface FinishedProduct {
  _id: string;
  name: string;
  sellingPrice: number;
  sellingPrice1?: number;
  sellingPrice2?: number;
  sellingPrice3?: number;
  stockUnits: number;
}

interface RawMaterial {
  _id: string;
  name: string;
  form: 'liquid' | 'solid';
  baseUnit: 'ml' | 'g';
  stockBase: number;
  weightedAverageCost: number;
  sellingPrice1?: number;
  sellingPrice2?: number;
  sellingPrice3?: number;
}

interface CartItem {
  id: string;
  type: 'finishedProduct' | 'rawMaterial';
  name: string;
  finishedProduct?: FinishedProduct;
  rawMaterial?: RawMaterial;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface SaleRecordLine {
  finishedProduct?: { name: string };
  rawMaterial?: { name: string; baseUnit: string };
  quantity: number;
  unit?: string;
  unitPriceAtSale: number;
}

interface SaleRecord {
  _id: string;
  receiptNumber: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  total?: number;
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  paidAmount?: number;
  remainingAmount?: number;
  customerName?: string;
  customerPhone?: string;
  performedBy?: { fullName: string } | string;
  lines: SaleRecordLine[];
  createdAt: string;
}

export default function SalesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const queryClient = useQueryClient();

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [itemType, setItemType] = useState<'finishedProduct' | 'rawMaterial'>('finishedProduct');
  const [selectedFinishedProductId, setSelectedFinishedProductId] = useState('');
  const [selectedFinishedProductPrice, setSelectedFinishedProductPrice] = useState<number | ''>('');
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState('');
  const [selectedRawMaterialPriceTier, setSelectedRawMaterialPriceTier] = useState<'tier1' | 'tier2' | 'tier3' | 'custom'>('tier1');
  const [selectedRawMaterialMajorPrice, setSelectedRawMaterialMajorPrice] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<string>('l');
  
  // Dynamic Pricing States
  const [customPrice, setCustomPrice] = useState<number | ''>(''); // Unit price
  const [customTotalPrice, setCustomTotalPrice] = useState<number | ''>(''); // Total price for the quantity
  const [lastEditedPriceField, setLastEditedPriceField] = useState<'unit' | 'total'>('unit');

  // Payment & Customer States
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID' | 'PARTIAL'>('PAID');
  const [paidAmountInput, setPaidAmountInput] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedFavoriteId, setSelectedFavoriteId] = useState('');
  const [note, setNote] = useState('');

  // Modals & UI States
  const [printSale, setPrintSale] = useState<SaleRecord | null>(null);
  const [saleErrorMsg, setSaleErrorMsg] = useState<string | null>(null);
  const [settleSaleTarget, setSettleSaleTarget] = useState<SaleRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNote, setSettleNote] = useState('');
  const [historyTab, setHistoryTab] = useState<'all' | 'unpaid' | 'paid' | 'favorites'>('all');
  const [deleteTargetSale, setDeleteTargetSale] = useState<SaleRecord | null>(null);
  const [statementModalTab, setStatementModalTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [historyDisplayLimit, setHistoryDisplayLimit] = useState(5);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [activeCustomerPhone, setActiveCustomerPhone] = useState<string | null>(null);

  // Queries
  const { data: products = [] } = useQuery<FinishedProduct[]>({
    queryKey: ['finished-products'],
    queryFn: async () => (await apiClient.get<FinishedProduct[]>('/finished-products')).data,
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: async () => (await apiClient.get<RawMaterial[]>('/raw-materials')).data,
  });

  const { data: salesHistory = [], isLoading: loadingHistory } = useQuery<SaleRecord[]>({
    queryKey: ['sales'],
    queryFn: async () => (await apiClient.get<SaleRecord[]>('/sales')).data,
  });

  const { data: favoriteCustomers = [] } = useQuery<FavoriteCustomerRecord[]>({
    queryKey: ['favorite-customers'],
    queryFn: async () => (await apiClient.get<FavoriteCustomerRecord[]>('/favorite-customers')).data,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      return (await apiClient.post('/favorite-customers/toggle', { customerName: name, customerPhone: phone })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-customers'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'فشل تغيير حالة المفضلة');
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await apiClient.delete(`/sales/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setDeleteTargetSale(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'فشل حذف الفاتورة');
    },
  });

  // Group all invoices by Customer Phone Number
  const customerGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        phone: string;
        name: string;
        sales: SaleRecord[];
        totalAmount: number;
        totalPaid: number;
        totalRemaining: number;
      }
    > = {};

    salesHistory.forEach((s) => {
      const rawPhone = (s.customerPhone || '').trim();
      if (!rawPhone) return;
      const cleanPhone = rawPhone.replace(/\D/g, '');
      if (!cleanPhone) return;

      if (!groups[cleanPhone]) {
        groups[cleanPhone] = {
          phone: rawPhone,
          name: s.customerName || 'عميل',
          sales: [],
          totalAmount: 0,
          totalPaid: 0,
          totalRemaining: 0,
        };
      }
      groups[cleanPhone].sales.push(s);

      const tot = s.totalAmount ?? s.total ?? 0;
      const paid = s.paidAmount ?? 0;
      const rem = s.remainingAmount ?? Math.max(0, tot - paid);

      groups[cleanPhone].totalAmount += tot;
      groups[cleanPhone].totalPaid += paid;
      groups[cleanPhone].totalRemaining += rem;

      if (s.customerName && s.customerName !== 'عميل نقدي' && s.customerName !== 'عميل آجل') {
        groups[cleanPhone].name = s.customerName;
      }
    });

    return groups;
  }, [salesHistory]);

  const activeCustomerGroup = useMemo(() => {
    if (!activeCustomerPhone) return null;
    const cleanKey = activeCustomerPhone.replace(/\D/g, '');
    if (customerGroups[cleanKey]) return customerGroups[cleanKey];

    const found = Object.values(customerGroups).find(
      (g) => g.phone === activeCustomerPhone || g.name === activeCustomerPhone
    );
    return found || null;
  }, [activeCustomerPhone, customerGroups]);

  const searchMatchedCustomerGroup = useMemo(() => {
    if (!invoiceSearchQuery.trim()) return null;
    const q = invoiceSearchQuery.trim().replace(/\D/g, '');
    if (!q || q.length < 3) return null;
    const key = Object.keys(customerGroups).find((k) => k.includes(q));
    return key ? customerGroups[key] : null;
  }, [invoiceSearchQuery, customerGroups]);

  // Clean Text Markers (100% immune to Windows/WhatsApp URL encoding corruption)
  const MARKER = {
    user: '[العميل]',
    phone: '[الهاتف]',
    chart: '[الفواتير]',
    page: '[فاتورة]',
    money: '[المشتريات]',
    check: '[مدفوع]',
    pin: '[المتبقي]',
    bullet: '-',
    calendar: '[التاريخ]',
    cashier: '[الكاشير]',
  };

  // WhatsApp Customer Ledger Reminder Helper (Summary per invoice without item list)
  const sendWhatsAppLedgerReminder = (group: {
    phone: string;
    name: string;
    sales: SaleRecord[];
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  }) => {
    const store = settings?.storeName || 'Spice shop';
    const customer = group.name || 'عميلنا العزيز';
    const phone = group.phone || '';

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone ? (cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone) : '';

    let invoicesList = '';
    group.sales.forEach((s, idx) => {
      const dateStr = new Date(s.createdAt).toLocaleDateString('ar-EG');
      const sTot = (s.totalAmount ?? s.total ?? 0).toFixed(2);

      invoicesList += `${idx + 1}. *فاتورة #${s.receiptNumber || s._id}*\n` +
        `   • التاريخ: ${dateStr}\n` +
        `   • إجمالي الفاتورة: ${sTot} ج.م\n\n`;
    });

    const messageText = `*كشف حساب ومشتريات من: ${store}*\n` +
      `----------------------------------------\n` +
      `👤 العميل: ${customer}\n` +
      `📞 الهاتف: ${phone}\n` +
      `📄 عدد الفواتير: ${group.sales.length} فاتورة مترابطة\n` +
      `----------------------------------------\n` +
      `*قائمة الفواتير:*\n` +
      `${invoicesList}` +
      `----------------------------------------\n` +
      `💰 إجمالي المشتريات الكلي: *${group.totalAmount.toFixed(2)} ج.م*\n` +
      `✅ إجمالي المدفوع: ${group.totalPaid.toFixed(2)} ج.م\n` +
      `📌 إجمالي المتبقي المستحق / الديون: *${group.totalRemaining.toFixed(2)} ج.م*\n\n` +
      `شكراً لتعاملكم مع ${store}! ❤️`;

    const encodedText = encodeURIComponent(messageText);

    if (formattedPhone) {
      window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    }
  };

  // WhatsApp Send Helper for Single Invoice
  const sendWhatsAppInvoice = (sale: SaleRecord) => {
    const store = settings?.storeName || 'Spice shop';
    const customer = sale.customerName || 'عميل محترم';
    const phone = sale.customerPhone || customerPhone || '';

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone ? (cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone) : '';

    const total = (sale.totalAmount ?? sale.total ?? 0).toFixed(2);
    const paid = (sale.paidAmount ?? (sale.totalAmount ?? sale.total ?? 0)).toFixed(2);
    const remaining = (sale.remainingAmount ?? 0).toFixed(2);
    const statusStr = sale.paymentStatus === 'PAID' || Number(remaining) <= 0 ? 'مدفوع بالكامل' : sale.paymentStatus === 'PARTIAL' ? 'دفع جزئي' : 'آجل / غير مدفوع';

    // Detailed Item Breakdown: Item Name, Unit Price, Quantity, Line Total
    let itemsList = '';
    sale.lines?.forEach((line, idx) => {
      const itemName = line.finishedProduct?.name || line.rawMaterial?.name || (line as any).name || 'صنف';
      const unitLabel = line.unit ? ` ${line.unit}` : ' قطعة';
      const priceStr = line.unitPriceAtSale.toFixed(2);
      const lineTotalStr = (line.quantity * line.unitPriceAtSale).toFixed(2);

      itemsList += `${idx + 1}. *${itemName}*\n` +
        `   • سعر القطعة: ${priceStr} ج.م | عدد القطع: ${line.quantity}${unitLabel} | الإجمالي: *${lineTotalStr} ج.م*\n`;
    });

    const cashierName = typeof sale.performedBy === 'object' && sale.performedBy?.fullName
      ? sale.performedBy.fullName
      : (typeof sale.performedBy === 'string' && sale.performedBy ? sale.performedBy : user?.fullName || 'admin');

    const dateStr = new Date(sale.createdAt).toLocaleDateString('ar-EG');

    // Calculate Previous Unpaid Debt from other invoices for this customer
    let previousDebt = 0;
    const currentCleanPhone = phone.replace(/\D/g, '');
    const currentCustomerName = (sale.customerName || '').trim();

    if (salesHistory && salesHistory.length > 0) {
      salesHistory.forEach((s) => {
        if (s._id === sale._id) return;

        const sPhone = (s.customerPhone || '').replace(/\D/g, '');
        const sName = (s.customerName || '').trim();

        const matchByPhone = Boolean(currentCleanPhone && sPhone && currentCleanPhone === sPhone);
        const matchByName = Boolean(
          currentCustomerName &&
          currentCustomerName !== 'عميل نقدي' &&
          currentCustomerName !== 'عميل آجل' &&
          sName === currentCustomerName
        );

        if (matchByPhone || matchByName) {
          const sTot = s.totalAmount ?? s.total ?? 0;
          const sPaid = s.paidAmount ?? 0;
          const sRem = s.remainingAmount ?? Math.max(0, sTot - sPaid);
          if (sRem > 0) {
            previousDebt += sRem;
          }
        }
      });
    }

    let previousDebtSection = '';
    if (previousDebt > 0) {
      const totalCombinedDebt = Number(remaining) + previousDebt;
      previousDebtSection =
        `----------------------------------------\n` +
        `📋 رصيد ديون متبقي من فواتير سابقة: *${previousDebt.toFixed(2)} ج.م*\n` +
        `💰 إجمالي الحساب المطلق (الفاتورة الحالية + السابقة): *${totalCombinedDebt.toFixed(2)} ج.م*\n`;
    }

    const msg = `*فاتورة بيع من: ${store}*\n` +
      `----------------------------------------\n` +
      `📄 رقم الفاتورة: #${sale.receiptNumber}\n` +
      `📅 التاريخ: ${dateStr}\n` +
      `👤 العميل: ${customer}\n` +
      `📞 رقم التليفون: ${phone}\n` +
      `👨💼 الكاشير/البائع: ${cashierName}\n\n` +
      `*تفاصيل المشتريات:*\n` +
      `${itemsList}\n` +
      `----------------------------------------\n` +
      `💰 إجمالي الفاتورة الحالية: *${total} ج.م*\n` +
      `✅ المبلغ المدفوع: ${paid} ج.م\n` +
      `📌 المتبقي من الفاتورة: *${remaining} ج.م*\n` +
      `حالة الدفع: ${statusStr}\n` +
      `${previousDebtSection}\n` +
      `شكراً لزيارتكم ${store}! ❤️`;

    const waUrl = formattedPhone
      ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
  };

  // Calculate Subtotal & Total
  const subtotal = cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);

  // Auto calculate paid amount and remaining balance for POS checkout
  let actualPaidAmount = total;
  let actualRemainingAmount = 0;

  if (paymentStatus === 'UNPAID') {
    actualPaidAmount = 0;
    actualRemainingAmount = total;
  } else if (paymentStatus === 'PARTIAL') {
    const numericInput = typeof paidAmountInput === 'number' ? paidAmountInput : 0;
    actualPaidAmount = Math.min(total, Math.max(0, numericInput));
    actualRemainingAmount = Math.max(0, total - actualPaidAmount);
  } else {
    actualPaidAmount = total;
    actualRemainingAmount = 0;
  }

  // Update Raw Material default unit and prices on raw material selection
  useEffect(() => {
    if (selectedRawMaterialId) {
      const mat = rawMaterials.find((m) => m._id === selectedRawMaterialId);
      if (mat) {
        const defaultUnit = mat.form === 'liquid' ? 'ml' : 'g';
        setSelectedUnit(defaultUnit);
        
        // Price per Major Unit (Liter / Kg)
        const p1 = mat.sellingPrice1 && mat.sellingPrice1 > 0 
          ? mat.sellingPrice1 
          : (mat.weightedAverageCost * 1000 * 1.3 > 0 ? Number((mat.weightedAverageCost * 1000 * 1.3).toFixed(2)) : 20);
        
        setSelectedRawMaterialPriceTier('tier1');
        setSelectedRawMaterialMajorPrice(p1);
        
        const unitP = Number((p1 / 1000).toFixed(4));
        setCustomPrice(unitP);
        setCustomTotalPrice(Number((unitP * qty).toFixed(2)));
        setLastEditedPriceField('unit');
      }
    }
  }, [selectedRawMaterialId, rawMaterials]);

  // Recalculate price dynamically when Qty, Unit, or Tier changes
  useEffect(() => {
    if (itemType === 'rawMaterial' && selectedRawMaterialId) {
      if (selectedRawMaterialPriceTier !== 'custom' && selectedRawMaterialMajorPrice > 0) {
        const isMajor = selectedUnit === 'l' || selectedUnit === 'kg';
        const calcUnitPrice = isMajor ? selectedRawMaterialMajorPrice : Number((selectedRawMaterialMajorPrice / 1000).toFixed(4));
        setCustomPrice(calcUnitPrice);
        setCustomTotalPrice(Number((calcUnitPrice * qty).toFixed(2)));
      } else if (lastEditedPriceField === 'total' && typeof customTotalPrice === 'number' && qty > 0) {
        const calcUnitPrice = Number((customTotalPrice / qty).toFixed(4));
        setCustomPrice(calcUnitPrice);
      } else if (typeof customPrice === 'number') {
        const calcTotal = Number((customPrice * qty).toFixed(2));
        setCustomTotalPrice(calcTotal);
      }
    }
  }, [qty, selectedUnit, selectedRawMaterialPriceTier, selectedRawMaterialMajorPrice]);

  const handleSelectRawMaterialTier = (tier: 'tier1' | 'tier2' | 'tier3', majorPrice: number) => {
    setSelectedRawMaterialPriceTier(tier);
    setSelectedRawMaterialMajorPrice(majorPrice);
    const isMajor = selectedUnit === 'l' || selectedUnit === 'kg';
    const unitP = isMajor ? majorPrice : Number((majorPrice / 1000).toFixed(4));
    setCustomPrice(unitP);
    setCustomTotalPrice(Number((unitP * qty).toFixed(2)));
    setLastEditedPriceField('unit');
  };

  // Handle manual change of Unit Price
  const handleUnitPriceChange = (val: number | '') => {
    setSelectedRawMaterialPriceTier('custom');
    setCustomPrice(val);
    setLastEditedPriceField('unit');
    if (typeof val === 'number' && qty > 0) {
      setCustomTotalPrice(Number((val * qty).toFixed(2)));
    } else {
      setCustomTotalPrice('');
    }
  };

  // Handle manual change of Total Price for the quantity
  const handleTotalPriceChange = (val: number | '') => {
    setSelectedRawMaterialPriceTier('custom');
    setCustomTotalPrice(val);
    setLastEditedPriceField('total');
    if (typeof val === 'number' && qty > 0) {
      setCustomPrice(Number((val / qty).toFixed(4)));
    } else {
      setCustomPrice('');
    }
  };

  // Record Sale Mutation
  const recordSaleMutation = useMutation({
    mutationFn: async () => {
      setSaleErrorMsg(null);

      const lines = cart.map((item) => {
        if (item.type === 'rawMaterial' && item.rawMaterial) {
          return {
            itemType: 'rawMaterial',
            rawMaterialId: item.rawMaterial._id,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceOverride: item.unitPrice,
          };
        } else {
          return {
            itemType: 'finishedProduct',
            finishedProductId: item.finishedProduct!._id,
            quantity: item.quantity,
            unitPriceOverride: item.unitPrice,
          };
        }
      });

      return (
        await apiClient.post('/sales', {
          lines,
          discount,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          note,
          paymentStatus,
          paidAmount: actualPaidAmount,
        })
      ).data;
    },
    onSuccess: (newSale: SaleRecord) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['finished-products'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedFavoriteId('');
      setNote('');
      setPaymentStatus('PAID');
      setPaidAmountInput('');
      setPrintSale(newSale);
    },
    onError: (err: any) => {
      setSaleErrorMsg(err.response?.data?.message || 'فشل إتمام عملية البيع');
    },
  });

  // Pay Settle Mutation for Unpaid / Partial Sales
  const settlePaymentMutation = useMutation({
    mutationFn: async () => {
      if (!settleSaleTarget || typeof settleAmount !== 'number' || settleAmount <= 0) return;
      return (
        await apiClient.patch(`/sales/${settleSaleTarget._id}/pay`, {
          amount: settleAmount,
          note: settleNote,
        })
      ).data;
    },
    onSuccess: (updatedSale: SaleRecord) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setSettleSaleTarget(null);
      setSettleAmount('');
      setSettleNote('');
      // Offer printing updated receipt
      if (updatedSale) {
        setPrintSale(updatedSale);
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'فشل تسديد الدفعة');
    },
  });

  const handleManualPrint = (sale: SaleRecord) => {
    setPrintSale(sale);
  };

  const handleAddToCart = () => {
    if (itemType === 'finishedProduct') {
      const p = products.find((prod) => prod._id === selectedFinishedProductId);
      if (!p) return;

      const finalPrice = selectedFinishedProductPrice !== '' ? Number(selectedFinishedProductPrice) : (p.sellingPrice1 ?? p.sellingPrice);

      const existingIndex = cart.findIndex((item) => item.type === 'finishedProduct' && item.finishedProduct?._id === p._id);
      if (existingIndex >= 0) {
        const copy = [...cart];
        copy[existingIndex].quantity += qty;
        copy[existingIndex].unitPrice = finalPrice;
        setCart(copy);
      } else {
        setCart([
          ...cart,
          {
            id: `fp_${p._id}`,
            type: 'finishedProduct',
            name: p.name,
            finishedProduct: p,
            quantity: qty,
            unit: 'قطعة',
            unitPrice: finalPrice,
          },
        ]);
      }
      setSelectedFinishedProductId('');
      setSelectedFinishedProductPrice('');
      setQty(1);
    } else {
      const mat = rawMaterials.find((m) => m._id === selectedRawMaterialId);
      if (!mat) return;

      const isMajor = selectedUnit === 'l' || selectedUnit === 'kg';
      const p1Major = mat.sellingPrice1 && mat.sellingPrice1 > 0 
        ? mat.sellingPrice1 
        : (mat.weightedAverageCost * 1000 * 1.3 > 0 ? Number((mat.weightedAverageCost * 1000 * 1.3).toFixed(2)) : 20);
      const p2Major = mat.sellingPrice2 && mat.sellingPrice2 > 0 ? mat.sellingPrice2 : p1Major;
      const p3Major = mat.sellingPrice3 && mat.sellingPrice3 > 0 ? mat.sellingPrice3 : p1Major;

      const p1Unit = isMajor ? p1Major : Number((p1Major / 1000).toFixed(4));
      const p2Unit = isMajor ? p2Major : Number((p2Major / 1000).toFixed(4));
      const p3Unit = isMajor ? p3Major : Number((p3Major / 1000).toFixed(4));

      const finalUnitPrice = selectedRawMaterialPriceTier === 'tier2' ? p2Unit : selectedRawMaterialPriceTier === 'tier3' ? p3Unit : p1Unit;

      const isAr = i18n.language === 'ar';
      const unitLabel = selectedUnit === 'l' ? (isAr ? 'لتر' : 'L') : selectedUnit === 'kg' ? (isAr ? 'كجم' : 'kg') : selectedUnit === 'ml' ? (isAr ? 'مل' : 'ml') : (isAr ? 'جرام' : 'g');

      const existingIndex = cart.findIndex((item) => item.type === 'rawMaterial' && item.rawMaterial?._id === mat._id && item.unit === selectedUnit && item.unitPrice === finalUnitPrice);
      if (existingIndex >= 0) {
        const copy = [...cart];
        copy[existingIndex].quantity += qty;
        setCart(copy);
      } else {
        setCart([
          ...cart,
          {
            id: `rm_${mat._id}_${selectedUnit}_${selectedRawMaterialPriceTier}`,
            type: 'rawMaterial',
            name: `${mat.name} (${unitLabel})`,
            rawMaterial: mat,
            quantity: qty,
            unit: selectedUnit,
            unitPrice: finalUnitPrice,
          },
        ]);
      }
      setSelectedRawMaterialId('');
      setSelectedRawMaterialPriceTier('tier1');
      setSelectedRawMaterialMajorPrice(0);
      setQty(1);
      setCustomPrice('');
      setCustomTotalPrice('');
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const selectedRm = rawMaterials.find((m) => m._id === selectedRawMaterialId);

  // Formatter for raw material dropdown options
  const formatRawMaterialOptionText = (m: RawMaterial) => {
    const isAr = i18n.language === 'ar';
    const outMsg = isAr ? '[نفدت الكمية]' : '[Out of Stock]';
    const availMsg = isAr ? 'المتوفر' : 'Available';
    const lUnit = isAr ? 'لتر' : 'L';
    const mlUnit = isAr ? 'مل' : 'ml';
    const kgUnit = isAr ? 'كجم' : 'kg';
    const gUnit = isAr ? 'جرام' : 'g';

    if (m.stockBase <= 0) return `${m.name} — ${outMsg}`;
    if (m.form === 'liquid') {
      if (m.stockBase >= 1000) {
        const liters = (m.stockBase / 1000).toFixed(1);
        return `${m.name} — (${availMsg}: ${liters} ${lUnit})`;
      }
      return `${m.name} — (${availMsg}: ${m.stockBase.toLocaleString()} ${mlUnit})`;
    } else {
      if (m.stockBase >= 1000) {
        const kg = (m.stockBase / 1000).toFixed(1);
        return `${m.name} — (${availMsg}: ${kg} ${kgUnit})`;
      }
      return `${m.name} — (${availMsg}: ${m.stockBase.toLocaleString()} ${gUnit})`;
    }
  };

  // Helper to check if customer is in favorites
  const isFavoriteCustomer = (phone?: string, name?: string) => {
    if (!phone && !name) return false;
    const cleanP = (phone || '').replace(/\D/g, '');
    return favoriteCustomers.some((f) => {
      const fClean = (f.customerPhone || '').replace(/\D/g, '');
      if (cleanP && fClean && cleanP === fClean) return true;
      if (name && f.customerName && name.trim().toLowerCase() === f.customerName.trim().toLowerCase()) return true;
      return false;
    });
  };

  // Filter Favorite Customers by Search Query
  const searchedFavoriteCustomers = useMemo(() => {
    if (!invoiceSearchQuery.trim()) return favoriteCustomers;
    const q = invoiceSearchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');
    return favoriteCustomers.filter((fav) => {
      const name = (fav.customerName || '').toLowerCase();
      const phone = (fav.customerPhone || '').toLowerCase();
      const cleanPhone = phone.replace(/\D/g, '');
      return name.includes(q) || phone.includes(q) || (cleanQ.length > 0 && cleanPhone.includes(cleanQ));
    });
  }, [favoriteCustomers, invoiceSearchQuery]);

  // Filter Sales History by Search Query & Payment Status (Customer Name, Customer Phone, Receipt Number)
  const searchedSales = salesHistory.filter((s) => {
    if (!invoiceSearchQuery.trim()) return true;
    const q = invoiceSearchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');
    const receiptNum = (s.receiptNumber || s._id || '').toLowerCase();
    const customer = (s.customerName || '').toLowerCase();
    const phone = (s.customerPhone || '').toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');

    return (
      receiptNum.includes(q) ||
      customer.includes(q) ||
      phone.includes(q) ||
      (cleanQ.length > 0 && cleanPhone.includes(cleanQ))
    );
  });

  const paidSales = searchedSales.filter(
    (s) => s.paymentStatus === 'PAID' || (s.remainingAmount ?? 0) <= 0
  );
  const unpaidSales = searchedSales.filter(
    (s) => s.paymentStatus !== 'PAID' && (s.remainingAmount ?? 0) > 0
  );

  const unpaidPagination = usePagination(unpaidSales, 5);
  const paidPagination = usePagination(paidSales, 5);

  // Customer Statement Modal Sales & Pagination
  const statementUnpaidSales = useMemo(() => {
    if (!activeCustomerGroup) return [];
    return activeCustomerGroup.sales.filter(
      (s) => s.paymentStatus !== 'PAID' && (s.remainingAmount ?? 0) > 0
    );
  }, [activeCustomerGroup]);

  const statementPaidSales = useMemo(() => {
    if (!activeCustomerGroup) return [];
    return activeCustomerGroup.sales.filter(
      (s) => s.paymentStatus === 'PAID' || (s.remainingAmount ?? 0) <= 0
    );
  }, [activeCustomerGroup]);

  const statementUnpaidPagination = usePagination(statementUnpaidSales, 5);
  const statementPaidPagination = usePagination(statementPaidSales, 5);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-2xl text-brand-forest dark:text-brand-sand flex items-center gap-2">
          <Receipt className="text-emerald-600" /> {t('nav.sales')}
        </h1>
        <p className="text-sm text-brand-sage">{t('sales.subtitle')}</p>
      </div>

      {/* POS Grid: Cart & Item Selection (Left) vs Checkout (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Item Selection & Cart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-botanical space-y-4">
            <div className="flex items-center justify-between border-b border-brand-sage/20 pb-3">
              <h2 className="font-display text-lg text-brand-forest dark:text-brand-sand flex items-center gap-2">
                <ShoppingCart size={20} className="text-emerald-700 dark:text-emerald-400" /> {t('sales.posTitle')}
              </h2>
              {user && (
                <span className="text-xs text-brand-sage font-medium bg-brand-sage/15 px-2.5 py-1 rounded-full">
                  {t('sales.cashierLabel')}: {user.fullName}
                </span>
              )}
            </div>

            {/* Selector Type Tabs */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setItemType('finishedProduct')}
                className={`px-3.5 py-2 text-xs rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                  itemType === 'finishedProduct'
                    ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-[#F5EFE0] shadow-sm border border-emerald-600/30'
                    : 'bg-brand-sage/10 text-brand-forest dark:text-brand-sand hover:bg-brand-sage/20'
                }`}
              >
                <Package size={15} />
                <span>{t('sales.finishedProductsTab')}</span>
              </button>
              <button
                type="button"
                onClick={() => setItemType('rawMaterial')}
                className={`px-3.5 py-2 text-xs rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                  itemType === 'rawMaterial'
                    ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-[#F5EFE0] shadow-sm border border-emerald-600/30'
                    : 'bg-brand-sage/10 text-brand-forest dark:text-brand-sand hover:bg-brand-sage/20'
                }`}
              >
                <Leaf size={15} />
                <span>{t('sales.rawMaterialsTab')}</span>
              </button>
            </div>

            {/* Form Inputs for Adding to Cart */}
            {itemType === 'finishedProduct' ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.selectProduct')}</label>
                  <select
                    value={selectedFinishedProductId}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      setSelectedFinishedProductId(prodId);
                      const prod = products.find((p) => p._id === prodId);
                      if (prod) {
                        setSelectedFinishedProductPrice(prod.sellingPrice1 ?? prod.sellingPrice);
                      } else {
                        setSelectedFinishedProductPrice('');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/80 dark:bg-brand-slate/80 text-sm font-medium focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">{t('sales.selectProductPlaceholder')}</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id} disabled={p.stockUnits <= 0}>
                        {p.name} {p.stockUnits <= 0 ? `— ${t('sales.outOfStock')}` : `(${t('sales.inStockLabel')}: ${p.stockUnits} ${t('common.pcs')})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.colPrice')}</label>
                  {(() => {
                    const selProd = products.find((p) => p._id === selectedFinishedProductId);
                    if (!selProd) {
                      return (
                        <select disabled className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/50 dark:bg-brand-slate/50 text-xs font-semibold opacity-60">
                          <option value="">{t('sales.selectProductFirst')}</option>
                        </select>
                      );
                    }
                    const p1 = selProd.sellingPrice1 ?? selProd.sellingPrice;
                    const p2 = selProd.sellingPrice2 ?? p1;
                    const p3 = selProd.sellingPrice3 ?? p1;

                    return (
                      <select
                        value={selectedFinishedProductPrice !== '' ? selectedFinishedProductPrice : p1}
                        onChange={(e) => setSelectedFinishedProductPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-xs font-bold text-amber-900 dark:text-amber-100 focus:ring-2 focus:ring-amber-500"
                      >
                        <option value={p1}>{t('sales.price1Label')}: {p1.toFixed(2)} {t('common.currency')}</option>
                        <option value={p2}>{t('sales.price2Label')}: {p2.toFixed(2)} {t('common.currency')}</option>
                        <option value={p3}>{t('sales.price3Label')}: {p3.toFixed(2)} {t('common.currency')}</option>
                      </select>
                    );
                  })()}
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.qtyLabel')} ({t('common.pcs')})</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/80 dark:bg-brand-slate/80 text-sm font-bold text-center"
                    />
                    <button
                      type="button"
                      disabled={!selectedFinishedProductId}
                      onClick={handleAddToCart}
                      className="btn-primary px-4 text-xs font-bold shrink-0 disabled:opacity-50"
                    >
                      {t('common.add')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-brand-sage/10 rounded-2xl border border-brand-sage/20">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Raw Material Selection */}
                  <div className="sm:col-span-4">
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.selectRawMaterialLabel')}</label>
                    <select
                      value={selectedRawMaterialId}
                      onChange={(e) => setSelectedRawMaterialId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/80 dark:bg-brand-slate/80 text-sm font-semibold dir-rtl"
                    >
                      <option value="">{t('sales.selectRawMaterialPlaceholder')}</option>
                      {rawMaterials.map((m) => (
                        <option key={m._id} value={m._id} disabled={m.stockBase <= 0}>
                          {formatRawMaterialOptionText(m)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Selection */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('common.unit')}</label>
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-brand-sage/30 bg-white/80 dark:bg-brand-slate/80 text-sm font-semibold"
                    >
                      {selectedRm?.form === 'liquid' ? (
                        <>
                          <option value="ml">{i18n.language === 'ar' ? 'مل (ml)' : 'ml'}</option>
                          <option value="l">{i18n.language === 'ar' ? 'لتر (L)' : 'L'}</option>
                        </>
                      ) : (
                        <>
                          <option value="g">{i18n.language === 'ar' ? 'جرام (g)' : 'g'}</option>
                          <option value="kg">{i18n.language === 'ar' ? 'كجم (kg)' : 'kg'}</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Price (السعر) Dropdown styled exactly like user's screenshot */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.colPrice')}</label>
                    {(() => {
                      if (!selectedRm) {
                        return (
                          <select disabled className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/50 dark:bg-brand-slate/50 text-xs font-semibold opacity-60">
                            <option value="">{t('sales.selectProductFirst')}</option>
                          </select>
                        );
                      }

                      const isMajor = selectedUnit === 'l' || selectedUnit === 'kg';
                      const p1Major = selectedRm.sellingPrice1 && selectedRm.sellingPrice1 > 0 ? selectedRm.sellingPrice1 : (selectedRm.weightedAverageCost * 1000 * 1.3 > 0 ? Number((selectedRm.weightedAverageCost * 1000 * 1.3).toFixed(2)) : 20);
                      const p2Major = selectedRm.sellingPrice2 && selectedRm.sellingPrice2 > 0 ? selectedRm.sellingPrice2 : p1Major;
                      const p3Major = selectedRm.sellingPrice3 && selectedRm.sellingPrice3 > 0 ? selectedRm.sellingPrice3 : p1Major;

                      const p1Unit = isMajor ? p1Major : Number((p1Major / 1000).toFixed(4));
                      const p2Unit = isMajor ? p2Major : Number((p2Major / 1000).toFixed(4));
                      const p3Unit = isMajor ? p3Major : Number((p3Major / 1000).toFixed(4));

                      return (
                        <select
                          value={selectedRawMaterialPriceTier}
                          onChange={(e) => {
                            const val = e.target.value as 'tier1' | 'tier2' | 'tier3';
                            if (val === 'tier1') handleSelectRawMaterialTier('tier1', p1Major);
                            else if (val === 'tier2') handleSelectRawMaterialTier('tier2', p2Major);
                            else handleSelectRawMaterialTier('tier3', p3Major);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-xs font-bold text-amber-900 dark:text-amber-100 focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="tier1">
                            {t('sales.price1Label')} : {isMajor ? p1Major.toFixed(2) : p1Unit} {t('common.currency')}
                          </option>
                          <option value="tier2">
                            {t('sales.price2Label')} : {isMajor ? p2Major.toFixed(2) : p2Unit} {t('common.currency')}
                          </option>
                          <option value="tier3">
                            {t('sales.price3Label')} : {isMajor ? p3Major.toFixed(2) : p3Unit} {t('common.currency')}
                          </option>
                        </select>
                      );
                    })()}
                  </div>

                  {/* Quantity + Add Button */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-brand-sage mb-1 font-semibold">{t('sales.qtyLabel')}</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={qty}
                        onChange={(e) => setQty(Math.max(0.01, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-xl border border-brand-sage/30 bg-white/80 dark:bg-brand-slate/80 text-sm font-bold text-center"
                      />
                      <button
                        type="button"
                        disabled={!selectedRawMaterialId}
                        onClick={handleAddToCart}
                        className="btn-primary px-4 text-xs font-bold shrink-0 disabled:opacity-50"
                      >
                        {t('common.add')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cart Table */}
            <div className="border-t border-brand-sage/20 pt-4">
              <h3 className="text-xs font-semibold text-brand-sage uppercase tracking-wider mb-2">{t('sales.cartTitle')}</h3>
              {cart.length === 0 ? (
                <p className="text-xs text-brand-sage py-6 text-center italic">{t('sales.cartEmpty')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-brand-sage/20 text-brand-forest dark:text-brand-sand">
                        <th className="py-2 text-start">{t('sales.colItem')}</th>
                        <th className="py-2 text-center">{t('sales.colQty')}</th>
                        <th className="py-2 text-end">{t('sales.colPrice')}</th>
                        <th className="py-2 text-end">{t('sales.colTotal')}</th>
                        <th className="py-2 text-end"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => (
                        <tr key={idx} className="border-b border-brand-sage/10 hover:bg-brand-sage/5">
                          <td className="py-2 font-semibold flex items-center gap-1.5">
                            {item.type === 'rawMaterial' ? <Leaf size={13} className="text-emerald-600" /> : <Package size={13} className="text-blue-600" />}
                            <span>{item.name}</span>
                          </td>
                          <td className="py-2 text-center font-bold">{item.quantity} {item.unit}</td>
                          <td className="py-2 text-end">{item.unitPrice.toFixed(2)} {t('common.currency')}</td>
                          <td className="py-2 text-end font-bold text-emerald-700 dark:text-emerald-300">
                            {(item.quantity * item.unitPrice).toFixed(2)} {t('common.currency')}
                          </td>
                          <td className="py-2 text-end">
                            <button onClick={() => removeFromCart(idx)} className="text-rose-500 hover:text-rose-700 p-1">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Checkout & Payment Options (Right) */}
        <div className="space-y-4">
          <div className="card-botanical space-y-4">
            <h2 className="font-display text-lg text-brand-forest dark:text-brand-sand flex items-center gap-2 border-b border-brand-sage/20 pb-3">
              <CreditCard size={20} className="text-emerald-600" /> {t('sales.checkoutTitle')}
            </h2>

            <div className="space-y-3.5 text-xs">
              {/* Favorite Customer Dropdown & Customer Details (OPTIONAL) */}
              {favoriteCustomers.length > 0 && (
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold flex items-center gap-1.5">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    {t('sales.favoriteCustomerLabel')}
                  </label>
                  <select
                    value={selectedFavoriteId}
                    onChange={(e) => {
                      const favId = e.target.value;
                      setSelectedFavoriteId(favId);
                      if (favId) {
                        const fav = favoriteCustomers.find((f) => f._id === favId);
                        if (fav) {
                          setCustomerName(fav.customerName || '');
                          setCustomerPhone(fav.customerPhone || '');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs font-semibold text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">{t('sales.selectFavoritePlaceholder')}</option>
                    {favoriteCustomers.map((fav) => (
                      <option key={fav._id} value={fav._id}>
                        {fav.customerName} {fav.customerPhone ? `(${fav.customerPhone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-brand-sage mb-1 font-semibold">
                    {t('sales.customerLabel')}
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage rtl:left-auto rtl:right-3" />
                    <input
                      type="text"
                      placeholder="اسم العميل بالكامل (اختياري)"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setSelectedFavoriteId('');
                      }}
                      className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-2 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-brand-sage mb-1 font-semibold">
                    {t('sales.customerPhoneLabel')}
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage rtl:left-auto rtl:right-3" />
                    <input
                      type="tel"
                      placeholder="01xxxxxxxxx (اختياري)"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setSelectedFavoriteId('');
                      }}
                      className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-2 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Type Selection (مدفوع - غير مدفوع/آجل - دفع جزئي) */}
              <div>
                <label className="block text-brand-sage mb-1.5 font-semibold">{t('sales.paymentStatusLabel')}</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('PAID');
                      setPaidAmountInput('');
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      paymentStatus === 'PAID'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-brand-slate text-gray-700 dark:text-[#E8E1CE] border-brand-sage/30'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>{t('sales.paidInFull')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('PARTIAL');
                      setPaidAmountInput(Math.round(total / 2));
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      paymentStatus === 'PARTIAL'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white dark:bg-brand-slate text-gray-700 dark:text-[#E8E1CE] border-brand-sage/30'
                    }`}
                  >
                    <Clock size={14} />
                    <span>{t('sales.partialPayment')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('UNPAID');
                      setPaidAmountInput(0);
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all flex flex-col items-center gap-1 ${
                      paymentStatus === 'UNPAID'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white dark:bg-brand-slate text-gray-700 dark:text-[#E8E1CE] border-brand-sage/30'
                    }`}
                  >
                    <AlertCircle size={14} />
                    <span>{t('sales.unpaidDeferred')}</span>
                  </button>
                </div>
              </div>

              {/* Partial Payment Input Field */}
              {paymentStatus === 'PARTIAL' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1.5">
                  <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    المبلغ المدفوع الآن من العميل (ج.م)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={total}
                    step="any"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-brand-slate font-bold text-amber-900 dark:text-amber-100"
                  />
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 flex justify-between pt-1">
                    <span>المتبقي الآجل:</span>
                    <strong className="font-bold">{actualRemainingAmount.toFixed(2)} ج.م</strong>
                  </div>
                </div>
              )}

              {/* Discount Input */}
              <div>
                <label className="block text-brand-sage mb-1 font-semibold">{t('sales.discountLabel')}</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 rounded-xl border border-brand-sage/30 bg-white/70 dark:bg-brand-slate/70 text-xs font-semibold"
                />
              </div>

              {/* Payment Summary */}
              <div className="border-t border-brand-sage/20 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-brand-sage">
                  <span>{t('sales.subtotal')}</span>
                  <span>{subtotal.toFixed(2)} {t('common.currency')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>{t('sales.discount')}</span>
                    <span>-{discount.toFixed(2)} {t('common.currency')}</span>
                  </div>
                )}
                <div className="flex justify-between font-display text-base font-bold text-brand-forest dark:text-brand-sand pt-1 border-t border-brand-sage/20">
                  <span>{t('sales.totalAmount')}</span>
                  <span>{total.toFixed(2)} {t('common.currency')}</span>
                </div>

                {/* Paid vs Remaining Breakdown */}
                <div className="bg-brand-sage/10 p-2.5 rounded-xl space-y-1 mt-2 text-[11px]">
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                    <span>{t('sales.paidNow')}</span>
                    <span>{actualPaidAmount.toFixed(2)} {t('common.currency')}</span>
                  </div>
                  {actualRemainingAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-brand-sage/20">
                      <span>{t('sales.remainingDeferred')}</span>
                      <span>{actualRemainingAmount.toFixed(2)} {t('common.currency')}</span>
                    </div>
                  )}
                </div>
              </div>

              {saleErrorMsg && (
                <div className="p-2 bg-rose-100 text-rose-800 rounded-lg text-xs font-medium">
                  {saleErrorMsg}
                </div>
              )}

              <button
                disabled={cart.length === 0 || recordSaleMutation.isPending}
                onClick={() => recordSaleMutation.mutate()}
                className="btn-primary w-full py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                <Printer size={16} />
                <span>
                  {recordSaleMutation.isPending
                    ? t('common.loading')
                    : `${t('sales.completeSale')} (${total.toFixed(2)} ${t('common.currency')})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sales History Section: Dual View (Paid on Right, Unpaid/Deferred on Left) */}
      <div className="card-botanical space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-sage/20 pb-3">
          <div>
            <h2 className="font-display text-lg text-brand-forest dark:text-brand-sand flex items-center gap-2">
              <Clock size={18} /> {t('sales.historyTitle')}
            </h2>
            <p className="text-xs text-brand-sage">{t('sales.historySubtitle')}</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-brand-sage/10 p-1 rounded-xl gap-1 flex-wrap">
            <button
              onClick={() => setHistoryTab('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                historyTab === 'all'
                  ? 'bg-brand-forest text-brand-sand shadow-sm'
                  : 'text-brand-sage hover:text-brand-forest'
              }`}
            >
              {t('sales.tabAll')} ({searchedSales.length})
            </button>
            <button
              onClick={() => setHistoryTab('unpaid')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                historyTab === 'unpaid'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50'
              }`}
            >
              <span>{t('sales.tabUnpaid')}</span>
              {unpaidSales.length > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-rose-700 rounded-full text-[10px] font-extrabold">
                  {unpaidSales.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setHistoryTab('paid')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                historyTab === 'paid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-brand-sage hover:text-brand-forest'
              }`}
            >
              {t('sales.tabPaid')} ({paidSales.length})
            </button>
            <button
              onClick={() => setHistoryTab('favorites')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                historyTab === 'favorites'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50'
              }`}
            >
              <Star size={13} className={historyTab === 'favorites' ? 'fill-white' : 'fill-amber-400'} />
              <span>المفضلة</span>
              {favoriteCustomers.length > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-amber-700 rounded-full text-[10px] font-extrabold">
                  {favoriteCustomers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Invoice Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage rtl:left-auto rtl:right-3" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة، رقم التليفون، أو اسم العميل..."
            value={invoiceSearchQuery}
            onChange={(e) => setInvoiceSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 rtl:pl-9 rtl:pr-9 py-2.5 rounded-xl border border-brand-sage/30 bg-white/80 dark:bg-brand-slate/80 text-xs font-semibold shadow-sm focus:ring-2 focus:ring-emerald-500 transition-all"
          />
          {invoiceSearchQuery && (
            <button
              onClick={() => setInvoiceSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 rtl:right-auto rtl:left-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#1A281E] transition-all"
              title="مسح البحث"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Customer Account Summary Banner if Phone Number match found in search */}
        {searchMatchedCustomerGroup && (
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-[#F5EFE0] p-4 rounded-2xl shadow-lg border border-emerald-500/40 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700/60 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow shrink-0">
                <User size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base">{searchMatchedCustomerGroup.name}</h3>
                  <span className="bg-emerald-800/90 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold text-emerald-200 border border-emerald-400/20 flex items-center gap-1">
                    <Phone size={11} /> {searchMatchedCustomerGroup.phone}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 mt-1">
                  مرتبط بـ <strong className="text-white">{searchMatchedCustomerGroup.sales.length} فواتير</strong> | إجمالي قيمة الفواتير: <strong className="text-emerald-300">{searchMatchedCustomerGroup.totalAmount.toFixed(2)} ج.م</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-emerald-800/60 pt-3 md:pt-0">
              <div className="text-start md:text-end">
                <span className="text-[11px] text-emerald-200 block font-medium">إجمالي الديون المتبقية</span>
                <strong className="text-rose-300 text-lg font-black">{searchMatchedCustomerGroup.totalRemaining.toFixed(2)} ج.م</strong>
              </div>
              <button
                onClick={() => setActiveCustomerPhone(searchMatchedCustomerGroup.phone)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all"
              >
                <FileText size={15} /> عرض كشف حساب العميل
              </button>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <p className="text-xs text-brand-sage text-center py-6">{t('common.loading')}</p>
        ) : salesHistory.length === 0 ? (
          <p className="text-xs text-brand-sage text-center py-6">{t('sales.noHistory')}</p>
        ) : historyTab === 'favorites' ? (
          /* Favorites Customers View */
          <div className="space-y-4 bg-amber-50/30 dark:bg-amber-950/10 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/30">
            <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-900/40 pb-3">
              <h3 className="font-display text-base font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Star size={20} className="fill-amber-400 text-amber-500" /> العملاء المفضلين ({favoriteCustomers.length})
              </h3>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                تم حفظهم في قائمة المفضلة لمتابعة كافة فواتيرهم بسهولة
              </span>
            </div>

            {searchedFavoriteCustomers.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Star size={36} className="mx-auto text-amber-300 dark:text-amber-700" />
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {favoriteCustomers.length === 0 ? 'لا يوجد عملاء مفضلين حالياً' : 'لا يوجد عملاء مفضلين مطبق عليهم البحث'}
                </p>
                {favoriteCustomers.length === 0 && (
                  <p className="text-[11px] text-gray-400">اضغط على أيقونة النجمة ⭐ بجانب اسم العميل في أي فاتورة لإضافته للمفضلة</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchedFavoriteCustomers.map((fav) => {
                  const cleanFPhone = (fav.customerPhone || '').replace(/\D/g, '');
                  const group = Object.values(customerGroups).find(
                    (g) => (g.phone && g.phone.replace(/\D/g, '') === cleanFPhone) || g.name === fav.customerName
                  );

                  const totalInv = group?.sales.length || 0;
                  const totalAmt = group?.totalAmount || 0;
                  const totalRem = group?.totalRemaining || 0;

                  return (
                    <div
                      key={fav._id}
                      className="bg-white dark:bg-[#131E17] p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                            <User size={20} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-[#F5EFE0] flex items-center gap-1.5">
                              {fav.customerName}
                              <Star size={14} className="fill-amber-400 text-amber-500 shrink-0" />
                            </h4>
                            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Phone size={11} /> {fav.customerPhone}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFavoriteMutation.mutate({ name: fav.customerName, phone: fav.customerPhone })}
                          className="p-1.5 text-amber-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                          title="إزالة من المفضلة"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-[#1A281E] p-2.5 rounded-lg text-center text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block">الفواتير</span>
                          <strong className="text-gray-800 dark:text-[#F5EFE0]">{totalInv}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">إجمالي المشتريات</span>
                          <strong className="text-emerald-600 dark:text-emerald-400">{totalAmt.toFixed(2)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">الديون</span>
                          <strong className={totalRem > 0 ? "text-rose-600 font-bold" : "text-gray-500"}>
                            {totalRem.toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveCustomerPhone(fav.customerPhone)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <BookOpen size={13} /> عرض كشف حساب وفواتير العميل بالكامل
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Split Columns Layout for Invoices */
          <div className={`grid grid-cols-1 ${historyTab === 'all' ? 'lg:grid-cols-2' : ''} gap-6`}>
            
            {/* Unpaid & Deferred Invoices Column */}
            {(historyTab === 'all' || historyTab === 'unpaid') && (
              <div className="space-y-3 bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200/60 dark:border-rose-900/40">
                <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900/40 pb-2">
                  <h3 className="font-display text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle size={16} /> {t('sales.unpaidInvoicesHeader')} ({unpaidSales.length})
                  </h3>
                  <span className="text-[11px] text-rose-600 dark:text-rose-300 font-semibold">
                    {t('sales.totalDues')} {unpaidSales.reduce((acc, s) => acc + (s.remainingAmount ?? 0), 0).toFixed(2)} {t('common.currency')}
                  </span>
                </div>

                {unpaidSales.length === 0 ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 py-6 text-center font-semibold">
                    {t('sales.emptyUnpaidMsg')}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {unpaidPagination.paginatedItems.map((sale) => {
                      const totalAmt = sale.totalAmount ?? sale.total ?? 0;
                      const paidAmt = sale.paidAmount ?? 0;
                      const remAmt = sale.remainingAmount ?? Math.max(0, totalAmt - paidAmt);
                      const isFav = isFavoriteCustomer(sale.customerPhone, sale.customerName);

                      return (
                        <div
                          key={sale._id}
                          className="bg-white dark:bg-[#131E17] p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-sm space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-gray-900 dark:text-[#F5EFE0] text-sm">
                                #{sale.receiptNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                {sale.paymentStatus === 'PARTIAL' ? 'دفع جزئي' : 'آجل / غير مدفوع'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-[#1A281E] px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-[#263A2A]">
                                {new Date(sale.createdAt).toLocaleDateString('ar-EG')} - {new Date(sale.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button
                                onClick={() => {
                                  const target = sale.customerPhone || sale.customerName;
                                  if (target) {
                                    toggleFavoriteMutation.mutate({ name: sale.customerName || 'عميل', phone: target });
                                  }
                                }}
                                title={isFav ? "إزالة العميل من المفضلة" : "إضافة العميل للمفضلة ⭐"}
                                className="p-1 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-500 transition-all"
                              >
                                <Star
                                  size={16}
                                  className={
                                    isFav
                                      ? "fill-amber-400 text-amber-500"
                                      : "text-gray-400 hover:text-amber-500"
                                  }
                                />
                              </button>
                              <button
                                onClick={() => setDeleteTargetSale(sale)}
                                title="حذف الفاتورة نهائياً من قاعدة البيانات"
                                className="p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <div>
                              <span className="font-bold text-gray-800 dark:text-[#E8E1CE] text-sm block">
                                {sale.customerName || 'عميل آجل'}
                              </span>
                              {sale.customerPhone && (
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono block">
                                  📞 {sale.customerPhone}
                                </span>
                              )}
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block mt-0.5">
                                الكاشير: {typeof sale.performedBy === 'object' ? sale.performedBy?.fullName : (sale.performedBy || user?.fullName || 'admin')}
                              </span>
                            </div>

                            <div className="text-end">
                              <div className="text-rose-600 font-extrabold text-sm">
                                المتبقي: {remAmt.toFixed(2)} ج.م
                              </div>
                              <div className="text-[10px] text-gray-500">
                                مدفوع: {paidAmt.toFixed(2)} من {totalAmt.toFixed(2)} ج.م
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#263A2A]">
                            <button
                              onClick={() => sendWhatsAppInvoice(sale)}
                              title="إرسال الفاتورة عبر الواتساب"
                              className="px-2.5 py-1 text-xs rounded-lg border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 font-semibold"
                            >
                              <Send size={12} className="text-emerald-600" /> واتساب
                            </button>
                            <button
                              onClick={() => {
                                const target = sale.customerPhone || sale.customerName;
                                if (target) {
                                  setActiveCustomerPhone(target);
                                }
                              }}
                              className="px-2.5 py-1 text-xs rounded-lg border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-1 font-bold transition-colors"
                              title="عرض كشف حساب العميل بالكامل"
                            >
                              <BookOpen size={12} className="text-amber-600 dark:text-amber-400" /> كشف الحساب
                            </button>
                            <button
                              onClick={() => {
                                setSettleSaleTarget(sale);
                                setSettleAmount(remAmt);
                              }}
                              className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1"
                            >
                              <DollarSign size={13} /> تسديد المتبقي
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <Pagination
                      currentPage={unpaidPagination.currentPage}
                      totalPages={unpaidPagination.totalPages}
                      totalItems={unpaidPagination.totalItems}
                      itemsPerPage={unpaidPagination.itemsPerPage}
                      onPageChange={unpaidPagination.setCurrentPage}
                      onItemsPerPageChange={unpaidPagination.setItemsPerPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Paid Invoices Column */}
            {(historyTab === 'all' || historyTab === 'paid') && (
              <div className="space-y-3 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40">
                <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/40 pb-2">
                  <h3 className="font-display text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> {t('sales.paidInvoicesHeader')} ({paidSales.length})
                  </h3>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    {t('sales.totalCollected')} {paidSales.reduce((acc, s) => acc + (s.totalAmount ?? s.total ?? 0), 0).toFixed(2)} {t('common.currency')}
                  </span>
                </div>

                {paidSales.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">{t('sales.emptyPaidMsg')}</p>
                ) : (
                  <div className="space-y-2.5">
                    {paidPagination.paginatedItems.map((sale) => {
                      const isFav = isFavoriteCustomer(sale.customerPhone, sale.customerName);

                      return (
                        <div
                          key={sale._id}
                          className="bg-white dark:bg-[#131E17] p-3.5 sm:p-4 rounded-xl border border-emerald-100 dark:border-[#263A2A] shadow-sm space-y-3 text-xs"
                        >
                          {/* Top Row: Receipt #, Paid Badge, Date */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-[#263A2A] pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-gray-900 dark:text-[#F5EFE0] text-sm">
                                #{sale.receiptNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
                                <Check size={10} /> مدفوع
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-[#1A281E] px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-[#263A2A]">
                              {new Date(sale.createdAt).toLocaleDateString('ar-EG')} - {new Date(sale.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Middle Row: Customer Info & Amount */}
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-gray-800 dark:text-[#E8E1CE] font-bold text-sm">
                                {sale.customerName || 'عميل نقدي'}
                              </p>
                              {sale.customerPhone && (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                  📞 {sale.customerPhone}
                                </p>
                              )}
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                الكاشير: {typeof sale.performedBy === 'object' ? sale.performedBy?.fullName : (sale.performedBy || user?.fullName || 'admin')}
                              </p>
                            </div>

                            <div className="text-end">
                              <span className="text-[10px] text-gray-400 block font-medium">إجمالي المحصل</span>
                              <div className="font-extrabold text-emerald-600 dark:text-[#E6DCB8] text-base sm:text-lg">
                                {(sale.totalAmount ?? sale.total ?? 0).toFixed(2)} ج.م
                              </div>
                            </div>
                          </div>

                          {/* Bottom Row: Actions */}
                          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100 dark:border-[#263A2A] flex-wrap">
                            <button
                              onClick={() => {
                                const target = sale.customerPhone || sale.customerName;
                                if (target) {
                                  toggleFavoriteMutation.mutate({ name: sale.customerName || 'عميل', phone: target });
                                }
                              }}
                              title={isFav ? "إزالة العميل من المفضلة" : "إضافة العميل للمفضلة ⭐"}
                              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-500 transition-all border border-gray-200/50 dark:border-[#263A2A]"
                            >
                              <Star
                                size={15}
                                className={isFav ? "fill-amber-400 text-amber-500" : "text-gray-400 hover:text-amber-500"}
                              />
                            </button>
                            <button
                              onClick={() => sendWhatsAppInvoice(sale)}
                              title="إرسال الفاتورة عبر الواتساب"
                              className="px-2.5 py-1.5 text-xs rounded-lg border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 inline-flex items-center gap-1 font-semibold"
                            >
                              <Send size={12} className="text-emerald-600" /> واتساب
                            </button>
                            <button
                              onClick={() => handleManualPrint(sale)}
                              className="px-2.5 py-1.5 text-xs rounded-lg bg-brand-sage/15 hover:bg-brand-sage/25 text-brand-forest dark:text-brand-sand inline-flex items-center gap-1 font-bold"
                            >
                              <Printer size={12} /> طباعة
                            </button>
                            <button
                              onClick={() => setDeleteTargetSale(sale)}
                              title="حذف الفاتورة نهائياً من قاعدة البيانات"
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition-all border border-rose-200/50 dark:border-rose-900/30"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <Pagination
                      currentPage={paidPagination.currentPage}
                      totalPages={paidPagination.totalPages}
                      totalItems={paidPagination.totalItems}
                      itemsPerPage={paidPagination.itemsPerPage}
                      onPageChange={paidPagination.setCurrentPage}
                      onItemsPerPageChange={paidPagination.setItemsPerPage}
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Customer Ledger Modal (Linked Invoices by Phone Number) */}
      {activeCustomerPhone && activeCustomerGroup && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#131E17] w-full max-w-xl rounded-2xl p-4 sm:p-5 shadow-2xl border border-gray-100 dark:border-[#263A2A] space-y-3.5 my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#263A2A] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shadow-sm shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900 dark:text-[#F5EFE0] flex items-center gap-2 flex-wrap">
                    كشف حساب: {activeCustomerGroup.name}
                    <span className="text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300/30">
                      <Phone size={11} /> {activeCustomerGroup.phone}
                    </span>
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    جميع الفواتير والمدفوعات المترابطة برقم التليفون
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCustomerPhone(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1A281E] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="bg-gray-50 dark:bg-[#1A281E] p-2.5 rounded-xl border border-gray-200/60 dark:border-[#263A2A] text-center">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block">الفواتير</span>
                <strong className="text-gray-900 dark:text-[#F5EFE0] text-sm font-extrabold">{activeCustomerGroup.sales.length}</strong>
              </div>
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-center">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block">إجمالي المشتريات</span>
                <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-extrabold">{activeCustomerGroup.totalAmount.toFixed(2)} ج.م</strong>
              </div>
              <div className="bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 text-center">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block">إجمالي الديون</span>
                <strong className="text-rose-600 dark:text-rose-300 text-sm font-extrabold">{activeCustomerGroup.totalRemaining.toFixed(2)} ج.م</strong>
              </div>
            </div>

            {/* WhatsApp Ledger Reminder Button */}
            <button
              onClick={() => sendWhatsAppLedgerReminder(activeCustomerGroup)}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0"
            >
              <Send size={14} /> إرسال إشعار تذكير بكشف الحساب والديون عبر الواتساب
            </button>

            {/* Tabs inside Customer Statement Modal */}
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-[#263A2A] pb-2 shrink-0">
              <button
                onClick={() => setStatementModalTab('unpaid')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  statementModalTab === 'unpaid'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
              >
                <span>غير مدفوعة / آجلة</span>
                {statementUnpaidSales.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-white text-rose-700 rounded-full text-[10px] font-extrabold">
                    {statementUnpaidSales.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStatementModalTab('paid')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  statementModalTab === 'paid'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                <span>مدفوعة بالكامل</span>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                  {statementPaidSales.length}
                </span>
              </button>
            </div>

            {/* Invoices List with Pagination according to active tab */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 grow">
              {statementModalTab === 'unpaid' ? (
                statementUnpaidSales.length === 0 ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center py-6 font-semibold">
                    لا توجد فواتير غير مدفوعة أو آجلة لهذا العميل 🎉
                  </p>
                ) : (
                  <>
                    {statementUnpaidPagination.paginatedItems.map((sale) => {
                      const tot = sale.totalAmount ?? sale.total ?? 0;
                      const paid = sale.paidAmount ?? 0;
                      const rem = sale.remainingAmount ?? Math.max(0, tot - paid);

                      return (
                        <div
                          key={sale._id}
                          className="p-3 rounded-xl border bg-rose-50/20 dark:bg-[#131E17] border-rose-200/80 dark:border-rose-900/40 space-y-2 text-xs shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-gray-900 dark:text-[#F5EFE0]">#{sale.receiptNumber}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                {sale.paymentStatus === 'PARTIAL' ? 'دفع جزئي' : 'آجل / غير مدفوع'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-mono">
                              {new Date(sale.createdAt).toLocaleDateString('ar-EG')} - {new Date(sale.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex justify-between items-center pt-0.5">
                            <div className="text-gray-600 dark:text-gray-300 text-[11px]">
                              <span className="font-semibold text-gray-800 dark:text-[#E8E1CE]">
                                {sale.lines?.map((l) => l.finishedProduct?.name || l.rawMaterial?.name || 'صنف').join(', ')}
                              </span>
                            </div>
                            <div className="text-end">
                              <span className="text-[11px] text-gray-500 block">إجمالي: {tot.toFixed(2)} ج.م</span>
                              <span className="text-xs font-black text-rose-600 block">المتبقي: {rem.toFixed(2)} ج.م</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-rose-100 dark:border-[#263A2A]">
                            <button
                              onClick={() => sendWhatsAppInvoice(sale)}
                              className="px-2 py-1 text-[11px] rounded-lg border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 flex items-center gap-1 font-semibold"
                            >
                              <Send size={11} className="text-emerald-600" /> واتساب
                            </button>
                            <button
                              onClick={() => handleManualPrint(sale)}
                              className="px-2 py-1 text-[11px] rounded-lg bg-brand-sage/15 hover:bg-brand-sage/25 text-brand-forest dark:text-brand-sand flex items-center gap-1 font-semibold"
                            >
                              <Printer size={11} /> طباعة
                            </button>
                            <button
                              onClick={() => {
                                setSettleSaleTarget(sale);
                                setSettleAmount(rem);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1"
                            >
                              <DollarSign size={12} /> تسديد المتبقي
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <Pagination
                      currentPage={statementUnpaidPagination.currentPage}
                      totalPages={statementUnpaidPagination.totalPages}
                      totalItems={statementUnpaidPagination.totalItems}
                      itemsPerPage={statementUnpaidPagination.itemsPerPage}
                      onPageChange={statementUnpaidPagination.setCurrentPage}
                      onItemsPerPageChange={statementUnpaidPagination.setItemsPerPage}
                    />
                  </>
                )
              ) : (
                statementPaidSales.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 font-semibold">
                    لا توجد فواتير مدفوعة بالكامل لهذا العميل حالياً
                  </p>
                ) : (
                  <>
                    {statementPaidPagination.paginatedItems.map((sale) => {
                      const tot = sale.totalAmount ?? sale.total ?? 0;

                      return (
                        <div
                          key={sale._id}
                          className="p-3 rounded-xl border bg-emerald-50/20 dark:bg-[#131E17] border-emerald-200/80 dark:border-emerald-900/40 space-y-2 text-xs shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-gray-900 dark:text-[#F5EFE0]">#{sale.receiptNumber}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                مدفوع بالكامل
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-mono">
                              {new Date(sale.createdAt).toLocaleDateString('ar-EG')} - {new Date(sale.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex justify-between items-center pt-0.5">
                            <div className="text-gray-600 dark:text-gray-300 text-[11px]">
                              <span className="font-semibold text-gray-800 dark:text-[#E8E1CE]">
                                {sale.lines?.map((l) => l.finishedProduct?.name || l.rawMaterial?.name || 'صنف').join(', ')}
                              </span>
                            </div>
                            <div className="text-end">
                              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block">إجمالي: {tot.toFixed(2)} ج.م</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#263A2A]">
                            <button
                              onClick={() => sendWhatsAppInvoice(sale)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 font-semibold"
                            >
                              <Send size={12} className="text-emerald-600" /> واتساب
                            </button>
                            <button
                              onClick={() => handleManualPrint(sale)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-brand-sage/15 hover:bg-brand-sage/25 text-brand-forest dark:text-brand-sand flex items-center gap-1 font-semibold"
                            >
                              <Printer size={12} /> طباعة
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <Pagination
                      currentPage={statementPaidPagination.currentPage}
                      totalPages={statementPaidPagination.totalPages}
                      totalItems={statementPaidPagination.totalItems}
                      itemsPerPage={statementPaidPagination.itemsPerPage}
                      onPageChange={statementPaidPagination.setCurrentPage}
                      onItemsPerPageChange={statementPaidPagination.setItemsPerPage}
                    />
                  </>
                )
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-[#263A2A]">
              <button
                onClick={() => setActiveCustomerPhone(null)}
                className="px-5 py-2 bg-gray-100 dark:bg-[#1A281E] hover:bg-gray-200 dark:hover:bg-[#263A2A] text-gray-700 dark:text-[#E8E1CE] rounded-xl text-xs font-bold"
              >
                إغلاق كشف الحساب
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Invoice Confirmation Dialog (Portaled) */}
      {deleteTargetSale && createPortal(
        <div className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131E17] max-w-md w-full rounded-2xl p-6 shadow-2xl border border-rose-200 dark:border-rose-900/40 space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-[#F5EFE0]">تأكيد حذف الفاتورة</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">الفاتورة رقم #{deleteTargetSale.receiptNumber}</p>
              </div>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold leading-relaxed">
              هل أنت تأكد من رغبتك في حذف الفاتورة رقم <strong className="text-rose-600">#{deleteTargetSale.receiptNumber}</strong> المسجلة باسم <strong className="text-gray-900 dark:text-[#F5EFE0]">{deleteTargetSale.customerName || 'عميل'}</strong> نهائياً من قاعدة البيانات؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#263A2A]">
              <button
                onClick={() => setDeleteTargetSale(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1A281E] transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteSaleMutation.mutate(deleteTargetSale._id)}
                disabled={deleteSaleMutation.isPending}
                className="px-4 py-2 text-xs font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                {deleteSaleMutation.isPending ? 'جاري الحذف...' : 'حذف الفاتورة نهائياً'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Settle Remaining Payment Modal (Portaled) */}
      {settleSaleTarget && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131E17] w-full max-w-md rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-[#263A2A] space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#263A2A] pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <DollarSign className="w-5 h-5" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-[#F5EFE0]">
                  تحصيل الدفعة المتبقية — فاتورة #{settleSaleTarget.receiptNumber}
                </h3>
              </div>
              <button onClick={() => setSettleSaleTarget(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 dark:bg-[#1A281E] p-3 rounded-xl space-y-1">
                <div className="flex justify-between text-gray-600 dark:text-[#E8E1CE]">
                  <span>العميل:</span>
                  <strong className="text-gray-900 dark:text-[#F5EFE0]">{settleSaleTarget.customerName}</strong>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-[#E8E1CE]">
                  <span>المبلغ المتبقي الحالي:</span>
                  <strong className="text-rose-600 text-sm">{(settleSaleTarget.remainingAmount ?? 0).toFixed(2)} ج.م</strong>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-[#E8E1CE] mb-1 font-bold">المبلغ المحصل الآن (ج.م)</label>
                <input
                  type="number"
                  min={0.01}
                  max={settleSaleTarget.remainingAmount ?? 0}
                  step="any"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-500 font-bold text-sm bg-white dark:bg-brand-slate text-emerald-800 dark:text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-[#E8E1CE] mb-1 font-medium">ملاحظات التحصيل (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: تحصيل نقدي عبر الكاشير"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#263A2A] bg-white dark:bg-brand-slate text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#263A2A]">
              <button
                onClick={() => setSettleSaleTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-[#D5C7A3] hover:bg-gray-100 dark:hover:bg-[#1A281E] rounded-xl"
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={settlePaymentMutation.isPending || !settleAmount || settleAmount <= 0}
                onClick={() => settlePaymentMutation.mutate()}
                className="btn-primary px-5 py-2 text-xs font-bold disabled:opacity-50"
              >
                {settlePaymentMutation.isPending ? t('common.loading') : 'تاكيد السداد والتحصيل'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Printable Invoice Modal (Portaled) */}
      {printSale && createPortal(
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div
            id="printable-receipt-modal"
            className="bg-white text-slate-900 rounded-2xl p-4 sm:p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto space-y-3 sm:space-y-4 shadow-2xl relative my-auto border border-slate-200 animate-in fade-in zoom-in-95 text-right rtl:text-right"
          >
            <button
              onClick={() => setPrintSale(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 print-hide"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-1 border-b border-slate-200 pb-3">
              <h2 className="font-display text-2xl font-bold text-slate-800">
                {settings?.storeName || 'مصنع ومتاجر بوتانيكا'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">فاتورة بيع — رقم #{printSale.receiptNumber}</p>
              <div className="text-xs text-slate-600 flex justify-between pt-2">
                <span>التاريخ: {new Date(printSale.createdAt).toLocaleDateString('ar-EG')}</span>
                <span>الوقت: {new Date(printSale.createdAt).toLocaleTimeString('ar-EG')}</span>
              </div>
              <div className="text-xs text-slate-600 flex justify-between pt-0.5 font-semibold">
                <span>العميل: {printSale.customerName || 'عميل نقدي'}</span>
                <span>الكاشير: {typeof printSale.performedBy === 'object' ? printSale.performedBy?.fullName : (printSale.performedBy || user?.fullName || 'الكاشير')}</span>
              </div>
            </div>

            {/* Receipt Items Table */}
            <table className="w-full text-xs text-start border-collapse my-2">
              <thead>
                <tr className="border-b border-slate-300 font-bold text-slate-800">
                  <th className="py-1 text-start">اسم المنتج / الصنف</th>
                  <th className="py-1 text-center">الكمية</th>
                  <th className="py-1 text-end">السعر</th>
                  <th className="py-1 text-end">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {printSale.lines?.map((line, index) => {
                  const itemName = line.finishedProduct?.name || line.rawMaterial?.name || (line as any).name || 'منتج';
                  const unitLabel = line.unit ? ` ${line.unit}` : '';
                  return (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-2 font-semibold text-slate-800">{itemName}</td>
                      <td className="py-2 text-center font-medium">{line.quantity}{unitLabel}</td>
                      <td className="py-2 text-end">{line.unitPriceAtSale.toFixed(2)}</td>
                      <td className="py-2 text-end font-bold">{(line.quantity * line.unitPriceAtSale).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Receipt Pricing & Payment Status Totals */}
            <div className="border-t border-slate-300 pt-2 space-y-1 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{(printSale.subtotal || printSale.totalAmount || printSale.total || 0).toFixed(2)} ج.م</span>
              </div>
              {printSale.discount > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>الخصم:</span>
                  <span>-{printSale.discount.toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-1">
                <span>الإجمالي النهائي:</span>
                <span>{(printSale.totalAmount || printSale.total || 0).toFixed(2)} ج.م</span>
              </div>

              {/* Payment Details on Receipt */}
              <div className="bg-slate-50 p-2 rounded-lg space-y-1 mt-2 text-[11px] border border-slate-200">
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>المبلغ المدفوع:</span>
                  <span>{(printSale.paidAmount ?? printSale.totalAmount ?? printSale.total ?? 0).toFixed(2)} ج.م</span>
                </div>
                {(printSale.remainingAmount ?? 0) > 0 ? (
                  <div className="flex justify-between text-red-600 font-extrabold border-t border-slate-200 pt-1">
                    <span>المتبقي آجل على العميل:</span>
                    <span>{printSale.remainingAmount?.toFixed(2)} ج.م</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-1">
                    <span>حالة الدفع:</span>
                    <span>خالص / مدفوع بالكامل</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-200 font-medium">
              شكراً لزيارتكم {settings?.storeName || 'بوتانيكا'} — نتمنى لكم صحة وجمالاً دائماً!
            </div>

            <div className="flex gap-2 pt-3 print-hide">
              <button
                onClick={() => setPrintSale(null)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs hover:bg-slate-50 font-medium"
              >
                إغلاق
              </button>
              <button
                onClick={() => sendWhatsAppInvoice(printSale)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Send size={14} /> إرسال عبر الواتساب
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Printer size={14} /> طباعة
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
