import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rf_cart') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('rf_cart', JSON.stringify(cart)); }, [cart]);

  const checkAuth = useCallback(async () => {
    try {
      const r = await api.get('/auth/me');
      setUser(r.data);
    } catch { setUser(null); }
    finally { setAuthLoading(false); }
  }, []);

  useEffect(() => {
    // Skip /me check if returning from OAuth callback
    if (typeof window !== 'undefined' && window.location.hash?.includes('session_id=')) {
      setAuthLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const addToCart = (product, variant, qty = 1, options = null) => {
    setCart((prev) => {
      // Chicken items with options are unique per set of options
      const optKey = options ? JSON.stringify(options) : '';
      const key = `${product.slug}_${variant.id}${optKey ? '_' + btoa(unescape(encodeURIComponent(optKey))).slice(0, 8) : ''}`;
      const existing = prev.find((c) => c.key === key);
      if (existing) return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + qty } : c));
      return [...prev, {
        key, slug: product.slug, name: product.name, image: product.image,
        variantId: variant.id, variantLabel: variant.label, price: variant.price, qty,
        options: options || undefined,
      }];
    });
  };
  const updateQty = (key, qty) => setCart((p) => p.map((c) => c.key === key ? { ...c, qty: Math.max(1, qty) } : c));
  const removeFromCart = (key) => setCart((p) => p.filter((c) => c.key !== key));
  const clearCart = () => setCart([]);

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null);
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartSubtotal = cart.reduce((s, c) => s + c.qty * c.price, 0);
  const deliveryCharge = cart.length > 0 && cartSubtotal < 200 ? 100 : 0;
  const cartTotal = cartSubtotal + deliveryCharge;

  return (
    <AppContext.Provider value={{
      user, setUser, authLoading, checkAuth, logout,
      cart, cartCount, cartSubtotal, deliveryCharge, cartTotal,
      addToCart, updateQty, removeFromCart, clearCart,
    }}>
      {children}
    </AppContext.Provider>
  );
};
