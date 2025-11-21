"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import { Plus, Trash2, Save } from 'lucide-react';

interface ReturnItem {
  productId: string;
  description: string;
  quantityPkts: number;
  weightKg: number;
  rate: number;
  value: number;
  reelNo?: string;
}

export default function SaleReturnPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    originalInvoiceNumber: '',
    customer: '',
    remarks: '',
  });
  
  const [items, setItems] = useState<ReturnItem[]>([{
    productId: '',
    description: '',
    quantityPkts: 0,
    weightKg: 0,
    rate: 0,
    value: 0,
    reelNo: '',
  }]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sale-returns?limit=50');
      const data = await res.json();
      setReturns(data.returns || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const addItem = () => {
    setItems([...items, {
      productId: '',
      description: '',
      quantityPkts: 0,
      weightKg: 0,
      rate: 0,
      value: 0,
      reelNo: '',
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate value
    if (field === 'rate' || field === 'quantityPkts' || field === 'weightKg') {
      const rate = field === 'rate' ? Number(value) : updated[index].rate;
      const qty = field === 'quantityPkts' ? Number(value) : updated[index].quantityPkts;
      updated[index].value = rate * qty;
    }
    
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.value || 0), 0);

  const handleSave = async () => {
    if (!form.customer || !form.originalInvoiceNumber) {
      alert('Please enter customer and original invoice number');
      return;
    }
    
    if (items.length === 0 || !items[0].description) {
      alert('Please add at least one item');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/sale-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.filter(item => item.description),
        }),
      });

      if (res.ok) {
        alert('Sale return created successfully');
        setForm({
          date: new Date().toISOString().split('T')[0],
          originalInvoiceNumber: '',
          customer: '',
          remarks: '',
        });
        setItems([{
          productId: '',
          description: '',
          quantityPkts: 0,
          weightKg: 0,
          rate: 0,
          value: 0,
          reelNo: '',
        }]);
        fetchReturns();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Failed to create return'}`);
      }
    } catch (error) {
      console.error('Error saving return:', error);
      alert('Failed to save return');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sale Returns</h1>
          <p className="text-gray-600">Manage customer returns</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">New Sale Return</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Invoice #</label>
              <input
                type="text"
                value={form.originalInvoiceNumber}
                onChange={(e) => setForm({ ...form, originalInvoiceNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="SI-000001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <input
                type="text"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input
                type="text"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700">Description</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700">Reel No</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700">Qty (Pkts)</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700">Weight (kg)</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700">Rate</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700">Value</th>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-2 py-1">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      <input
                        type="text"
                        value={item.reelNo || ''}
                        onChange={(e) => updateItem(index, 'reelNo', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      <input
                        type="number"
                        value={item.quantityPkts}
                        onChange={(e) => updateItem(index, 'quantityPkts', Number(e.target.value))}
                        className="w-full px-2 py-1 border-0 focus:ring-0 text-right"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={item.weightKg}
                        onChange={(e) => updateItem(index, 'weightKg', Number(e.target.value))}
                        className="w-full px-2 py-1 border-0 focus:ring-0 text-right"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', Number(e.target.value))}
                        className="w-full px-2 py-1 border-0 focus:ring-0 text-right"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-semibold">
                      {item.value.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                        disabled={items.length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={5} className="border border-gray-300 px-2 py-2 text-right">Total:</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{totalAmount.toFixed(2)}</td>
                  <td className="border border-gray-300 px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between">
            <button
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Plus size={18} />
              Add Item
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Return'}
            </button>
          </div>
        </div>

        {/* Returns List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Returns</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Return #</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Invoice #</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Customer</th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No returns found</td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr key={ret._id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{ret.returnNumber}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(ret.date).toLocaleDateString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{ret.originalInvoiceNumber}</td>
                      <td className="border border-gray-300 px-4 py-2">{ret.customer}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {ret.netAmount?.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
