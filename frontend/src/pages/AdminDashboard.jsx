import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import {
  TrendingUp, ShoppingBag, Truck, Package, Users, Trash2, X, Plus, Edit3, Save,
  Upload, ImageIcon, Minus,
} from 'lucide-react';

const tabs = ['Inventory', 'Orders', 'Revenue / Customers', 'Staff'];

const StatCard = ({ icon: Icon, value, label }) => (
  <div className="bg-white rounded-2xl p-6 border border-[#E4D9C1] shadow-sm">
    <Icon size={22} className="text-[#5C3B1E] mb-4" strokeWidth={1.5} />
    <div className="font-serif text-3xl text-[#2B1D11]">{value}</div>
    <div className="text-xs tracking-[0.2em] text-[#7A6A55] uppercase mt-1">{label}</div>
  </div>
);

const statusColors = {
  Placed: 'text-[#2B1D11]', Confirmed: 'text-[#2B1D11]',
  Processing: 'text-[#C96C1B]', Packed: 'text-[#C96C1B]',
  'Out for Delivery': 'text-[#4E6A3C]', Delivered: 'text-[#4E6A3C]',
  Cancelled: 'text-red-600',
};

const ORDER_STATUSES = ['Placed', 'Confirmed', 'Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];
const CATEGORIES = ['eggs', 'chicken', 'fruits', 'vegetables'];

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/* --------------- Offline Order Modal --------------- */
const OfflineOrderModal = ({ open, onClose, onCreated, products }) => {
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [lines, setLines] = useState([]);
  const [payment, setPayment] = useState('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setCustomer({ name: '', phone: '', email: '' }); setLines([]); setPayment('cash'); setNotes(''); setError(''); }
  }, [open]);

  if (!open) return null;

  const subtotal = lines.reduce((s, l) => s + (l.price || 0) * (l.qty || 0), 0);
  const delivery = subtotal > 0 && subtotal < 200 ? 100 : 0;
  const total = subtotal + delivery;

  const addLine = () => setLines((L) => [...L, { slug: '', variant_id: '', qty: 1, price: 0 }]);
  const removeLine = (i) => setLines((L) => L.filter((_, idx) => idx !== i));
  const updateLine = (i, patch) => setLines((L) => L.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!customer.name || !customer.phone) { setError('Customer name and phone required'); return; }
    if (lines.length === 0) { setError('Add at least one item'); return; }
    for (const l of lines) {
      if (!l.slug || !l.variant_id || !l.qty) { setError('Every line needs product, variant and qty'); return; }
    }
    setBusy(true);
    try {
      const r = await api.post('/admin/orders/offline', {
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        items: lines.map((l) => ({ slug: l.slug, variant_id: l.variant_id, qty: parseInt(l.qty, 10) })),
        payment_method: payment,
        payment_status: 'Paid',
        notes,
        status: 'Placed',
      });
      onCreated?.(r.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create order');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#EFE4CB]">
          <div>
            <div className="text-[#C96C1B] tracking-[0.3em] text-xs">NEW OFFLINE ORDER</div>
            <div className="font-serif text-2xl text-[#2B1D11]">Add a walk-in / phone order</div>
          </div>
          <button type="button" onClick={onClose} className="text-[#7A6A55] hover:text-[#2B1D11]"><X size={22} /></button>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid sm:grid-cols-3 gap-3">
            <input required value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="Customer name*" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
            <input required value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} placeholder="Phone*" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
            <input value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} placeholder="Email (optional)" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-[#7A6A55] uppercase tracking-widest">Items</div>
              <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-sm text-[#4E6A3C] hover:text-[#3D5530]"><Plus size={15} /> Add item</button>
            </div>
            {lines.length === 0 && <div className="text-sm text-[#7A6A55] px-4 py-6 bg-[#FBF7EC] rounded-xl text-center">No items yet — click "Add item".</div>}
            <div className="space-y-2">
              {lines.map((l, i) => {
                const prod = products.find((p) => p.slug === l.slug);
                const variants = prod?.variants || [];
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <select value={l.slug} onChange={(e) => updateLine(i, { slug: e.target.value, variant_id: '', price: 0 })} className="col-span-5 px-3 py-2 border border-[#E4D9C1] rounded-lg bg-white text-sm">
                      <option value="">Select product</option>
                      {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                    </select>
                    <select value={l.variant_id} disabled={!l.slug} onChange={(e) => { const v = variants.find((x) => x.id === e.target.value); updateLine(i, { variant_id: e.target.value, price: v?.price || 0 }); }} className="col-span-4 px-3 py-2 border border-[#E4D9C1] rounded-lg bg-white text-sm disabled:opacity-50">
                      <option value="">Variant</option>
                      {variants.map((v) => <option key={v.id} value={v.id}>{v.label} — ₹{v.price}</option>)}
                    </select>
                    <input type="number" min="1" value={l.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} className="col-span-2 px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
                    <button type="button" onClick={() => removeLine(i)} className="col-span-1 text-red-500 hover:text-red-700 flex justify-center"><Trash2 size={16} /></button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <select value={payment} onChange={(e) => setPayment(e.target.value)} className="px-4 py-3 border border-[#E4D9C1] rounded-xl bg-white">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank transfer</option>
              <option value="cod">Cash on Delivery</option>
              <option value="offline">Other (offline)</option>
            </select>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
          </div>

          <div className="bg-[#FBF7EC] rounded-xl p-5">
            <div className="flex justify-between text-[#4B3826]"><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between text-[#4B3826]"><span>Delivery</span><span>{delivery ? `₹${delivery}` : 'Free'}</span></div>
            <div className="flex justify-between font-serif text-xl text-[#2B1D11] mt-2"><span>Total</span><span>₹{total}</span></div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-[#EFE4CB]">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-full text-[#2B1D11] hover:bg-[#F7F1E5]">Cancel</button>
          <button disabled={busy} className="bg-[#2B1D11] hover:bg-[#3A2818] text-white px-6 py-2 rounded-full disabled:opacity-70">
            {busy ? 'Saving…' : 'Create order'}
          </button>
        </div>
      </form>
    </div>
  );
};

/* --------------- Product Editor Modal --------------- */
const ProductEditorModal = ({ open, mode, initial, onClose, onSaved }) => {
  const [form, setForm] = useState({
    slug: '', name: '', category: 'fruits', image: '', from_price: 0, description: '',
    variants: [{ id: 'default', label: '1 kg', price: 0, stock: 0 }],
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) setForm({ ...initial });
    else setForm({
      slug: '', name: '', category: 'fruits', image: '', from_price: 0, description: '',
      variants: [{ id: 'default', label: '1 kg', price: 0, stock: 0 }],
    });
    setError('');
  }, [open, mode, initial]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setVariant = (i, patch) => setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => idx === i ? { ...v, ...patch } : v) }));
  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { id: `v${Date.now()}`, label: '', price: 0, stock: 0 }] }));
  const rmVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError('Image too large (max 3MB)'); return; }
    const url = await fileToDataUrl(file);
    set('image', url);
  };

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.name || !form.category || !form.image) { setError('Name, category, image required'); return; }
    if (form.variants.length === 0 || form.variants.some((v) => !v.label || !v.price)) {
      setError('At least one variant with label & price'); return;
    }
    setBusy(true);
    try {
      if (mode === 'edit') {
        await api.put(`/admin/products/${initial.slug}`, {
          name: form.name, category: form.category, image: form.image,
          from_price: parseInt(form.from_price || 0, 10) || Math.min(...form.variants.map((v) => parseInt(v.price, 10) || 0)),
          description: form.description,
        });
        // Sync variants (patch + add + delete)
        const originalIds = (initial.variants || []).map((v) => v.id);
        const newIds = form.variants.map((v) => v.id);
        // deletes
        for (const id of originalIds) {
          if (!newIds.includes(id)) {
            await api.delete(`/admin/products/${initial.slug}/variants/${id}`);
          }
        }
        for (const v of form.variants) {
          if (originalIds.includes(v.id)) {
            await api.patch(`/admin/products/${initial.slug}/variants/${v.id}`, {
              label: v.label, price: parseInt(v.price, 10) || 0, stock: parseInt(v.stock, 10) || 0,
            });
          } else {
            await api.post(`/admin/products/${initial.slug}/variants`, {
              id: v.id, label: v.label, price: parseInt(v.price, 10) || 0, stock: parseInt(v.stock, 10) || 0,
            });
          }
        }
      } else {
        const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        await api.post('/admin/products', {
          slug, name: form.name, category: form.category, image: form.image,
          from_price: parseInt(form.from_price || 0, 10) || Math.min(...form.variants.map((v) => parseInt(v.price, 10) || 0)),
          description: form.description,
          variants: form.variants.map((v) => ({ id: v.id, label: v.label, price: parseInt(v.price, 10) || 0, stock: parseInt(v.stock, 10) || 0 })),
        });
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#EFE4CB]">
          <div>
            <div className="text-[#C96C1B] tracking-[0.3em] text-xs">{mode === 'edit' ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</div>
            <div className="font-serif text-2xl text-[#2B1D11]">{mode === 'edit' ? initial?.name : 'Add a product'}</div>
          </div>
          <button type="button" onClick={onClose} className="text-[#7A6A55] hover:text-[#2B1D11]"><X size={22} /></button>
        </div>
        <div className="p-8 space-y-5">
          <div className="grid md:grid-cols-[180px_1fr] gap-5">
            <div>
              <div className="text-xs text-[#7A6A55] uppercase tracking-widest mb-2">Photo</div>
              <div className="aspect-square rounded-xl border border-[#E4D9C1] bg-[#FBF7EC] overflow-hidden flex items-center justify-center">
                {form.image ? <img src={form.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={40} className="text-[#B8A98C]" />}
              </div>
              <input ref={fileRef} onChange={handleFile} type="file" accept="image/*" className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 w-full inline-flex items-center justify-center gap-2 border border-[#4E6A3C] text-[#4E6A3C] hover:bg-[#4E6A3C] hover:text-white rounded-lg px-3 py-2 text-sm">
                <Upload size={14} /> Upload image
              </button>
              <input value={form.image?.startsWith('data:') ? '' : (form.image || '')} onChange={(e) => set('image', e.target.value)} placeholder="or paste image URL" className="mt-2 w-full px-3 py-2 border border-[#E4D9C1] rounded-lg text-xs" />
            </div>
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Product name*" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
                <select value={form.category} onChange={(e) => set('category', e.target.value)} className="px-4 py-3 border border-[#E4D9C1] rounded-xl bg-white">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {mode !== 'edit' && (
                <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="slug (auto if empty)" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              )}
              <input type="number" value={form.from_price} onChange={(e) => set('from_price', e.target.value)} placeholder="Base 'From' price (₹)" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description" rows={3} className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-[#7A6A55] uppercase tracking-widest">Variants</div>
              <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 text-sm text-[#4E6A3C]"><Plus size={15} /> Add variant</button>
            </div>
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input value={v.id} onChange={(e) => setVariant(i, { id: e.target.value })} placeholder="id" className="col-span-2 px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
                  <input value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} placeholder="Label (e.g. 1 kg)" className="col-span-5 px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
                  <input type="number" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} placeholder="Price ₹" className="col-span-2 px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
                  <input type="number" value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} placeholder="Stock" className="col-span-2 px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
                  <button type="button" onClick={() => rmVariant(i)} className="col-span-1 text-red-500 hover:text-red-700 flex justify-center items-center"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-[#EFE4CB]">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-full text-[#2B1D11] hover:bg-[#F7F1E5]">Cancel</button>
          <button disabled={busy} className="bg-[#2B1D11] hover:bg-[#3A2818] text-white px-6 py-2 rounded-full inline-flex items-center gap-2 disabled:opacity-70">
            <Save size={16} /> {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

/* --------------- Main Dashboard --------------- */
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
  const [showOffline, setShowOffline] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editorProduct, setEditorProduct] = useState(null);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', password: '', role: 'staff' });
  const [staffErr, setStaffErr] = useState('');

  const reload = useCallback(async () => {
    try {
      const [s, p, o, c, st] = await Promise.all([
        api.get('/admin/stats'), api.get('/products'), api.get('/admin/orders'),
        api.get('/admin/customers'), api.get('/admin/staff'),
      ]);
      setStats(s.data); setProducts(p.data); setOrders(o.data); setCustomers(c.data); setStaff(st.data);
    } catch (e) { /* ignore */ }
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
    try { await api.post('/admin/staff', newStaff); setNewStaff({ name: '', email: '', phone: '', password: '', role: 'staff' }); reload(); }
    catch (err) { setStaffErr(err.response?.data?.detail || 'Failed'); }
  };
  const removeStaff = async (uid) => {
    if (!window.confirm('Remove this account?')) return;
    try { await api.delete(`/admin/staff/${uid}`); reload(); }
    catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const openInvoice = async (id) => { const r = await api.get(`/orders/${id}`); setInvoiceOrder(r.data); };
  const openEditProduct = (p) => { setEditorMode('edit'); setEditorProduct(p); setEditorOpen(true); };
  const openNewProduct = () => { setEditorMode('create'); setEditorProduct(null); setEditorOpen(true); };
  const deleteProduct = async (slug) => {
    if (!window.confirm('Delete this product entirely?')) return;
    try { await api.delete(`/admin/products/${slug}`); reload(); }
    catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-14">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3">ADMIN</div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#2B1D11]">Farm Dashboard</h1>
            <div className="text-sm text-[#7A6A55] mt-1">Signed in as {user.name} ({user.role})</div>
          </div>
          <button onClick={() => setShowOffline(true)} className="inline-flex items-center gap-2 bg-[#4E6A3C] hover:bg-[#3D5530] text-white px-5 py-2.5 rounded-full">
            <Plus size={16} /> New offline order
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mt-8 mb-10">
          <StatCard icon={TrendingUp} value={`₹${stats.revenue?.toLocaleString?.() || 0}`} label="Revenue" />
          <StatCard icon={ShoppingBag} value={stats.orders} label="Orders" />
          <StatCard icon={Truck} value={stats.pending} label="Pending" />
          <StatCard icon={Package} value={stats.products} label="Products" />
          <StatCard icon={Users} value={stats.customers} label="Customers" />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-full text-sm transition-colors ${activeTab === t ? 'bg-white border border-[#2B1D11] text-[#2B1D11]' : 'text-[#2B1D11] hover:bg-white/60'}`}>{t}</button>
          ))}
        </div>

        {activeTab === 'Inventory' && (
          <div>
            {isAdmin && (
              <div className="flex justify-end mb-3">
                <button onClick={openNewProduct} className="inline-flex items-center gap-2 bg-[#2B1D11] hover:bg-[#3A2818] text-white px-4 py-2 rounded-full text-sm">
                  <Plus size={15} /> Add product
                </button>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <div key={p.slug} className="bg-white rounded-2xl border border-[#E4D9C1] overflow-hidden">
                  <div className="aspect-[16/10] bg-[#EFE4CB] overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-[#4E6A3C]">{p.category}</div>
                        <div className="font-serif text-lg text-[#2B1D11]">{p.name}</div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => openEditProduct(p)} className="p-2 text-[#2B1D11] hover:bg-[#F7F1E5] rounded-lg" title="Edit"><Edit3 size={16} /></button>
                          <button onClick={() => deleteProduct(p.slug)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 mt-3">
                      {p.variants.map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-sm">
                          <div>
                            <div className="text-[#2B1D11]">{v.label}</div>
                            <div className="text-xs text-[#7A6A55]">₹{v.price}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateStock(p.slug, v.id, v.stock - 1)} className="w-7 h-7 rounded-full border border-[#E4D9C1] text-[#2B1D11] hover:bg-[#EFE4CB]"><Minus size={12} className="mx-auto" /></button>
                            <span className="w-10 text-center text-[#2B1D11]">{v.stock}</span>
                            <button onClick={() => updateStock(p.slug, v.id, v.stock + 1)} className="w-7 h-7 rounded-full border border-[#E4D9C1] text-[#2B1D11] hover:bg-[#EFE4CB]"><Plus size={12} className="mx-auto" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                    <th className="text-left px-6 py-4">Src</th>
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
                      <td className="px-6 py-4 text-[#4B3826]">{o.customer_name || o.customer_email}<div className="text-xs text-[#7A6A55]">{o.customer_email}</div></td>
                      <td className="px-6 py-4 text-xs uppercase tracking-widest text-[#7A6A55]">{o.source || 'online'}</td>
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
                    <tr><td colSpan={10} className="px-6 py-10 text-center text-[#7A6A55]">No orders found.</td></tr>
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
                  {invoiceOrder.notes && <div className="text-xs text-[#7A6A55] mt-2 text-right">Notes: {invoiceOrder.notes}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        <OfflineOrderModal
          open={showOffline}
          onClose={() => setShowOffline(false)}
          onCreated={() => reload()}
          products={products}
        />
        <ProductEditorModal
          open={editorOpen}
          mode={editorMode}
          initial={editorProduct}
          onClose={() => setEditorOpen(false)}
          onSaved={reload}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
