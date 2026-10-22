import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Store, Eye, EyeOff, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = login(username.trim(), password);
      if (!success) {
        setError('Invalid username or password');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">StyleHub</h1>
            <p className="text-sm text-gray-500 mt-1">Clothing Shop Management System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                placeholder="Enter username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-3">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                className="px-3 py-2 bg-gray-50 rounded-lg text-xs text-center hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-700">Admin</span>
                <br />
                <span className="text-gray-500">admin / admin123</span>
              </button>
              <button
                onClick={() => { setUsername('cashier'); setPassword('cash123'); }}
                className="px-3 py-2 bg-gray-50 rounded-lg text-xs text-center hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-700">Cashier</span>
                <br />
                <span className="text-gray-500">cashier / cash123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
