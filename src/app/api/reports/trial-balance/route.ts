import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

// Models are imported lazily where heavy

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const to = (searchParams.get('to') || '').trim();
    const toDate = to ? new Date(to + 'T23:59:59.999Z') : new Date();

    // Inventory valuation (WAC) as of date
    const Stock = (await import('@/models/Stock')).default;
    const Product = (await import('@/models/Product')).default;
    const Store = (await import('@/models/Store')).default;
    const PurchaseInvoice = (await import('@/models/PurchaseInvoice')).default;

    const stocks = await Stock.find({}).lean();
    const pIds = Array.from(new Set(stocks.map((s: any) => String(s.productId)).filter(Boolean)));
    const sIds = Array.from(new Set(stocks.map((s: any) => String(s.storeId)).filter(Boolean)));
    const [products, stores] = await Promise.all([
      Product.find({ _id: { $in: pIds } }, { item: 1, costRateQty: 1 }).lean(),
      Store.find({ _id: { $in: sIds } }, { store: 1 }).lean(),
    ]);
    const pById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));
    const sById = new Map<string, any>(stores.map((s: any) => [String(s._id), s]));

    // Build WAC map from purchases up to toDate
    const productItems = pIds.map((id) => (pById.get(id)?.item || '')).filter(Boolean);
    const storeNames = sIds.map((id) => (sById.get(id)?.store || '')).filter(Boolean);
    const wacAgg = productItems.length ? await PurchaseInvoice.aggregate([
      { $unwind: '$items' },
      { $match: { date: { $lte: toDate }, 'items.product': { $in: productItems }, ...(storeNames.length ? { 'items.store': { $in: storeNames } } : {}) } },
      { $project: {
          store: '$items.store',
          product: '$items.product',
          qty: { $ifNull: ['$items.qty', 0] },
          weight: { $ifNull: ['$items.weight', 0] },
          rate: { $ifNull: ['$items.rate', 0] },
          rateOn: { $ifNull: ['$items.rateOn', 'Weight'] },
          value: { $ifNull: ['$items.value', 0] },
        } },
      { $addFields: {
          _valueNorm: {
            $cond: [
              { $gt: ['$value', 0] },
              '$value',
              {
                $cond: [
                  { $eq: ['$rateOn', 'Quantity'] },
                  { $multiply: [{ $ifNull: ['$rate', 0] }, { $ifNull: ['$qty', 0] }] },
                  { $multiply: [{ $ifNull: ['$rate', 0] }, { $ifNull: ['$weight', 0] }] },
                ],
              },
            ],
          },
        } },
      { $group: { _id: { store: '$store', product: '$product' }, totalWeight: { $sum: { $ifNull: ['$weight', 0] } }, totalValue: { $sum: '$_valueNorm' } } },
    ]).exec() : [];
    const costMap = new Map<string, { w: number; v: number }>();
    for (const r of wacAgg as any[]) costMap.set(`${r._id.store || ''}||${r._id.product}`, { w: r.totalWeight || 0, v: r.totalValue || 0 });

    let inventoryValue = 0;
    for (const st of stocks as any[]) {
      const item = pById.get(String(st.productId))?.item || '';
      const store = sById.get(String(st.storeId))?.store || '';
      const weight = Number(st.weightKg || 0);
      const info = costMap.get(`${store}||${item}`) || costMap.get(`||${item}`);
      const perKg = info && info.w > 0 ? info.v / info.w : 0;
      if (perKg && weight) inventoryValue += perKg * weight;
    }
    inventoryValue = Math.round(inventoryValue);

    // Sales and cash/receipts/payments
    const SaleInvoice = (await import('@/models/SaleInvoice')).default;
    const Receipt = (await import('@/models/Receipt')).default;
    const Payment = (await import('@/models/Payment')).default;

    const salesAgg = await SaleInvoice.aggregate([
      { $match: { date: { $lte: toDate } } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$netAmount', 0] } } } },
    ]).exec();
    const totalSales = Math.round(salesAgg?.[0]?.amount || 0);

    const receiptsCustAgg = await Receipt.aggregate([
      { $match: { date: { $lte: toDate }, partyType: 'Customer' } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();
    const totalCustomerReceipts = Math.round(receiptsCustAgg?.[0]?.amount || 0);

    const cashInAgg = await Receipt.aggregate([
      { $match: { date: { $lte: toDate }, mode: { $in: ['Cash', 'Bank'] } } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();
    const cashOutAgg = await Payment.aggregate([
      { $match: { date: { $lte: toDate }, mode: { $in: ['Cash', 'Bank'] } } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();
    const cashBankNet = Math.round((cashInAgg?.[0]?.amount || 0) - (cashOutAgg?.[0]?.amount || 0));

    const purchasesAgg = await PurchaseInvoice.aggregate([
      { $match: { date: { $lte: toDate } } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$totalAmount', 0] } } } },
    ]).exec();
    const totalPurchases = Math.round(purchasesAgg?.[0]?.amount || 0);

    const supplierPaymentsAgg = await Payment.aggregate([
      { $match: { date: { $lte: toDate }, partyType: 'Supplier' } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();
    const totalSupplierPayments = Math.round(supplierPaymentsAgg?.[0]?.amount || 0);

    // Balances
    const arBal = Math.max(0, totalSales - totalCustomerReceipts); // receivable (debit)
    const apBal = Math.max(0, totalPurchases - totalSupplierPayments); // payable (credit)

    const accounts: Array<{ account: string; debit: number; credit: number }> = [];
    // Cash/Bank
    accounts.push({ account: 'Cash/Bank', debit: cashBankNet >= 0 ? cashBankNet : 0, credit: cashBankNet < 0 ? -cashBankNet : 0 });
    // Inventory
    accounts.push({ account: 'Inventory', debit: inventoryValue, credit: 0 });
    // Accounts Receivable
    if (arBal) accounts.push({ account: 'Accounts Receivable', debit: arBal, credit: 0 });
    // Accounts Payable
    if (apBal) accounts.push({ account: 'Accounts Payable', debit: 0, credit: apBal });
    // Sales Revenue (credit)
    if (totalSales) accounts.push({ account: 'Sales Revenue', debit: 0, credit: totalSales });

    // Balance accounts with Equity (plug)
    const totalDebit = accounts.reduce((s, a) => s + (a.debit || 0), 0);
    const totalCredit = accounts.reduce((s, a) => s + (a.credit || 0), 0);
    const diff = Math.round(totalDebit - totalCredit);
    if (diff !== 0) {
      if (diff > 0) accounts.push({ account: 'Equity (Balancing)', debit: 0, credit: diff });
      else accounts.push({ account: 'Equity (Balancing)', debit: -diff, credit: 0 });
    }

    const finalDebit = accounts.reduce((s, a) => s + (a.debit || 0), 0);
    const finalCredit = accounts.reduce((s, a) => s + (a.credit || 0), 0);

    return NextResponse.json({ accounts, totalDebit: finalDebit, totalCredit: finalCredit });
  } catch (e) {
    console.error('trial-balance error:', e);
    return NextResponse.json({ accounts: [], totalDebit: 0, totalCredit: 0 });
  }
}
