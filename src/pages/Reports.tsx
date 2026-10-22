import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState, Badge } from '../components/Common';
import { BarChart3, FileText, Package, TrendingUp, Download, Filter, History } from 'lucide-react';

type ReportType = 'sales' | 'inventory' | 'stock' | 'profit' | 'audit';

export function ReportsPage() {
  const { products, sales, stockMovements, expenses, auditLogs, settings } = useApp();
  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const formatCurrency = (amount: number) => `${settings.currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const categories = useMemo(() => [...new Set(products.map(p => p.category))].filter(Boolean), [products]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = s.createdAt.split('T')[0];
      return (!dateFrom || saleDate >= dateFrom) && (!dateTo || saleDate <= dateTo);
    });
  }, [sales, dateFrom, dateTo]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => !categoryFilter || p.category === categoryFilter);
  }, [products, categoryFilter]);

  const salesReport = useMemo(() => {
    const totalRevenue = filteredSales.reduce((s, sale) => s + sale.paid, 0);
    const totalDiscount = filteredSales.reduce((s, sale) => s + sale.discount, 0);
    const totalTax = filteredSales.reduce((s, sale) => s + sale.tax, 0);
    const totalGross = filteredSales.reduce((s, sale) => s + sale.total, 0);
    const outstanding = filteredSales.reduce((s, sale) => s + sale.balance, 0);
    const paidCount = filteredSales.filter(s => s.status === 'paid').length;
    const partialCount = filteredSales.filter(s => s.status === 'partial').length;
    const unpaidCount = filteredSales.filter(s => s.status === 'unpaid').length;

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    filteredSales.forEach(s => {
      paymentBreakdown[s.paymentMethod] = (paymentBreakdown[s.paymentMethod] || 0) + s.paid;
    });

    return { totalRevenue, totalDiscount, totalTax, totalGross, outstanding, paidCount, partialCount, unpaidCount, paymentBreakdown };
  }, [filteredSales]);

  const inventoryReport = useMemo(() => {
    const totalItems = filteredProducts.length;
    const totalStock = filteredProducts.reduce((s, p) => s + p.stock, 0);
    const totalValue = filteredProducts.reduce((s, p) => s + (p.stock * p.sellingPrice), 0);
    const totalCost = filteredProducts.reduce((s, p) => s + (p.stock * p.purchaseCost), 0);
    const totalSold = filteredProducts.reduce((s, p) => s + p.sold, 0);
    const lowStock = filteredProducts.filter(p => p.stock <= settings.lowStockThreshold && p.stock > 0);
    const outOfStock = filteredProducts.filter(p => p.stock === 0);

    return { totalItems, totalStock, totalValue, totalCost, totalSold, lowStock, outOfStock };
  }, [filteredProducts, settings.lowStockThreshold]);

  const profitReport = useMemo(() => {
    const totalRevenue = filteredSales.reduce((s, sale) => s + sale.paid, 0);
    let totalCOGS = 0;
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) totalCOGS += product.purchaseCost * item.quantity;
      });
    });
    const grossProfit = totalRevenue - totalCOGS;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit, margin };
  }, [filteredSales, products, expenses]);

  const handleExportCSV = (type: ReportType) => {
    let csv = '';
    let filename = '';

    switch (type) {
      case 'sales':
        csv = 'Invoice,Customer,Date,Subtotal,Discount,Tax,Total,Paid,Balance,Payment,Status\n';
        csv += filteredSales.map(s => `${s.invoiceNumber},${s.customerName},${new Date(s.createdAt).toLocaleDateString()},${s.subtotal},${s.discount},${s.tax},${s.total},${s.paid},${s.balance},${s.paymentMethod},${s.status}`).join('\n');
        filename = `sales_report_${dateFrom || 'all'}_to_${dateTo || 'all'}.csv`;
        break;
      case 'inventory':
        csv = 'Product,SKU,Category,Cost Price,Selling Price,Stock,Sold,Damaged,Stock Value\n';
        csv += filteredProducts.map(p => `${p.name},${p.sku},${p.category},${p.purchaseCost},${p.sellingPrice},${p.stock},${p.sold},${p.damaged},${p.stock * p.sellingPrice}`).join('\n');
        filename = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'profit':
        csv = 'Metric,Amount\n';
        csv += `Total Revenue,${profitReport.totalRevenue}\nCost of Goods Sold,${profitReport.totalCOGS}\nGross Profit,${profitReport.grossProfit}\nTotal Expenses,${profitReport.totalExpenses}\nNet Profit,${profitReport.netProfit}\nProfit Margin,${profitReport.margin.toFixed(2)}%`;
        filename = `profit_report_${dateFrom || 'all'}_to_${dateTo || 'all'}.csv`;
        break;
      case 'audit':
        csv = 'Date,User,Action,Entity,Details\n';
        csv += auditLogs.map(l => `${new Date(l.createdAt).toLocaleString()},${l.userName},${l.action},${l.entity},"${l.details}"`).join('\n');
        filename = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
        break;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const reports = [
    { id: 'sales' as ReportType, label: 'Sales Report', icon: BarChart3 },
    { id: 'inventory' as ReportType, label: 'Inventory Report', icon: Package },
    { id: 'stock' as ReportType, label: 'Stock Movements', icon: History },
    { id: 'profit' as ReportType, label: 'Profit Report', icon: TrendingUp },
    { id: 'audit' as ReportType, label: 'Audit Trail', icon: FileText },
  ];

  return (
    <div className="space-y-4">
      {/* Report Tabs */}
      <div className="flex flex-wrap gap-2">
        {reports.map(r => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeReport === r.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            <r.icon className="w-4 h-4" /> {r.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
        {(activeReport === 'inventory' || activeReport === 'sales') && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button onClick={() => handleExportCSV(activeReport)} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 ml-auto">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Report Content */}
      {activeReport === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="text-lg font-bold">{filteredSales.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Revenue Collected</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(salesReport.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Total Discounts</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(salesReport.totalDiscount)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(salesReport.outstanding)}</p>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Method Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(salesReport.paymentBreakdown).map(([method, amount]) => (
                <div key={method} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{method}</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(amount)}</p>
                </div>
              ))}
              {Object.keys(salesReport.paymentBreakdown).length === 0 && <p className="text-sm text-gray-400">No data</p>}
            </div>
          </div>

          {/* Sales Status */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Sales Status</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><Badge variant="success">Paid</Badge><span className="text-sm">{salesReport.paidCount}</span></div>
              <div className="flex items-center gap-2"><Badge variant="warning">Partial</Badge><span className="text-sm">{salesReport.partialCount}</span></div>
              <div className="flex items-center gap-2"><Badge variant="danger">Unpaid</Badge><span className="text-sm">{salesReport.unpaidCount}</span></div>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Total Products</p>
              <p className="text-lg font-bold">{inventoryReport.totalItems}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Total Stock Units</p>
              <p className="text-lg font-bold">{inventoryReport.totalStock}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Stock Value (Retail)</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(inventoryReport.totalValue)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Stock Value (Cost)</p>
              <p className="text-lg font-bold">{formatCurrency(inventoryReport.totalCost)}</p>
            </div>
          </div>

          {/* Low Stock Items */}
          {inventoryReport.lowStock.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-amber-800 mb-3">Low Stock Items ({inventoryReport.lowStock.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {inventoryReport.lowStock.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <span className="text-sm">{p.name}</span>
                    <Badge variant="warning">{p.stock}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Out of Stock */}
          {inventoryReport.outOfStock.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-red-800 mb-3">Out of Stock ({inventoryReport.outOfStock.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {inventoryReport.outOfStock.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-red-100">
                    <span className="text-sm">{p.name}</span>
                    <Badge variant="danger">0</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Inventory Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Sold</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-2 text-gray-600">{p.category}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(p.purchaseCost)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(p.sellingPrice)}</td>
                      <td className="px-4 py-2 text-right font-medium">{p.stock}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{p.sold}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(p.stock * p.sellingPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-medium">
                    <td colSpan={5} className="px-4 py-3 text-right">Totals:</td>
                    <td className="px-4 py-3 text-right">{inventoryReport.totalStock}</td>
                    <td className="px-4 py-3 text-right">{inventoryReport.totalSold}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(inventoryReport.totalValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'stock' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Before</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">After</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                </tr>
              </thead>
              <tbody>
                {stockMovements.length > 0 ? [...stockMovements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(mov => (
                  <tr key={mov.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500">{new Date(mov.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2 font-medium">{mov.productName}</td>
                    <td className="px-4 py-2">
                      <Badge variant={mov.type === 'addition' ? 'success' : mov.type === 'sale' ? 'info' : 'danger'}>
                        {mov.type}
                      </Badge>
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${mov.type === 'addition' ? 'text-green-600' : 'text-red-600'}`}>
                      {mov.type === 'addition' ? '+' : '-'}{mov.quantity}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">{mov.previousStock}</td>
                    <td className="px-4 py-2 text-right font-medium">{mov.newStock}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs">{mov.reason || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{mov.userName}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={8}><EmptyState icon={History} title="No stock movements" description="Stock movements will appear here when stock is adjusted or sales are made." /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReport === 'profit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(profitReport.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Cost of Goods Sold</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(profitReport.totalCOGS)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Gross Profit</p>
              <p className={`text-lg font-bold ${profitReport.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profitReport.grossProfit)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Total Expenses</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(profitReport.totalExpenses)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Net Profit</p>
              <p className={`text-lg font-bold ${profitReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profitReport.netProfit)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Profit Margin</p>
              <p className={`text-lg font-bold ${profitReport.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profitReport.margin.toFixed(1)}%</p>
            </div>
          </div>

          {/* Profit Summary */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Profit Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Revenue (collected payments)</span>
                <span className="font-medium">{formatCurrency(profitReport.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Less: Cost of Goods Sold</span>
                <span className="font-medium text-red-600">({formatCurrency(profitReport.totalCOGS)})</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 bg-green-50 px-3 rounded">
                <span className="text-sm font-medium text-gray-700">Gross Profit</span>
                <span className="font-bold text-green-700">{formatCurrency(profitReport.grossProfit)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Less: Operating Expenses</span>
                <span className="font-medium text-amber-600">({formatCurrency(profitReport.totalExpenses)})</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-blue-50 px-3 rounded-lg">
                <span className="font-medium text-gray-900">Net Profit</span>
                <span className="text-xl font-bold text-blue-700">{formatCurrency(profitReport.netProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length > 0 ? [...auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(log => (
                  <tr key={log.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">{log.userName}</td>
                    <td className="px-4 py-2"><Badge variant="info">{log.action}</Badge></td>
                    <td className="px-4 py-2 text-gray-600">{log.entity}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs max-w-xs truncate">{log.details}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}><EmptyState icon={FileText} title="No audit logs" description="Audit trail will be populated as actions are performed." /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
