import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

const AdminLogin = () => {
  const { setUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@retrofarms.in');
  const [password, setPassword] = useState('admin123');
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
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3 text-center">ADMIN</div>
        <h1 className="font-serif text-3xl text-[#2B1D11] text-center mb-8">Farm Dashboard Login</h1>
        <label className="block text-xs text-[#7A6A55] mb-1">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
          className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-4 focus:outline-none focus:border-[#2B1D11]" />
        <label className="block text-xs text-[#7A6A55] mb-1">Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
          className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-4 focus:outline-none focus:border-[#2B1D11]" />
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        <button disabled={loading} className="w-full bg-[#2B1D11] hover:bg-[#3A2818] text-[#F7F1E5] rounded-full py-3 transition-colors disabled:opacity-70">
          {loading ? 'Signing in…' : 'Enter dashboard'}
        </button>
        <div className="mt-6 text-xs text-[#7A6A55] leading-relaxed">
          Default creds:<br />
          admin@retrofarms.in / admin123<br />
          staff@retrofarms.in / staff123
        </div>
      </form>
    </div>
  );
};

export default AdminLogin;
