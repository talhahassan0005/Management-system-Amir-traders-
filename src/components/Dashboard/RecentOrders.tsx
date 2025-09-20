'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Eye, MoreHorizontal, X } from 'lucide-react';

interface Order {
  _id: string;
  invoiceNumber: string;
  customer: string;
  total: number;
  status: string;
  date: string;
}

// Memoized status color function
const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Memoized OrderRow component
const OrderRow = memo(({ 
  order, 
  onViewDetails, 
  onPrintInvoice, 
  onEditOrder, 
  dropdownOpen, 
  onToggleDropdown 
}: {
  order: Order;
  onViewDetails: (id: string) => void;
  onPrintInvoice: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  dropdownOpen: string | null;
  onToggleDropdown: (id: string) => void;
}) => {
  const handlePrintInvoice = useCallback(() => {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice - ${order.invoiceNumber}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  background: #f8f9fa;
                  padding: 20px;
                  line-height: 1.6;
                }
                .invoice-container {
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .header { 
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  text-align: center; 
                  padding: 30px 20px;
                }
                .header h1 { font-size: 2.5em; margin-bottom: 10px; }
                .header h2 { font-size: 1.5em; opacity: 0.9; }
                .content { padding: 30px; }
                .invoice-details { 
                  background: #f8f9fa;
                  border-radius: 8px;
                  padding: 25px;
                  margin-bottom: 20px;
                }
                .detail-row { 
                  display: flex; 
                  justify-content: space-between; 
                  margin-bottom: 15px;
                  padding: 10px 0;
                  border-bottom: 1px solid #e9ecef;
                }
                .detail-row:last-child { border-bottom: none; }
                .label { 
                  font-weight: 600; 
                  color: #495057;
                  font-size: 1.1em;
                }
                .value { 
                  color: #212529;
                  font-weight: 500;
                }
                .total { 
                  font-size: 1.3em; 
                  font-weight: bold; 
                  margin-top: 20px;
                  padding: 15px;
                  background: #e3f2fd;
                  border-radius: 6px;
                  color: #1976d2;
                }
                .footer {
                  text-align: center;
                  padding: 20px;
                  color: #6c757d;
                  border-top: 1px solid #e9ecef;
                }
                @media print { 
                  body { background: white; padding: 0; }
                  .invoice-container { box-shadow: none; }
                }
              </style>
            </head>
            <body>
              <div class="invoice-container">
                <div class="header">
                  <h1>INVOICE</h1>
                  <h2>${order.invoiceNumber}</h2>
                </div>
                <div class="content">
                  <div class="invoice-details">
                    <div class="detail-row">
                      <span class="label">Customer Name:</span>
                      <span class="value">${order.customer}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Invoice Date:</span>
                      <span class="value">${new Date(order.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Status:</span>
                      <span class="value" style="color: #28a745; font-weight: 600;">${order.status.toUpperCase()}</span>
                    </div>
                    <div class="detail-row total">
                      <span class="label">Total Amount:</span>
                      <span class="value">PKR ${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div class="footer">
                  <p>Thank you for your business!</p>
                  <p>Generated on ${new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      alert('Error printing invoice. Please try again.');
    }
  }, [order]);

  const handleEditOrder = useCallback(() => {
    try {
      const orderData = encodeURIComponent(JSON.stringify(order));
      window.location.href = `/sale?edit=${orderData}`;
    } catch (error) {
      console.error('Error navigating to edit page:', error);
      alert('Error opening edit page. Please try again.');
    }
  }, [order]);

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-150">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {order.invoiceNumber}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {order.customer}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        PKR {order.total.toFixed(2)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {new Date(order.date).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onViewDetails(order._id)}
            className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors duration-200"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <div className="relative">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleDropdown(order._id);
              }}
              className="text-gray-600 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100 transition-colors duration-200"
              title="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {dropdownOpen === order._id && (
              <div 
                data-dropdown="true"
                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-200 z-50"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onViewDetails(order._id);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePrintInvoice();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span>Print Invoice</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEditOrder();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Order</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
});

OrderRow.displayName = 'OrderRow';

function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // Memoized fetch function
  const fetchRecentOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching recent orders...');
      const response = await fetch('/api/sale-invoices?limit=5&sort=-date');
      const data = await response.json();
      
      console.log('API Response:', response.ok, data);
      
      if (response.ok) {
        const ordersData = (data.invoices || []).map((invoice: any) => ({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber || 'N/A',
          customer: invoice.customer || 'Unknown Customer',
          total: invoice.netAmount || invoice.totalAmount || 0,
          status: invoice.status || 'delivered',
          date: invoice.date || new Date().toISOString()
        }));
        console.log('Processed orders:', ordersData);
        setOrders(ordersData);
      } else {
        console.error('Error fetching recent orders:', data.error);
        setError(`API Error: ${data.error || 'Unknown error'}`);
        // Try fetching from orders API as fallback
        try {
          const fallbackResponse = await fetch('/api/orders?limit=5');
          const fallbackData = await fallbackResponse.json();
          if (fallbackResponse.ok) {
            const ordersData = (fallbackData.orders || []).map((order: any) => ({
              _id: order._id,
              invoiceNumber: order.orderNumber || order.invoiceNumber || 'N/A',
              customer: order.customer || 'Unknown Customer',
              total: order.totalAmount || order.total || 0,
              status: order.status || 'delivered',
              date: order.date || new Date().toISOString()
            }));
            setOrders(ordersData);
            setError(null);
          }
        } catch (fallbackError) {
          console.error('Fallback API also failed:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setError(`Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized handlers
  const handleViewDetails = useCallback((id: string) => {
    setSelectedOrder(id);
    setDropdownOpen(null);
  }, []);

  const handleToggleDropdown = useCallback((id: string) => {
    setDropdownOpen(prev => prev === id ? null : id);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  useEffect(() => {
    fetchRecentOrders();
  }, [fetchRecentOrders]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen) {
        const target = event.target as Element;
        const dropdownElement = document.querySelector('[data-dropdown="true"]');
        
        if (dropdownElement && !dropdownElement.contains(target)) {
          setDropdownOpen(null);
        }
      }
    };

    if (dropdownOpen) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen]);

  const selectedOrderData = useMemo(() => 
    orders.find(o => o._id === selectedOrder), 
    [orders, selectedOrder]
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
      </div>
      
      {/* Order Detail Modal */}
      {selectedOrder && selectedOrderData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Invoice:</span>
                <span className="text-gray-900 font-semibold">{selectedOrderData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Customer:</span>
                <span className="text-gray-900">{selectedOrderData.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Total:</span>
                <span className="text-gray-900 font-semibold">PKR {selectedOrderData.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrderData.status)}`}>
                  {selectedOrderData.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Date:</span>
                <span className="text-gray-900">{new Date(selectedOrderData.date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => window.location.href = '/orders'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>View All</span>
              </button>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Loading orders...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="text-red-500">
                    <div className="text-lg mb-2">Error Loading Orders</div>
                    <div className="text-sm">{error}</div>
                    <button 
                      onClick={fetchRecentOrders}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Try Again
                    </button>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="text-gray-500">
                    <div className="text-lg mb-2">No recent orders found</div>
                    <div className="text-sm">
                      <p>It looks like there are no sale invoices yet.</p>
                      <p className="mt-2">
                        <a href="/sale" className="text-blue-600 hover:text-blue-800 underline">
                          Create your first sale invoice
                        </a>
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <OrderRow
                  key={order._id}
                  order={order}
                  onViewDetails={handleViewDetails}
                  onPrintInvoice={() => {}}
                  onEditOrder={() => {}}
                  dropdownOpen={dropdownOpen}
                  onToggleDropdown={handleToggleDropdown}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <button 
          onClick={() => window.location.href = '/orders'}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
        >
          View all orders →
        </button>
      </div>
    </div>
  );
}

export default memo(RecentOrders);
