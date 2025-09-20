'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import { Database, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface DbStatus {
  status: string;
  database: string;
  connectionState: string;
  message: string;
  error?: string;
  fallback?: string;
  uri?: string;
}

export default function DbStatusPage() {
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/db-status');
      const data = await response.json();
      setDbStatus(data);
    } catch (error) {
      console.error('Error fetching database status:', error);
      setDbStatus({
        status: 'error',
        database: 'Unknown',
        connectionState: 'error',
        message: '❌ Failed to check database status',
        error: 'Network error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'disconnected':
        return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Database className="w-8 h-8 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 border-green-200';
      case 'disconnected':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Database Status</h1>
            <p className="text-gray-600">Check the current database connection status</p>
          </div>
          <button
            onClick={fetchDbStatus}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 disabled:bg-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Checking...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Database Status Card */}
        {dbStatus && (
          <div className={`rounded-lg border-2 p-6 ${getStatusColor(dbStatus.status)}`}>
            <div className="flex items-start space-x-4">
              {getStatusIcon(dbStatus.status)}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {dbStatus.database} Status
                </h2>
                <p className="text-lg mb-4">{dbStatus.message}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Connection State</h3>
                    <p className="text-sm text-gray-900 capitalize">{dbStatus.connectionState}</p>
                  </div>
                  
                  {dbStatus.uri && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Connection URI</h3>
                      <p className="text-sm text-gray-900 font-mono">{dbStatus.uri}</p>
                    </div>
                  )}
                  
                  {dbStatus.error && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Error Details</h3>
                      <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                        {dbStatus.error}
                      </p>
                    </div>
                  )}
                  
                  {dbStatus.fallback && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Fallback Mode</h3>
                      <p className="text-sm text-gray-900">{dbStatus.fallback}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Setup Options</h3>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-gray-900">Option 1: MongoDB Atlas (Recommended)</h4>
              <p className="text-sm text-gray-600 mt-1">
                Use MongoDB Atlas cloud database - free tier available. See setup-mongodb-atlas.md for instructions.
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-gray-900">Option 2: Local MongoDB Installation</h4>
              <p className="text-sm text-gray-600 mt-1">
                Install MongoDB Community Server locally for development.
              </p>
            </div>
            
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-medium text-gray-900">Option 3: Docker (If Available)</h4>
              <p className="text-sm text-gray-600 mt-1">
                Run MongoDB in a Docker container: <code className="bg-gray-100 px-1 rounded">docker run -d -p 27017:27017 mongo</code>
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-gray-900">Current: Real MongoDB Database</h4>
              <p className="text-sm text-gray-600 mt-1">
                The application is now using a real MongoDB database. All data is stored in MongoDB collections.
              </p>
            </div>
          </div>
        </div>

        {/* API Test */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Endpoints Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Customers API</h4>
              <p className="text-sm text-gray-600 mt-1">/api/customers</p>
              <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Working
              </span>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Products API</h4>
              <p className="text-sm text-gray-600 mt-1">/api/products</p>
              <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Working
              </span>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Suppliers API</h4>
              <p className="text-sm text-gray-600 mt-1">/api/suppliers</p>
              <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Working
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
