import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import Supplier from '@/models/Supplier';
import Payment from '@/models/Payment';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
  const supplierQ = (searchParams.get('supplier') || searchParams.get('customer') || '').trim();
    const store = (searchParams.get('store') || '').trim();
    const product = (searchParams.get('product') || '').trim();
    const from = (searchParams.get('from') || '').trim();
    const to = (searchParams.get('to') || '').trim();
    const toDate = to ? new Date(to + 'T23:59:59.999Z') : new Date();

    // Build robust supplier keys from Supplier collection
    let supplierKeys: string[] = [];
    let supplierRegex: RegExp | null = null;
    if (supplierQ) {
      supplierRegex = new RegExp(supplierQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matches = await Supplier.find({
        $or: [{ code: supplierRegex }, { person: supplierRegex }, { description: supplierRegex }],
      }, { _id: 1, code: 1, person: 1, description: 1 }).lean();
      const keys = new Set<string>();
      for (const m of matches) {
        if (m._id) keys.add(String(m._id));
        if (m.code) keys.add(String(m.code));
        if (m.person) keys.add(String(m.person));
        if (m.description) keys.add(String(m.description));
      }
      supplierKeys = Array.from(keys);
    }

    const useItemFilter = !!(store || product);

    const match: any = { date: { $lte: toDate } };
    if (supplierQ) {
      if (supplierKeys.length) match.supplier = { $in: supplierKeys };
      else match.supplier = supplierRegex!;
    }
    const pipeline: any[] = [{ $match: match }];

    if (useItemFilter) {
      const itemCond: any = {};
      if (store) itemCond.store = new RegExp(`^${store}$`, 'i');
      if (product) itemCond.product = new RegExp(product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      pipeline.push(
        { $addFields: {
            itemsFiltered: {
              $filter: {
                input: { $ifNull: ['$items', []] },
                as: 'it',
                cond: {
                  $and: [
                    ...(itemCond.store ? [{ $regexMatch: { input: '$$it.store', regex: itemCond.store } }] : []),
                    ...(itemCond.product ? [{ $regexMatch: { input: '$$it.product', regex: itemCond.product } }] : []),
                  ],
                },
              },
            },
          } },
        { $project: {
            supplier: 1,
            invPurchased: { $sum: { $map: { input: '$itemsFiltered', as: 'it', in: { $ifNull: ['$$it.value', 0] } } } },
          } },
      );
    } else {
      // Net amount approximation: totalAmount - discount + freight
      pipeline.push({ $project: {
        supplier: 1,
        invPurchased: {
          $add: [
            { $ifNull: ['$totalAmount', 0] },
            { $ifNull: ['$freight', 0] },
            { $multiply: [-1, { $ifNull: ['$discount', 0] }] },
          ],
        },
      } });
    }

    // Optional from filter
    if (from) {
      pipeline.unshift({ $match: { date: { $gte: new Date(from) } } });
    }

    pipeline.push({ $group: { _id: '$supplier', totalPurchased: { $sum: { $ifNull: ['$invPurchased', 0] } } } });

    const purchasedBySupplier = await PurchaseInvoice.aggregate(pipeline).exec();

    // Payments to suppliers up to date
    const paymentMatch: any = { date: { $lte: toDate }, partyType: 'Supplier' };
    if (supplierQ) {
      if (supplierKeys.length) paymentMatch.partyId = { $in: supplierKeys };
      else if (supplierRegex) paymentMatch.partyId = supplierRegex;
    }
    const paymentsAgg = await Payment.aggregate([
      { $match: paymentMatch },
      { $group: { _id: '$partyId', amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();

    // Map supplier keys to canonical display names and phones, and then consolidate
    const supKeys = Array.from(new Set([
      ...purchasedBySupplier.map((r: any) => String(r._id || '')).filter(Boolean),
      ...paymentsAgg.map((r: any) => String(r._id || '')).filter(Boolean),
    ]));

    // Prepare candidate tokens for matching (support strings like "Name (Desc)")
    const objectIdKeys = supKeys.filter(k => /^[0-9a-fA-F]{24}$/.test(k));
    const strKeys = supKeys.filter(k => !/^[0-9a-fA-F]{24}$/.test(k));
    const tokenSet = new Set<string>(strKeys);
    for (const s of strKeys) {
      const m = s.match(/^(.*?)\s*\((.*?)\)\s*$/);
      if (m) {
        if (m[1]) tokenSet.add(m[1].trim());
        if (m[2]) tokenSet.add(m[2].trim());
      }
    }

    let supDocs: any[] = [];
    {
      const or: any[] = [];
      if (objectIdKeys.length) or.push({ _id: { $in: objectIdKeys } });
      const tokens = Array.from(tokenSet);
      if (tokens.length) {
        or.push({ code: { $in: tokens } });
        or.push({ person: { $in: tokens } });
        or.push({ description: { $in: tokens } });
      }
      if (or.length) {
        supDocs = await Supplier.find({ $or: or }, { _id: 1, code: 1, person: 1, description: 1, phone: 1, mobile: 1 }).lean();
      }
    }

    // Build a rich name map: keys include _id, code, person, description, and "person (description)"
    const nameMap = new Map<string, { name: string; phone?: string }>();
    for (const s of supDocs) {
      const baseName = String(s.person || s.description || s.code || '').trim();
      const composite = s.person && s.description && s.person !== s.description
        ? `${String(s.person).trim()} (${String(s.description).trim()})`
        : baseName;
      const display = composite || baseName || String(s.code || '');
      const phone = String(s.mobile || s.phone || '').trim() || undefined;
      if (s._id) nameMap.set(String(s._id), { name: display, phone });
      if (s.code) nameMap.set(String(s.code), { name: display, phone });
      if (s.person) nameMap.set(String(s.person), { name: display, phone });
      if (s.description) nameMap.set(String(s.description), { name: display, phone });
      // also map composite explicitly
      if (composite) nameMap.set(composite, { name: display, phone });
    }

    // Aggregate purchases by canonical display name
    const totalsByName = new Map<string, { purchased: number; paid: number }>();
    for (const r of purchasedBySupplier as any[]) {
      const rawKey = String(r._id || '');
      const info = nameMap.get(rawKey);
      const name = (info?.name || rawKey || 'N/A') as string;
      const prev = totalsByName.get(name) || { purchased: 0, paid: 0 };
      prev.purchased += Math.round(r.totalPurchased || 0);
      totalsByName.set(name, prev);
    }

    // Merge payments using the same canonical names
    for (const p of paymentsAgg as any[]) {
      const info = nameMap.get(String(p._id));
      const name = (info?.name || String(p._id || '')) as string;
      const prev = totalsByName.get(name) || { purchased: 0, paid: 0 };
      prev.paid += Math.round(p.amount || 0);
      totalsByName.set(name, prev);
    }

    // If no supplier filter, include all suppliers with zero rows as well
    if (!supplierQ) {
      const allSuppliers = await Supplier.find({}, { _id: 1, code: 1, person: 1, description: 1 }).lean();
      for (const s of allSuppliers as any[]) {
        const baseName = String(s.person || s.description || s.code || '').trim();
        const composite = s.person && s.description && s.person !== s.description
          ? `${String(s.person).trim()} (${String(s.description).trim()})`
          : baseName;
        const display = composite || baseName;
        if (!display) continue;
        if (!totalsByName.has(display)) totalsByName.set(display, { purchased: 0, paid: 0 });
      }
    }

    let rows = Array.from(totalsByName.entries()).map(([name, t]) => ({
      supplier: name,
      totalPurchased: Math.round(t.purchased),
      amountPaid: Math.round(t.paid),
      balanceDue: Math.round(Math.max(0, (t.purchased || 0) - (t.paid || 0))),
    }));
    rows.sort((a, b) => (b.balanceDue - a.balanceDue) || (b.totalPurchased - a.totalPurchased));

    if (supplierQ) {
      const rx = new RegExp(supplierQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      rows = rows.filter(r => rx.test(r.supplier));
    }

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Error fetching payables:', error);
    return NextResponse.json({ rows: [] });
  }
}
