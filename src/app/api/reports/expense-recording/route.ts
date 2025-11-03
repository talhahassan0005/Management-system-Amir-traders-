import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';

function fmtDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function inferCategory(p: any): string {
  const notes = String(p?.notes || '').trim();
  // accept "category: X" pattern inside notes
  const m = notes.match(/category\s*[:=]\s*([^;,-]+)/i);
  if (m && m[1]) return m[1].trim();
  if (p?.partyType === 'Supplier') return 'Supplier Payment';
  if (p?.partyType === 'Customer') return 'Customer Refund';
  return 'Payment';
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

    const dateMatch: any = { $lte: toDate };
    if (fromDate) dateMatch.$gte = fromDate;

    const match: any = { date: dateMatch };
    if (customerQ) {
      match.partyType = 'Customer';
      if (customerKeys.length) match.partyId = { $in: customerKeys };
      else if (customerRegex) match.partyId = customerRegex;
    }

    const payments = await Payment.find(match, { date: 1, partyType: 1, partyId: 1, mode: 1, amount: 1, notes: 1 })
      .sort({ date: 1 })
      .lean();

    // Resolve names for description
    const custKeys = Array.from(new Set(payments.filter(p => p.partyType === 'Customer').map(p => String(p.partyId || ''))));
    const suppKeys = Array.from(new Set(payments.filter(p => p.partyType === 'Supplier').map(p => String(p.partyId || ''))));

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
      const nm = String(c.person || c.description || c.code || '').trim();
      if (c._id) nameMap.set(String(c._id), nm);
      if (c.code) nameMap.set(String(c.code), nm);
    }
    for (const s of suppDocs as any[]) {
      const nm = String(s.person || s.description || s.code || '').trim();
      if (s._id) nameMap.set(String(s._id), nm);
      if (s.code) nameMap.set(String(s.code), nm);
    }

    const rows = payments.map((p: any) => ({
      date: fmtDate(new Date(p.date)),
      category: inferCategory(p),
      description: `${p.mode} ${p.partyType === 'Supplier' ? 'to' : 'from'} ${nameMap.get(String(p.partyId)) || p.partyId || p.partyType}${p.notes ? ' - ' + p.notes : ''}`,
      amount: Math.round(p.amount || 0),
    }));

    return NextResponse.json({ rows });
  } catch (e) {
    console.error('Error in expense-recording:', e);
    return NextResponse.json({ rows: [] });
  }
}
