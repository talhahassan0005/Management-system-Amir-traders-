import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    const matchStage: any = {};
    if (from || to) {
      matchStage.date = {};
      if (from) matchStage.date.$gte = new Date(from);
      if (to) matchStage.date.$lte = new Date(to);
    }
    
    const pipeline = [
      ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          units: { $sum: { $ifNull: ['$items.pkt', 0] } },
          revenue: { $sum: { $multiply: [{ $ifNull: ['$items.pkt', 0] }, { $ifNull: ['$items.rate', 0] }] } }
        }
      },
      { $sort: { units: 1 } },
      { $limit: 50 }
    ];
    
    const results = await SaleInvoice.aggregate(pipeline as any).exec();
    
    const rows = results.map((r: any, idx: number) => ({
      rank: idx + 1,
      product: r._id || 'N/A',
      units: r.units || 0,
      revenue: r.revenue || 0
    }));
    
    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Error fetching low sale products:', error);
    return NextResponse.json({ rows: [] });
  }
}
