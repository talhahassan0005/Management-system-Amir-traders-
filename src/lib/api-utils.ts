import { NextRequest, NextResponse } from 'next/server';

// API Response utilities
export class ApiResponse {
  static success(data: any, status = 200) {
    return NextResponse.json(data, { status });
  }

  static error(message: string, status = 500, details?: any) {
    return NextResponse.json(
      { 
        error: message, 
        ...(details && { details }),
        timestamp: new Date().toISOString()
      }, 
      { status }
    );
  }

  static validationError(errors: string[]) {
    return NextResponse.json(
      { 
        error: 'Validation failed', 
        details: errors,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }

  static notFound(resource = 'Resource') {
    return NextResponse.json(
      { 
        error: `${resource} not found`,
        timestamp: new Date().toISOString()
      },
      { status: 404 }
    );
  }

  static unauthorized(message = 'Unauthorized') {
    return NextResponse.json(
      { 
        error: message,
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    );
  }

  static forbidden(message = 'Forbidden') {
    return NextResponse.json(
      { 
        error: message,
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    );
  }
}

// Request parsing utilities
export class RequestParser {
  static getPaginationParams(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
  }

  static getSearchParams(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    return {
      search: searchParams.get('search') || '',
      filter: searchParams.get('filter') || '',
      sort: searchParams.get('sort') || '-createdAt',
      ...this.getPaginationParams(request)
    };
  }

  static async getBody(request: NextRequest) {
    try {
      return await request.json();
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }
}

// Database query utilities
export class QueryBuilder {
  static buildSearchQuery(search: string, filter: string, searchFields: string[]) {
    if (!search) return {};

    const regex = { $regex: search, $options: 'i' };

    if (filter && searchFields.includes(filter)) {
      return { [filter]: regex };
    }

    return {
      $or: searchFields.map(field => ({ [field]: regex }))
    };
  }

  static buildSortQuery(sort: string) {
    if (!sort) return { createdAt: 'desc' } as Record<string, 'asc' | 'desc'>;

    const direction: 'asc' | 'desc' = sort.startsWith('-') ? 'desc' : 'asc';
    const field = sort.replace(/^-/, '');

    return { [field]: direction } as Record<string, 'asc' | 'desc'>;
  }
}

// Error handling utilities
export class ErrorHandler {
  static handleMongoError(error: any) {
    console.error('MongoDB Error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return ApiResponse.validationError(validationErrors);
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      return ApiResponse.error(
        `Duplicate ${field}: ${error.keyValue?.[field] || 'value'}`,
        409
      );
    }

    if (error.name === 'CastError') {
      return ApiResponse.error('Invalid ID format', 400);
    }

    return ApiResponse.error('Database operation failed', 500, error.message);
  }

  static handleAsyncError(handler: Function) {
    return async (request: NextRequest, ...args: any[]) => {
      try {
        return await handler(request, ...args);
      } catch (error: any) {
        console.error('API Error:', error);
        
        if (error.message === 'Invalid JSON in request body') {
          return ApiResponse.error('Invalid request body', 400);
        }

        return ApiResponse.error('Internal server error', 500, error.message);
      }
    };
  }
}

// Performance monitoring
export class PerformanceMonitor {
  static async measureTime<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      console.log(`${operationName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  }
}

// Cache utilities
export class CacheUtils {
  static getCacheHeaders(maxAge = 300) {
    return {
      'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=60`,
      'CDN-Cache-Control': `max-age=${maxAge}`,
      'Vercel-CDN-Cache-Control': `max-age=${maxAge}`,
    };
  }

  static getNoCacheHeaders() {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }
}
