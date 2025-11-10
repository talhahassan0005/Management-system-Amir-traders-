"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import { Edit, Eye, MoreHorizontal, Plus, Search, ShoppingCart, Trash2, X, Loader2 } from 'lucide-react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

interface Order {
  _id: string;
  orderNumber: string;
  customer: { name: string } | string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt?: string;
  items: number;
}

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
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state for new order
  const [newOrder, setNewOrder] = useState({
    customer: { name: '', email: '', phone: '', address: '' },
    items: [{ product: '', quantity: 1, price: 0 }],
    paymentMethod: 'cash' as 'cash' | 'card' | 'bank_transfer',
    notes: '',
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPaymentStatus) params.append('paymentStatus', selectedPaymentStatus);
      if (searchQuery) params.append('q', searchQuery);
      const response = await fetch(`/api/orders?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        const list: Order[] = (data.orders || []).map((o: any) => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          customer: o.customer,
          total: o.total,
          status: o.status,
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod,
          createdAt: o.createdAt,
          items: o.items?.length || 0,
        }));
        setOrders(list);
      } else {
        console.error('Error fetching orders:', data.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedStatus, selectedPaymentStatus]);

  // Auto-refresh every 10 seconds for real-time feeling
  useAutoRefresh(() => {
    if (!showCreateModal && !showEditModal && !showViewModal) {
      fetchOrders();
    }
  }, 10000);

  const handleCreateOrder = async () => {
    try {
      setSaving(true);
      const subtotal = newOrder.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const total = subtotal; // Add tax logic if needed
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOrder,
          subtotal,
          tax: 0,
          total,
        }),
      });
      
      if (response.ok) {
        setShowCreateModal(false);
        setNewOrder({
          customer: { name: '', email: '', phone: '', address: '' },
          items: [{ product: '', quantity: 1, price: 0 }],
          paymentMethod: 'cash',
          notes: '',
        });
        fetchOrders();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to create order'}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
      const response = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchOrders();
      } else {
        alert('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        fetchOrders();
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  };

  const filteredOrders = orders; // server-side filters applied

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600">Manage customer orders and track their status</p>
          </div>
          {/* New Order button removed per request */}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === 'delivered').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === 'processing' || o.status === 'shipped').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Status Filter */}
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
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
                    Payment
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
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">{order.items} items</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{typeof order.customer === 'string' ? order.customer : order.customer?.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">{order.paymentMethod}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.createdAt?.toString()?.slice(0, 10) || ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1 rounded"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                          className="text-xs border rounded px-2 py-1 text-green-600 hover:bg-green-50"
                          title="Update status"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button 
                          onClick={() => handleDeleteOrder(order._id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded"
                          title="Delete order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Order Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={newOrder.customer.name}
                      onChange={(e) => setNewOrder({...newOrder, customer: {...newOrder.customer, name: e.target.value}})}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={newOrder.customer.email}
                      onChange={(e) => setNewOrder({...newOrder, customer: {...newOrder.customer, email: e.target.value}})}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={newOrder.customer.phone}
                      onChange={(e) => setNewOrder({...newOrder, customer: {...newOrder.customer, phone: e.target.value}})}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={newOrder.paymentMethod}
                      onChange={(e) => setNewOrder({...newOrder, paymentMethod: e.target.value as any})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <textarea
                    value={newOrder.customer.address}
                    onChange={(e) => setNewOrder({...newOrder, customer: {...newOrder.customer, address: e.target.value}})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                    required
                  />
                </div>

                {/* Items */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Items</label>
                  {newOrder.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Product ID"
                        value={item.product}
                        onChange={(e) => {
                          const items = [...newOrder.items];
                          items[idx].product = e.target.value;
                          setNewOrder({...newOrder, items});
                        }}
                        className="col-span-6 px-3 py-2 border rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const items = [...newOrder.items];
                          items[idx].quantity = Number(e.target.value) || 1;
                          setNewOrder({...newOrder, items});
                        }}
                        className="col-span-2 px-3 py-2 border rounded-lg text-sm"
                        min={1}
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => {
                          const items = [...newOrder.items];
                          items[idx].price = Number(e.target.value) || 0;
                          setNewOrder({...newOrder, items});
                        }}
                        className="col-span-3 px-3 py-2 border rounded-lg text-sm"
                        min={0}
                        step={0.01}
                      />
                      <button
                        onClick={() => {
                          const items = newOrder.items.filter((_, i) => i !== idx);
                          setNewOrder({...newOrder, items: items.length ? items : [{product: '', quantity: 1, price: 0}]});
                        }}
                        className="col-span-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setNewOrder({...newOrder, items: [...newOrder.items, {product: '', quantity: 1, price: 0}]})}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-right text-lg font-bold">
                    Total: PKR {newOrder.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Order Modal */}
        {showViewModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-semibold">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">{selectedOrder.createdAt?.toString()?.slice(0, 10)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(selectedOrder.paymentStatus)}`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <p className="text-sm">
                    <strong>Name:</strong> {typeof selectedOrder.customer === 'string' ? selectedOrder.customer : selectedOrder.customer?.name}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Order Summary</h3>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">PKR {selectedOrder.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.items} items</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
