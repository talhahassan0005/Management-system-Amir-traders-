import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await ctx.params;
    const invoice = await SaleInvoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Sale invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching sale invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale invoice' },
      { status: 500 }
    );
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
    const invoice = await SaleInvoice.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Sale invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating sale invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update sale invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await ctx.params;
    const invoice = await SaleInvoice.findByIdAndDelete(id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Sale invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Sale invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete sale invoice' },
      { status: 500 }
    );
  }
}
