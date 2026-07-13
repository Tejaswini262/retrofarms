import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const AdminLogin = () => {
  const { loginWithEmail } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@retrofarms.in');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const u = loginWithEmail(email, password);
    if (u) navigate('/admin');
    else setError('Invalid credentials. Try admin@retrofarms.in / admin123');
  };

  return (
    <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl p-10 shadow-lg border border-[#E4D9C1]">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3 text-center">ADMIN</div>
        <h1 className="font-serif text-3xl text-[#2B1D11] text-center mb-8">Farm Dashboard Login</h1>

        <label className="block text-xs text-[#7A6A55] mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11] bg-white text-[#2B1D11] mb-4"
        />
        <label className="block text-xs text-[#7A6A55] mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11] bg-white text-[#2B1D11] mb-4"
        />
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        <button className="w-full bg-[#2B1D11] hover:bg-[#3A2818] text-[#F7F1E5] rounded-full py-3 transition-colors">
          Enter dashboard
        </button>
        <div className="mt-6 text-xs text-[#7A6A55] leading-relaxed">
          Demo creds:<br />
          admin@retrofarms.in / admin123<br />
          staff@retrofarms.in / staff123
        </div>
      </form>
    </div>
  );
};

export default AdminLogin;
