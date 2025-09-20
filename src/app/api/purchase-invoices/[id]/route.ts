import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PurchaseInvoice from '@/models/PurchaseInvoice';

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const invoice = await PurchaseInvoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
    }
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching purchase invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase invoice' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = await ctx.params;
    const invoice = await PurchaseInvoice.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!invoice) {
      return NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
    }
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating purchase invoice:', error);
    return NextResponse.json({ error: 'Failed to update purchase invoice' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await ctx.params;
    const invoice = await PurchaseInvoice.findByIdAndDelete(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Purchase invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase invoice:', error);
    return NextResponse.json({ error: 'Failed to delete purchase invoice' }, { status: 500 });
  }
}
