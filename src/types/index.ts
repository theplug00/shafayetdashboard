export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'cashier';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  sizes: string[];
  colors: string[];
  purchaseCost: number;
  sellingPrice: number;
  stock: number;
  sold: number;
  damaged: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  totalSpent: number;
  totalOrders: number;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  paymentMethod: string;
  cashierId: string;
  cashierName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: 'paid' | 'partial' | 'unpaid';
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'addition' | 'reduction' | 'damaged' | 'adjustment' | 'sale';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  userId: string;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  taxRate: number;
  lowStockThreshold: number;
  receiptFormat: 'a4' | 'thermal';
  paymentMethods: string[];
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalStock: number;
  totalSold: number;
  lowStockItems: number;
  todaySales: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
}
