import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';
import Customer from '@/models/Customer';
import Receipt from '@/models/Receipt';

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
  const customer = (searchParams.get('customer') || '').trim();
  const store = (searchParams.get('store') || '').trim();
  const product = (searchParams.get('product') || '').trim();
  const from = (searchParams.get('from') || '').trim();
  const to = (searchParams.get('to') || '').trim();
  const toDate = to ? new Date(to + 'T23:59:59.999Z') : new Date();
    
    const query: any = { balance: { $gt: 0 } }; // Only unpaid invoices
    if (customer) {
      // Resolve customer filter across multiple fields and support both exact and partial matches
      const custRegex = new RegExp(customer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matches = await Customer.find({
        $or: [
          { code: custRegex },
          { person: custRegex },
          { description: custRegex },
        ],
      }, { _id: 1, code: 1, person: 1, description: 1 }).lean();
      const keys = new Set<string>();
      for (const m of matches) {
        if (m._id) keys.add(String(m._id));
        if (m.code) keys.add(String(m.code));
        if (m.person) keys.add(String(m.person));
        if (m.description) keys.add(String(m.description));
      }
      // Combine $in and regex to be robust to how invoices store the customer
      query.$or = [
        { customer: custRegex },
        ...(keys.size ? [{ customer: { $in: Array.from(keys) } }] : []),
      ];
    }
    if (store) {
      const storeRegex = new RegExp(`^${store}$`, 'i');
      query['items.store'] = storeRegex;
    }
    if (product) {
      const prodRegex = new RegExp(product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query['items.product'] = prodRegex;
    }
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }
    
    // Aggregate to customer-level summary. If product/store filters are present,
    // allocate receive/balance proportionally to matched items' value.
    const useItemFilter = !!(store || product);

    const pipeline: any[] = [];
    // Outstanding as of toDate: consider all sales up to toDate
    const matchStage: any = { date: { $lte: toDate } };
    if (customer) {
      // Keep same robust customer $or matching as above in find-query path
      const custRegex = new RegExp(customer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matches = await Customer.find({
        $or: [ { code: custRegex }, { person: custRegex }, { description: custRegex } ],
      }, { _id: 1, code: 1, person: 1, description: 1 }).lean();
      const keys = new Set<string>();
      for (const m of matches) {
        if (m._id) keys.add(String(m._id));
        if (m.code) keys.add(String(m.code));
        if (m.person) keys.add(String(m.person));
        if (m.description) keys.add(String(m.description));
      }
      if (keys.size) {
        pipeline.push({ $match: { ...matchStage, customer: { $in: Array.from(keys) } } });
      } else {
        pipeline.push({ $match: { ...matchStage, customer: custRegex } });
      }
    } else {
      pipeline.push({ $match: matchStage });
    }

    if (useItemFilter) {
      const itemCond: any = {};
      if (store) itemCond.store = new RegExp(`^${store}$`, 'i');
      if (product) itemCond.product = new RegExp(product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      pipeline.push(
        { $addFields: {
            itemsAllValue: { $sum: { $map: { input: { $ifNull: ['$items', []] }, as: 'it', in: { $ifNull: ['$$it.value', 0] } } } },
            itemsFiltered: {
              $filter: { input: { $ifNull: ['$items', []] }, as: 'it', cond: {
                $and: [
                  ...(itemCond.store ? [{ $regexMatch: { input: '$$it.store', regex: itemCond.store } }] : []),
                  ...(itemCond.product ? [{ $regexMatch: { input: '$$it.product', regex: itemCond.product } }] : []),
                ]
              } }
            },
          } },
        { $addFields: {
            itemsMatchValue: { $sum: { $map: { input: '$itemsFiltered', as: 'it', in: { $ifNull: ['$$it.value', 0] } } } },
            _proportion: {
              $cond: [
                { $gt: ['$itemsAllValue', 0] },
                { $divide: ['$itemsMatchValue', '$itemsAllValue'] },
                0
              ]
            }
          } },
        { $project: {
            customer: 1,
            invInvoiced: '$itemsMatchValue',
            invReceived: { $round: [{ $multiply: [{ $ifNull: ['$receive', 0] }, '$_proportion'] }, 2] },
            invBalance: { $round: [{ $multiply: [{ $ifNull: ['$balance', 0] }, '$_proportion'] }, 2] },
          } }
      );
    } else {
      pipeline.push({ $project: {
        customer: 1,
        invInvoiced: { $ifNull: ['$netAmount', 0] },
        // We'll compute received via Receipts collection; include invoice.receive too
        invReceived: { $ifNull: ['$receive', 0] },
        invBalance: { $ifNull: ['$balance', 0] },
      } });
    }

    pipeline.push({ $group: {
      _id: '$customer',
      totalInvoiced: { $sum: { $ifNull: ['$invInvoiced', 0] } },
      amountReceived: { $sum: { $ifNull: ['$invReceived', 0] } },
      balanceDue: { $sum: { $ifNull: ['$invBalance', 0] } },
    } });

    pipeline.push({ $sort: { balanceDue: -1, totalInvoiced: -1 } });

    const summary = await SaleInvoice.aggregate(pipeline).exec();

    // Receipts up to toDate (cash/bank/cheque), only for customers
    const receiptsAgg = await Receipt.aggregate([
      { $match: { date: { $lte: toDate }, partyType: 'Customer' } },
      { $group: { _id: '$partyId', amount: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).exec();

    // Map customer keys to display names
    const custKeys = Array.from(new Set([
      ...summary.map((r: any) => String(r._id || '')).filter(Boolean),
      ...receiptsAgg.map((r: any) => String(r._id || '')).filter(Boolean),
    ]));
    let custDocs: any[] = [];
    // Helper to normalize WhatsApp phone (digits only, with country code). Defaults PK if local pattern.
    const normalizePhone = (p?: string): string | undefined => {
      let d = String(p || '').replace(/\D/g, '');
      if (!d) return undefined;
      if (d.startsWith('0092')) d = '92' + d.slice(4);
      if (d.startsWith('0') && d.length === 11) return '92' + d.slice(1); // 03xxxxxxxxx
      if (!d.startsWith('0') && d.length === 10 && d[0] === '3') return '92' + d; // 3xxxxxxxxx
      if (d.startsWith('92') && d.length === 12) return d; // already E.164 for PK
      if (!d.startsWith('0') && d.length >= 8 && d.length <= 15) return d; // other countries
      return d || undefined;
    };

    if (custKeys.length) {
      const objectIdKeys = custKeys.filter(k => /^[0-9a-fA-F]{24}$/.test(k));
      const codeKeys = custKeys.filter(k => !/^[0-9a-fA-F]{24}$/.test(k));
      const or: any[] = [];
      if (objectIdKeys.length) or.push({ _id: { $in: objectIdKeys } });
      if (codeKeys.length) or.push({ code: { $in: codeKeys } });
      if (or.length) {
        custDocs = await Customer.find(
          { $or: or },
          { _id: 1, code: 1, person: 1, description: 1, phone: 1, mobile: 1 }
        ).lean();
      }
    }

    const custInfoMap = new Map<string, { name: string; phone?: string; waPhone?: string }>();
    for (const c of custDocs) {
      const name = String(c.person || c.description || c.code || '');
      const phone = String((c as any).mobile || (c as any).phone || '').trim() || undefined;
      const waPhone = normalizePhone(phone);
      if (c._id) custInfoMap.set(String(c._id), { name, phone, waPhone });
      if (c.code) custInfoMap.set(String(c.code), { name, phone, waPhone });
    }

    // Build receipts map by display name and keep phone mapping
    const receiptByName = new Map<string, number>();
    const phoneByName = new Map<string, string | undefined>();
    const waPhoneByName = new Map<string, string | undefined>();
    for (const rc of receiptsAgg as any[]) {
      const info = custInfoMap.get(String(rc._id));
      const name = info?.name || String(rc._id || '');
      const prev = receiptByName.get(name) || 0;
      receiptByName.set(name, prev + (rc.amount || 0));
      if (info?.phone) phoneByName.set(name, info.phone);
      if (info?.waPhone) waPhoneByName.set(name, info.waPhone);
    }

    // Merge invoices summary and receipts using display name as key
  const rowsMap = new Map<string, { customer: string; totalInvoiced: number; amountReceived: number; balanceDue: number; phone?: string; waPhone?: string }>();

    for (const r of summary as any[]) {
      const info = custInfoMap.get(String(r._id));
      const name = info?.name || String(r._id || 'N/A');
      const received = (r.amountReceived || 0) + (receiptByName.get(name) || 0);
      const phone = info?.phone || phoneByName.get(name);
      const waPhone = info?.waPhone || waPhoneByName.get(name) || normalizePhone(phone);
      rowsMap.set(name, {
        customer: name,
        totalInvoiced: Math.round(r.totalInvoiced || 0),
        amountReceived: Math.round(received),
        balanceDue: Math.round(Math.max(0, (r.totalInvoiced || 0) - received)),
        phone,
        waPhone,
      });
    }

    // Include customers that only have receipts (no sales in date range)
    for (const [name, amt] of receiptByName.entries()) {
      if (!rowsMap.has(name)) {
        rowsMap.set(name, {
          customer: name,
          totalInvoiced: 0,
          amountReceived: Math.round(amt),
          balanceDue: 0,
          phone: phoneByName.get(name),
          waPhone: waPhoneByName.get(name),
        });
      }
    }

    // If no explicit customer filter is provided, include all customers (even zero rows)
    if (!customer) {
      const allCustomers = await Customer.find({}, { _id: 1, code: 1, person: 1, description: 1, phone: 1, mobile: 1 }).lean();
      for (const c of allCustomers as any[]) {
        const name = String(c.person || c.description || c.code || '');
        if (!name) continue;
        if (!rowsMap.has(name)) {
          const phone = String(c.mobile || c.phone || '').trim() || undefined;
          const waPhone = normalizePhone(phone);
          rowsMap.set(name, { customer: name, totalInvoiced: 0, amountReceived: 0, balanceDue: 0, phone, waPhone });
        }
      }
    }

    let rows = Array.from(rowsMap.values()).sort((a, b) => (b.balanceDue - a.balanceDue) || (b.totalInvoiced - a.totalInvoiced));

    // If a specific customer filter string is provided, ensure only matching names are returned
    if (customer) {
      const rx = new RegExp(customer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      rows = rows.filter(r => rx.test(r.customer));
    }
    
    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Error fetching receivables:', error);
    return NextResponse.json({ rows: [] });
  }
}
