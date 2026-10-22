import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SaleDB, ProductDB, StockMovementDB, CustomerDB } from '../services/database';
import { Modal, Badge, EmptyState, Toast } from '../components/Common';
import {
  ScanBarcode, Search, ShoppingCart, UserPlus, Users, Phone, Mail,
  Plus, Minus, Trash2, Check, Package, CreditCard, History,
  ArrowRight, AlertCircle, Tag, DollarSign, User
} from 'lucide-react';
import { SaleItem, Customer } from '../types';

export function CRMPage() {
  const { products, customers, sales, currentUser, settings, refreshProducts, refreshSales, refreshCustomers, refreshStockMovements, addAuditLog } = useApp();
  const [activeTab, setActiveTab] = useState<'pos' | 'customers'>('pos');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'pos' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}>
          <ScanBarcode className="w-4 h-4" /> Quick Sale / Scan
        </button>
        <button onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'customers' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}>
          <Users className="w-4 h-4" /> Customers ({customers.length})
        </button>
      </div>

      {activeTab === 'pos' ? (
        <QuickSalePanel
          products={products}
          customers={customers}
          settings={settings}
          currentUser={currentUser!}
          refreshCustomers={refreshCustomers}
          addAuditLog={addAuditLog}
          onComplete={(saleData, customerId) => {
            // Update stock
            saleData.items.forEach((item: SaleItem) => {
              const prod = products.find(p => p.id === item.productId);
              ProductDB.updateStock(item.productId, -item.quantity);
              StockMovementDB.create({
                productId: item.productId,
                productName: item.productName,
                type: 'sale',
                quantity: item.quantity,
                previousStock: prod?.stock || 0,
                newStock: (prod?.stock || 0) - item.quantity,
                reason: `CRM Quick Sale`,
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
              customerId: customerId,
              customerName: saleData.customerName,
              customerPhone: saleData.customerPhone,
              status: saleData.status,
              cashierId: currentUser!.id,
              cashierName: currentUser!.name,
            });

            // Update customer stats
            if (customerId) {
              CustomerDB.updateAfterSale(customerId, saleData.paid);
            }

            addAuditLog('CREATE', 'Sale', sale.id, `CRM Quick Sale: ${sale.invoiceNumber}`);
            refreshProducts();
            refreshSales();
            refreshCustomers();
            refreshStockMovements();
            setToast({ message: `Sale completed: ${sale.invoiceNumber}`, type: 'success' });
          }}
        />
      ) : (
        <CustomerManagement
          customers={customers}
          sales={sales}
          settings={settings}
          onRefresh={refreshCustomers}
          onAddAuditLog={addAuditLog}
          currentUser={currentUser!}
        />
      )}
    </div>
  );
}

