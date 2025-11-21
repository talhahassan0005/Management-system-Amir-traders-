'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout/Layout'
import { Plus, Trash2, Save } from 'lucide-react'

interface ReturnItem {
  _id?: string
  productId: string
  description: string
  quantityPkts: number
  weightKg: number
  rate: number
  value: number
  reelNo: string
  notes: string
}

interface PurchaseReturn {
  _id: string
  returnNumber: string
  date: string
  originalInvoiceNumber: string
  supplier: string
  items: ReturnItem[]
  totalAmount: number
  netAmount: number
  remarks: string
  createdAt: string
}

export default function PurchaseReturnPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState('')
  const [supplier, setSupplier] = useState('')
  const [remarks, setRemarks] = useState('')
  const [items, setItems] = useState<ReturnItem[]>([])

  // New item state
  const [newItem, setNewItem] = useState<ReturnItem>({
    productId: '',
    description: '',
    quantityPkts: 0,
    weightKg: 0,
    rate: 0,
    value: 0,
    reelNo: '',
    notes: ''
  })

  useEffect(() => {
    fetchReturns()
  }, [])

  const fetchReturns = async () => {
    try {
      const response = await fetch('/api/purchase-returns?limit=50')
      if (response.ok) {
        const data = await response.json()
        setReturns(data.returns || [])
      }
    } catch (error) {
      console.error('Error fetching returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    if (!newItem.description) {
      alert('Please enter item description')
      return
    }

    const itemToAdd = {
      ...newItem,
      value: newItem.rate * newItem.quantityPkts
    }

    setItems([...items, itemToAdd])
    setNewItem({
      productId: '',
      description: '',
      quantityPkts: 0,
      weightKg: 0,
      rate: 0,
      value: 0,
      reelNo: '',
      notes: ''
    })
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    }

    // Auto-calculate value if rate or quantity changes
    if (field === 'rate' || field === 'quantityPkts') {
      updatedItems[index].value = updatedItems[index].rate * updatedItems[index].quantityPkts
    }

    setItems(updatedItems)
  }

  const handleSave = async () => {
    if (!supplier) {
      alert('Please enter supplier name')
      return
    }

    if (!originalInvoiceNumber) {
      alert('Please enter original invoice number')
      return
    }

    if (items.length === 0) {
      alert('Please add at least one item')
      return
    }

    const totalAmount = items.reduce((sum, item) => sum + item.value, 0)

    const returnData = {
      date,
      originalInvoiceNumber,
      supplier,
      items,
      totalAmount,
      netAmount: totalAmount,
      remarks
    }

    setSaving(true)
    try {
      const response = await fetch('/api/purchase-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      })

      if (response.ok) {
        alert('Purchase return saved successfully!')
        // Reset form
        setDate(new Date().toISOString().split('T')[0])
        setOriginalInvoiceNumber('')
        setSupplier('')
        setRemarks('')
        setItems([])
        fetchReturns()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error saving return:', error)
      alert('Failed to save purchase return')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Purchase Return</h1>

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Original Invoice Number
            </label>
            <input
              type="text"
              value={originalInvoiceNumber}
              onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
              placeholder="PI-000001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Supplier name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarks
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional remarks"
          />
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
              {/* New Item Row */}
              <tr className="bg-blue-50">
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="text"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Item description"
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                  />
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="text"
                    value={newItem.reelNo}
                    onChange={(e) => setNewItem({ ...newItem, reelNo: e.target.value })}
                    placeholder="Reel no"
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                  />
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={newItem.quantityPkts || ''}
                    onChange={(e) => setNewItem({ ...newItem, quantityPkts: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                  />
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={newItem.weightKg || ''}
                    onChange={(e) => setNewItem({ ...newItem, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                  />
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="number"
                    value={newItem.rate || ''}
                    onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })}
                    className="w-24 px-2 py-1 border border-gray-300 rounded"
                  />
                </td>
                <td className="border border-gray-300 px-3 py-2 font-medium">
                  {(newItem.rate * newItem.quantityPkts).toFixed(2)}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <button
                    onClick={addItem}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </td>
              </tr>

              {/* Existing Items */}
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-3 py-2 text-gray-900">{item.description}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-900">{item.reelNo}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-900">{item.quantityPkts}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-900">{item.weightKg}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-900">{item.rate.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">{item.value.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2">
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}

              {items.length > 0 && (
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={5} className="px-3 py-2 text-right">Total:</td>
                  <td className="px-3 py-2">
                    {items.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Purchase Return'}
        </button>
      </div>

      {/* Recent Returns Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Purchase Returns</h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : returns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No purchase returns found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Return No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Original Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map((returnDoc) => (
                  <tr key={returnDoc._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{returnDoc.returnNumber}</td>
                    <td className="px-4 py-3 text-sm">{new Date(returnDoc.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{returnDoc.originalInvoiceNumber}</td>
                    <td className="px-4 py-3 text-sm">{returnDoc.supplier}</td>
                    <td className="px-4 py-3 text-sm">{returnDoc.items.length}</td>
                    <td className="px-4 py-3 text-sm font-medium">Rs. {returnDoc.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
      </div>
    </Layout>
  )
}