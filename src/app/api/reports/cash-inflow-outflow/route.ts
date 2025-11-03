import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Receipt from '@/models/Receipt';
import Payment from '@/models/Payment';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';

function fmtDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const from = (searchParams.get('from') || '').trim();
    const to = (searchParams.get('to') || '').trim();
    const customerQ = (searchParams.get('customer') || '').trim();
    const toDate = to ? new Date(to + 'T23:59:59.999Z') : new Date();
    const fromDate = from ? new Date(from + 'T00:00:00.000Z') : null;

    // Resolve customer keys if a customer filter is provided
    let customerKeys: string[] = [];
    let customerRegex: RegExp | null = null;
    if (customerQ) {
      customerRegex = new RegExp(customerQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matches = await Customer.find({
        $or: [{ code: customerRegex }, { person: customerRegex }, { description: customerRegex }],
      }, { _id: 1, code: 1, person: 1, description: 1 }).lean();
      const keys = new Set<string>();
      for (const m of matches) {
        if (m._id) keys.add(String(m._id));
        if (m.code) keys.add(String(m.code));
        if (m.person) keys.add(String(m.person));
        if (m.description) keys.add(String(m.description));
      }
      customerKeys = Array.from(keys);
    }

    // Build base matches
    const dateMatch: any = { $lte: toDate };
    if (fromDate) dateMatch.$gte = fromDate;

    const receiptMatch: any = { date: dateMatch };
    const paymentMatch: any = { date: dateMatch };

    if (customerQ) {
      // Restrict to customer-related flows only when a customer is specified
      receiptMatch.partyType = 'Customer';
      paymentMatch.partyType = 'Customer';
      if (customerKeys.length) {
        receiptMatch.partyId = { $in: customerKeys };
        paymentMatch.partyId = { $in: customerKeys };
      } else if (customerRegex) {
        receiptMatch.partyId = customerRegex;
        paymentMatch.partyId = customerRegex;
      }
    }

    const [receipts, payments] = await Promise.all([
      Receipt.find(receiptMatch, { date: 1, partyId: 1, partyType: 1, amount: 1, mode: 1 }).lean(),
      Payment.find(paymentMatch, { date: 1, partyId: 1, partyType: 1, amount: 1, mode: 1 }).lean(),
    ]);

    // Collect party keys to resolve names for pretty descriptions
    const custKeys = Array.from(new Set([
      ...receipts.filter(r => r.partyType === 'Customer').map(r => String(r.partyId || '')),
      ...payments.filter(p => p.partyType === 'Customer').map(p => String(p.partyId || '')),
    ].filter(Boolean)));
    const suppKeys = Array.from(new Set([
      ...receipts.filter(r => r.partyType === 'Supplier').map(r => String(r.partyId || '')),
      ...payments.filter(p => p.partyType === 'Supplier').map(p => String(p.partyId || '')),
    ].filter(Boolean)));

    const [custDocs, suppDocs] = await Promise.all([
      custKeys.length ? Customer.find({ $or: [
        { _id: { $in: custKeys.filter(k => /^[0-9a-fA-F]{24}$/.test(k)) } },
        { code: { $in: custKeys.filter(k => !/^[0-9a-fA-F]{24}$/.test(k)) } },
      ] }, { _id: 1, code: 1, person: 1, description: 1 }).lean() : [],
      suppKeys.length ? Supplier.find({ $or: [
        { _id: { $in: suppKeys.filter(k => /^[0-9a-fA-F]{24}$/.test(k)) } },
        { code: { $in: suppKeys.filter(k => !/^[0-9a-fA-F]{24}$/.test(k)) } },
      ] }, { _id: 1, code: 1, person: 1, description: 1 }).lean() : [],
    ]);

    const nameMap = new Map<string, string>();
    for (const c of custDocs as any[]) {
      const name = String(c.person || c.description || c.code || '').trim();
      if (c._id) nameMap.set(String(c._id), name);
      if (c.code) nameMap.set(String(c.code), name);
    }
    for (const s of suppDocs as any[]) {
      const name = String(s.person || s.description || s.code || '').trim();
      if (s._id) nameMap.set(String(s._id), name);
      if (s.code) nameMap.set(String(s.code), name);
    }

    // Build rows
    const rows: Array<{ date: string; type: 'inflow' | 'outflow'; description: string; inflow?: number; outflow?: number }> = [];
    for (const r of receipts as any[]) {
      rows.push({
        date: fmtDate(new Date(r.date)),
        type: 'inflow',
        description: `Receipt from ${nameMap.get(String(r.partyId)) || r.partyId || r.partyType} (${r.mode})`,
        inflow: Math.round(r.amount || 0),
      });
    }
    for (const p of payments as any[]) {
      rows.push({
        date: fmtDate(new Date(p.date)),
        type: 'outflow',
        description: `Payment to ${nameMap.get(String(p.partyId)) || p.partyId || p.partyType} (${p.mode})`,
        outflow: Math.round(p.amount || 0),
      });
    }

    // Sort by date asc, inflow before outflow on same day
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));

    return NextResponse.json({ rows });
  } catch (e) {
    console.error('Error in cash-inflow-outflow:', e);
    return NextResponse.json({ rows: [] });
  }
}
