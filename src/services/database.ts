import { User, Product, Sale, StockMovement, Expense, BusinessSettings, AuditLog, Customer } from '../types';

const DB_KEYS = {
  users: 'stylehub_users',
  products: 'stylehub_products',
  sales: 'stylehub_sales',
  stockMovements: 'stylehub_stock_movements',
  expenses: 'stylehub_expenses',
  settings: 'stylehub_settings',
  auditLogs: 'stylehub_audit_logs',
  invoiceCounter: 'stylehub_invoice_counter',
  customers: 'stylehub_customers',
};

function get<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function set<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getOne<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function setOne<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function generateInvoiceNumber(): string {
  const counter = parseInt(localStorage.getItem(DB_KEYS.invoiceCounter) || '0') + 1;
  localStorage.setItem(DB_KEYS.invoiceCounter, counter.toString());
  const date = new Date();
  return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(counter).padStart(4, '0')}`;
}

// Initialize default data
export function initializeDatabase(): void {
  if (!localStorage.getItem(DB_KEYS.users)) {
    const defaultUsers: User[] = [
      { id: generateId(), username: 'admin', password: 'admin123', name: 'System Administrator', role: 'admin', createdAt: new Date().toISOString() },
      { id: generateId(), username: 'cashier', password: 'cash123', name: 'Sarah Mensah', role: 'cashier', createdAt: new Date().toISOString() },
    ];
    set(DB_KEYS.users, defaultUsers);
  }
  if (!localStorage.getItem(DB_KEYS.settings)) {
    const defaultSettings: BusinessSettings = {
      businessName: 'StyleHub Fashion',
      address: '123 Market Street, Accra, Ghana',
      phone: '+233 20 123 4567',
      email: 'info@stylehub.com',
      currency: 'GHS',
      taxRate: 0,
      lowStockThreshold: 5,
      receiptFormat: 'thermal',
      paymentMethods: ['Cash', 'Mobile Money', 'Card', 'Bank Transfer'],
    };
    setOne(DB_KEYS.settings, defaultSettings);
  }
}

// User operations
export const UserDB = {
  getAll: (): User[] => get<User>(DB_KEYS.users),
  getById: (id: string): User | undefined => get<User>(DB_KEYS.users).find(u => u.id === id),
  getByUsername: (username: string): User | undefined => get<User>(DB_KEYS.users).find(u => u.username === username),
  create: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const users = get<User>(DB_KEYS.users);
    const newUser: User = { ...user, id: generateId(), createdAt: new Date().toISOString() };
    users.push(newUser);
    set(DB_KEYS.users, users);
    return newUser;
  },
  update: (id: string, data: Partial<User>): User | null => {
    const users = get<User>(DB_KEYS.users);
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...data };
    set(DB_KEYS.users, users);
    return users[idx];
  },
  delete: (id: string): boolean => {
    const users = get<User>(DB_KEYS.users);
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    set(DB_KEYS.users, filtered);
    return true;
  },
};

// Product operations
export const ProductDB = {
  getAll: (): Product[] => get<Product>(DB_KEYS.products),
  getById: (id: string): Product | undefined => get<Product>(DB_KEYS.products).find(p => p.id === id),
  create: (product: Omit<Product, 'id' | 'sold' | 'damaged' | 'createdAt' | 'updatedAt'>): Product => {
    const products = get<Product>(DB_KEYS.products);
    const newProduct: Product = { ...product, id: generateId(), sold: 0, damaged: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    products.push(newProduct);
    set(DB_KEYS.products, products);
    return newProduct;
  },
  update: (id: string, data: Partial<Product>): Product | null => {
    const products = get<Product>(DB_KEYS.products);
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...data, updatedAt: new Date().toISOString() };
    set(DB_KEYS.products, products);
    return products[idx];
  },
  delete: (id: string): boolean => {
    const products = get<Product>(DB_KEYS.products);
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    set(DB_KEYS.products, filtered);
    return true;
  },
  updateStock: (id: string, quantity: number): Product | null => {
    const products = get<Product>(DB_KEYS.products);
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    products[idx].stock = Math.max(0, products[idx].stock + quantity);
    if (quantity < 0) products[idx].sold += Math.abs(quantity);
    products[idx].updatedAt = new Date().toISOString();
    set(DB_KEYS.products, products);
    return products[idx];
  },
};

// Sale operations
export const SaleDB = {
  getAll: (): Sale[] => get<Sale>(DB_KEYS.sales),
  getById: (id: string): Sale | undefined => get<Sale>(DB_KEYS.sales).find(s => s.id === id),
  create: (sale: Omit<Sale, 'id' | 'invoiceNumber' | 'createdAt'>): Sale => {
    const sales = get<Sale>(DB_KEYS.sales);
    const newSale: Sale = { ...sale, id: generateId(), invoiceNumber: generateInvoiceNumber(), createdAt: new Date().toISOString() };
    sales.push(newSale);
    set(DB_KEYS.sales, sales);
    return newSale;
  },
  update: (id: string, data: Partial<Sale>): Sale | null => {
    const sales = get<Sale>(DB_KEYS.sales);
    const idx = sales.findIndex(s => s.id === id);
    if (idx === -1) return null;
    sales[idx] = { ...sales[idx], ...data };
    set(DB_KEYS.sales, sales);
    return sales[idx];
  },
  delete: (id: string): boolean => {
    const sales = get<Sale>(DB_KEYS.sales);
    const filtered = sales.filter(s => s.id !== id);
    if (filtered.length === sales.length) return false;
    set(DB_KEYS.sales, filtered);
    return true;
  },
};

// Stock Movement operations
export const StockMovementDB = {
  getAll: (): StockMovement[] => get<StockMovement>(DB_KEYS.stockMovements),
  create: (movement: Omit<StockMovement, 'id' | 'createdAt'>): StockMovement => {
    const movements = get<StockMovement>(DB_KEYS.stockMovements);
    const newMovement: StockMovement = { ...movement, id: generateId(), createdAt: new Date().toISOString() };
    movements.push(newMovement);
    set(DB_KEYS.stockMovements, movements);
    return newMovement;
  },
  getByProduct: (productId: string): StockMovement[] => get<StockMovement>(DB_KEYS.stockMovements).filter(m => m.productId === productId),
};

// Expense operations
export const ExpenseDB = {
  getAll: (): Expense[] => get<Expense>(DB_KEYS.expenses),
  create: (expense: Omit<Expense, 'id' | 'createdAt'>): Expense => {
    const expenses = get<Expense>(DB_KEYS.expenses);
    const newExpense: Expense = { ...expense, id: generateId(), createdAt: new Date().toISOString() };
    expenses.push(newExpense);
    set(DB_KEYS.expenses, expenses);
    return newExpense;
  },
  delete: (id: string): boolean => {
    const expenses = get<Expense>(DB_KEYS.expenses);
    const filtered = expenses.filter(e => e.id !== id);
    if (filtered.length === expenses.length) return false;
    set(DB_KEYS.expenses, filtered);
    return true;
  },
};

// Settings operations
export const SettingsDB = {
  get: (): BusinessSettings | null => getOne<BusinessSettings>(DB_KEYS.settings),
  update: (data: Partial<BusinessSettings>): BusinessSettings | null => {
    const current = getOne<BusinessSettings>(DB_KEYS.settings);
    if (!current) return null;
    const updated = { ...current, ...data };
    setOne(DB_KEYS.settings, updated);
    return updated;
  },
};

// Audit Log operations
export const AuditLogDB = {
  getAll: (): AuditLog[] => get<AuditLog>(DB_KEYS.auditLogs),
  create: (log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog => {
    const logs = get<AuditLog>(DB_KEYS.auditLogs);
    const newLog: AuditLog = { ...log, id: generateId(), createdAt: new Date().toISOString() };
    logs.push(newLog);
    set(DB_KEYS.auditLogs, logs);
    return newLog;
  },
};

// Customer operations
export const CustomerDB = {
  getAll: (): Customer[] => get<Customer>(DB_KEYS.customers),
  getById: (id: string): Customer | undefined => get<Customer>(DB_KEYS.customers).find(c => c.id === id),
  getByPhone: (phone: string): Customer | undefined => get<Customer>(DB_KEYS.customers).find(c => c.phone === phone),
  search: (query: string): Customer[] => {
    const q = query.toLowerCase();
    return get<Customer>(DB_KEYS.customers).filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)
    );
  },
  create: (customer: Omit<Customer, 'id' | 'totalSpent' | 'totalOrders' | 'loyaltyPoints' | 'createdAt' | 'updatedAt'>): Customer => {
    const customers = get<Customer>(DB_KEYS.customers);
    const newCustomer: Customer = {
      ...customer,
      id: generateId(),
      totalSpent: 0,
      totalOrders: 0,
      loyaltyPoints: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    customers.push(newCustomer);
    set(DB_KEYS.customers, customers);
    return newCustomer;
  },
  update: (id: string, data: Partial<Customer>): Customer | null => {
    const customers = get<Customer>(DB_KEYS.customers);
    const idx = customers.findIndex(c => c.id === id);
    if (idx === -1) return null;
    customers[idx] = { ...customers[idx], ...data, updatedAt: new Date().toISOString() };
    set(DB_KEYS.customers, customers);
    return customers[idx];
  },
  delete: (id: string): boolean => {
    const customers = get<Customer>(DB_KEYS.customers);
    const filtered = customers.filter(c => c.id !== id);
    if (filtered.length === customers.length) return false;
    set(DB_KEYS.customers, filtered);
    return true;
  },
  updateAfterSale: (customerId: string, amount: number): void => {
    if (!customerId) return;
    const customers = get<Customer>(DB_KEYS.customers);
    const idx = customers.findIndex(c => c.id === customerId);
    if (idx === -1) return;
    customers[idx].totalSpent += amount;
    customers[idx].totalOrders += 1;
    customers[idx].loyaltyPoints += Math.floor(amount);
    customers[idx].updatedAt = new Date().toISOString();
    set(DB_KEYS.customers, customers);
  },
};
