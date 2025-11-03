import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { emitStockUpdated } from '@/lib/cross-tab-event-bus';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const filter = searchParams.get('filter');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Use MongoDB
    let query = {};
    
    if (search && filter) {
      switch (filter) {
        case 'Item':
          query = { item: { $regex: search, $options: 'i' } };
          break;
        case 'Description':
          query = { description: { $regex: search, $options: 'i' } };
          break;
        case 'Grams':
          query = { grams: parseInt(search) || 0 };
          break;
        case 'Brand':
          query = { brand: { $regex: search, $options: 'i' } };
          break;
        case 'Category':
          query = { category: { $regex: search, $options: 'i' } };
          break;
        default:
          query = {
            $or: [
              { item: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
              { brand: { $regex: search, $options: 'i' } },
              { category: { $regex: search, $options: 'i' } }
            ]
          };
      }
    }
    
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Product.countDocuments(query);
    console.log(`✅ Fetched ${products.length} products from MongoDB`);
    
    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    // Use MongoDB
    const product = new Product(body);
    await product.save();
    console.log('✅ Product created in MongoDB');
    
    // Emit stock updated event
    emitStockUpdated();
    
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
