import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Receipt from '@/models/Receipt';
import SaleInvoice from '@/models/SaleInvoice';
import PurchaseInvoice from '@/models/PurchaseInvoice';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const partyType = searchParams.get('partyType') as 'Customer' | 'Supplier' | null;
    const partyId = searchParams.get('partyId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (!partyType || !partyId) return NextResponse.json({ error: 'partyType and partyId are required' }, { status: 400 });

    const range: any = {};
    if (from) {
      const d = new Date(from); d.setHours(0,0,0,0); range.$gte = d;
    }
    if (to) {
      const d = new Date(to); d.setHours(23,59,59,999); range.$lte = d;
    }

    const isAll = !partyId || partyId.toLowerCase?.() === 'all';
    const payQuery: any = { partyType };
    const recQuery: any = { partyType };
    if (!isAll) { payQuery.partyId = partyId; recQuery.partyId = partyId; }
    if (from || to) { payQuery.date = range; recQuery.date = range; }

    const invQuery: any = (from || to) ? { date: range } : {};
    const piQuery: any = (from || to) ? { date: range } : {};
    // If single party, filter invoices by party too
    if (!isAll && partyType === 'Customer') {
      const cust = await Customer.findById(partyId).lean();
      if (cust?.description) invQuery.customer = cust.description;
    }
    if (!isAll && partyType === 'Supplier') {
      const sup = await Supplier.findById(partyId).lean();
      if (sup?.description) piQuery.supplier = sup.description;
      if (sup?.code && !piQuery.supplier) piQuery.supplier = sup.code;
    }
    const [payments, receipts, saleInvoices, purchaseInvoices] = await Promise.all([
      Payment.find(payQuery).sort({ date: 1 }),
      Receipt.find(recQuery).sort({ date: 1 }),
      SaleInvoice.find(partyType === 'Customer' ? invQuery : { _id: null }).sort({ date: 1 }),
      PurchaseInvoice.find(partyType === 'Supplier' ? piQuery : { _id: null }).sort({ date: 1 }),
    ]);

    type Row = { 
      date: Date; 
      type: 'Payment' | 'Receipt' | 'Sale' | 'Purchase'; 
      voucher: string; 
      debit: number; 
      credit: number;
      qty?: number;
      weight?: number;
      itemName?: string;
      rate?: number;
      reelNo?: string;
    };
    
    const rows: Row[] = [];
    
    // Add payments/receipts with direction based on party type
    // For Customer ledger: Sale = debit, Payment (money received from customer) = credit, Receipt = credit
    // For Supplier ledger: Purchase = credit, Payment (money paid to supplier) = debit, Receipt = credit
    payments.forEach(p => rows.push({ 
      date: p.date, 
      type: 'Payment', 
      voucher: p.voucherNumber, 
      debit: partyType === 'Supplier' ? p.amount : 0, 
      credit: partyType === 'Customer' ? p.amount : 0,
      itemName: p.notes || 'Payment'
    }));
    
    receipts.forEach(r => rows.push({ 
      date: r.date, 
      type: 'Receipt', 
      voucher: r.receiptNumber, 
      debit: 0, 
      credit: r.amount,
      itemName: r.notes || 'Receipt'
    }));
    
    // Add sale invoices (debit by default; if paymentType is Credit, record as credit)
    if (partyType === 'Customer') {
      saleInvoices.forEach(si => {
        const isCreditSale = String((si as any).paymentType || '').toLowerCase() === 'credit';
        if (si.items && si.items.length > 0) {
          si.items.forEach((item: any) => {
            const amount = Number(item.value || 0);
            rows.push({
              date: si.date,
              type: 'Sale',
              voucher: si.invoiceNumber,
              debit: isCreditSale ? 0 : amount,
              credit: isCreditSale ? amount : 0,
              qty: item.pkt || 0,
              weight: item.weight || 0,
              itemName: item.description || '',
              rate: item.rate || 0,
              reelNo: item.reelNo || ''
            });
          });
        } else {
          // If no items, add the invoice total as a single entry
          rows.push({
            date: si.date,
            type: 'Sale',
            voucher: si.invoiceNumber,
            debit: isCreditSale ? 0 : (si.netAmount || si.totalAmount || 0),
            credit: isCreditSale ? (si.netAmount || si.totalAmount || 0) : 0,
            qty: 0,
            weight: si.totalWeight || 0,
            itemName: 'Sale Invoice',
            rate: 0,
            reelNo: ''
          });
        }
      });
    }
    
    // Add purchase invoices (credit entries for suppliers)
    if (partyType === 'Supplier') {
      purchaseInvoices.forEach(pi => {
        if (pi.items && pi.items.length > 0) {
          const tempRows: Row[] = [] as any;
          let itemsCreditTotal = 0;
          let qtyTotal = 0;
          let weightTotal = 0;
          pi.items.forEach((item: any) => {
            const qty = Number(item.qty || item.pkt || 0);
            const wt = Number(item.weight || 0);
            const rate = Number(item.rate || 0);
            const basis = (item.rateOn === 'Quantity') ? 'Quantity' : 'Weight';
            const computed = (typeof item.value === 'number' && !Number.isNaN(item.value))
              ? Number(item.value)
              : (basis === 'Quantity' ? rate * qty : rate * wt);
            itemsCreditTotal += Number(computed || 0);
            qtyTotal += qty;
            weightTotal += wt;
            tempRows.push({
              date: pi.date,
              type: 'Purchase',
              voucher: pi.invoiceNumber,
              debit: 0,
              credit: Number(computed || 0),
              qty,
              weight: wt,
              itemName: item.description || item.product || '',
              rate,
              reelNo: item.reelNo || ''
            });
          });
          if (itemsCreditTotal > 0) {
            tempRows.forEach(r => rows.push(r));
          } else {
            // Fallback for legacy invoices without rate/value: show as single total row
            rows.push({
              date: pi.date,
              type: 'Purchase',
              voucher: pi.invoiceNumber,
              debit: 0,
              credit: pi.netAmount || pi.totalAmount || 0,
              qty: qtyTotal || 0,
              weight: weightTotal || 0,
              itemName: 'Purchase Invoice',
              rate: 0,
              reelNo: ''
            });
          }
        } else {
          // If no items, add the invoice total as a single entry
          rows.push({
            date: pi.date,
            type: 'Purchase',
            voucher: pi.invoiceNumber,
            debit: 0,
            credit: pi.netAmount || pi.totalAmount || 0,
            qty: 0,
            weight: pi.totalWeight || 0,
            itemName: 'Purchase Invoice',
            rate: 0,
            reelNo: ''
          });
        }
      });
    }
    
    rows.sort((a,b) => +a.date - +b.date);

    let balance = 0; // positive = receivable, negative = payable (adjust as needed)
    const ledger = rows.map((r) => {
      balance += r.debit - r.credit;
      return { 
        date: r.date, 
        voucherNo: r.voucher, 
        debit: r.debit, 
        credit: r.credit, 
        balance,
        qty: r.qty,
        weight: r.weight,
        itemName: r.itemName,
        rate: r.rate,
        reelNo: r.reelNo
      };
    });

    console.log('Ledger built successfully, returning', ledger.length, 'entries');
    return NextResponse.json({ ledger });
  } catch (error) {
    console.error('Error building ledger:', error);
    return NextResponse.json({ error: 'Failed to build ledger: ' + error.message }, { status: 500 });
  }
}
