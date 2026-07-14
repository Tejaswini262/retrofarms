import React, { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { TrendingUp, ShoppingBag, Truck, Package, Users, Trash2, X } from 'lucide-react';

const tabs = ['Inventory', 'Orders', 'Revenue / Customers', 'Staff'];

const StatCard = ({ icon: Icon, value, label }) => (
  <div className="bg-white rounded-2xl p-6 border border-[#E4D9C1] shadow-sm">
    <Icon size={22} className="text-[#5C3B1E] mb-4" strokeWidth={1.5} />
    <div className="font-serif text-3xl text-[#2B1D11]">{value}</div>
    <div className="text-xs tracking-[0.2em] text-[#7A6A55] uppercase mt-1">{label}</div>
  </div>
);

const statusColors = {
  Placed: 'text-[#2B1D11]',
  Confirmed: 'text-[#2B1D11]',
  Processing: 'text-[#C96C1B]',
  Packed: 'text-[#C96C1B]',
  'Out for Delivery': 'text-[#4E6A3C]',
  Delivered: 'text-[#4E6A3C]',
  Cancelled: 'text-red-600',
};

const ORDER_STATUSES = ['Placed', 'Confirmed', 'Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

const AdminDashboard = () => {
  const { user, authLoading } = useApp();
  const [activeTab, setActiveTab] = useState('Inventory');
  const [stats, setStats] = useState({ revenue: 0, orders: 0, pending: 0, products: 0, customers: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [orderFilter, setOrderFilter] = useState('All');
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', password: '', role: 'staff' });
  const [staffErr, setStaffErr] = useState('');

  const reload = useCallback(async () => {
    try {
      const [s, p, o, c, st] = await Promise.all([
        api.get('/admin/stats'), api.get('/products'), api.get('/admin/orders'),
        api.get('/admin/customers'), api.get('/admin/staff'),
      ]);
      setStats(s.data); setProducts(p.data); setOrders(o.data); setCustomers(c.data); setStaff(st.data);
    } catch (e) { /* ignore, will redirect */ }
  }, []);

  useEffect(() => { if (user && (user.role === 'admin' || user.role === 'staff')) reload(); }, [user, reload]);

  if (authLoading) return <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin' && user.role !== 'staff') return <Navigate to="/" replace />;

  const isAdmin = user.role === 'admin';
  const filteredOrders = orderFilter === 'All' ? orders : orders.filter((o) => o.status === orderFilter);

  const updateStock = async (slug, variantId, newStock) => {
    await api.patch(`/admin/products/${slug}/variants/${variantId}/stock`, { stock: newStock });
    reload();
  };

  const updateOrder = async (orderId, patch) => {
    await api.patch(`/admin/orders/${orderId}`, patch);
    reload();
    if (invoiceOrder && invoiceOrder.order_id === orderId) {
      const r = await api.get(`/orders/${orderId}`);
      setInvoiceOrder(r.data);
    }
  };

  const addStaff = async (e) => {
    e.preventDefault(); setStaffErr('');
    try {
      await api.post('/admin/staff', newStaff);
      setNewStaff({ name: '', email: '', phone: '', password: '', role: 'staff' });
      reload();
    } catch (err) { setStaffErr(err.response?.data?.detail || 'Failed'); }
  };

  const removeStaff = async (uid) => {
    if (!window.confirm('Remove this account?')) return;
    try { await api.delete(`/admin/staff/${uid}`); reload(); }
    catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };

  const openInvoice = async (id) => {
    const r = await api.get(`/orders/${id}`);
    setInvoiceOrder(r.data);
  };

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-14">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3">ADMIN</div>
        <h1 className="font-serif text-5xl md:text-6xl text-[#2B1D11] mb-2">Farm Dashboard</h1>
        <div className="text-sm text-[#7A6A55] mb-10">Signed in as {user.name} ({user.role})</div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <StatCard icon={TrendingUp} value={`₹${stats.revenue?.toLocaleString?.() || 0}`} label="Revenue" />
          <StatCard icon={ShoppingBag} value={stats.orders} label="Orders" />
          <StatCard icon={Truck} value={stats.pending} label="Pending" />
          <StatCard icon={Package} value={stats.products} label="Products" />
          <StatCard icon={Users} value={stats.customers} label="Customers" />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-full text-sm transition-colors ${activeTab === t ? 'bg-white border border-[#2B1D11] text-[#2B1D11]' : 'text-[#2B1D11] hover:bg-white/60'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'Inventory' && (
          <div className="bg-white rounded-2xl border border-[#E4D9C1] overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#EFE4CB] text-[#2B1D11]">
                  <th className="text-left px-6 py-4">Product</th>
                  <th className="text-left px-6 py-4">Category</th>
                  <th className="text-left px-6 py-4">Variant</th>
                  <th className="text-left px-6 py-4">Stock</th>
                  <th className="text-left px-6 py-4">Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => p.variants.map((v, i) => (
                  <tr key={`${p.slug}_${v.id}`} className="border-t border-[#EFE4CB]">
                    {i === 0 && (
                      <td rowSpan={p.variants.length} className="px-6 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          <div className="font-medium text-[#2B1D11]">{p.name}</div>
                        </div>
                      </td>
                    )}
                    {i === 0 && <td rowSpan={p.variants.length} className="px-6 py-4 align-top text-[#4E6A3C] uppercase text-xs tracking-widest">{p.category}</td>}
                    <td className="px-6 py-4 text-[#4B3826]">{v.label}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateStock(p.slug, v.id, v.stock - 1)} className="w-7 h-7 rounded-full border border-[#E4D9C1] text-[#2B1D11] hover:bg-[#EFE4CB]">−</button>
                        <span className="w-10 text-center text-[#2B1D11]">{v.stock}</span>
                        <button onClick={() => updateStock(p.slug, v.id, v.stock + 1)} className="w-7 h-7 rounded-full border border-[#E4D9C1] text-[#2B1D11] hover:bg-[#EFE4CB]">+</button>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-serif text-[#2B1D11]">₹{v.price}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Orders' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {['All', ...ORDER_STATUSES].map((s) => (
                <button key={s} onClick={() => setOrderFilter(s)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${orderFilter === s ? 'bg-[#4E6A3C] text-white' : 'bg-white border border-[#E4D9C1] text-[#2B1D11] hover:border-[#2B1D11]'}`}>{s}</button>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-[#E4D9C1] overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
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
                    <tr key={o.order_id} className="border-t border-[#EFE4CB] hover:bg-[#FBF7EC]">
                      <td className="px-6 py-4 text-[#2B1D11]">#{o.order_id}</td>
                      <td className="px-6 py-4 text-[#4B3826]">{o.customer_email}</td>
                      <td className="px-6 py-4 text-[#4B3826]">{o.items?.length}</td>
                      <td className="px-6 py-4 font-serif text-[#2B1D11]">₹{o.total}</td>
                      <td className="px-6 py-4 text-[#4B3826] whitespace-nowrap">{o.payment_method?.toUpperCase()} · {o.payment_status}</td>
                      <td className="px-6 py-4">
                        <select value={o.assigned_staff_id || ''} onChange={(e) => updateOrder(o.order_id, { assigned_staff_id: e.target.value })}
                          className="bg-white border border-[#E4D9C1] rounded-lg px-2 py-1 text-xs text-[#2B1D11] focus:outline-none focus:border-[#2B1D11]">
                          <option value="">Unassigned</option>
                          {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select value={o.status} onChange={(e) => updateOrder(o.order_id, { status: e.target.value })}
                          className={`bg-white border border-[#E4D9C1] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#2B1D11] ${statusColors[o.status] || ''}`}>
                          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-[#7A6A55] whitespace-nowrap">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : ''}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => openInvoice(o.order_id)} className="px-4 py-1.5 border border-[#E4D9C1] rounded-full text-xs text-[#2B1D11] hover:border-[#2B1D11]">Invoice</button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-[#7A6A55]">No orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Revenue / Customers' && (
          <div className="bg-white rounded-2xl border border-[#E4D9C1] overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-[#EFE4CB] text-[#2B1D11]">
                  <th className="text-left px-6 py-4">Customer</th>
                  <th className="text-left px-6 py-4">Phone</th>
                  <th className="text-left px-6 py-4">Email</th>
                  <th className="text-left px-6 py-4">Orders</th>
                  <th className="text-left px-6 py-4">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.user_id} className="border-t border-[#EFE4CB]">
                    <td className="px-6 py-4 text-[#2B1D11]">{c.name || '—'}</td>
                    <td className="px-6 py-4 text-[#4B3826]">{c.phone}</td>
                    <td className="px-6 py-4 text-[#4B3826]">{c.email}</td>
                    <td className="px-6 py-4 text-[#4B3826]">{c.orders}</td>
                    <td className="px-6 py-4 font-serif text-[#2B1D11]">₹{c.total_spent?.toLocaleString?.() || 0}</td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-[#7A6A55]">No customers yet.</td></tr>}
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
                    <tr key={s.user_id} className="border-t border-[#EFE4CB]">
                      <td className="px-6 py-4 text-[#2B1D11]">{s.name}</td>
                      <td className="px-6 py-4 text-[#4B3826]">{s.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs border ${s.role === 'Admin' ? 'border-[#C96C1B] text-[#C96C1B]' : 'border-[#4E6A3C] text-[#4E6A3C]'}`}>{s.role}</span>
                      </td>
                      <td className="px-6 py-4 text-[#4B3826]">{s.phone}</td>
                      <td className="px-6 py-4">
                        {isAdmin && s.user_id !== user.user_id && (
                          <button onClick={() => removeStaff(s.user_id)} className="text-[#C96C1B] hover:text-red-600"><Trash2 size={16} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isAdmin && (
              <form onSubmit={addStaff} className="bg-white rounded-2xl border border-[#E4D9C1] p-6">
                <h3 className="font-serif text-2xl text-[#2B1D11] mb-6">Add staff / admin</h3>
                <input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Full name" required className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
                <input value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="Email" type="email" required className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
                <input value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} placeholder="Phone (optional)" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
                <input value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Password" type="password" required minLength={4} className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
                <select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })} className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-4 bg-white focus:outline-none focus:border-[#2B1D11]">
                  <option value="staff">Staff (delivery)</option>
                  <option value="admin">Admin</option>
                </select>
                {staffErr && <div className="text-sm text-red-600 mb-3">{staffErr}</div>}
                <button className="w-full bg-[#4E6A3C] hover:bg-[#3D5530] text-white rounded-full py-3 transition-colors">Create account</button>
              </form>
            )}
          </div>
        )}

        {invoiceOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onClick={() => setInvoiceOrder(null)}>
            <div className="bg-white rounded-2xl max-w-3xl w-full my-10" onClick={(e) => e.stopPropagation()}>
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-xs text-[#7A6A55] uppercase tracking-widest">Invoice</div>
                    <div className="font-serif text-2xl text-[#2B1D11]">#{invoiceOrder.order_id}</div>
                    <div className="text-xs text-[#7A6A55]">{invoiceOrder.created_at ? new Date(invoiceOrder.created_at).toLocaleString('en-IN') : ''}</div>
                  </div>
                  <button onClick={() => setInvoiceOrder(null)} className="text-[#7A6A55] hover:text-[#2B1D11]"><X size={22} /></button>
                </div>
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-xs text-[#7A6A55] uppercase tracking-widest mb-1">Customer</div>
                    <div className="text-[#2B1D11]">{invoiceOrder.customer_name || invoiceOrder.address?.full_name}</div>
                    <div className="text-sm text-[#4B3826]">{invoiceOrder.customer_email}</div>
                    <div className="text-sm text-[#4B3826]">{invoiceOrder.address?.phone}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#7A6A55] uppercase tracking-widest mb-1">Shipping</div>
                    <div className="text-sm text-[#4B3826]">
                      {invoiceOrder.address?.line1}{invoiceOrder.address?.line2 ? `, ${invoiceOrder.address.line2}` : ''}<br />
                      {invoiceOrder.address?.city} — {invoiceOrder.address?.pincode}
                    </div>
                  </div>
                </div>
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="text-left text-xs text-[#7A6A55] uppercase tracking-widest border-b border-[#E4D9C1]">
                      <th className="py-2">Item</th><th className="py-2">Variant</th>
                      <th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoiceOrder.items || []).map((i, idx) => (
                      <tr key={idx} className="border-b border-[#EFE4CB]">
                        <td className="py-2 text-[#2B1D11]">{i.name}</td>
                        <td className="py-2 text-[#4B3826]">{i.variant_label}</td>
                        <td className="py-2 text-right text-[#4B3826]">{i.qty}</td>
                        <td className="py-2 text-right text-[#4B3826]">₹{i.price}</td>
                        <td className="py-2 text-right text-[#2B1D11]">₹{i.price * i.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="ml-auto max-w-xs">
                  <div className="flex justify-between text-[#4B3826] py-1"><span>Subtotal</span><span>₹{invoiceOrder.subtotal}</span></div>
                  <div className="flex justify-between text-[#4B3826] py-1"><span>Delivery</span><span>{invoiceOrder.delivery_charge ? `₹${invoiceOrder.delivery_charge}` : 'Free'}</span></div>
                  <div className="h-px bg-[#E4D9C1] my-2" />
                  <div className="flex justify-between font-serif text-xl text-[#2B1D11]"><span>Total</span><span>₹{invoiceOrder.total}</span></div>
                  <div className="text-xs text-[#7A6A55] mt-2 text-right">Payment: {invoiceOrder.payment_method?.toUpperCase()} · {invoiceOrder.payment_status}</div>
                  <div className="text-xs text-[#7A6A55] text-right">Status: {invoiceOrder.status}</div>
                  {invoiceOrder.assigned_staff_name && <div className="text-xs text-[#7A6A55] text-right">Assigned: {invoiceOrder.assigned_staff_name}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