// Quick Sale POS Panel
function QuickSalePanel({ products, customers, settings, currentUser, refreshCustomers, addAuditLog, onComplete }: {
  products: any[];
  customers: Customer[];
  settings: any;
  currentUser: any;
  refreshCustomers: () => void;
  addAuditLog: (action: string, entity: string, entityId: string, details: string) => void;
  onComplete: (saleData: any, customerId: string) => void;
}) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<any | null>(null);
  const [scanError, setScanError] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(settings.paymentMethods[0] || 'Cash');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const scanRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number) => `${settings.currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // Auto-focus scan input
  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  // Handle scan/lookup
  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    setScanError('');
    setScannedProduct(null);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);

    if (!scanInput.trim()) return;

    // Search by SKU or barcode
    const found = products.find(p =>
      p.sku.toLowerCase() === scanInput.trim().toLowerCase() ||
      p.id === scanInput.trim() ||
      p.name.toLowerCase().includes(scanInput.trim().toLowerCase())
    );

    if (found) {
      if (found.stock <= 0) {
        setScanError('Product is out of stock');
        return;
      }
      setScannedProduct(found);
      // Auto-select first size and color if only one option
      if (found.sizes.length === 1) setSelectedSize(found.sizes[0]);
      if (found.colors.length === 1) setSelectedColor(found.colors[0]);
    } else {
      setScanError(`No product found for "${scanInput}"`);
    }
  };

  // Add to cart
  const addToCart = () => {
    if (!scannedProduct || !selectedSize || !selectedColor) return;
    if (quantity > scannedProduct.stock) {
      setScanError(`Only ${scannedProduct.stock} units available`);
      return;
    }

    const existing = cart.find(i => i.productId === scannedProduct.id && i.size === selectedSize && i.color === selectedColor);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > scannedProduct.stock) {
        setScanError(`Insufficient stock. Available: ${scannedProduct.stock}`);
        return;
      }
      setCart(cart.map(i => i === existing ? { ...i, quantity: newQty, total: newQty * i.unitPrice } : i));
    } else {
      setCart([...cart, {
        productId: scannedProduct.id,
        productName: scannedProduct.name,
        size: selectedSize,
        color: selectedColor,
        quantity,
        unitPrice: scannedProduct.sellingPrice,
        total: quantity * scannedProduct.sellingPrice,
      }]);
    }

    // Reset for next scan
    setScanInput('');
    setScannedProduct(null);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
    setScanError('');
    scanRef.current?.focus();
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, i) => sum + i.total, 0);
  const taxAmt = subtotal * (settings.taxRate / 100);
  const total = subtotal - discount + taxAmt;
  const paid = parseFloat(paidAmount) || total;
  const balance = Math.max(0, total - paid);

  // Complete sale
  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    const status = balance === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    onComplete({
      items: cart,
      subtotal,
      discount,
      tax: taxAmt,
      total,
      paid,
      balance,
      paymentMethod,
      customerName: selectedCustomer?.name || '',
      customerPhone: selectedCustomer?.phone || '',
      status,
    }, selectedCustomer?.id || '');
    // Reset
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setPaidAmount('');
    setCustomerSearch('');
  };

  // Customer search results
  const customerResults = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ).slice(0, 5);
  }, [customerSearch, customers]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Scanner + Product Details */}
      <div className="lg:col-span-2 space-y-4">
        {/* Scanner Input */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ScanBarcode className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Scan or Enter Product ID / SKU</h3>
          </div>
          <form onSubmit={handleScan} className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={scanRef}
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-blue-200 text-base font-mono focus:border-blue-500 outline-none bg-blue-50/50"
                placeholder="Scan barcode or type SKU / product name..."
                autoFocus
              />
            </div>
            <button type="submit" className="px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
              <Search className="w-4 h-4" /> Lookup
            </button>
          </form>
          {scanError && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 border border-red-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-600">{scanError}</span>
            </div>
          )}
        </div>

        {/* Product Details Card */}
        {scannedProduct && (
          <div className="bg-white rounded-xl border-2 border-green-200 p-4 animate-slide-in">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{scannedProduct.name}</h3>
                <p className="text-sm text-gray-500 font-mono">SKU: {scannedProduct.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(scannedProduct.sellingPrice)}</p>
                <p className="text-xs text-gray-500">Cost: {formatCurrency(scannedProduct.purchaseCost)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium">{scannedProduct.category}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Available Stock</p>
                <p className={`text-sm font-bold ${scannedProduct.stock <= settings.lowStockThreshold ? 'text-amber-600' : 'text-green-600'}`}>{scannedProduct.stock}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Total Sold</p>
                <p className="text-sm font-medium">{scannedProduct.sold}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant={scannedProduct.stock === 0 ? 'danger' : scannedProduct.stock <= settings.lowStockThreshold ? 'warning' : 'success'}>
                  {scannedProduct.stock === 0 ? 'Out of Stock' : scannedProduct.stock <= settings.lowStockThreshold ? 'Low' : 'In Stock'}
                </Badge>
              </div>
            </div>

            {/* Size, Color, Qty Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                <select value={selectedSize} onChange={e => setSelectedSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
                  <option value="">Select</option>
                  {scannedProduct.sizes.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                <select value={selectedColor} onChange={e => setSelectedColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
                  <option value="">Select</option>
                  {scannedProduct.colors.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-2 py-2 hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                  <input type="number" min="1" max={scannedProduct.stock} value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center py-2 text-sm border-x border-gray-200 outline-none" />
                  <button type="button" onClick={() => setQuantity(Math.min(scannedProduct.stock, quantity + 1))} className="px-2 py-2 hover:bg-gray-100"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="flex items-end">
                <button onClick={addToCart}
                  disabled={!selectedSize || !selectedColor}
                  className="w-full py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Add to Cart
                </button>
              </div>
            </div>
            {scannedProduct.sizes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="text-xs text-gray-500 mr-1">Sizes:</span>
                {scannedProduct.sizes.map((s: string) => (
                  <button key={s} onClick={() => setSelectedSize(s)}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${selectedSize === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {scannedProduct.colors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs text-gray-500 mr-1">Colors:</span>
                {scannedProduct.colors.map((c: string) => (
                  <button key={c} onClick={() => setSelectedColor(c)}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${selectedColor === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cart */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Cart ({cart.length} items)</h3>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">Clear All</button>
            )}
          </div>
          {cart.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Product</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Size/Color</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Qty</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Price</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Total</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="px-4 py-2 font-medium">{item.productName}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{item.size} / {item.color}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => {
                            if (item.quantity > 1) setCart(cart.map((i, j) => j === idx ? { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.unitPrice } : i));
                            else setCart(cart.filter((_, j) => j !== idx));
                          }} className="p-0.5 hover:bg-gray-100 rounded"><Minus className="w-3 h-3" /></button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                          <button onClick={() => {
                            const prod = products.find(p => p.id === item.productId);
                            if (prod && item.quantity < prod.stock) setCart(cart.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice } : i));
                          }} className="p-0.5 hover:bg-gray-100 rounded"><Plus className="w-3 h-3" /></button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => setCart(cart.filter((_, j) => j !== idx))} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <ScanBarcode className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Scan or search for a product to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Checkout Panel */}
      <div className="space-y-4">
        {/* Customer Selection */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" /> Customer
            </h3>
            <button onClick={() => setShowNewCustomer(true)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <UserPlus className="w-3 h-3" /> New
            </button>
          </div>
          {selectedCustomer ? (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                  <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-xs text-gray-400 hover:text-red-500">✕</button>
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span>{selectedCustomer.totalOrders} orders</span>
                <span>{formatCurrency(selectedCustomer.totalSpent)} spent</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                onFocus={() => setShowCustomerSearch(true)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
                placeholder="Search customer by name or phone..."
              />
              {showCustomerSearch && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {customerResults.map(c => (
                    <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
              {showCustomerSearch && customerResults.length === 0 && customerSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3">
                  <p className="text-sm text-gray-500">No customers found</p>
                  <button onClick={() => { setShowNewCustomer(true); setShowCustomerSearch(false); }} className="text-xs text-blue-600 hover:text-blue-700 mt-1">
                    + Create new customer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-600" /> Payment
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
                {settings.paymentMethods.map((m: string) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount ({settings.currency})</label>
              <input type="number" min="0" step="0.01" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received ({settings.currency})</label>
              <input type="number" min="0" step="0.01" value={paidAmount || total.toFixed(2)} onChange={e => setPaidAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-red-600">-{formatCurrency(discount)}</span></div>}
            {taxAmt > 0 && <div className="flex justify-between"><span className="text-gray-600">Tax ({settings.taxRate}%)</span><span>{formatCurrency(taxAmt)}</span></div>}
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="text-green-600">{formatCurrency(paid)}</span></div>
            {balance > 0 && <div className="flex justify-between"><span className="text-gray-600">Balance Due</span><span className="text-amber-600 font-medium">{formatCurrency(balance)}</span></div>}
          </div>

          <button
            onClick={handleCompleteSale}
            disabled={cart.length === 0}
            className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            <Check className="w-5 h-5" /> Complete Sale
          </button>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomer && (
        <NewCustomerModal
          onClose={() => setShowNewCustomer(false)}
          onSave={(customer) => {
            const newCustomer = CustomerDB.create(customer);
            setSelectedCustomer(newCustomer);
            setShowNewCustomer(false);
            refreshCustomers();
            addAuditLog('CREATE', 'Customer', newCustomer.id, `New customer: ${customer.name}`);
            setToast({ message: `Customer "${customer.name}" created`, type: 'success' });
          }}
        />
      )}
    </div>
  );
}

// New Customer Modal
function NewCustomerModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add New Customer" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border ${errors.name ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`}
            placeholder="Customer name" autoFocus />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border ${errors.phone ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`}
            placeholder="+233 XX XXX XXXX" />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
            placeholder="customer@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
            placeholder="Customer address" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none resize-none"
            rows={2} placeholder="Preferences, sizes, notes..." />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Customer</button>
        </div>
      </form>
    </Modal>
  );
}

// Customer Management Tab
function CustomerManagement({ customers, sales, settings, onRefresh, onAddAuditLog, currentUser }: {
  customers: Customer[];
  sales: any[];
  settings: any;
  onRefresh: () => void;
  onAddAuditLog: (action: string, entity: string, entityId: string, details: string) => void;
  currentUser: any;
}) {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const formatCurrency = (amount: number) => `${settings.currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const getCustomerSales = (customerId: string) => {
    return sales.filter(s => s.customerId === customerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
            placeholder="Search by name, phone, or email..." />
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <UserPlus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
          <div key={customer.id} onClick={() => setSelectedCustomer(customer)}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{customer.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.phone}</p>
                </div>
              </div>
              <Badge variant={customer.totalOrders > 10 ? 'success' : customer.totalOrders > 0 ? 'info' : 'default'}>
                {customer.totalOrders} orders
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Total Spent</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(customer.totalSpent)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Loyalty Points</p>
                <p className="text-sm font-bold text-purple-600">{customer.loyaltyPoints}</p>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full">
            <EmptyState icon={Users} title="No customers yet" description="Add your first customer to start tracking purchases and building relationships." />
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Modal isOpen={true} onClose={() => setSelectedCustomer(null)} title="Customer Details" size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">{selectedCustomer.name.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  {selectedCustomer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedCustomer.phone}</span>}
                  {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedCustomer.email}</span>}
                </div>
              </div>
              <button onClick={() => { setEditingCustomer(selectedCustomer); setSelectedCustomer(null); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50">Edit</button>
            </div>

            {selectedCustomer.address && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedCustomer.address}</p>
            )}
            {selectedCustomer.notes && (
              <p className="text-sm text-gray-600 bg-amber-50 rounded-lg p-3 border border-amber-100">
                <span className="font-medium text-amber-700">Notes:</span> {selectedCustomer.notes}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">{formatCurrency(selectedCustomer.totalSpent)}</p>
                <p className="text-xs text-green-600">Total Spent</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                <ShoppingCart className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700">{selectedCustomer.totalOrders}</p>
                <p className="text-xs text-blue-600">Orders</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                <Tag className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-700">{selectedCustomer.loyaltyPoints}</p>
                <p className="text-xs text-purple-600">Loyalty Points</p>
              </div>
            </div>

            {/* Purchase History */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <History className="w-4 h-4" /> Purchase History
              </h4>
              {getCustomerSales(selectedCustomer.id).length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Invoice</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCustomerSales(selectedCustomer.id).map(sale => (
                        <tr key={sale.id} className="border-b border-gray-50">
                          <td className="px-3 py-2 font-mono text-xs text-blue-600">{sale.invoiceNumber}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{new Date(sale.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(sale.total)}</td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant={sale.status === 'paid' ? 'success' : sale.status === 'partial' ? 'warning' : 'danger'}>{sale.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">No purchase history</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Customer Modal */}
      {(showAddModal || editingCustomer) && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={() => { setShowAddModal(false); setEditingCustomer(null); }}
          onSave={(data: any) => {
            if (editingCustomer) {
              CustomerDB.update(editingCustomer.id, data);
              onAddAuditLog('UPDATE', 'Customer', editingCustomer.id, `Updated: ${data.name}`);
              setToast({ message: 'Customer updated', type: 'success' });
            } else {
              CustomerDB.create(data);
              onAddAuditLog('CREATE', 'Customer', '', `New customer: ${data.name}`);
              setToast({ message: 'Customer created', type: 'success' });
            }
            onRefresh();
            setShowAddModal(false);
            setEditingCustomer(null);
          }}
        />
      )}
    </div>
  );
}

// Customer Form Modal (for add/edit)
function CustomerFormModal({ customer, onClose, onSave }: { customer: Customer | null; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={customer ? 'Edit Customer' : 'Add New Customer'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border ${errors.name ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`}
            placeholder="Customer name" autoFocus />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border ${errors.phone ? 'border-red-300' : 'border-gray-200'} text-sm focus:border-blue-500 outline-none`}
            placeholder="+233 XX XXX XXXX" />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
            placeholder="customer@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
            placeholder="Customer address" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none resize-none"
            rows={2} placeholder="Preferences, sizes, notes..." />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            {customer ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
