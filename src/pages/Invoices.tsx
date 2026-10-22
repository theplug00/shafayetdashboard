import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState, Badge } from '../components/Common';
import { FileText, Search, Printer, Eye, Download } from 'lucide-react';
import { Sale } from '../types';

export function InvoicesPage() {
  const { sales, settings } = useApp();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewInvoice, setViewInvoice] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const filteredSales = useMemo(() => {
    return [...sales]
      .filter(s => {
        const matchSearch = s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || s.customerName.toLowerCase().includes(search.toLowerCase());
        const saleDate = s.createdAt.split('T')[0];
        const matchFrom = !dateFrom || saleDate >= dateFrom;
        const matchTo = !dateTo || saleDate <= dateTo;
        return matchSearch && matchFrom && matchTo;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, search, dateFrom, dateTo]);

  const formatCurrency = (amount: number) => `${settings.currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const handlePrint = (sale: Sale, format: 'a4' | 'thermal') => {
    const printContent = generateInvoiceHTML(sale, format);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generateInvoiceHTML = (sale: Sale, format: 'a4' | 'thermal') => {
    const isThermal = format === 'thermal';
    const width = isThermal ? '80mm' : '210mm';
    const padding = isThermal ? '5mm' : '20mm';

    return `<!DOCTYPE html><html><head><title>${sale.invoiceNumber}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; width: ${width}; padding: ${padding}; font-size: ${isThermal ? '11px' : '12px'}; }
      .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
      .header h1 { font-size: ${isThermal ? '16px' : '20px'}; margin-bottom: 4px; }
      .header p { font-size: ${isThermal ? '10px' : '11px'}; color: #555; }
      .info { margin-bottom: 10px; font-size: ${isThermal ? '10px' : '11px'}; }
      .info div { margin-bottom: 2px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th { border-bottom: 1px solid #000; padding: 4px 2px; text-align: left; font-size: ${isThermal ? '10px' : '11px'}; }
      td { padding: 3px 2px; font-size: ${isThermal ? '10px' : '11px'}; border-bottom: 1px dotted #ccc; }
      .text-right { text-align: right; }
      .totals { border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; }
      .totals div { display: flex; justify-content: space-between; margin-bottom: 3px; }
      .total-final { font-weight: bold; font-size: ${isThermal ? '13px' : '14px'}; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
      .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-size: ${isThermal ? '9px' : '10px'}; color: #666; }
      .status { text-align: center; margin: 10px 0; padding: 5px; border: 1px solid; font-weight: bold; }
      .status.paid { border-color: green; color: green; }
      .status.partial { border-color: orange; color: orange; }
      .status.unpaid { border-color: red; color: red; }
      @media print { @page { size: ${isThermal ? '80mm auto' : 'A4'}; margin: 0; } }
    </style></head><body>
    <div class="header">
      <h1>${settings.businessName}</h1>
      <p>${settings.address}</p>
      <p>Tel: ${settings.phone} | ${settings.email}</p>
    </div>
    <div class="info">
      <div><strong>Invoice:</strong> ${sale.invoiceNumber}</div>
      <div><strong>Date:</strong> ${new Date(sale.createdAt).toLocaleString()}</div>
      <div><strong>Customer:</strong> ${sale.customerName || 'Walk-in Customer'}${sale.customerPhone ? ` (${sale.customerPhone})` : ''}</div>
      <div><strong>Cashier:</strong> ${sale.cashierName}</div>
      <div><strong>Payment:</strong> ${sale.paymentMethod}</div>
    </div>
    <table>
      <thead><tr><th>Item</th><th>Size</th><th>Color</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
      <tbody>${sale.items.map(item => `<tr><td>${item.productName}</td><td>${item.size}</td><td>${item.color}</td><td class="text-right">${item.quantity}</td><td class="text-right">${formatCurrency(item.unitPrice)}</td><td class="text-right">${formatCurrency(item.total)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal:</span><span>${formatCurrency(sale.subtotal)}</span></div>
      ${sale.discount > 0 ? `<div><span>Discount:</span><span>-${formatCurrency(sale.discount)}</span></div>` : ''}
      ${sale.tax > 0 ? `<div><span>Tax:</span><span>${formatCurrency(sale.tax)}</span></div>` : ''}
      <div class="total-final"><span>TOTAL:</span><span>${formatCurrency(sale.total)}</span></div>
      <div><span>Paid:</span><span>${formatCurrency(sale.paid)}</span></div>
      ${sale.balance > 0 ? `<div><span>Balance Due:</span><span>${formatCurrency(sale.balance)}</span></div>` : ''}
    </div>
    <div class="status ${sale.status}">${sale.status.toUpperCase()}</div>
    <div class="footer">
      <p>Thank you for your business!</p>
      <p>This is a computer-generated invoice.</p>
    </div>
    </body></html>`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none" placeholder="To" />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length > 0 ? filteredSales.map(sale => (
                <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600">{sale.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{sale.customerName || 'Walk-in'}</p>
                    {sale.customerPhone && <p className="text-xs text-gray-400">{sale.customerPhone}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="info">{sale.paymentMethod}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={sale.status === 'paid' ? 'success' : sale.status === 'partial' ? 'warning' : 'danger'}>
                      {sale.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewInvoice(sale)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handlePrint(sale, settings.receiptFormat)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Print Receipt">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button onClick={() => handlePrint(sale, 'a4')} className="p-1.5 rounded hover:bg-purple-50 text-purple-600" title="Print A4 Invoice">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7}><EmptyState icon={FileText} title="No invoices found" description="Invoices will appear here after sales are recorded." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredSales.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
            Showing {filteredSales.length} of {sales.length} invoices
          </div>
        )}
      </div>

      {/* Invoice Preview Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewInvoice(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Invoice {viewInvoice.invoiceNumber}</h2>
              <div className="flex gap-2">
                <button onClick={() => handlePrint(viewInvoice, settings.receiptFormat)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                  <Printer className="w-3.5 h-3.5" /> Receipt
                </button>
                <button onClick={() => handlePrint(viewInvoice, 'a4')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                  <FileText className="w-3.5 h-3.5" /> A4 Invoice
                </button>
                <button onClick={() => setViewInvoice(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
              </div>
            </div>
            <div ref={printRef} className="overflow-y-auto flex-1 p-6">
              <div className="max-w-lg mx-auto">
                <div className="text-center mb-6 pb-4 border-b border-dashed border-gray-300">
                  <h1 className="text-xl font-bold text-gray-900">{settings.businessName}</h1>
                  <p className="text-sm text-gray-500">{settings.address}</p>
                  <p className="text-sm text-gray-500">{settings.phone} | {settings.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">Invoice #</p>
                    <p className="font-medium">{viewInvoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium">{new Date(viewInvoice.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium">{viewInvoice.customerName || 'Walk-in'}</p>
                    {viewInvoice.customerPhone && <p className="text-xs text-gray-400">{viewInvoice.customerPhone}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Cashier</p>
                    <p className="font-medium">{viewInvoice.cashierName}</p>
                  </div>
                </div>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-600">Item</th>
                      <th className="text-left py-2 font-medium text-gray-600">Details</th>
                      <th className="text-right py-2 font-medium text-gray-600">Qty</th>
                      <th className="text-right py-2 font-medium text-gray-600">Price</th>
                      <th className="text-right py-2 font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2">{item.productName}</td>
                        <td className="py-2 text-gray-500 text-xs">{item.size} / {item.color}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-dashed border-gray-300 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(viewInvoice.subtotal)}</span></div>
                  {viewInvoice.discount > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-red-600">-{formatCurrency(viewInvoice.discount)}</span></div>}
                  {viewInvoice.tax > 0 && <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{formatCurrency(viewInvoice.tax)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Total</span><span>{formatCurrency(viewInvoice.total)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Paid ({viewInvoice.paymentMethod})</span><span className="text-green-600">{formatCurrency(viewInvoice.paid)}</span></div>
                  {viewInvoice.balance > 0 && <div className="flex justify-between"><span className="text-gray-600">Balance Due</span><span className="text-amber-600 font-medium">{formatCurrency(viewInvoice.balance)}</span></div>}
                </div>
                <div className={`text-center mt-4 py-2 rounded font-medium text-sm ${viewInvoice.status === 'paid' ? 'bg-green-50 text-green-700' : viewInvoice.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  {viewInvoice.status.toUpperCase()}
                </div>
                <p className="text-center text-xs text-gray-400 mt-4">Thank you for your business!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
