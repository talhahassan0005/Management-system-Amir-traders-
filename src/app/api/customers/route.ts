import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import eventBus from '@/lib/event-bus';
import Counter from '@/models/Counter';
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
  
  // Build query with field mapping
  const searchFields = ['code', 'description', 'business', 'city'];
  const query = QueryBuilder.buildSearchQuery(search, filter, searchFields);
  const sortQuery = QueryBuilder.buildSortQuery(sort);
  
  // Execute queries in parallel
  const [customers, total] = await Promise.all([
    PerformanceMonitor.measureTime(
      () => Customer.find(query)
        .sort(sortQuery as any)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      'Fetch customers'
    ),
    PerformanceMonitor.measureTime(
      () => Customer.countDocuments(query),
      'Count customers'
    )
  ]);
  
  const hasMore = (page * limit) < total;
  
  const response = {
    customers,
    pagination: {
      page,
      limit,
      total,
      hasMore
    }
  };  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...CacheUtils.getNoCacheHeaders()
    }
  });
});

export const POST = ErrorHandler.handleAsyncError(async (request: NextRequest) => {
  try {
    await dbConnect();
    const body = await RequestParser.getBody(request);

    // Sanitize and validate data
    const sanitizedBody: any = { ...body };

    // Sanitize numeric fields
    if (sanitizedBody.creditDays != null) sanitizedBody.creditDays = Number(sanitizedBody.creditDays) || 0;
    if (sanitizedBody.creditLimit != null) sanitizedBody.creditLimit = Number(sanitizedBody.creditLimit) || 0;

    // Sanitize string fields
    if (typeof sanitizedBody.description === 'string') sanitizedBody.description = sanitizedBody.description.trim();
    if (typeof sanitizedBody.code === 'string' && sanitizedBody.code.trim().length === 0) delete sanitizedBody.code; // Let server generate

    // Basic required checks
    if (!sanitizedBody.description || String(sanitizedBody.description).trim().length === 0) {
      return ApiResponse.validationError(['Customer description is required']);
    }

    // Generate customer code using atomic counter to avoid duplicates
    if (!sanitizedBody.code) {
      const counter = await Counter.findByIdAndUpdate(
        'customer',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      sanitizedBody.code = `24-06-${String((counter?.seq || 1)).padStart(6, '0')}`;
    }

    // Retry small loop in the unlikely case of duplicate key race
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const customer = await Customer.create(sanitizedBody);
        // Emit SSE event
        try { eventBus.emit('customers:changed'); } catch {}
        return ApiResponse.success(customer, 201);
      } catch (err: any) {
        if (err?.code === 11000 && !body.code) {
          // regenerate and retry
          const counter = await Counter.findByIdAndUpdate('customer', { $inc: { seq: 1 } }, { new: true, upsert: true });
          sanitizedBody.code = `24-06-${String((counter?.seq || 1)).padStart(6, '0')}`;
          continue;
        }
        throw err;
      }
    }
    throw new Error('Could not generate unique code after retries');
  } catch (error: any) {
    return ErrorHandler.handleMongoError(error);
  }
});
