'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import { Edit, Loader2, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';

interface Supplier {
  _id?: string;
  code: string;
  description: string;
  business: string;
  city: string;
  person: string;
  phone: string;
  address: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<Supplier>({
    code: '',
    description: '',
    business: '',
    city: '',
    person: '',
    phone: '',
    address: '',
  });

  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
        params.append('filter', searchFilter);
      }
      // Request a larger page size like Customer does elsewhere
      params.append('limit', '1000');
      const res = await fetch(`/api/suppliers?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setSuppliers(data.suppliers || []);
      } else {
        console.error('Failed to load suppliers:', data.error);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };




  
  useEffect(() => {
    fetchSuppliers();
    // realtime via SSE
    const es = new EventSource('/api/suppliers/sse');
    es.onmessage = (e) => {
      if (e.data === 'changed') fetchSuppliers();
    };
    es.onerror = () => {
      es.close();
      // Reconnect next effect render automatically
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchFilter]);

  const handleInputChange = (field: keyof Supplier, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      // Minimal validation like Customer page
      if (!formData.description || !formData.description.trim()) {
        setErrorMsg('Description is required');
        return;
      }
      if (isEditing && selectedSupplier?._id) {
        const res = await fetch(`/api/suppliers/${selectedSupplier._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          await fetchSuppliers();
          handleRefresh();
          setSuccessMsg('Supplier updated');
        } else {
          const err = await res.json();
          console.error('Update failed:', err.error);
          setErrorMsg(err.error || 'Failed to update supplier');
          return;
        }
      } else {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          await fetchSuppliers();
          handleRefresh();
          setSuccessMsg('Supplier created');
        } else {
          const err = await res.json();
          console.error('Create failed:', err.error);
          setErrorMsg(err.error || 'Failed to create supplier');
          return;
        }
      }
    } catch (e) {
      console.error('Error saving supplier:', e);
      setErrorMsg('Unexpected error while saving supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData(supplier);
    setIsEditing(true);
  };

  const handleRemove = async (supplierId: string) => {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        console.error('Delete failed:', err.error);
      }
      await fetchSuppliers();
      handleRefresh();
    } catch (e) {
      console.error('Error deleting supplier:', e);
    }
  };

  const handleRefresh = () => {
    setSelectedSupplier(null);
    setIsEditing(false);
    setFormData({
      code: '',
      description: '',
      business: '',
      city: '',
      person: '',
      phone: '',
      address: '',
    });
  };

  const handleExit = () => {
    handleRefresh();
  };

  const filteredSuppliers = suppliers; // Server filters, keep client list as-is

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplier Information</h1>
            <p className="text-gray-600">Manage supplier details and information</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>

        {/* Supplier Information Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Supplier Information</h2>
          {errorMsg && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
              {successMsg}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Auto-generated"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Enter description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
              <input
                type="text"
                value={formData.business}
                onChange={(e) => handleInputChange('business', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Enter business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <select
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Select City</option>
                <option value="LHR">Lahore</option>
                <option value="KHI">Karachi</option>
                <option value="ISB">Islamabad</option>
                <option value="FSD">Faisalabad</option>
                <option value="MUX">Multan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
              <input
                type="text"
                value={formData.person}
                onChange={(e) => handleInputChange('person', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Contact person name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone #</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Phone number"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Enter address"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Look Up</h3>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-4">
                {['All', 'Code', 'Description', 'Business Name', 'City'].map((opt) => (
                  <label key={opt} className="flex items-center">
                    <input
                      type="radio"
                      name="searchFilter"
                      value={opt}
                      checked={searchFilter === opt}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      <p className="text-gray-500">Loading suppliers...</p>
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No suppliers found</td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier, index) => (
                    <tr
                      key={supplier._id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedSupplier?._id === supplier._id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedSupplier(supplier)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.business}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.person}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(supplier); }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(supplier._id!); }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
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
