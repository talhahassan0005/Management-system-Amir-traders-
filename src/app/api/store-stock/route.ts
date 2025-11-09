import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import SaleInvoice from '@/models/SaleInvoice';
import Product from '@/models/Product';
import Store from '@/models/Store';
import Stock from '@/models/Stock';
import Production from '@/models/Production';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const storeFilter = (searchParams.get('store') || '').trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const skip = (page - 1) * limit;

    const matchPurchase: any = {};
    const matchSale: any = {};
    if (storeFilter) {
      matchPurchase['items.store'] = storeFilter;
      matchSale['items.store'] = storeFilter;
    }

    const [purchases, sales] = await Promise.all([
      PurchaseInvoice.aggregate([
        { $unwind: '$items' },
        ...(storeFilter ? [{ $match: matchPurchase }] as any[] : []),
        // Group by store, product and reelNo when available so each reel becomes its own row
        { $group: {
          _id: { store: '$items.store', product: '$items.product', reelNo: { $ifNull: ['$items.reelNo', ''] } },
          purchasedQty: { $sum: { $ifNull: ['$items.qty', 0] } },
          purchasedWeight: { $sum: { $ifNull: ['$items.weight', 0] } },
        }},
      ]).exec(),
      SaleInvoice.aggregate([
        { $unwind: '$items' },
        ...(storeFilter ? [{ $match: matchSale }] as any[] : []),
        // Group sales also by reelNo when present to avoid merging different reels
        { $group: {
          _id: { store: '$items.store', product: '$items.product', reelNo: { $ifNull: ['$items.reelNo', ''] } },
          soldQty: { $sum: { $ifNull: ['$items.pkt', 0] } },
          soldWeight: { $sum: { $ifNull: ['$items.weight', 0] } },
        }},
      ]).exec(),
    ]);

    type Key = string;
  const byKey = new Map<Key, any>();

    purchases.forEach((doc: any) => {
      const reel = doc._id.reelNo || '';
      const key = `${doc._id.store || ''}||${doc._id.product || ''}||${reel}`;
      const cur = byKey.get(key) || { store: doc._id.store || '', product: doc._id.product || '', purchasedQty: 0, purchasedWeight: 0, soldQty: 0, soldWeight: 0 };
      cur.purchasedQty += doc.purchasedQty || 0;
      cur.purchasedWeight += doc.purchasedWeight || 0;
      // preserve reelNo so later we can display it per-row
      (cur as any)._reelNo = reel;
      byKey.set(key, cur);
    });

    sales.forEach((doc: any) => {
      const reel = doc._id.reelNo || '';
      const key = `${doc._id.store || ''}||${doc._id.product || ''}||${reel}`;
      const cur = byKey.get(key) || { store: doc._id.store || '', product: doc._id.product || '', purchasedQty: 0, purchasedWeight: 0, soldQty: 0, soldWeight: 0 };
      cur.soldQty += doc.soldQty || 0;
      cur.soldWeight += doc.soldWeight || 0;
      (cur as any)._reelNo = reel;
      byKey.set(key, cur);
    });

    // Merge in Production movements (items to output store, materialOut from source stores)
    try {
      // Pull all productions; we'll filter by store name after mapping
      const prods = await Production.find({}, { items: 1, materialOut: 1, outputStoreId: 1 }).lean();

      // Prepare caches for id->name/item resolution
      const allProdIds = new Set<string>();
      const allStoreIds = new Set<string>();
      for (const pr of prods) {
        if (Array.isArray(pr.items)) {
          for (const it of pr.items as any[]) allProdIds.add(String(it.productId));
        }
        if (Array.isArray(pr.materialOut)) {
          for (const mo of pr.materialOut as any[]) {
            allProdIds.add(String(mo.productId));
            allStoreIds.add(String(mo.storeId));
          }
        }
        allStoreIds.add(String((pr as any).outputStoreId));
      }

      const [prodDocs, storeDocs] = await Promise.all([
        allProdIds.size ? Product.find({ _id: { $in: Array.from(allProdIds) } }).lean() : [],
        allStoreIds.size ? Store.find({ _id: { $in: Array.from(allStoreIds) } }).lean() : [],
      ] as any);
      const pById = new Map<string, any>((prodDocs as any[]).map((p: any) => [String(p._id), p]));
      const sById = new Map<string, any>((storeDocs as any[]).map((s: any) => [String(s._id), s]));

      for (const pr of prods as any[]) {
        const outStoreName = sById.get(String(pr.outputStoreId))?.store || '';

        // Items produced into output store: treat as purchased into that store
        if (Array.isArray(pr.items)) {
          for (const it of pr.items) {
            const itemCode = pById.get(String(it.productId))?.item || '';
            if (!outStoreName || !itemCode) continue;
            const reel = it.reelNo || '';
            const key = `${outStoreName}||${itemCode}||${reel}`;
            const cur = byKey.get(key) || { store: outStoreName, product: itemCode, purchasedQty: 0, purchasedWeight: 0, soldQty: 0, soldWeight: 0 };
            cur.purchasedQty += Number(it.quantityPkts || 0);
            cur.purchasedWeight += Number(it.weightKg || 0);
            (cur as any)._reelNo = reel;
            byKey.set(key, cur);
          }
        }

        // Material moved out from source stores: treat as production-out (subtract later)
        if (Array.isArray(pr.materialOut)) {
          for (const mo of pr.materialOut) {
            const moStoreName = sById.get(String(mo.storeId))?.store || '';
            const itemCode = pById.get(String(mo.productId))?.item || '';
            if (!moStoreName || !itemCode) continue;
            const reel = mo.reelNo || '';
            const key = `${moStoreName}||${itemCode}||${reel}`;
            const cur = byKey.get(key) || { store: moStoreName, product: itemCode, purchasedQty: 0, purchasedWeight: 0, soldQty: 0, soldWeight: 0 };
            // Stash production-out as a separate field to subtract in current
            (cur as any)._prodOutQty = Number((cur as any)._prodOutQty || 0) + Number(mo.quantityPkts || 0);
            (cur as any)._prodOutWeight = Number((cur as any)._prodOutWeight || 0) + Number(mo.weightKg || 0);
            (cur as any)._reelNo = reel;
            byKey.set(key, cur);
          }
        }
      }
    } catch (e) {
      console.warn('store-stock: failed merging Production movements', e);
    }

    // Merge in current stock from Stock collection so stores with stock but
    // no direct purchase/sale rows are still represented.
    // no direct purchase/sale rows are still represented.
    try {
      // Pull all stocks; we'll filter by store name later
      const stocks = await Stock.find({}).lean();
      if (stocks && stocks.length) {
        const productIds = Array.from(new Set(stocks.map((s: any) => String(s.productId))));
        const storeIds = Array.from(new Set(stocks.map((s: any) => String(s.storeId))));
        const [productsFromIds, storesFromIds] = await Promise.all([
          productIds.length ? Product.find({ _id: { $in: productIds } }).lean() : [],
          storeIds.length ? Store.find({ _id: { $in: storeIds } }).lean() : [],
        ] as any);
        const pById = new Map<string, any>((productsFromIds as any[]).map((p: any) => [String(p._id), p]));
        const sById = new Map<string, any>((storesFromIds as any[]).map((s: any) => [String(s._id), s]));

        stocks.forEach((s: any) => {
          const storeName = (sById.get(String(s.storeId))?.store) || '';
          const productItem = (pById.get(String(s.productId))?.item) || '';
          if (!storeName || !productItem) return;
          const reel = s.reelNo || '';
          const key: string = `${storeName}||${productItem}||${reel}`;
          const cur = byKey.get(key) || { store: storeName, product: productItem, purchasedQty: 0, purchasedWeight: 0, soldQty: 0, soldWeight: 0 };
          // Keep purchase/sale aggregates if present; ensure current quantities reflect Stock
          const currentQtyFromStock = Number(s.quantityPkts || 0);
          const currentWeightFromStock = Number(s.weightKg || 0);
          // Stash computed values temporarily on the record
          (cur as any)._currentQtyFromStock = currentQtyFromStock;
          (cur as any)._currentWeightFromStock = currentWeightFromStock;
          (cur as any)._reelNo = reel;
          byKey.set(key, cur);
        });
      }
    } catch (e) {
      console.warn('store-stock: failed merging Stock docs', e);
    }
  // Recompute rows after merging Stock docs
  const rows = Array.from(byKey.values());
  const items = rows.map(r => r.product).filter(Boolean);
    const products = items.length ? await Product.find({ item: { $in: items } }).lean() : [];
    const productByItem = new Map<string, any>(products.map((p: any) => [p.item, p]));

    let data = rows.map((r) => {
      const p = productByItem.get(r.product) || {};
      // Prefer explicit current from Stock merge if available, otherwise purchases - sales
  const prodOutQty = Number((r as any)._prodOutQty || 0);
  const prodOutWeight = Number((r as any)._prodOutWeight || 0);
  const computedQty = Number(r.purchasedQty || 0) - Number(r.soldQty || 0) - prodOutQty;
  const computedWeight = Number(r.purchasedWeight || 0) - Number(r.soldWeight || 0) - prodOutWeight;
  const currentQty = (r as any)._currentQtyFromStock !== undefined ? Number((r as any)._currentQtyFromStock) : computedQty;
  const currentWeight = (r as any)._currentWeightFromStock !== undefined ? Number((r as any)._currentWeightFromStock) : computedWeight;
      return {
        store: r.store || '',
        itemCode: r.product || '',
        description: p.description || '',
        brand: p.brand || '',
        category: p.category || '',
        type: p.type || '',
        length: p.length || 0,
        width: p.width || 0,
        grams: p.grams || 0,
        purchasedQty: r.purchasedQty || 0,
        soldQty: r.soldQty || 0,
        currentQty,
        purchasedWeight: r.purchasedWeight || 0,
        soldWeight: r.soldWeight || 0,
        currentWeight,
        reelNo: (r as any)._reelNo || '',
        // Add pricing and stock level information from Product model
        salePriceQt: p.salePriceQt || 0,
        salePriceKg: p.salePriceKg || 0,
        costRateQty: p.costRateQty || 0,
        minStockLevel: p.minStockLevel || 0,
        maxStockLevel: p.maxStockLevel || 0,
      };
    }).sort((a, b) => a.store.localeCompare(b.store) || a.itemCode.localeCompare(b.itemCode));

    // Include placeholder rows for stores with no data so they still appear
    try {
      const activeStores = await Store.find(storeFilter ? { store: storeFilter } : { status: 'Active' }).lean();
      const presentStores = new Set<string>(data.map(d => d.store));
      const placeholders = (activeStores || []).filter((s: any) => !!s?.store && !presentStores.has(s.store)).map((s: any) => ({
        store: s.store,
        itemCode: '-',
        description: '',
        brand: '',
        category: '',
        type: '',
        length: 0,
        width: 0,
        grams: 0,
        purchasedQty: 0,
        soldQty: 0,
        currentQty: 0,
        purchasedWeight: 0,
        soldWeight: 0,
        currentWeight: 0,
        reelNo: '',
        salePriceQt: 0,
        salePriceKg: 0,
        costRateQty: 0,
        minStockLevel: 0,
        maxStockLevel: 0,
      }));
      if (placeholders.length) {
        data = [...data, ...placeholders].sort((a, b) => a.store.localeCompare(b.store) || a.itemCode.localeCompare(b.itemCode));
      }
    } catch (e) {
      console.warn('store-stock: failed adding placeholders', e);
    }

    // Apply store filter by display name if provided
    if (storeFilter) {
      data = data.filter(d => d.store === storeFilter);
    }

    const total = data.length;
    const paginatedData = data.slice(skip, skip + limit);
    const hasMore = (page * limit) < total;

    return NextResponse.json({ data: paginatedData, pagination: { hasMore } });
  } catch (error: any) {
    console.error('Error building store stock:', error);
    return NextResponse.json({ error: 'Failed to build store stock: ' + (error.message || 'Unknown error') }, { status: 500 });
  }
}


