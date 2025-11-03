import { SortOrder } from 'mongoose';
import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import SaleInvoice from '@/models/SaleInvoice';
import { 
  ApiResponse, 
  RequestParser, 
  QueryBuilder, 
  ErrorHandler, 
  PerformanceMonitor,
  CacheUtils 
} from '@/lib/api-utils';

export const GET = ErrorHandler.handleAsyncError(async (request: NextRequest) => {
  await dbConnect();
  
  const { search, filter, page, limit, skip, sort } = RequestParser.getSearchParams(request);
  
  // Build query
  const searchFields = ['invoiceNumber', 'customer', 'description'];
  const query = QueryBuilder.buildSearchQuery(search, filter, searchFields);
  const sortQuery = QueryBuilder.buildSortQuery(sort) as { [key: string]: SortOrder };
  
  // Execute queries in parallel for better performance
  const [invoices, total] = await Promise.all([
    PerformanceMonitor.measureTime(
      () => SaleInvoice.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean() // Use lean() for better performance
        .exec(),
      'Fetch sale invoices'
    ),
    PerformanceMonitor.measureTime(
      () => SaleInvoice.countDocuments(query),
      'Count sale invoices'
    )
  ]);
  
  const hasMore = (page * limit) < total;
  
  const response = {
    invoices,
    pagination: {
      page,
      limit,
      total,
      hasMore
    }
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...CacheUtils.getNoCacheHeaders()
    }
  });
});

export const POST = ErrorHandler.handleAsyncError(async (request: NextRequest) => {
  await dbConnect();
  
  const body = await RequestParser.getBody(request);
  
  // Validate required fields
  const validationErrors: string[] = [];
  if (!body.customer) validationErrors.push('Customer is required');
  if (!body.paymentType) validationErrors.push('Payment type is required');
  
  if (validationErrors.length > 0) {
    return ApiResponse.validationError(validationErrors);
  }
  
  // Sanitize and transform data
  const sanitizedBody = { ...body };
  
  // Convert date strings to Date objects
  if (sanitizedBody.date && typeof sanitizedBody.date === 'string') {
    sanitizedBody.date = new Date(sanitizedBody.date);
  }
  if (sanitizedBody.biltyDate && typeof sanitizedBody.biltyDate === 'string') {
    sanitizedBody.biltyDate = new Date(sanitizedBody.biltyDate);
  }
  
  // Sanitize numeric fields
  if (sanitizedBody.netAmount != null) {
    sanitizedBody.netAmount = Number(sanitizedBody.netAmount) || 0;
  }
  if (sanitizedBody.totalAmount != null) {
    sanitizedBody.totalAmount = Number(sanitizedBody.totalAmount) || 0;
  }
  
  const savedInvoice = await PerformanceMonitor.measureTime(
    () => SaleInvoice.create(sanitizedBody),
    'Create sale invoice'
  );
  
  return ApiResponse.success(savedInvoice, 201);
});
