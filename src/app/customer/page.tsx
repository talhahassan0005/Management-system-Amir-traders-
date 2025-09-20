'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import { Save, Edit, Trash2, RefreshCw, X, Search, Loader2 } from 'lucide-react';

interface Customer {
  _id?: string;
  code: string;
  description: string;
  business: string;
  city: string;
  person: string;
  phone: string;
  address: string;
  email: string;
  mobile: string;
  creditDays: number;
  creditLimit: number;
  isActive: boolean;
}

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState<Customer>({
    code: '',
    description: '',
    business: '',
    city: '',
    person: '',
    phone: '',
    address: '',
    email: '',
    mobile: '',
    creditDays: 0,
    creditLimit: 0,
    isActive: true,
  });

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
        params.append('filter', searchFilter);
      }
      // Request a larger limit so more than 10 show
      params.append('limit', '100000');
      const response = await fetch(`/api/customers?${params}`, { cache: 'no-store' });
      const data = await response.json();
      
      if (response.ok) {
        setCustomers(data.customers || []);
      } else {
        console.error('Error fetching customers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load customers on component mount and when search changes
  useEffect(() => {
    fetchCustomers();
    // realtime via SSE
    const es = new EventSource('/api/customers/sse');
    es.onmessage = (e) => {
      if (e.data === 'changed') fetchCustomers();
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [searchQuery, searchFilter]);

  const handleInputChange = (field: keyof Customer, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      // Minimal client validation
      if (!formData.description || !formData.description.trim()) {
        setErrorMsg('Description is required');
        return;
      }
      
      if (isEditing && selectedCustomer) {
        // Update existing customer
        const response = await fetch(`/api/customers/${selectedCustomer._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (response.ok) {
          await fetchCustomers(); // Refresh the list
          handleRefresh();
          setSuccessMsg('Customer updated');
        } else {
          const error = await response.json();
          console.error('Error updating customer:', error.error);
          setErrorMsg(error.error || 'Failed to update customer');
        }
      } else {
        // Add new customer
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (response.ok) {
          await fetchCustomers(); // Refresh the list
          handleRefresh();
          setSuccessMsg('Customer created');
        } else {
          const error = await response.json();
          console.error('Error creating customer:', error.error);
          setErrorMsg(error.error || 'Failed to create customer');
        }
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      setErrorMsg('Unexpected error while saving customer');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(customer);
    setIsEditing(true);
  };

  const handleRemove = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchCustomers(); // Refresh the list
        handleRefresh();
      } else {
        const error = await response.json();
        console.error('Error deleting customer:', error.error);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleRefresh = () => {
    setSelectedCustomer(null);
    setIsEditing(false);
    setFormData({
      code: '',
      description: '',
      business: '',
      city: '',
      person: '',
      phone: '',
      address: '',
      email: '',
      mobile: '',
      creditDays: 0,
      creditLimit: 0,
      isActive: true,
    });
  };

  const handleExit = () => {
    handleRefresh();
  };

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    switch (searchFilter) {
      case 'Code':
        return customer.code.toLowerCase().includes(query);
      case 'Description':
        return customer.description.toLowerCase().includes(query);
      case 'Business':
        return customer.business.toLowerCase().includes(query);
      case 'City':
        return customer.city.toLowerCase().includes(query);
      default:
        return (
          customer.code.toLowerCase().includes(query) ||
          customer.description.toLowerCase().includes(query) ||
          customer.business.toLowerCase().includes(query) ||
          customer.city.toLowerCase().includes(query)
        );
    }
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Information</h1>
            <p className="text-gray-600">Manage customer details and information</p>
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

        {/* Customer Information Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Customer Information</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Business</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Person</label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile#</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => handleInputChange('mobile', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Mobile number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credit Days</label>
              <input
                type="number"
                value={formData.creditDays}
                onChange={(e) => handleInputChange('creditDays', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Credit days"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
              <input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => handleInputChange('creditLimit', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Credit limit"
              />
            </div>
          </div>
        </div>

        {/* Look Up Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Look Up</h3>
          </div>
          
          {/* Search Filter */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchFilter"
                    value="All"
                    checked={searchFilter === 'All'}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">All</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchFilter"
                    value="Code"
                    checked={searchFilter === 'Code'}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Code</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchFilter"
                    value="Description"
                    checked={searchFilter === 'Description'}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Description</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchFilter"
                    value="Business"
                    checked={searchFilter === 'Business'}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Business</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchFilter"
                    value="City"
                    checked={searchFilter === 'City'}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">City</span>
                </label>
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

          {/* Customer List Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
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
                      <p className="text-gray-500">Loading customers...</p>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer, index) => (
                  <tr 
                    key={customer._id} 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedCustomer?._id === customer._id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.business}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.person}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(customer);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(customer._id!);
                        }}
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
