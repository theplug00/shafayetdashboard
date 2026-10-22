import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Product, Sale, StockMovement, Expense, BusinessSettings, AuditLog } from '../types';
import { initializeDatabase, UserDB, ProductDB, SaleDB, StockMovementDB, ExpenseDB, SettingsDB, AuditLogDB } from '../services/database';

interface AppState {
  currentUser: User | null;
  products: Product[];
  sales: Sale[];
  stockMovements: StockMovement[];
  expenses: Expense[];
  settings: BusinessSettings;
  auditLogs: AuditLog[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  refreshProducts: () => void;
  refreshSales: () => void;
  refreshStockMovements: () => void;
  refreshExpenses: () => void;
  refreshAuditLogs: () => void;
  refreshSettings: () => void;
  addAuditLog: (action: string, entity: string, entityId: string, details: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    businessName: 'StyleHub Fashion',
    address: '123 Market Street, Accra, Ghana',
    phone: '+233 20 123 4567',
    email: 'info@stylehub.com',
    currency: 'GHS',
    taxRate: 0,
    lowStockThreshold: 5,
    receiptFormat: 'thermal',
    paymentMethods: ['Cash', 'Mobile Money', 'Card', 'Bank Transfer'],
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    initializeDatabase();
    const savedUser = localStorage.getItem('stylehub_current_user');
    if (savedUser) {
      try { setCurrentUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }
    refreshAll();
  }, []);

  const refreshAll = useCallback(() => {
    setProducts(ProductDB.getAll());
    setSales(SaleDB.getAll());
    setStockMovements(StockMovementDB.getAll());
    setExpenses(ExpenseDB.getAll());
    const s = SettingsDB.get();
    if (s) setSettings(s);
    setAuditLogs(AuditLogDB.getAll());
  }, []);

  const refreshProducts = useCallback(() => setProducts(ProductDB.getAll()), []);
  const refreshSales = useCallback(() => setSales(SaleDB.getAll()), []);
  const refreshStockMovements = useCallback(() => setStockMovements(StockMovementDB.getAll()), []);
  const refreshExpenses = useCallback(() => setExpenses(ExpenseDB.getAll()), []);
  const refreshAuditLogs = useCallback(() => setAuditLogs(AuditLogDB.getAll()), []);
  const refreshSettings = useCallback(() => {
    const s = SettingsDB.get();
    if (s) setSettings(s);
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const user = UserDB.getByUsername(username);
    if (user && user.password === password) {
      setCurrentUser(user);
      localStorage.setItem('stylehub_current_user', JSON.stringify(user));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('stylehub_current_user');
  }, []);

  const addAuditLog = useCallback((action: string, entity: string, entityId: string, details: string) => {
    if (!currentUser) return;
    AuditLogDB.create({
      action, entity, entityId, details,
      userId: currentUser.id,
      userName: currentUser.name,
    });
    setAuditLogs(AuditLogDB.getAll());
  }, [currentUser]);

  return (
    <AppContext.Provider value={{
      currentUser, products, sales, stockMovements, expenses, settings, auditLogs,
      login, logout, refreshProducts, refreshSales, refreshStockMovements,
      refreshExpenses, refreshAuditLogs, refreshSettings, addAuditLog,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
