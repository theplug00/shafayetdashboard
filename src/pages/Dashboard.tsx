import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/Common';
import { DollarSign, Package, ShoppingCart, AlertTriangle, TrendingUp, Clock, ArrowUpRight, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export function DashboardPage() {
  const { products, sales, settings, stockMovements, customers } = useApp();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const todaySales = sales.filter(s => s.createdAt.startsWith(today));
    const weekSales = sales.filter(s => s.createdAt >= weekAgo);
    const monthSales = sales.filter(s => s.createdAt >= monthAgo);

    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalSold = products.reduce((sum, p) => sum + p.sold, 0);
    const lowStockItems = products.filter(p => p.stock <= settings.lowStockThreshold).length;

    return {
      totalRevenue: sales.reduce((sum, s) => sum + s.paid, 0),
      totalSales: sales.length,
      totalStock,
      totalSold,
      lowStockItems,
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.paid, 0),
      weekRevenue: weekSales.reduce((sum, s) => sum + s.paid, 0),
      monthRevenue: monthSales.reduce((sum, s) => sum + s.paid, 0),
    };
  }, [products, sales, settings]);

  const salesChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const daySales = sales.filter(s => s.createdAt.startsWith(dateStr));
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: daySales.reduce((sum, s) => sum + s.paid, 0),
        sales: daySales.length,
      };
    });
    return last7Days;
  }, [sales]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    products.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + p.stock;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [products]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

  const recentSales = useMemo(() => {
    return [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [sales]);

  const recentMovements = useMemo(() => {
    return [...stockMovements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [stockMovements]);

  const formatCurrency = (amount: number) => `${settings.currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} color="green" />
        <StatCard title="Total Sales" value={stats.totalSales} icon={ShoppingCart} color="blue" />
        <StatCard title="Available Stock" value={stats.totalStock.toLocaleString()} icon={Package} color="purple" />
        <StatCard title="Low Stock Alerts" value={stats.lowStockItems} icon={AlertTriangle} color="amber" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Today's Revenue</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.todayRevenue)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="p-2 bg-blue-50 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
          <div>
            <p className="text-sm text-gray-500">This Week</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.weekRevenue)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="p-2 bg-purple-50 rounded-lg"><ArrowUpRight className="w-5 h-5 text-purple-600" /></div>
          <div>
            <p className="text-sm text-gray-500">This Month</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.monthRevenue)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="p-2 bg-indigo-50 rounded-lg"><Users className="w-5 h-5 text-indigo-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Customers</p>
            <p className="text-lg font-bold text-gray-900">{customers.length}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Stock by Category</h3>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No products added yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Sales Trend Line */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Sales Count Trend</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Sales</h3>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">{sale.customerName || 'Walk-in'} • {sale.items.length} item(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(sale.total)}</p>
                    <p className={`text-xs ${sale.status === 'paid' ? 'text-green-600' : sale.status === 'partial' ? 'text-amber-600' : 'text-red-600'}`}>
                      {sale.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No sales recorded yet</p>
          )}
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Stock Movements</h3>
          {recentMovements.length > 0 ? (
            <div className="space-y-3">
              {recentMovements.map(mov => (
                <div key={mov.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{mov.productName}</p>
                    <p className="text-xs text-gray-500 capitalize">{mov.type} • {mov.reason || 'No reason'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${mov.type === 'addition' ? 'text-green-600' : 'text-red-600'}`}>
                      {mov.type === 'addition' ? '+' : '-'}{mov.quantity}
                    </p>
                    <p className="text-xs text-gray-500">Stock: {mov.newStock}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No stock movements yet</p>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockItems > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Low Stock Alert</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {products.filter(p => p.stock <= settings.lowStockThreshold).slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                <span className="text-sm text-gray-700 truncate">{p.name}</span>
                <span className="text-sm font-bold text-amber-600 ml-2">{p.stock}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
