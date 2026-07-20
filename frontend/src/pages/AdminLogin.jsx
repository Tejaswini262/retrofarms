import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { Lock } from 'lucide-react';

const AdminLogin = () => {
  const { setUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await api.post('/auth/admin-login', { email, password });
      setUser(r.data);
      navigate('/admin');
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl p-10 shadow-lg border border-[#E4D9C1]">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#EFE4CB] text-[#5C3B1E] mx-auto mb-4 mt-1" style={{ display: 'flex', margin: '0 auto 1rem' }}>
          <Lock size={22} />
        </div>
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3 text-center">ADMIN</div>
        <h1 className="font-serif text-3xl text-[#2B1D11] text-center mb-2">Farm Dashboard Login</h1>
        <p className="text-sm text-[#7A6A55] text-center mb-8">
          Restricted access. Please sign in with your admin or staff credentials.
        </p>
        <label className="block text-xs text-[#7A6A55] mb-1">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          autoComplete="username"
          placeholder="you@retrofarms.in"
          className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-4 focus:outline-none focus:border-[#2B1D11] bg-white"
        />
        <label className="block text-xs text-[#7A6A55] mb-1">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-4 focus:outline-none focus:border-[#2B1D11] bg-white"
        />
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        <button disabled={loading} className="w-full bg-[#2B1D11] hover:bg-[#3A2818] text-[#F7F1E5] rounded-full py-3 transition-colors disabled:opacity-70">
          {loading ? 'Signing in…' : 'Enter dashboard'}
        </button>
        <div className="mt-6 text-xs text-[#7A6A55] text-center">
          Forgot your password? Contact the farm administrator.
        </div>
      </form>
    </div>
  );
};

export default AdminLogin;
