import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect from '@/lib/mongodb';
import Supplier from '@/models/Supplier';
import { ApiResponse, RequestParser, QueryBuilder, ErrorHandler, PerformanceMonitor, CacheUtils } from '@/lib/api-utils';
import eventBus from '@/lib/event-bus';
import Counter from '@/models/Counter';

export const GET = ErrorHandler.handleAsyncError(async (request: NextRequest) => {
  await dbConnect();

  const { search, filter, page, limit, skip, sort } = RequestParser.getSearchParams(request);
  const searchFields = ['code', 'description', 'business', 'city'];
  const query = QueryBuilder.buildSearchQuery(search, filter, searchFields);
  const sortQuery = QueryBuilder.buildSortQuery(sort);

  const [suppliers, total] = await Promise.all([
    PerformanceMonitor.measureTime(
      () => Supplier.find(query).sort(sortQuery).skip(skip).limit(limit).lean().exec(),
      'Fetch suppliers'
    ),
    PerformanceMonitor.measureTime(() => Supplier.countDocuments(query), 'Count suppliers')
  ]);

  return new Response(
    JSON.stringify({
      suppliers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CacheUtils.getNoCacheHeaders()
      }
    }
  );
});

export const POST = ErrorHandler.handleAsyncError(async (request: NextRequest) => {
  await dbConnect();
  const body = await RequestParser.getBody(request);
  const sanitized: any = { ...body };
  if (typeof sanitized.description === 'string') sanitized.description = sanitized.description.trim();
  if (!sanitized.description) return ApiResponse.validationError(['Supplier description is required']);
  // Allow model hook to produce code when absent
  if (typeof sanitized.code === 'string' && sanitized.code.trim().length === 0) delete sanitized.code;
  // Generate supplier code using atomic counter like customers when not provided
  if (!sanitized.code) {
    const counter = await Counter.findByIdAndUpdate(
      'supplier',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    sanitized.code = `11-02-${String(counter?.seq || 1).padStart(6, '0')}`;
  }
  const maxAttempts = 5;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const supplier = await Supplier.create(sanitized);
      try { eventBus.emit('suppliers:changed'); } catch {}
      return ApiResponse.success(supplier, 201);
    } catch (err: any) {
      const isDup = err?.code === 11000 || /E11000/i.test(err?.message || '');
      if (isDup) {
        // Regenerate new sequence code from counter and retry
        const counter = await Counter.findByIdAndUpdate(
          'supplier',
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        sanitized.code = `11-02-${String(counter?.seq || 1).padStart(6, '0')}`;
        continue;
      }
      if (err?.errors) {
        const messages = Object.values(err.errors).map((e: any) => e.message).filter(Boolean);
        if (messages.length) return ApiResponse.validationError(messages as string[]);
      }
      throw err;
    }
  }
  return ApiResponse.error('Could not generate a unique supplier code. Please try again.', 500);
});
