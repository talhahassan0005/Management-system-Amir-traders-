'use client';

import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout/Layout';
import { Save, Search, Loader2, Edit, Trash2 } from 'lucide-react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

interface Product {
  _id?: string;
  item: string;
  description: string;
  brand: string;
  sheetsPerPkt: number;
  width: number;
  length: number;
  grams: number;
  constant: string;
  pktPerReem: number;
  salePriceQt: number;
  salePriceKg: number;
  costRateQty: number;
  minStockLevel: number;
  maxStockLevel: number;
  category: string;
  type: string;
  isActive: boolean;
}

// Mock data removed - will use real database

const brandOptions = [
  'BLEECH', 'BLEECH BOARD', 'BOX BOARD', 'BROWN BACK BOARD', 
  'CARD BOARD', 'CLAY', 'DIRECT REELS', 'IMPORTANT', 'PACKAGES', 'LOCAL'
];

const typeOptions = ['Reel', 'Board'];

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Product>({
    item: '',
    description: '',
    brand: '',
    sheetsPerPkt: 0,
    width: 0,
    length: 0,
    grams: 0,
    constant: '',
    pktPerReem: 0,
    salePriceQt: 0,
    salePriceKg: 0,
    costRateQty: 0,
    minStockLevel: 0,
    maxStockLevel: 0,
    category: '',
    type: 'Reel',
    isActive: true,
  });

  const combinedBrandOptions = useMemo(() => {
    const existing = Array.from(new Set(products.map(p => (p.brand || '').trim()).filter(Boolean)));
    const all = Array.from(new Set([...brandOptions, ...existing]));
    return all.sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
        params.append('filter', searchFilter);
      }
      
      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setProducts(data.products || []);
        // Extract unique categories from products
        const uniqueCategories = [...new Set((data.products || []).map((product: any) => product.category).filter(Boolean))];
        setCategories(uniqueCategories);
      } else {
        console.error('Error fetching products:', data.error);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load products on component mount and when search changes
  useEffect(() => {
    fetchProducts();
  }, [searchQuery, searchFilter]);

  // Silent auto-refresh every 10 seconds for real-time updates
  useAutoRefresh(() => {
    if (!isEditing && !saving && !showDeleteModal) {
      fetchProducts();
    }
  }, 10000);

  const handleInputChange = (field: keyof Product, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (isEditing && selectedProduct) {
        // Update existing product
        const response = await fetch(`/api/products/${selectedProduct._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (response.ok) {
          await fetchProducts(); // Refresh the list
          resetForm();
        } else {
          const error = await response.json();
          console.error('Error updating product:', error.error);
        }
      } else {
        // Add new product
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (response.ok) {
          await fetchProducts(); // Refresh the list
          resetForm();
        } else {
          const error = await response.json();
          console.error('Error creating product:', error.error);
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData(product);
    setIsEditing(true);
  };

  const handleRemove = (productId: string) => {
    const prod = products.find(p => p._id === productId) || null;
    setDeleteTarget(prod);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) { setShowDeleteModal(false); return; }
    try {
      setDeleting(true);
      const response = await fetch(`/api/products/${deleteTarget._id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchProducts();
        resetForm();
      } else {
        const error = await response.json();
        console.error('Error deleting product:', error.error);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setIsEditing(false);
    setFormData({
      item: '',
      description: '',
      brand: '',
      sheetsPerPkt: 0,
      width: 0,
      length: 0,
      grams: 0,
      constant: '',
      pktPerReem: 0,
      salePriceQt: 0,
      salePriceKg: 0,
      costRateQty: 0,
      minStockLevel: 0,
      maxStockLevel: 0,
      category: '',
      type: 'Reel',
      isActive: true,
    });
  };

  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    switch (searchFilter) {
      case 'Item':
        return product.item.toLowerCase().includes(query);
      case 'Description':
        return product.description.toLowerCase().includes(query);
      case 'Grams':
        return product.grams.toString().includes(query);
      case 'Brand':
        return product.brand.toLowerCase().includes(query);
      case 'Category':
        return product.category.toLowerCase().includes(query);
      default:
        return (
          product.item.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
        );
    }
  });

  return (
    <>
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Item Information</h1>
          <p className="text-gray-600">Manage product and item details</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Item Information Form */}
          <div className="w-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900">Item Information</h2>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg w-full sm:w-auto"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item</label>
                  <input
                    type="text"
                    value={formData.item}
                    onChange={(e) => handleInputChange('item', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Enter item code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Enter description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Start typing brand..."
                    list="brand-list"
                    autoComplete="off"
                  />
                  <datalist id="brand-list">
                    {combinedBrandOptions.map(brand => (
                      <option key={brand} value={brand} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sheets/Pkt</label>
                  <input
                    type="number"
                    value={formData.sheetsPerPkt}
                    onChange={(e) => handleInputChange('sheetsPerPkt', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Sheets per packet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.width}
                    onChange={(e) => handleInputChange('width', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Width"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.length}
                    onChange={(e) => handleInputChange('length', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Length"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grams</label>
                  <input
                    type="number"
                    value={formData.grams}
                    onChange={(e) => handleInputChange('grams', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Grams"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pkt/Reem</label>
                  <input
                    type="number"
                    value={formData.pktPerReem}
                    onChange={(e) => handleInputChange('pktPerReem', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Packets per reem"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price Qt</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salePriceQt}
                    onChange={(e) => handleInputChange('salePriceQt', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Sale price per quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price Kg</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salePriceKg}
                    onChange={(e) => handleInputChange('salePriceKg', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Sale price per kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost Rate Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costRateQty}
                    onChange={(e) => handleInputChange('costRateQty', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Cost rate per quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Stock Level</label>
                  <input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => handleInputChange('minStockLevel', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Minimum stock level"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Stock Level</label>
                  <input
                    type="number"
                    value={formData.maxStockLevel}
                    onChange={(e) => handleInputChange('maxStockLevel', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Maximum stock level"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select Type</option>
                    {typeOptions.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
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
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4">
              <div className="flex flex-wrap items-center gap-4">
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
                    value="Item"
                    checked={searchFilter === 'Item'}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Item</span>
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
                    value="Grams"
                    checked={searchFilter === 'Grams'}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Grams</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchFilter"
                    value="Brand"
                    checked={searchFilter === 'Brand'}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Brand</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchFilter"
                    value="Category"
                    checked={searchFilter === 'Category'}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Category</span>
                </label>
              </div>
              <div className="flex-1 w-full sm:max-w-md">
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

          {/* Product List Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product, index) => (
                  <tr 
                    key={product._id} 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedProduct?._id === product._id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.item}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(product);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(product._id!);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-700 transition-colors duration-200 ml-2"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
    {showDeleteModal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={()=>!deleting && setShowDeleteModal(false)}></div>
        <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md mx-4 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product?</h3>
          <p className="text-sm text-gray-700 mb-4">
            You are about to delete <span className="font-medium">{deleteTarget?.item}</span>. All related production entries for this product will also be removed. This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button onClick={()=>!deleting && setShowDeleteModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50" disabled={deleting}>Cancel</button>
            <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
