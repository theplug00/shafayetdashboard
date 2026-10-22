import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ProductDB, StockMovementDB, generateId } from '../services/database';
import { Modal, ConfirmDialog, Badge, EmptyState, Toast } from '../components/Common';
import { Plus, Search, Edit2, Trash2, Package, Filter, Download, ArrowUpDown } from 'lucide-react';
import { Product } from '../types';

export function ProductsPage() {
  const { products, currentUser, settings, refreshProducts, addAuditLog, refreshStockMovements } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stockModal, setStockModal] = useState<{ product: Product; type: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [sortField, setSortField] = useState<'name' | 'stock' | 'sellingPrice'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const categories = useMemo(() => [...new Set(products.map(p => p.category))].filter(Boolean), [products]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [products, search, categoryFilter, sortField, sortDir]);

  const handleSort = (field: 'name' | 'stock' | 'sellingPrice') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleDelete = (id: string) => {
    ProductDB.delete(id);
    addAuditLog('DELETE', 'Product', id, 'Product deleted');
    refreshProducts();
    setToast({ message: 'Product deleted successfully', type: 'success' });
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'SKU', 'Category', 'Sizes', 'Colors', 'Cost Price', 'Selling Price', 'Stock', 'Sold', 'Damaged'];
    const rows = filteredProducts.map(p => [p.name, p.sku, p.category, p.sizes.join(';'), p.colors.join(';'), p.purchaseCost, p.sellingPrice, p.stock, p.sold, p.damaged]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setToast({ message: 'Inventory report exported', type: 'success' });
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          {currentUser?.role === 'admin' && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-gray-900">
                    Product <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sizes / Colors</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  <button onClick={() => handleSort('sellingPrice')} className="flex items-center gap-1 ml-auto hover:text-gray-900">
                    Price <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  <button onClick={() => handleSort('stock')} className="flex items-center gap-1 ml-auto hover:text-gray-900">
                    Stock <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Sold</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? filteredProducts.map(product => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">Cost: {settings.currency} {product.purchaseCost.toFixed(2)}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-3 text-gray-600">{product.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {product.sizes.slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{s}</span>)}
                      {product.sizes.length > 3 && <span className="text-xs text-gray-400">+{product.sizes.length - 3}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.colors.slice(0, 3).map(c => <span key={c} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{c}</span>)}
                      {product.colors.length > 3 && <span className="text-xs text-gray-400">+{product.colors.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{settings.currency} {product.sellingPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium">{product.stock}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{product.sold}</td>
                  <td className="px-4 py-3 text-center">
                    {product.stock === 0 ? <Badge variant="danger">Out of Stock</Badge> :
                     product.stock <= settings.lowStockThreshold ? <Badge variant="warning">Low Stock</Badge> :
                     <Badge variant="success">In Stock</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setStockModal({ product, type: 'addition' })} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Add Stock">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingProduct(product)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {currentUser?.role === 'admin' && (
                        <button onClick={() => setDeleteConfirm(product.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9}><EmptyState icon={Package} title="No products found" description="Add your first product or adjust your search filters." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredProducts.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {(showAddModal || editingProduct) && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => { setShowAddModal(false); setEditingProduct(null); }}
          onSave={(data) => {
            if (editingProduct) {
              ProductDB.update(editingProduct.id, data);
              addAuditLog('UPDATE', 'Product', editingProduct.id, `Updated product: ${data.name}`);
              setToast({ message: 'Product updated successfully', type: 'success' });
            } else {
              ProductDB.create(data as any);
              addAuditLog('CREATE', 'Product', '', `Added new product: ${data.name}`);
              setToast({ message: 'Product added successfully', type: 'success' });
            }
            refreshProducts();
            setShowAddModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      {stockModal && (
        <StockAdjustmentModal
          product={stockModal.product}
          type={stockModal.type}
          onClose={() => setStockModal(null)}
          onSave={(type, qty, reason) => {
            const prevStock = stockModal.product.stock;
            let newStock = prevStock;
            if (type === 'addition') newStock = prevStock + qty;
            else if (type === 'reduction') newStock = Math.max(0, prevStock - qty);
            else if (type === 'damaged') { newStock = Math.max(0, prevStock - qty); ProductDB.update(stockModal.product.id, { damaged: stockModal.product.damaged + qty }); }

            ProductDB.update(stockModal.product.id, { stock: newStock });
            StockMovementDB.create({
              productId: stockModal.product.id,
              productName: stockModal.product.name,
              type: type as any,
              quantity: qty,
              previousStock: prevStock,
              newStock,
              reason,
              userId: currentUser!.id,
              userName: currentUser!.name,
            });
            addAuditLog('STOCK', 'Product', stockModal.product.id, `${type}: ${qty} units. Reason: ${reason}`);
            refreshProducts();
            refreshStockMovements();
            setStockModal(null);
            setToast({ message: `Stock ${type} recorded`, type: 'success' });
          }}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        danger
      />
    </div>
  );
}

// Product Form Modal
function ProductFormModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    category: product?.category || '',
    sizes: product?.sizes.join(', ') || '',
    colors: product?.colors.join(', ') || '',
    purchaseCost: product?.purchaseCost?.toString() || '',
    sellingPrice: product?.sellingPrice?.toString() || '',
    stock: product?.stock?.toString() || '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (!form.sku.trim()) errs.sku = 'SKU is required';
    if (!form.category.trim()) errs.category = 'Category is required';
    if (!form.sellingPrice || parseFloat(form.sellingPrice) <= 0) errs.sellingPrice = 'Valid selling price required';
    if (!form.purchaseCost || parseFloat(form.purchaseCost) < 0) errs.purchaseCost = 'Valid cost price required';
    if (form.stock && parseInt(form.stock) < 0) errs.stock = 'Stock cannot be negative';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      sizes: form.sizes.split(',').map(s => s.trim()).filter(Boolean),
      colors: form.colors.split(',').map(c => c.trim()).filter(Boolean),
      purchaseCost: parseFloat(form.purchaseCost),
      sellingPrice: parseFloat(form.sellingPrice),
      stock: parseInt(form.stock) || 0,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={product ? 'Edit Product' : 'Add New Product'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${errors.name ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`} placeholder="e.g. Classic Polo Shirt" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Barcode *</label>
            <input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${errors.sku ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`} placeholder="e.g. POLO-001" />
            {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${errors.category ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`} placeholder="e.g. Shirts, Trousers, Dresses" />
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
            <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${errors.stock ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`} />
            {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost *</label>
            <input type="number" min="0" step="0.01" value={form.purchaseCost} onChange={e => setForm({ ...form, purchaseCost: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${errors.purchaseCost ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`} placeholder="0.00" />
            {errors.purchaseCost && <p className="text-xs text-red-500 mt-1">{errors.purchaseCost}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
            <input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${errors.sellingPrice ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`} placeholder="0.00" />
            {errors.sellingPrice && <p className="text-xs text-red-500 mt-1">{errors.sellingPrice}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sizes (comma separated)</label>
            <input type="text" value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" placeholder="S, M, L, XL, XXL" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Colors (comma separated)</label>
            <input type="text" value={form.colors} onChange={e => setForm({ ...form, colors: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" placeholder="Red, Blue, Black, White" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            {product ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Stock Adjustment Modal
function StockAdjustmentModal({ product, type, onClose, onSave }: { product: Product; type: string; onClose: () => void; onSave: (type: string, qty: number, reason: string) => void }) {
  const [adjType, setAdjType] = useState(type);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseInt(qty);
    if (!q || q <= 0) return;
    onSave(adjType, q, reason);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Stock Adjustment - ${product.name}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="text-gray-600">Current Stock: <span className="font-bold text-gray-900">{product.stock}</span></p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={adjType} onChange={e => setAdjType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
            <option value="addition">Stock Addition</option>
            <option value="reduction">Stock Reduction</option>
            <option value="damaged">Damaged/Lost</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
          <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" placeholder="Enter quantity" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" placeholder="Reason for adjustment" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Apply</button>
        </div>
      </form>
    </Modal>
  );
}
