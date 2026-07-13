import React, { createContext, useContext, useEffect, useState } from 'react';
import { ADMIN_CREDENTIALS } from '../data/mock';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('rf_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem('rf_cart');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('rf_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (user) localStorage.setItem('rf_user', JSON.stringify(user));
    else localStorage.removeItem('rf_user');
  }, [user]);

  const addToCart = (product, variant, qty = 1) => {
    setCart((prev) => {
      const key = `${product.slug}_${variant.id}`;
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + qty } : c));
      }
      return [
        ...prev,
        {
          key,
          slug: product.slug,
          name: product.name,
          image: product.image,
          variantId: variant.id,
          variantLabel: variant.label,
          price: variant.price,
          qty,
        },
      ];
    });
  };

  const updateQty = (key, qty) => {
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, qty: Math.max(1, qty) } : c)));
  };

  const removeFromCart = (key) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const clearCart = () => setCart([]);

  const loginWithGoogle = () => {
    // Mocked Google login
    const fake = {
      name: 'Guest Customer',
      email: 'guest.customer@gmail.com',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
      role: 'customer',
      provider: 'google',
    };
    setUser(fake);
    return fake;
  };

  const loginWithEmail = (email, password) => {
    const found = Object.values(ADMIN_CREDENTIALS).find(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password,
    );
    if (found) {
      const u = { name: found.name, email: found.email, role: found.role, provider: 'email' };
      setUser(u);
      return u;
    }
    return null;
  };

  const logout = () => setUser(null);

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.qty * c.price, 0);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        cart,
        cartCount,
        cartTotal,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        loginWithGoogle,
        loginWithEmail,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
