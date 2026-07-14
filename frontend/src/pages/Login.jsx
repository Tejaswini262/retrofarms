import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.4 29.4 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.4 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c11 0 19.5-8 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.6 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.4 29.2 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-2 13.2-5.2l-6.1-5.1c-2 1.4-4.4 2.3-7.1 2.3-5.4 0-9.9-3.1-11.3-7.5l-6.6 5.1C9.6 39.1 16.3 43.5 24 43.5z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2.1 3.9-3.8 5.2l6.1 5.1c-.4.4 6.4-4.7 6.4-14.3 0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const Login = () => {
  const navigate = useNavigate();

  const handleGoogle = () => {
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-lg border border-[#E4D9C1]">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3 text-center">WELCOME BACK</div>
        <h1 className="font-serif text-3xl text-[#2B1D11] text-center mb-2">Sign in to Retro Farms</h1>
        <p className="text-sm text-[#7A6A55] text-center mb-8">
          Track your orders, save your kitchen list, checkout faster.
        </p>
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 border border-[#E4D9C1] hover:border-[#2B1D11] text-[#2B1D11] rounded-full py-3 mb-6 transition-colors bg-white"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <div className="text-center mt-4 text-sm text-[#7A6A55]">
          Are you a farm admin?{' '}
          <Link to="/admin/login" className="text-[#C96C1B] hover:underline">Admin login</Link>
        </div>
        <button onClick={() => navigate('/')} className="block mx-auto mt-6 text-xs text-[#7A6A55] hover:text-[#2B1D11]">
          ← Continue browsing
        </button>
      </div>
    </div>
  );
};

export default Login;
