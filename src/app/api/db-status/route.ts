import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
import dbConnect, { isConnected, getConnectionStatus } from '@/lib/mongodb';

export async function GET() {
  try {
    // Try to connect to MongoDB
    try {
      await dbConnect();
      
      const connected = isConnected();
      const connectionState = getConnectionStatus();
      
      if (connected) {
        return NextResponse.json({
          status: 'connected',
          database: 'MongoDB',
          connectionState: connectionState,
          message: '✅ MongoDB is connected and working',
          uri: process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@') || 'Not configured',
          timestamp: new Date().toISOString(),
        });
      } else {
        return NextResponse.json({
          status: 'disconnected',
          database: 'Mock Database',
          connectionState: connectionState,
          message: '⚠️ MongoDB not available, using mock database',
          fallback: 'Using JSON file-based mock database for development',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      return NextResponse.json({
        status: 'error',
        database: 'Mock Database',
        connectionState: 'fallback',
        message: '❌ MongoDB connection failed, using mock database',
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using JSON file-based mock database for development',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      database: 'Unknown',
      message: '❌ Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
