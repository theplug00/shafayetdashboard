import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SaleDB, ProductDB, StockMovementDB } from '../services/database';
import { Modal, Badge, EmptyState, Toast } from '../components/Common';
import { Plus, ShoppingCart, Trash2, Search, Minus } from 'lucide-react';
import { SaleItem } from '../types';

export function SalesPage() {
  const { products, sales, currentUser, settings, refreshProducts, refreshSales, refreshStockMovements, addAuditLog } = useApp();
  const [showNewSale, setShowNewSale] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const filteredSales = useMemo(() => {
    return [...sales]
      .filter(s => {
        const matchSearch = s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || s.customerName.toLowerCase().includes(search.toLowerCase());
        const matchDate = !dateFilter || s.createdAt.startsWith(dateFilter);
        return matchSearch && matchDate;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, search, dateFilter]);

  const formatCurrency = (amount: number) => `${settings.currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search invoices or customers..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
        </div>
        <button onClick={() => setShowNewSale(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Sale
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-500">Total Sales</p>
          <p className="text-lg font-bold text-gray-900">{sales.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(sales.reduce((s, sale) => s + sale.paid, 0))}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-500">Outstanding</p>
          <p className="text-lg font-bold text-amber-600">{formatCurrency(sales.reduce((s, sale) => s + sale.balance, 0))}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-500">Paid Sales</p>
          <p className="text-lg font-bold text-blue-600">{sales.filter(s => s.status === 'paid').length}</p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length > 0 ? filteredSales.map(sale => (
                <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600">{sale.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{sale.customerName || 'Walk-in'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{sale.items.length}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(sale.paid)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{sale.balance > 0 ? formatCurrency(sale.balance) : '-'}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="info">{sale.paymentMethod}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={sale.status === 'paid' ? 'success' : sale.status === 'partial' ? 'warning' : 'danger'}>
                      {sale.status}
                    </Badge>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9}><EmptyState icon={ShoppingCart} title="No sales found" description="Record your first sale to see it here." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredSales.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
            Showing {filteredSales.length} of {sales.length} sales
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      {showNewSale && (
        <NewSaleModal
          onClose={() => setShowNewSale(false)}
          onSave={(saleData: any) => {
            // Process sale: update stock for each item
            (saleData.items as SaleItem[]).forEach((item: SaleItem) => {
              ProductDB.updateStock(item.productId, -item.quantity);
              StockMovementDB.create({
                productId: item.productId,
                productName: item.productName,
                type: 'sale',
                quantity: item.quantity,
                previousStock: products.find(p => p.id === item.productId)?.stock || 0,
                newStock: (products.find(p => p.id === item.productId)?.stock || 0) - item.quantity,
                reason: `Sale - ${saleData.invoiceNumber || 'New'}`,
                userId: currentUser!.id,
                userName: currentUser!.name,
              });
            });

            const sale = SaleDB.create({
              items: saleData.items,
              subtotal: saleData.subtotal,
              discount: saleData.discount,
              tax: saleData.tax,
              total: saleData.total,
              paid: saleData.paid,
              balance: saleData.balance,
              paymentMethod: saleData.paymentMethod,
              customerName: saleData.customerName,
              status: saleData.status,
              cashierId: currentUser!.id,
              cashierName: currentUser!.name,
            });

            addAuditLog('CREATE', 'Sale', sale.id, `New sale: ${sale.invoiceNumber} - Total: ${formatCurrency(sale.total)}`);
            refreshProducts();
            refreshSales();
            refreshStockMovements();
            setShowNewSale(false);
            setToast({ message: `Sale recorded: ${sale.invoiceNumber}`, type: 'success' });
          }}
        />
      )}
    </div>
  );
}

// New Sale Modal
function NewSaleModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const { products, settings, currentUser } = useApp();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState(settings.paymentMethods[0] || 'Cash');
  const [paid, setPaid] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const product = products.find(p => p.id === selectedProduct);

  const addItem = () => {
    if (!product || !selectedSize || !selectedColor || !quantity) {
      setErrors({ item: 'Please select product, size, color, and quantity' });
      return;
    }
    const qty = parseInt(quantity);
    if (qty > product.stock) {
      setErrors({ item: `Only ${product.stock} units available` });
      return;
    }
    const existing = items.find(i => i.productId === product.id && i.size === selectedSize && i.color === selectedColor);
    if (existing) {
      if (existing.quantity + qty > product.stock) {
        setErrors({ item: `Insufficient stock. Available: ${product.stock}, in cart: ${existing.quantity}` });
        return;
      }
      setItems(items.map(i => i === existing ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.unitPrice } : i));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        size: selectedSize,
        color: selectedColor,
        quantity: qty,
        unitPrice: product.sellingPrice,
        total: qty * product.sellingPrice,
      }]);
    }
    setSelectedProduct(''); setSelectedSize(''); setSelectedColor(''); setQuantity('1');
    setErrors({});
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const discountAmt = parseFloat(discount) || 0;
  const taxAmt = subtotal * (settings.taxRate / 100);
  const total = subtotal - discountAmt + taxAmt;
  const paidAmt = parseFloat(paid) || total;
  const balance = Math.max(0, total - paidAmt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { setErrors({ form: 'Add at least one item' }); return; }
    const status = balance === 0 ? 'paid' : paidAmt > 0 ? 'partial' : 'unpaid';
    onSave({
      items, subtotal, discount: discountAmt, tax: taxAmt, total,
      paid: paidAmt, balance, paymentMethod, customerName, status,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Record New Sale" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{errors.form}</p>}

        {/* Add Items Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Add Items</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <select value={selectedProduct} onChange={e => { setSelectedProduct(e.target.value); setSelectedSize(''); setSelectedColor(''); }}
              className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
              <option value="">Select Product</option>
              {products.filter(p => p.stock > 0).map(p => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
              ))}
            </select>
            <select value={selectedSize} onChange={e => setSelectedSize(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" disabled={!product}>
              <option value="">Size</option>
              {product?.sizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={selectedColor} onChange={e => setSelectedColor(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" disabled={!product}>
              <option value="">Color</option>
              {product?.colors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-1">
              <input type="number" min="1" max={product?.stock || 1} value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" placeholder="Qty" />
              <button type="button" onClick={addItem} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {errors.item && <p className="text-xs text-red-500 mt-2">{errors.item}</p>}
        </div>

        {/* Cart Items */}
        {items.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Product</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Size</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Color</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Qty</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Price</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="px-3 py-2 font-medium">{item.productName}</td>
                    <td className="px-3 py-2">{item.size}</td>
                    <td className="px-3 py-2">{item.color}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => {
                          if (item.quantity > 1) setItems(items.map((i, j) => j === idx ? { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.unitPrice } : i));
                        }} className="p-0.5 hover:bg-gray-100 rounded"><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button type="button" onClick={() => {
                          const prod = products.find(p => p.id === item.productId);
                          if (prod && item.quantity < prod.stock) setItems(items.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice } : i));
                        }} className="p-0.5 hover:bg-gray-100 rounded"><Plus className="w-3 h-3" /></button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{settings.currency} {item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">{settings.currency} {item.total.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => removeItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals and Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" placeholder="Walk-in customer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
                {settings.paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount ({settings.currency})</label>
              <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid ({settings.currency})</label>
              <input type="number" min="0" step="0.01" value={paid || total.toFixed(2)} onChange={e => setPaid(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium">{settings.currency} {subtotal.toFixed(2)}</span></div>
            {discountAmt > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Discount</span><span className="text-red-600">-{settings.currency} {discountAmt.toFixed(2)}</span></div>}
            {taxAmt > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Tax ({settings.taxRate}%)</span><span>{settings.currency} {taxAmt.toFixed(2)}</span></div>}
            <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Total</span><span>{settings.currency} {total.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Paid</span><span className="text-green-600">{settings.currency} {paidAmt.toFixed(2)}</span></div>
            {balance > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Balance Due</span><span className="text-amber-600 font-medium">{settings.currency} {balance.toFixed(2)}</span></div>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={items.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Complete Sale
          </button>
        </div>
      </form>
    </Modal>
  );
}
