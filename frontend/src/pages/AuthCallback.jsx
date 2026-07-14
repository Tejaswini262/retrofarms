import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useApp();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const hash = location.hash || window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) { navigate('/login', { replace: true }); return; }
    const session_id = decodeURIComponent(match[1]);
    (async () => {
      try {
        const r = await api.post('/auth/session', { session_id });
        setUser(r.data);
        // Clean hash
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/', { replace: true, state: { user: r.data } });
      } catch (e) {
        navigate('/login', { replace: true });
      }
    })();
  }, [location.hash, navigate, setUser]);

  return (
    <div className="min-h-screen bg-[#F7F1E5] flex items-center justify-center">
      <div className="text-[#2B1D11] font-serif text-xl">Signing you in…</div>
    </div>
  );
};

export default AuthCallback;
