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
    // Pre-range queries (to compute opening balance prior to 'from')
    const preRange: any = {};
    if (from) {
      const preTo = new Date(from);
      preTo.setHours(0,0,0,0);
      preTo.setMilliseconds(preTo.getMilliseconds() - 1); // just before the day starts
      preRange.$lte = preTo;
    }
    const payPreQuery: any = { partyType };
    const recPreQuery: any = { partyType };
    if (!(partyId.toLowerCase?.() === 'all')) { payPreQuery.partyId = partyId; recPreQuery.partyId = partyId; }
    if (from) { payPreQuery.date = preRange; recPreQuery.date = preRange; }
    const preInvQuery: any = from ? { date: preRange } : {};
    const prePiQuery: any = from ? { date: preRange } : {};
    // If single party, filter invoices by party too
    if (!isAll && partyType === 'Customer') {
      const cust = await Customer.findById(partyId).lean();
      if ((cust as any)?.person) {
        invQuery.customer = (cust as any).person;
        preInvQuery.customer = (cust as any).person;
      } else if ((cust as any)?.description) {
        invQuery.customer = (cust as any).description;
        preInvQuery.customer = (cust as any).description;
      }
    }
    if (!isAll && partyType === 'Supplier') {
      const sup = await Supplier.findById(partyId).lean();
      if (sup) {
        console.log('Found supplier document:', sup);
        // Try to match by multiple fields: person, description, or code
        const matchCriteria = [];
        if ((sup as any)?.person) matchCriteria.push((sup as any).person);
        if ((sup as any)?.description) matchCriteria.push((sup as any).description);
        if ((sup as any)?.code) matchCriteria.push((sup as any).code);
        
        if (matchCriteria.length > 0) {
          piQuery.supplier = { $in: matchCriteria };
          prePiQuery.supplier = { $in: matchCriteria };
          console.log('Supplier match criteria:', matchCriteria);
        } else {
          // If no matching fields, search by the supplier ID itself as a string
          piQuery.supplier = partyId;
          prePiQuery.supplier = partyId;
        }
      } else {
        console.log('Supplier not found, using partyId directly:', partyId);
        // If supplier document not found, try the partyId directly
        piQuery.supplier = partyId;
        prePiQuery.supplier = partyId;
      }
    }
    const [payments, receipts, saleInvoices, purchaseInvoices, prePayments, preReceipts, preSales, prePurchases] = await Promise.all([
      Payment.find(payQuery).sort({ date: 1 }),
      Receipt.find(recQuery).sort({ date: 1 }),
      SaleInvoice.find(partyType === 'Customer' ? invQuery : { _id: null }).sort({ date: 1 }),
      PurchaseInvoice.find(partyType === 'Supplier' ? piQuery : { _id: null }).sort({ date: 1 }),
      // Pre-range data
      Payment.find(from ? payPreQuery : { _id: null }).sort({ date: 1 }),
      Receipt.find(from ? recPreQuery : { _id: null }).sort({ date: 1 }),
      SaleInvoice.find(from && partyType === 'Customer' ? preInvQuery : { _id: null }).sort({ date: 1 }),
      PurchaseInvoice.find(from && partyType === 'Supplier' ? prePiQuery : { _id: null }).sort({ date: 1 }),
    ]);

    console.log('Ledger query results:');
    console.log('- Purchase query:', JSON.stringify(piQuery));
    console.log('- Purchase invoices found:', purchaseInvoices.length);
    console.log('- Payments found:', payments.length);
    console.log('- Receipts found:', receipts.length);
    if (purchaseInvoices.length > 0) {
      console.log('- Sample purchase invoice:', {
        invoiceNumber: purchaseInvoices[0].invoiceNumber,
        supplier: purchaseInvoices[0].supplier,
        totalAmount: purchaseInvoices[0].totalAmount
      });
    }

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
    const preRows: Row[] = [];
    
    // Add payments/receipts with direction based on party type
    // For Customer ledger: Sale = debit, Payment (money received from customer) = credit, Receipt = credit
    // For Supplier ledger: Purchase = credit, Payment (money paid to supplier) = debit, Receipt = credit
    const pushPayment = (arr: Row[], p: any) => arr.push({ 
      date: p.date, 
      type: 'Payment', 
      voucher: p.voucherNumber, 
      debit: partyType === 'Supplier' ? p.amount : 0, 
      credit: partyType === 'Customer' ? p.amount : 0,
      itemName: p.notes || 'Payment'
    });
    payments.forEach(p => pushPayment(rows, p));
    prePayments.forEach(p => pushPayment(preRows, p));
    
    const pushReceipt = (arr: Row[], r: any) => arr.push({ 
      date: r.date, 
      type: 'Receipt', 
      voucher: r.receiptNumber, 
      debit: 0, 
      credit: r.amount,
      itemName: r.notes || 'Receipt'
    });
    receipts.forEach(r => pushReceipt(rows, r));
    preReceipts.forEach(r => pushReceipt(preRows, r));
    
    // Add sale invoices - COMBINED per invoice (not per item)
    const handleSaleInvoices = (source: any[], target: Row[]) => {
      source.forEach(si => {
        const paymentType = String((si as any).paymentType || '').toLowerCase();
        const isCreditSale = paymentType === 'credit';
        const isCashSale = paymentType === 'cash';
        
        // Calculate totals across all items
        let totalAmount = 0;
        let totalQty = 0;
        let totalWeight = 0;
        const itemNames: string[] = [];
        
        if (si.items && si.items.length > 0) {
          si.items.forEach((item: any) => {
            totalAmount += Number(item.value || 0);
            totalQty += Number(item.pkt || 0);
            totalWeight += Number(item.weight || 0);
            if (item.description) {
              itemNames.push(item.description);
            }
          });
        } else {
          totalAmount = si.netAmount || si.totalAmount || 0;
          totalWeight = si.totalWeight || 0;
        }
        
        // Single combined entry per invoice
        const itemName = itemNames.length > 0 
          ? `Sale Invoice (${itemNames.length} items)` 
          : 'Sale Invoice';
        
        if (isCreditSale) {
          // Credit sale: customer owes money (debit)
          target.push({
            date: si.date,
            type: 'Sale',
            voucher: si.invoiceNumber,
            debit: totalAmount,
            credit: 0,
            qty: totalQty,
            weight: totalWeight,
            itemName,
            rate: 0,
            reelNo: ''
          });
        } else if (isCashSale) {
          // Cash sale: add both sale (debit) and payment received (credit) to balance out
          target.push({
            date: si.date,
            type: 'Sale',
            voucher: si.invoiceNumber,
            debit: totalAmount,
            credit: 0,
            qty: totalQty,
            weight: totalWeight,
            itemName,
            rate: 0,
            reelNo: ''
          });
          target.push({
            date: si.date,
            type: 'Payment',
            voucher: si.invoiceNumber + '-CASH',
            debit: 0,
            credit: totalAmount,
            qty: 0,
            weight: 0,
            itemName: 'Cash Payment',
            rate: 0,
            reelNo: ''
          });
        } else {
          // Default behavior for other payment types
          target.push({
            date: si.date,
            type: 'Sale',
            voucher: si.invoiceNumber,
            debit: totalAmount,
            credit: 0,
            qty: totalQty,
            weight: totalWeight,
            itemName,
            rate: 0,
            reelNo: ''
          });
        }
      });
    };
    if (partyType === 'Customer') {
      handleSaleInvoices(saleInvoices as any[], rows);
      if (from) handleSaleInvoices(preSales as any[], preRows);
    }
    
    // Add purchase invoices - COMBINED per invoice (not per item)
    const handlePurchaseInvoices = (source: any[], target: Row[]) => {
      source.forEach(pi => {
        // Calculate totals across all items
        let totalAmount = 0;
        let totalQty = 0;
        let totalWeight = 0;
        const itemNames: string[] = [];
        
        if (pi.items && pi.items.length > 0) {
          pi.items.forEach((item: any) => {
            const qty = Number(item.qty || item.pkt || 0);
            const wt = Number(item.weight || 0);
            const rate = Number(item.rate || 0);
            const basis = (item.rateOn === 'Quantity') ? 'Quantity' : 'Weight';
            const computed = (typeof item.value === 'number' && !Number.isNaN(item.value))
              ? Number(item.value)
              : (basis === 'Quantity' ? rate * qty : rate * wt);
            
            totalAmount += Number(computed || 0);
            totalQty += qty;
            totalWeight += wt;
            
            if (item.description || item.product) {
              itemNames.push(item.description || item.product);
            }
          });
        } else {
          totalAmount = pi.netAmount || pi.totalAmount || 0;
          totalWeight = pi.totalWeight || 0;
        }
        
        // Single combined entry per invoice
        const itemName = itemNames.length > 0 
          ? `Purchase Invoice (${itemNames.length} items)` 
          : 'Purchase Invoice';
        
        target.push({
          date: pi.date,
          type: 'Purchase',
          voucher: pi.invoiceNumber,
          debit: 0,
          credit: totalAmount,
          qty: totalQty,
          weight: totalWeight,
          itemName,
          rate: 0,
          reelNo: ''
        });
      });
    };
    if (partyType === 'Supplier') {
      handlePurchaseInvoices(purchaseInvoices as any[], rows);
      if (from) handlePurchaseInvoices(prePurchases as any[], preRows);
    }
    
    // Calculate opening balance (before 'from')
    preRows.sort((a,b) => +a.date - +b.date);
    let openingBalance = 0;
    preRows.forEach(r => { openingBalance += (r.debit || 0) - (r.credit || 0); });

    rows.sort((a,b) => +a.date - +b.date);

    let balance = openingBalance; // start from opening balance
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

    console.log('Ledger built successfully, returning', ledger.length, 'entries', 'Opening:', openingBalance.toFixed(2));
    return NextResponse.json({ openingBalance, ledger });
  } catch (error) {
    console.error('Error building ledger:', error);
    return NextResponse.json({ error: 'Failed to build ledger: ' + (error as any)?.message || 'Unknown error' }, { status: 500 });
  }
}
