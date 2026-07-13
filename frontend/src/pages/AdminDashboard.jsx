import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PRODUCTS, MOCK_ORDERS, MOCK_CUSTOMERS, MOCK_STAFF, ADMIN_STATS } from '../data/mock';
import { TrendingUp, ShoppingBag, Truck, Package, Users, Trash2 } from 'lucide-react';

const tabs = ['Inventory', 'Orders', 'Revenue / Customers', 'Staff'];

const StatCard = ({ icon: Icon, value, label }) => (
  <div className="bg-white rounded-2xl p-6 border border-[#E4D9C1] shadow-sm">
    <Icon size={22} className="text-[#5C3B1E] mb-4" strokeWidth={1.5} />
    <div className="font-serif text-3xl text-[#2B1D11]">{value}</div>
    <div className="text-xs tracking-[0.2em] text-[#7A6A55] uppercase mt-1">{label}</div>
  </div>
);

const OrderStatusBadge = ({ status }) => {
  const colors = {
    Placed: 'text-[#2B1D11]',
    Delivered: 'text-[#4E6A3C]',
    Cancelled: 'text-red-600',
    'On The Way': 'text-[#C96C1B]',
  };
  return <span className={colors[status] || 'text-[#2B1D11]'}>{status}</span>;
};

const AdminDashboard = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('Inventory');
  const [orderFilter, setOrderFilter] = useState('All');
  const [staff, setStaff] = useState(MOCK_STAFF);
  const [products, setProducts] = useState(PRODUCTS);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', password: '', role: 'staff' });

  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return <Navigate to="/admin/login" replace />;
  }

  const orderStatuses = ['All', 'Pending', 'Confirmed', 'Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];
  const filteredOrders =
    orderFilter === 'All'
      ? MOCK_ORDERS
      : MOCK_ORDERS.filter((o) => o.status.toLowerCase() === orderFilter.toLowerCase());

  const addStaff = (e) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;
    setStaff((s) => [
      ...s,
      { name: newStaff.name, email: newStaff.email, phone: newStaff.phone || '—', role: newStaff.role === 'admin' ? 'Admin' : 'Staff' },
    ]);
    setNewStaff({ name: '', email: '', phone: '', password: '', role: 'staff' });
  };

  const removeStaff = (email) => setStaff((s) => s.filter((x) => x.email !== email));

  const updateStock = (slug, variantId, delta) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.slug === slug
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId ? { ...v, stock: Math.max(0, v.stock + delta) } : v,
              ),
            }
          : p,
      ),
    );
  };

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-14">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3">ADMIN</div>
        <h1 className="font-serif text-5xl md:text-6xl text-[#2B1D11] mb-10">Farm Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <StatCard icon={TrendingUp} value={`₹${ADMIN_STATS.revenue.toLocaleString()}`} label="Revenue" />
          <StatCard icon={ShoppingBag} value={ADMIN_STATS.orders} label="Orders" />
          <StatCard icon={Truck} value={ADMIN_STATS.pending} label="Pending" />
          <StatCard icon={Package} value={ADMIN_STATS.products} label="Products" />
          <StatCard icon={Users} value={ADMIN_STATS.customers} label="Customers" />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-full text-sm transition-colors ${
                activeTab === t
                  ? 'bg-white border border-[#2B1D11] text-[#2B1D11]'
                  : 'text-[#2B1D11] hover:bg-white/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'Inventory' && (
          <div className="bg-white rounded-2xl border border-[#E4D9C1] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#EFE4CB] text-[#2B1D11]">
                  <th className="text-left px-6 py-4">Product</th>
                  <th className="text-left px-6 py-4">Category</th>
                  <th className="text-left px-6 py-4">Variants</th>
                  <th className="text-left px-6 py-4">Stock</th>
                  <th className="text-left px-6 py-4">Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) =>
                  p.variants.map((v, i) => (
                    <tr key={`${p.slug}_${v.id}`} className="border-t border-[#EFE4CB]">
                      {i === 0 ? (
                        <td rowSpan={p.variants.length} className="px-6 py-4 align-top">
                          <div className="flex items-center gap-3">
                            <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                            <div className="font-medium text-[#2B1D11]">{p.name}</div>
                          </div>
                        </td>
                      ) : null}
                      {i === 0 ? (
                        <td rowSpan={p.variants.length} className="px-6 py-4 align-top text-[#4E6A3C] uppercase text-xs tracking-widest">
                          {p.category}
                        </td>
                      ) : null}
                      <td className="px-6 py-4 text-[#4B3826]">{v.label}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateStock(p.slug, v.id, -1)}
                            className="w-7 h-7 rounded-full border border-[#E4D9C1] text-[#2B1D11] hover:bg-[#EFE4CB]"
                          >
                            −
                          </button>
                          <span className="w-10 text-center text-[#2B1D11]">{v.stock}</span>
                          <button
                            onClick={() => updateStock(p.slug, v.id, 1)}
                            className="w-7 h-7 rounded-full border border-[#E4D9C1] text-[#2B1D11] hover:bg-[#EFE4CB]"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-serif text-[#2B1D11]">₹{v.price}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Orders' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {orderStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setOrderFilter(s)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    orderFilter === s
                      ? 'bg-[#4E6A3C] text-white'
                      : 'bg-white border border-[#E4D9C1] text-[#2B1D11] hover:border-[#2B1D11]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-[#E4D9C1] overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-[#EFE4CB] text-[#2B1D11]">
                    <th className="text-left px-6 py-4">Order</th>
                    <th className="text-left px-6 py-4">Customer</th>
                    <th className="text-left px-6 py-4">Items</th>
                    <th className="text-left px-6 py-4">Total</th>
                    <th className="text-left px-6 py-4">Payment</th>
                    <th className="text-left px-6 py-4">Assigned to</th>
                    <th className="text-left px-6 py-4">Status</th>
                    <th className="text-left px-6 py-4">Placed</th>
                    <th className="text-left px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="border-t border-[#EFE4CB] hover:bg-[#FBF7EC]">
                      <td className="px-6 py-4 text-[#2B1D11]">#{o.id}</td>
                      <td className="px-6 py-4 text-[#4B3826]">{o.email}</td>
                      <td className="px-6 py-4 text-[#4B3826]">{o.items}</td>
                      <td className="px-6 py-4 font-serif text-[#2B1D11]">₹{o.total}</td>
                      <td className="px-6 py-4 text-[#4B3826]">{o.payment} · {o.paymentStatus}</td>
                      <td className={`px-6 py-4 ${o.assignedTo === 'Unassigned' ? 'text-[#C96C1B]' : 'text-[#2B1D11]'}`}>
                        {o.assignedTo}
                      </td>
                      <td className="px-6 py-4"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-6 py-4 text-[#7A6A55]">{o.placed}</td>
                      <td className="px-6 py-4">
                        <button className="px-4 py-1.5 border border-[#E4D9C1] rounded-full text-xs text-[#2B1D11] hover:border-[#2B1D11]">
                          Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Revenue / Customers' && (
          <div className="bg-white rounded-2xl border border-[#E4D9C1] overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#EFE4CB] text-[#2B1D11]">
                  <th className="text-left px-6 py-4">Customer</th>
                  <th className="text-left px-6 py-4">Phone</th>
                  <th className="text-left px-6 py-4">Email</th>
                  <th className="text-left px-6 py-4">Orders</th>
                  <th className="text-left px-6 py-4">Total Spent</th>
                  <th className="text-left px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CUSTOMERS.map((c) => (
                  <tr key={c.email} className="border-t border-[#EFE4CB]">
                    <td className="px-6 py-4 text-[#2B1D11]">{c.name}</td>
                    <td className="px-6 py-4 text-[#4B3826]">{c.phone}</td>
                    <td className="px-6 py-4 text-[#4B3826]">{c.email}</td>
                    <td className="px-6 py-4 text-[#4B3826]">{c.orders}</td>
                    <td className="px-6 py-4 font-serif text-[#2B1D11]">₹{c.totalSpent.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button className="px-4 py-1.5 border border-[#E4D9C1] rounded-full text-xs text-[#2B1D11] hover:border-[#2B1D11]">
                        View orders
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Staff' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E4D9C1] overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-[#EFE4CB] text-[#2B1D11]">
                    <th className="text-left px-6 py-4">Name</th>
                    <th className="text-left px-6 py-4">Email</th>
                    <th className="text-left px-6 py-4">Role</th>
                    <th className="text-left px-6 py-4">Phone</th>
                    <th className="text-left px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.email} className="border-t border-[#EFE4CB]">
                      <td className="px-6 py-4 text-[#2B1D11]">{s.name}</td>
                      <td className="px-6 py-4 text-[#4B3826]">{s.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs border ${
                            s.role === 'Admin'
                              ? 'border-[#C96C1B] text-[#C96C1B]'
                              : 'border-[#4E6A3C] text-[#4E6A3C]'
                          }`}
                        >
                          {s.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#4B3826]">{s.phone}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => removeStaff(s.email)}
                          className="text-[#C96C1B] hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={addStaff} className="bg-white rounded-2xl border border-[#E4D9C1] p-6">
              <h3 className="font-serif text-2xl text-[#2B1D11] mb-6">Add staff / admin</h3>
              <input
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="Full name"
                className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]"
              />
              <input
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="Email"
                type="email"
                className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]"
              />
              <input
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                placeholder="Phone (optional)"
                className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]"
              />
              <input
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                placeholder="Temporary password"
                type="password"
                className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]"
              />
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-4 bg-white focus:outline-none focus:border-[#2B1D11]"
              >
                <option value="staff">Staff (delivery)</option>
                <option value="admin">Admin</option>
              </select>
              <button className="w-full bg-[#4E6A3C] hover:bg-[#3D5530] text-white rounded-full py-3 transition-colors">
                Create account
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
