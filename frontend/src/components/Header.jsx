import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, LogOut, LayoutDashboard, Package } from 'lucide-react';
import { useApp } from '../context/AppContext';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_farm-to-table-541/artifacts/b3s8sdag_retro_farms_logo.jpeg';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/farmers', label: 'Meet Our Farmers' },
  { to: '/about', label: 'Our Farm' },
];

const Header = () => {
  const { user, cartCount, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-[#F7F1E5]/95 backdrop-blur border-b border-[#E4D9C1]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Retro Farms" className="w-12 h-12 rounded-full object-cover border border-[#E4D9C1] bg-white" />
          <div className="leading-tight">
            <div className="font-serif text-[22px] text-[#2B1D11] font-semibold">Retro Farms</div>
            <div className="text-[10px] tracking-[0.18em] text-[#5C3B1E]">MOVE TO ROOTS · EST. 6 ACRES</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-10">
          {navItems.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => `text-[15px] font-medium transition-colors ${isActive ? 'text-[#C96C1B]' : 'text-[#2B1D11] hover:text-[#C96C1B]'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/cart" className="relative p-2 text-[#2B1D11] hover:text-[#C96C1B] transition-colors" aria-label="cart">
            <ShoppingBag size={22} strokeWidth={1.6} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#C96C1B] text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{cartCount}</span>
            )}
          </Link>

          <div className="relative">
            <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center gap-2 text-[#2B1D11] hover:text-[#C96C1B] transition-colors">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-8 h-8 rounded-full object-cover border border-[#E4D9C1]" />
              ) : (
                <User size={20} strokeWidth={1.6} />
              )}
              <span className="hidden sm:inline text-[15px]">{user ? (user.name || 'You').split(' ')[0] : 'Sign in'}</span>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-11 w-60 bg-white rounded-xl shadow-xl border border-[#E4D9C1] py-2 z-50" onMouseLeave={() => setProfileOpen(false)}>
                {!user ? (
                  <>
                    <button onClick={() => { setProfileOpen(false); navigate('/login'); }} className="w-full text-left px-4 py-2 text-sm text-[#2B1D11] hover:bg-[#F7F1E5]">Sign in</button>
                    <button onClick={() => { setProfileOpen(false); navigate('/admin/login'); }} className="w-full text-left px-4 py-2 text-sm text-[#2B1D11] hover:bg-[#F7F1E5]">Admin login</button>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-2 border-b border-[#EFE4CB]">
                      <div className="text-sm font-medium text-[#2B1D11]">{user.name}</div>
                      <div className="text-xs text-[#7A6A55] truncate">{user.email}</div>
                    </div>
                    {(user.role === 'admin' || user.role === 'staff') && (
                      <button onClick={() => { setProfileOpen(false); navigate('/admin'); }} className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-[#2B1D11] hover:bg-[#F7F1E5]">
                        <LayoutDashboard size={15} /> Dashboard
                      </button>
                    )}
                    {user.role === 'customer' && (
                      <button onClick={() => { setProfileOpen(false); navigate('/my-orders'); }} className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-[#2B1D11] hover:bg-[#F7F1E5]">
                        <Package size={15} /> My orders
                      </button>
                    )}
                    <button onClick={async () => { setProfileOpen(false); await logout(); navigate('/'); }} className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-[#2B1D11] hover:bg-[#F7F1E5]">
                      <LogOut size={15} /> Sign out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <button className="lg:hidden p-2 text-[#2B1D11]" onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-[#E4D9C1] bg-[#F7F1E5]">
          <div className="px-6 py-4 flex flex-col gap-3">
            {navItems.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `text-base ${isActive ? 'text-[#C96C1B]' : 'text-[#2B1D11]'}`}>
                {n.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
