import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Stock from '@/models/Stock';
import Product from '@/models/Product';
import Store from '@/models/Store';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const storeFilter = (searchParams.get('store') || '').trim();
    const toParam = (searchParams.get('to') || '').trim();
    const toDate = toParam ? new Date(toParam + 'T23:59:59.999Z') : new Date();

    // INVENTORY (asset) — WAC-based valuation up to toDate, store optional (empty = all stores)
    // Build stock query (by store if provided)
    let storeIds: string[] | undefined;
    if (storeFilter) {
      const stores = await Store.find({ store: new RegExp(`^${storeFilter}$`, 'i') }, { _id: 1 }).lean();
      storeIds = stores.map((s: any) => String(s._id));
      if (!storeIds.length) {
        // No matching store, return empty balance sheet
        return NextResponse.json({ assets: [], liabilities: [], equity: [] });
      }
    }

    const stockQuery: any = {};
    if (storeIds) stockQuery.storeId = { $in: storeIds };

    const stocks = await Stock.find(stockQuery).lean();

    // Preload product/store maps for names and product item codes
    const pIds = Array.from(new Set(stocks.map((s: any) => String(s.productId))));
    const sIds = Array.from(new Set(stocks.map((s: any) => String(s.storeId))));
    const [products, stores] = await Promise.all([
      Product.find({ _id: { $in: pIds } }, { item: 1, costRateQty: 1 }).lean(),
      Store.find({ _id: { $in: sIds } }, { store: 1 }).lean(),
    ]);
    const pById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));
    const sById = new Map<string, any>(stores.map((s: any) => [String(s._id), s]));

    // Build WAC cost map from purchases up to toDate per store+product
    const PurchaseInvoice = (await import('@/models/PurchaseInvoice')).default;
    const storeNames = sIds.map((id) => (sById.get(id)?.store || '')).filter(Boolean);
    const productItems = pIds.map((id) => (pById.get(id)?.item || '')).filter(Boolean);
    type Key = string;
    const costMap = new Map<Key, { _wacQty: number; _wacWeight: number; _wacValue: number }>();
    if (productItems.length) {
      const matchStage: any = { date: { $lte: toDate }, 'items.product': { $in: productItems } };
      if (storeNames.length) matchStage['items.store'] = { $in: storeNames };
      const wacAgg = await PurchaseInvoice.aggregate([
        { $unwind: '$items' },
        { $match: matchStage },
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
        { $group: {
            _id: { store: '$store', product: '$product' },
            totalQty: { $sum: { $ifNull: ['$qty', 0] } },
            totalWeight: { $sum: { $ifNull: ['$weight', 0] } },
            totalValue: { $sum: '$_valueNorm' },
          } },
      ]).exec();
      for (const r of wacAgg as any[]) {
        const key = `${r._id.store || ''}||${r._id.product}`;
        costMap.set(key, { _wacQty: r.totalQty || 0, _wacWeight: r.totalWeight || 0, _wacValue: r.totalValue || 0 });
      }
    }

    // Sum inventory value using WAC per product per store
    let inventoryValue = 0;
    for (const s of stocks as any[]) {
      const p = pById.get(String(s.productId)) || {};
      const st = sById.get(String(s.storeId)) || {};
      const item = p.item || '';
      const storeName = st.store || '';
      const qty = Number(s.quantityPkts || 0);
      const weight = Number(s.weightKg || 0);
      let perKg = 0;
      // prefer WAC per kg
      const info = costMap.get(`${storeName}||${item}`) || costMap.get(`||${item}`) /* if store missing on purchases */;
      if (info && info._wacWeight > 0 && info._wacValue > 0) perKg = info._wacValue / info._wacWeight;
      // fallback via per-qty costRateQty -> convert to perKg if possible
      if (!perKg) {
        const fallbackPerQty = Number(p.costRateQty || 0);
        if (fallbackPerQty > 0 && qty > 0 && weight > 0) {
          perKg = fallbackPerQty * (qty / weight);
        }
      }
      const value = (perKg && weight) ? perKg * weight : 0;
      inventoryValue += value;
    }
    inventoryValue = Math.round(inventoryValue);

    // ACCOUNTS RECEIVABLE (asset): Sales up to date minus receipts from customers up to date
    const SaleInvoice = (await import('@/models/SaleInvoice')).default;
    const Receipt = (await import('@/models/Receipt')).default;
    const salesAgg = await SaleInvoice.aggregate([
      { $match: { date: { $lte: toDate } } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$netAmount', 0] } } } },
    ]).exec();
    const totalSales = salesAgg?.[0]?.amount || 0;
    const custReceiptsAgg = await Receipt.aggregate([
      { $match: { date: { $lte: toDate }, partyType: 'Customer' } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();
    const totalCustomerReceipts = custReceiptsAgg?.[0]?.amount || 0;
    const accountsReceivable = Math.max(0, Math.round(totalSales - totalCustomerReceipts));

    // CASH/BANK (asset): receipts (cash/bank) - payments (cash/bank)
    const Payment = (await import('@/models/Payment')).default;
    const cashInAgg = await Receipt.aggregate([
      { $match: { date: { $lte: toDate }, mode: { $in: ['Cash', 'Bank'] } } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();
    const cashOutAgg = await Payment.aggregate([
      { $match: { date: { $lte: toDate }, mode: { $in: ['Cash', 'Bank'] } } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();
    const cashBank = Math.round((cashInAgg?.[0]?.amount || 0) - (cashOutAgg?.[0]?.amount || 0));

    // ACCOUNTS PAYABLE (liability): purchases up to date minus payments to suppliers up to date
    const purchasesAgg = await PurchaseInvoice.aggregate([
      { $match: { date: { $lte: toDate } } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$totalAmount', 0] } } } },
    ]).exec();
    const totalPurchases = purchasesAgg?.[0]?.amount || 0;
    const suppPaymentsAgg = await Payment.aggregate([
      { $match: { date: { $lte: toDate }, partyType: 'Supplier' } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();
    const totalSupplierPayments = suppPaymentsAgg?.[0]?.amount || 0;
    const accountsPayable = Math.max(0, Math.round(totalPurchases - totalSupplierPayments));

    // Compose arrays
    const assets = [
      { account: 'Inventory', amount: inventoryValue },
      { account: 'Accounts Receivable', amount: accountsReceivable },
      { account: 'Cash/Bank', amount: cashBank },
    ];

    const liabilities = [
      { account: 'Accounts Payable', amount: accountsPayable },
    ];

    const totalAssets = assets.reduce((s, a) => s + (a.amount || 0), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + (l.amount || 0), 0);
    const equityAmount = Math.round(totalAssets - totalLiabilities);
    const equity = [
      { account: 'Retained Earnings', amount: equityAmount },
    ];

    return NextResponse.json({ assets, liabilities, equity });
  } catch (err) {
    console.error('Balance sheet error:', err);
    return NextResponse.json({ assets: [], liabilities: [], equity: [] });
  }
}
