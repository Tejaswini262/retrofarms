import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import api, { API_BASE } from '../lib/api';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, Truck, Package, Users, Trash2, X, Plus, Edit3, Save,
  Upload, ImageIcon, Minus, MapPin, ExternalLink, Lock, User as UserIcon,
  Download, Printer, Bell, Layers,
} from 'lucide-react';

const tabs = ['Inventory', 'Orders', 'Revenue', 'Customers', 'Feedback', 'Farmers', 'Categories', 'Staff', 'Account'];

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

const VARIANT_PRESETS = [
  '50 g', '100 g', '200 g', '250 g', '500 g', '750 g', '1 kg', '2 kg', '3 kg', '5 kg',
  '100 ml', '250 ml', '500 ml', '1 L', '2 L',
  '6 pcs', '12 pcs (1 dozen)', '30 pcs (1 tray)', '1 piece',
];

const buildMapsUrl = (addr) => {
  if (!addr) return null;
  if (addr.lat && addr.lng) {
    return `https://www.google.com/maps?q=${addr.lat},${addr.lng}`;
  }
  const parts = [addr.line1, addr.line2, addr.city, addr.pincode, addr.landmark].filter(Boolean);
  if (parts.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/* --------------- Offline Order Modal --------------- */
const OfflineOrderModal = ({ open, onClose, onCreated, products }) => {
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [address, setAddress] = useState({ line1: '', line2: '', city: 'Hyderabad', pincode: '', landmark: '' });
  const [lines, setLines] = useState([]);
  const [payment, setPayment] = useState('cash');
  const [notes, setNotes] = useState('');
  const [customTotal, setCustomTotal] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pastCustomers, setPastCustomers] = useState([]);
  const [custQuery, setCustQuery] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [phoneLookupMsg, setPhoneLookupMsg] = useState('');

  useEffect(() => {
    if (open) {
      api.get('/admin/offline-customers').then((r) => setPastCustomers(r.data || [])).catch(() => {});
    } else {
      setCustomer({ name: '', phone: '', email: '' });
      setAddress({ line1: '', line2: '', city: 'Hyderabad', pincode: '', landmark: '' });
      setLines([]); setPayment('cash'); setNotes(''); setCustomTotal(''); setError('');
      setCustQuery(''); setShowSuggest(false); setPhoneLookupMsg('');
    }
  }, [open]);

  // Auto-lookup by phone (debounced 500ms) — auto-fill saved details for returning offline customers
  useEffect(() => {
    if (!open) return;
    const phone = customer.phone?.trim();
    if (!phone || phone.length < 6) { setPhoneLookupMsg(''); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get(`/admin/customers/lookup?phone=${encodeURIComponent(phone)}`);
        if (r.data && r.data.user_id) {
          if (!customer.name) setCustomer((c) => ({ ...c, name: r.data.name || '', email: r.data.email && !r.data.email.includes('@retrofarms.offline') ? r.data.email : c.email }));
          if (r.data.saved_address) {
            const a = r.data.saved_address;
            setAddress((prev) => ({
              line1: prev.line1 || a.line1 || '',
              line2: prev.line2 || a.line2 || '',
              city: prev.city && prev.city !== 'Hyderabad' ? prev.city : (a.city || prev.city),
              pincode: prev.pincode || a.pincode || '',
              landmark: prev.landmark || a.landmark || '',
            }));
          }
          setPhoneLookupMsg(`Returning customer — ${r.data.name || 'details'} auto-filled.`);
        } else {
          setPhoneLookupMsg('');
        }
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [customer.phone, open]);

  if (!open) return null;

  const subtotal = lines.reduce((s, l) => s + (l.price || 0) * (l.qty || 0), 0);
  const autoDelivery = subtotal > 0 && subtotal < 200 ? 100 : 0;
  const hasCustomTotal = customTotal !== '' && !isNaN(parseInt(customTotal, 10));
  const total = hasCustomTotal ? parseInt(customTotal, 10) : subtotal + autoDelivery;
  const delivery = hasCustomTotal ? Math.max(0, total - subtotal) : autoDelivery;

  const q = custQuery.trim().toLowerCase();
  const suggestions = q ? pastCustomers.filter((c) =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.phone || '').includes(q) ||
    (c.email || '').toLowerCase().includes(q),
  ).slice(0, 8) : pastCustomers.slice(0, 8);

  const pickPast = (c) => {
    setCustomer({ name: c.name || '', phone: c.phone || '', email: c.email && !c.email.includes('@retrofarms.offline') ? c.email : '' });
    if (c.last_address) {
      setAddress({
        line1: c.last_address.line1 || '', line2: c.last_address.line2 || '',
        city: c.last_address.city || 'Hyderabad', pincode: c.last_address.pincode || '',
        landmark: c.last_address.landmark || '',
      });
    }
    setCustQuery(`${c.name || ''} · ${c.phone || ''}`);
    setShowSuggest(false);
  };

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
      const paymentStatus = payment === 'not_paid' ? 'Not Paid' : 'Paid';
      const addressPayload = {
        full_name: customer.name, phone: customer.phone,
        line1: address.line1, line2: address.line2, city: address.city,
        pincode: address.pincode, landmark: address.landmark,
      };
      const r = await api.post('/admin/orders/offline', {
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        items: lines.map((l) => ({ slug: l.slug, variant_id: l.variant_id, qty: parseInt(l.qty, 10) })),
        address: addressPayload,
        payment_method: payment,
        payment_status: paymentStatus,
        notes,
        status: 'Placed',
        total_override: hasCustomTotal ? parseInt(customTotal, 10) : null,
        save_customer_address: true,
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
          <div>
            <div className="text-xs text-[#7A6A55] uppercase tracking-widest mb-2">Reuse past customer</div>
            <div className="relative">
              <input
                value={custQuery}
                onChange={(e) => { setCustQuery(e.target.value); setShowSuggest(true); }}
                onFocus={() => setShowSuggest(true)}
                placeholder="Search by name, phone, email…"
                className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11] bg-white"
              />
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#E4D9C1] rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {suggestions.map((c) => (
                    <button key={c.user_id} type="button" onClick={() => pickPast(c)}
                      className="w-full text-left px-4 py-3 hover:bg-[#F7F1E5] border-b border-[#EFE4CB] last:border-b-0">
                      <div className="flex justify-between gap-3">
                        <div className="text-[#2B1D11] font-medium">{c.name || '—'}</div>
                        <div className="text-xs text-[#7A6A55]">{c.orders} order{c.orders === 1 ? '' : 's'}</div>
                      </div>
                      <div className="text-xs text-[#7A6A55] flex flex-wrap gap-x-3">
                        {c.phone && <span>{c.phone}</span>}
                        {c.email && !c.email.includes('@retrofarms.offline') && <span>{c.email}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="text-xs text-[#7A6A55] mt-1">Or just type phone below — we'll auto-fill for returning customers.</div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <input required value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="Customer name*" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
            <input required value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} placeholder="Phone*" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
            <input value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} placeholder="Email (optional)" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
          </div>
          {phoneLookupMsg && <div className="text-xs text-[#4E6A3C] -mt-3">{phoneLookupMsg}</div>}

          <div>
            <div className="text-xs text-[#7A6A55] uppercase tracking-widest mb-2">Address</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="Street / house no." className="sm:col-span-2 px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              <input value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Area / colony" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              <input value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} placeholder="Landmark (optional)" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              <input value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} placeholder="Pincode" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
            </div>
            <div className="text-xs text-[#7A6A55] mt-2">Address is saved to the customer profile and auto-filled next time this phone number is used.</div>
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
              <option value="not_paid">Not Paid (due)</option>
              <option value="offline">Other (offline)</option>
            </select>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
          </div>

          <div className="bg-[#FBF7EC] rounded-xl p-5 space-y-2">
            <div className="flex justify-between text-[#4B3826]"><span>Subtotal (from items)</span><span>₹{subtotal}</span></div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-[#4B3826] text-sm">Final total (override — leave blank for auto)</label>
              <div className="flex items-center gap-2">
                <span className="text-[#4B3826]">₹</span>
                <input type="number" min="0" value={customTotal} onChange={(e) => setCustomTotal(e.target.value)} placeholder={String(subtotal + autoDelivery)}
                  className="w-32 px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm bg-white text-right" />
              </div>
            </div>
            {!hasCustomTotal && (
              <div className="flex justify-between text-[#4B3826] text-sm"><span>Auto delivery {autoDelivery > 0 && '(subtotal < ₹200)'}</span><span>{autoDelivery ? `₹${autoDelivery}` : 'Free'}</span></div>
            )}
            <div className="h-px bg-[#E4D9C1] my-1" />
            <div className="flex justify-between font-serif text-xl text-[#2B1D11]"><span>Total to record</span><span>₹{total}</span></div>
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
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="text-xs text-[#7A6A55] mr-1 self-center">Quick labels:</span>
              {VARIANT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    // Fill the last empty variant's label, or add a new variant with this preset
                    setForm((f) => {
                      const idx = f.variants.findIndex((v) => !v.label);
                      if (idx >= 0) {
                        const copy = [...f.variants];
                        copy[idx] = { ...copy[idx], label: preset, id: copy[idx].id || preset.toLowerCase().replace(/[^a-z0-9]+/g, '') };
                        return { ...f, variants: copy };
                      }
                      const id = preset.toLowerCase().replace(/[^a-z0-9]+/g, '') || `v${Date.now()}`;
                      return { ...f, variants: [...f.variants, { id, label: preset, price: 0, stock: 0 }] };
                    });
                  }}
                  className="px-2.5 py-1 text-xs rounded-full border border-[#E4D9C1] text-[#2B1D11] hover:bg-[#EFE4CB]"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input value={v.id} onChange={(e) => setVariant(i, { id: e.target.value })} placeholder="id" className="col-span-2 px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
                  <input value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} placeholder="Label (e.g. 100 g, 500 ml, 1 kg)" className="col-span-5 px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
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

/* --------------- Farmer Editor Modal --------------- */
const FarmerEditorModal = ({ open, mode, initial, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: '', creds: '', role: '', photo: '', order: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) setForm({
      name: initial.name || '', creds: initial.creds || '', role: initial.role || '',
      photo: initial.photo || '', order: initial.order || 0,
    });
    else setForm({ name: '', creds: '', role: '', photo: '', order: 0 });
    setError('');
  }, [open, mode, initial]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError('Photo too large (max 3MB)'); return; }
    set('photo', await fileToDataUrl(file));
  };

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.name) { setError('Name is required'); return; }
    setBusy(true);
    try {
      if (mode === 'edit') {
        await api.put(`/admin/farmers/${initial.farmer_id}`, {
          name: form.name, creds: form.creds, role: form.role, photo: form.photo, order: parseInt(form.order || 0, 10),
        });
      } else {
        await api.post('/admin/farmers', {
          name: form.name, creds: form.creds, role: form.role, photo: form.photo, order: parseInt(form.order || 0, 10),
        });
      }
      onSaved?.(); onClose();
    } catch (e) { setError(e.response?.data?.detail || 'Save failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#EFE4CB]">
          <div>
            <div className="text-[#C96C1B] tracking-[0.3em] text-xs">{mode === 'edit' ? 'EDIT FARMER' : 'NEW FARMER'}</div>
            <div className="font-serif text-2xl text-[#2B1D11]">{mode === 'edit' ? initial?.name : 'Add a farmer'}</div>
          </div>
          <button type="button" onClick={onClose} className="text-[#7A6A55] hover:text-[#2B1D11]"><X size={22} /></button>
        </div>
        <div className="p-8 space-y-4">
          <div className="grid md:grid-cols-[180px_1fr] gap-5">
            <div>
              <div className="text-xs text-[#7A6A55] uppercase tracking-widest mb-2">Photo</div>
              <div className="aspect-[4/5] rounded-xl border border-[#E4D9C1] bg-[#FBF7EC] overflow-hidden flex items-center justify-center">
                {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={40} className="text-[#B8A98C]" />}
              </div>
              <input ref={fileRef} onChange={handleFile} type="file" accept="image/*" className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 w-full inline-flex items-center justify-center gap-2 border border-[#4E6A3C] text-[#4E6A3C] hover:bg-[#4E6A3C] hover:text-white rounded-lg px-3 py-2 text-sm">
                <Upload size={14} /> Upload photo
              </button>
              <input value={form.photo?.startsWith('data:') ? '' : (form.photo || '')} onChange={(e) => set('photo', e.target.value)} placeholder="or paste image URL" className="mt-2 w-full px-3 py-2 border border-[#E4D9C1] rounded-lg text-xs" />
            </div>
            <div className="space-y-3">
              <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name (with title)" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              <input value={form.creds} onChange={(e) => set('creds', e.target.value)} placeholder="Credentials (e.g. M.Sc, Ph.D)" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              <input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Role (e.g. Founder & Farm Director)" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              <input type="number" value={form.order} onChange={(e) => set('order', e.target.value)} placeholder="Display order (lower first)" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
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

/* --------------- Account (self-service credential update) --------------- */
const AccountForm = ({ user, onUpdated }) => {
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault(); setSaveMsg(''); setSaveErr('');
    try {
      const r = await api.patch('/auth/me', { name: form.name, email: form.email, phone: form.phone });
      setSaveMsg('Profile updated.');
      onUpdated?.(r.data);
    } catch (err) { setSaveErr(err.response?.data?.detail || 'Update failed'); }
  };

  const changePassword = async (e) => {
    e.preventDefault(); setPwdMsg(''); setPwdErr('');
    if (!pwd.next || pwd.next.length < 6) { setPwdErr('New password must be at least 6 characters.'); return; }
    if (pwd.next !== pwd.confirm) { setPwdErr('Passwords do not match.'); return; }
    try {
      await api.patch('/auth/me', { current_password: pwd.current, new_password: pwd.next });
      setPwd({ current: '', next: '', confirm: '' });
      setPwdMsg('Password changed. Use the new password next time you sign in.');
    } catch (err) { setPwdErr(err.response?.data?.detail || 'Password change failed'); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-[#E4D9C1] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-full bg-[#EFE4CB] text-[#5C3B1E] flex items-center justify-center"><UserIcon size={20} /></div>
          <div>
            <h3 className="font-serif text-2xl text-[#2B1D11]">Profile</h3>
            <div className="text-xs text-[#7A6A55]">Update your name, email and contact number.</div>
          </div>
        </div>
        <label className="block text-xs text-[#7A6A55] mb-1">Full name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
        <label className="block text-xs text-[#7A6A55] mb-1">Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
        <label className="block text-xs text-[#7A6A55] mb-1">Phone</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-4 focus:outline-none focus:border-[#2B1D11]" />
        {saveErr && <div className="text-sm text-red-600 mb-3">{saveErr}</div>}
        {saveMsg && <div className="text-sm text-[#4E6A3C] mb-3">{saveMsg}</div>}
        <button className="w-full bg-[#2B1D11] hover:bg-[#3A2818] text-white rounded-full py-3">Save profile</button>
      </form>

      <form onSubmit={changePassword} className="bg-white rounded-2xl border border-[#E4D9C1] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-full bg-[#EFE4CB] text-[#5C3B1E] flex items-center justify-center"><Lock size={20} /></div>
          <div>
            <h3 className="font-serif text-2xl text-[#2B1D11]">Password</h3>
            <div className="text-xs text-[#7A6A55]">Change your dashboard password. If you're still on the default, please change it now.</div>
          </div>
        </div>
        <label className="block text-xs text-[#7A6A55] mb-1">Current password</label>
        <input type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
        <label className="block text-xs text-[#7A6A55] mb-1">New password (min 6 characters)</label>
        <input type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
        <label className="block text-xs text-[#7A6A55] mb-1">Confirm new password</label>
        <input type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-4 focus:outline-none focus:border-[#2B1D11]" />
        {pwdErr && <div className="text-sm text-red-600 mb-3">{pwdErr}</div>}
        {pwdMsg && <div className="text-sm text-[#4E6A3C] mb-3">{pwdMsg}</div>}
        <button className="w-full bg-[#4E6A3C] hover:bg-[#3D5530] text-white rounded-full py-3">Change password</button>
      </form>
    </div>
  );
};

/* --------------- Revenue breakdown Panel --------------- */
const RevenuePanel = () => {
  const [view, setView] = useState('day');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState({ rows: [], summary: { total_revenue: 0, total_orders: 0, aov: 0 } });

  const load = useCallback(async () => {
    const params = new URLSearchParams({ view });
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const r = await api.get(`/admin/revenue/breakdown?${params.toString()}`);
    setData(r.data);
  }, [view, start, end]);

  useEffect(() => { load(); }, [load]);

  const downloadCsv = () => {
    const header = ['Period', 'Revenue', 'Orders', 'Avg Order Value'];
    const rows = data.rows.map((r) => [r.period, r.revenue, r.orders, r.aov]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `revenue_${view}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadXlsx = () => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    window.open(`${API_BASE}/admin/orders/export.xlsx?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E4D9C1] rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-[#F7F1E5] rounded-full p-1">
            {['day', 'week', 'month', 'year'].map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-full text-sm capitalize ${view === v ? 'bg-[#2B1D11] text-white' : 'text-[#2B1D11]'}`}>
                {v}
              </button>
            ))}
          </div>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
          <span className="text-[#7A6A55]">to</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
          <div className="flex-1" />
          <button onClick={downloadCsv} className="inline-flex items-center gap-2 border border-[#4E6A3C] text-[#4E6A3C] hover:bg-[#4E6A3C] hover:text-white px-4 py-2 rounded-full text-sm">
            <Download size={14} /> CSV
          </button>
          <button onClick={downloadXlsx} className="inline-flex items-center gap-2 bg-[#4E6A3C] hover:bg-[#3D5530] text-white px-4 py-2 rounded-full text-sm">
            <Download size={14} /> Orders XLSX
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E4D9C1] rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-[#7A6A55]">Total revenue</div>
          <div className="font-serif text-3xl text-[#2B1D11] mt-2">₹{data.summary.total_revenue?.toLocaleString?.() || 0}</div>
        </div>
        <div className="bg-white border border-[#E4D9C1] rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-[#7A6A55]">Paid orders</div>
          <div className="font-serif text-3xl text-[#2B1D11] mt-2">{data.summary.total_orders}</div>
        </div>
        <div className="bg-white border border-[#E4D9C1] rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-[#7A6A55]">Avg order value</div>
          <div className="font-serif text-3xl text-[#2B1D11] mt-2">₹{data.summary.aov?.toLocaleString?.() || 0}</div>
        </div>
      </div>

      <div className="bg-white border border-[#E4D9C1] rounded-2xl p-6">
        <div className="text-xs uppercase tracking-widest text-[#7A6A55] mb-4">Revenue by {view}</div>
        {data.rows.length === 0 ? (
          <div className="py-16 text-center text-[#7A6A55]">No paid revenue in this range yet.</div>
        ) : (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={data.rows} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE4CB" />
                <XAxis dataKey="period" stroke="#7A6A55" fontSize={12} />
                <YAxis stroke="#7A6A55" fontSize={12} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E4D9C1', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="revenue" fill="#4E6A3C" name="Revenue (₹)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="orders" fill="#C96C1B" name="Orders" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {data.rows.length > 0 && (
        <div className="bg-white border border-[#E4D9C1] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-[#EFE4CB] text-[#2B1D11]">
                <th className="text-left px-6 py-3">Period</th>
                <th className="text-right px-6 py-3">Revenue</th>
                <th className="text-right px-6 py-3">Orders</th>
                <th className="text-right px-6 py-3">AOV</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.period} className="border-t border-[#EFE4CB]">
                  <td className="px-6 py-3 text-[#2B1D11]">{r.period}</td>
                  <td className="px-6 py-3 text-right font-serif text-[#2B1D11]">₹{r.revenue?.toLocaleString?.()}</td>
                  <td className="px-6 py-3 text-right text-[#4B3826]">{r.orders}</td>
                  <td className="px-6 py-3 text-right text-[#4B3826]">₹{r.aov?.toLocaleString?.()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* --------------- Categories Panel --------------- */
const CategoriesPanel = ({ isAdmin }) => {
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [newCat, setNewCat] = useState({ id: '', label: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/categories').then((r) => setCats(r.data));
    api.get('/products').then((r) => setProducts(r.data));
  };
  useEffect(load, []);

  const productsInCat = (cid) => products.filter((p) => p.category === cid).length;

  const add = async (e) => {
    e.preventDefault(); setError('');
    try {
      const cid = newCat.id.trim().toLowerCase().replace(/\s+/g, '-') || newCat.label.trim().toLowerCase().replace(/\s+/g, '-');
      await api.post('/admin/categories', { id: cid, label: newCat.label.trim() });
      setNewCat({ id: '', label: '' }); load();
    } catch (err) { setError(err.response?.data?.detail || 'Failed'); }
  };

  const save = async (c) => {
    try { await api.patch(`/admin/categories/${c.id}`, { label: editing.label, order: parseInt(editing.order || 0, 10) }); setEditing(null); load(); }
    catch (err) { alert(err.response?.data?.detail || 'Failed'); }
  };

  const remove = async (c) => {
    const count = productsInCat(c.id);
    if (count > 0) {
      const others = cats.filter((x) => x.id !== c.id);
      const target = window.prompt(`${count} product(s) still use "${c.label}". Type the ID of another category to move them into (options: ${others.map((x) => x.id).join(', ')}), or leave blank to cancel:`);
      if (!target) return;
      try { await api.delete(`/admin/categories/${c.id}?reassign_to=${encodeURIComponent(target)}`); load(); }
      catch (e) { alert(e.response?.data?.detail || 'Failed'); }
    } else {
      if (!window.confirm(`Delete category "${c.label}"?`)) return;
      try { await api.delete(`/admin/categories/${c.id}`); load(); }
      catch (e) { alert(e.response?.data?.detail || 'Failed'); }
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E4D9C1] overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-[#EFE4CB] text-[#2B1D11]">
              <th className="text-left px-6 py-4">ID</th>
              <th className="text-left px-6 py-4">Label</th>
              <th className="text-left px-6 py-4">Order</th>
              <th className="text-left px-6 py-4">Products</th>
              <th className="text-left px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className="border-t border-[#EFE4CB]">
                <td className="px-6 py-3 text-[#2B1D11] font-mono text-xs">{c.id}</td>
                <td className="px-6 py-3 text-[#2B1D11]">
                  {editing?.id === c.id ? (
                    <input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} className="px-2 py-1 border border-[#E4D9C1] rounded" />
                  ) : c.label}
                </td>
                <td className="px-6 py-3 text-[#4B3826]">
                  {editing?.id === c.id ? (
                    <input type="number" value={editing.order} onChange={(e) => setEditing({ ...editing, order: e.target.value })} className="w-16 px-2 py-1 border border-[#E4D9C1] rounded" />
                  ) : c.order}
                </td>
                <td className="px-6 py-3 text-[#4E6A3C]">{productsInCat(c.id)}</td>
                <td className="px-6 py-3 text-right">
                  {isAdmin && (
                    editing?.id === c.id ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => save(c)} className="text-[#4E6A3C] hover:text-[#3D5530]"><Save size={16} /></button>
                        <button onClick={() => setEditing(null)} className="text-[#7A6A55]"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing({ ...c })} className="text-[#2B1D11]"><Edit3 size={16} /></button>
                        <button onClick={() => remove(c)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                      </div>
                    )
                  )}
                </td>
              </tr>
            ))}
            {cats.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-[#7A6A55]">No categories yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <form onSubmit={add} className="bg-white rounded-2xl border border-[#E4D9C1] p-6">
          <h3 className="font-serif text-2xl text-[#2B1D11] mb-4">Add category</h3>
          <input value={newCat.label} onChange={(e) => setNewCat({ ...newCat, label: e.target.value })} placeholder="Label (e.g. Mutton)" required className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
          <input value={newCat.id} onChange={(e) => setNewCat({ ...newCat, id: e.target.value })} placeholder="id (optional — auto-generated)" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl mb-3 focus:outline-none focus:border-[#2B1D11]" />
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          <button className="w-full bg-[#4E6A3C] hover:bg-[#3D5530] text-white rounded-full py-3">Add category</button>
        </form>
      )}
    </div>
  );
};

/* --------------- Feedback Panel --------------- */
const FeedbackPanel = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [respondingId, setRespondingId] = useState(null);
  const [responseText, setResponseText] = useState('');

  const load = async () => {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    const r = await api.get(`/admin/feedback${q}`);
    setItems(r.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const setStatus = async (fb, status) => {
    try { await api.patch(`/admin/feedback/${fb.feedback_id}`, { status }); load(); }
    catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };
  const saveResponse = async (fb) => {
    try { await api.patch(`/admin/feedback/${fb.feedback_id}`, { admin_response: responseText }); setRespondingId(null); setResponseText(''); load(); }
    catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };

  const statusBadge = (s) => {
    const map = { active: 'bg-[#DDECD1] text-[#4E6A3C]', flagged: 'bg-[#FCE9D0] text-[#C96C1B]', hidden: 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-0.5 rounded-full text-xs ${map[s] || 'bg-[#EFE4CB] text-[#2B1D11]'}`}>{s}</span>;
  };
  const stars = (n) => (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'text-[#F0B849]' : 'text-[#D9CBAF]'}>★</span>
      ))}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'flagged', 'hidden'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize ${filter === f ? 'bg-[#2B1D11] text-white' : 'bg-white border border-[#E4D9C1] text-[#2B1D11]'}`}>
            {f}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="bg-white border border-[#E4D9C1] rounded-2xl p-14 text-center text-[#7A6A55]">No feedback in this view.</div>
      ) : items.map((fb) => (
        <div key={fb.feedback_id} className="bg-white border border-[#E4D9C1] rounded-2xl p-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {stars(fb.rating)}
                {statusBadge(fb.status)}
                {fb.flags?.length > 0 && fb.flags.map((f) => (
                  <span key={f} className="text-[10px] uppercase tracking-widest bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{f.replace(/_/g, ' ')}</span>
                ))}
              </div>
              <div className="text-[#2B1D11]">{fb.comment || <em className="text-[#7A6A55]">(no comment)</em>}</div>
              <div className="text-xs text-[#7A6A55] mt-2">
                {fb.customer_name || fb.customer_email} · Order <span className="font-mono">#{fb.order_id}</span> · {new Date(fb.created_at).toLocaleString('en-IN')}
                {fb.edit_count > 0 && <> · edited {fb.edit_count}×</>}
              </div>
              {fb.admin_response && (
                <div className="mt-3 pl-4 border-l-2 border-[#4E6A3C] text-sm text-[#4B3826]">
                  <div className="text-xs uppercase tracking-widest text-[#4E6A3C] mb-1">Farm reply</div>
                  {fb.admin_response}
                </div>
              )}
              {respondingId === fb.feedback_id && (
                <div className="mt-3 flex gap-2">
                  <input value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Write a public reply…"
                    className="flex-1 px-3 py-2 border border-[#E4D9C1] rounded-lg text-sm" />
                  <button onClick={() => saveResponse(fb)} className="bg-[#4E6A3C] text-white px-4 py-2 rounded-full text-sm">Save</button>
                  <button onClick={() => { setRespondingId(null); setResponseText(''); }} className="text-[#7A6A55] px-3">Cancel</button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end">
              {fb.status !== 'active' && <button onClick={() => setStatus(fb, 'active')} className="text-xs text-[#4E6A3C] hover:underline">Approve</button>}
              {fb.status !== 'flagged' && <button onClick={() => setStatus(fb, 'flagged')} className="text-xs text-[#C96C1B] hover:underline">Flag</button>}
              {fb.status !== 'hidden' && <button onClick={() => setStatus(fb, 'hidden')} className="text-xs text-red-600 hover:underline">Hide</button>}
              <button onClick={() => { setRespondingId(fb.feedback_id); setResponseText(fb.admin_response || ''); }} className="text-xs text-[#2B1D11] hover:underline mt-2">Respond</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* --------------- Main Dashboard --------------- */
const AdminDashboard = () => {
  const { user, setUser, authLoading } = useApp();
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
  const [customerOrders, setCustomerOrders] = useState(null); // { user, orders }
  const [farmers, setFarmers] = useState([]);
  const [farmerEditorOpen, setFarmerEditorOpen] = useState(false);
  const [farmerEditorMode, setFarmerEditorMode] = useState('create');
  const [farmerEditing, setFarmerEditing] = useState(null);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', password: '', role: 'staff' });
  const [staffErr, setStaffErr] = useState('');

  const reload = useCallback(async () => {
    try {
      const [s, p, o, c, st, fs] = await Promise.all([
        api.get('/admin/stats'), api.get('/products'), api.get('/admin/orders'),
        api.get('/admin/customers'), api.get('/admin/staff'), api.get('/farmers'),
      ]);
      setStats(s.data); setProducts(p.data); setOrders(o.data); setCustomers(c.data); setStaff(st.data); setFarmers(fs.data);
    } catch (e) { /* ignore */ }
  }, []);

  // Polling for new orders to show notification toast
  const seenOrderIds = useRef(new Set());
  const initialLoad = useRef(true);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) return;
    const check = async () => {
      try {
        const r = await api.get('/admin/orders?limit=20');
        if (initialLoad.current) {
          r.data.forEach((o) => seenOrderIds.current.add(o.order_id));
          initialLoad.current = false;
          return;
        }
        const newest = r.data.find((o) => !seenOrderIds.current.has(o.order_id));
        if (newest) {
          r.data.forEach((o) => seenOrderIds.current.add(o.order_id));
          setToast(newest);
          // Play a subtle beep via Web Audio API
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = 660; g.gain.value = 0.05;
            o.connect(g); g.connect(ctx.destination); o.start();
            setTimeout(() => { o.stop(); ctx.close(); }, 220);
          } catch {}
          setOrders(r.data);
          reload();
        }
      } catch {}
    };
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [user, reload]);

  useEffect(() => { if (user && (user.role === 'admin' || user.role === 'staff')) reload(); }, [user, reload]);

  if (authLoading) return <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin' && user.role !== 'staff') return <Navigate to="/" replace />;

  const isAdmin = user.role === 'admin';
  const filteredOrders = orderFilter === 'All' ? orders
    : orderFilter === 'Not Paid' ? orders.filter((o) => (o.payment_method === 'not_paid') || (o.payment_status && ['Pending', 'Not Paid', 'Cod Pending'].includes(o.payment_status)))
    : orders.filter((o) => o.status === orderFilter);

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
  const openCustomerOrders = async (uid) => {
    const r = await api.get(`/admin/customers/${uid}/orders`);
    setCustomerOrders(r.data);
  };
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap gap-2">
                {['All', 'Not Paid', ...ORDER_STATUSES].map((s) => (
                  <button key={s} onClick={() => setOrderFilter(s)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${orderFilter === s ? 'bg-[#4E6A3C] text-white' : 'bg-white border border-[#E4D9C1] text-[#2B1D11] hover:border-[#2B1D11]'}`}>{s}</button>
                ))}
              </div>
              <a href={`${API_BASE}/admin/orders/export.xlsx`} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-2 bg-[#4E6A3C] hover:bg-[#3D5530] text-white px-4 py-2 rounded-full text-sm">
                <Download size={14} /> Download as Excel
              </a>
            </div>
            <div className="bg-white rounded-2xl border border-[#E4D9C1] overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr className="bg-[#EFE4CB] text-[#2B1D11]">
                    <th className="text-left px-6 py-4">Order</th>
                    <th className="text-left px-6 py-4">Customer</th>
                    <th className="text-left px-6 py-4">Src</th>
                    <th className="text-left px-6 py-4">Items</th>
                    <th className="text-left px-6 py-4">Total</th>
                    <th className="text-left px-6 py-4">Payment</th>
                    <th className="text-left px-6 py-4">Location</th>
                    <th className="text-left px-6 py-4">Assigned to</th>
                    <th className="text-left px-6 py-4">Status</th>
                    <th className="text-left px-6 py-4">Placed</th>
                    <th className="text-left px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => {
                    const mapsUrl = buildMapsUrl(o.address);
                    return (
                    <tr key={o.order_id} className="border-t border-[#EFE4CB] hover:bg-[#FBF7EC]">
                      <td className="px-6 py-4 text-[#2B1D11]">#{o.order_id}</td>
                      <td className="px-6 py-4 text-[#4B3826]">{o.customer_name || o.customer_email}<div className="text-xs text-[#7A6A55]">{o.customer_email}</div></td>
                      <td className="px-6 py-4 text-xs uppercase tracking-widest text-[#7A6A55]">{o.source || 'online'}</td>
                      <td className="px-6 py-4 text-[#4B3826]">{o.items?.length}</td>
                      <td className="px-6 py-4 font-serif text-[#2B1D11]">₹{o.total}</td>
                      <td className="px-6 py-4 text-[#4B3826] whitespace-nowrap">{o.payment_method?.toUpperCase()} · {o.payment_status}</td>
                      <td className="px-6 py-4">
                        {mapsUrl ? (
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-[#4E6A3C] text-[#4E6A3C] hover:bg-[#4E6A3C] hover:text-white transition-colors whitespace-nowrap"
                            title={[o.address?.line1, o.address?.line2, o.address?.city, o.address?.pincode].filter(Boolean).join(', ')}>
                            <MapPin size={12} /> Open in Maps <ExternalLink size={11} />
                          </a>
                        ) : <span className="text-xs text-[#7A6A55]">—</span>}
                      </td>
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
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr><td colSpan={11} className="px-6 py-10 text-center text-[#7A6A55]">No orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Revenue' && <RevenuePanel />}

        {activeTab === 'Feedback' && <FeedbackPanel />}

        {activeTab === 'Categories' && <CategoriesPanel isAdmin={isAdmin} />}

        {activeTab === 'Customers' && (
          <div className="bg-white rounded-2xl border border-[#E4D9C1] overflow-x-auto">
            <div className="px-6 pt-5 pb-3 text-xs text-[#7A6A55]">
              Sorted by revenue. Click any customer row (or the orders count) to see their full order history.
            </div>
            <table className="w-full text-sm min-w-[800px]">
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
                {customers.map((c) => (
                  <tr key={c.user_id} className="border-t border-[#EFE4CB] hover:bg-[#FBF7EC] cursor-pointer" onClick={() => openCustomerOrders(c.user_id)}>
                    <td className="px-6 py-4 text-[#2B1D11] font-medium">{c.name || '—'}</td>
                    <td className="px-6 py-4 text-[#4B3826]">{c.phone}</td>
                    <td className="px-6 py-4 text-[#4B3826]">{c.email}</td>
                    <td className="px-6 py-4">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openCustomerOrders(c.user_id); }}
                        className="text-[#C96C1B] hover:text-[#A85512] underline underline-offset-2">
                        {c.orders} {c.orders === 1 ? 'order' : 'orders'}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-serif text-[#2B1D11]">₹{c.total_spent?.toLocaleString?.() || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openCustomerOrders(c.user_id); }}
                        className="px-4 py-1.5 border border-[#E4D9C1] rounded-full text-xs text-[#2B1D11] hover:border-[#2B1D11]">
                        View orders
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-[#7A6A55]">No customers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Farmers' && (
          <div>
            {isAdmin && (
              <div className="flex justify-end mb-3">
                <button onClick={() => { setFarmerEditorMode('create'); setFarmerEditing(null); setFarmerEditorOpen(true); }}
                  className="inline-flex items-center gap-2 bg-[#2B1D11] hover:bg-[#3A2818] text-white px-4 py-2 rounded-full text-sm">
                  <Plus size={15} /> Add farmer
                </button>
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {farmers.map((f) => (
                <div key={f.farmer_id} className="bg-white rounded-2xl border border-[#E4D9C1] overflow-hidden">
                  <div className="aspect-[4/5] bg-[#EFE4CB] overflow-hidden">
                    {f.photo ? <img src={f.photo} alt={f.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center font-serif text-6xl text-[#C4A97F]">
                        {(f.name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2)}
                      </div>}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-xl text-[#2B1D11]">{f.name}</h3>
                        <div className="text-sm text-[#7A6A55]">{f.creds}</div>
                        <div className="inline-block mt-2 px-3 py-1 rounded-full bg-[#EFE4CB] text-xs text-[#4E6A3C]">{f.role}</div>
                        <div className="text-xs text-[#B8A98C] mt-2">Display order: {f.order ?? 0}</div>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-col gap-1">
                          <button onClick={() => { setFarmerEditorMode('edit'); setFarmerEditing(f); setFarmerEditorOpen(true); }} className="p-2 text-[#2B1D11] hover:bg-[#F7F1E5] rounded-lg" title="Edit"><Edit3 size={16} /></button>
                          <button onClick={async () => {
                            if (!window.confirm('Remove this farmer?')) return;
                            try { await api.delete(`/admin/farmers/${f.farmer_id}`); reload(); } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
                          }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {farmers.length === 0 && (
                <div className="col-span-full text-center py-14 text-[#7A6A55]">No farmers yet — click "Add farmer" to create one.</div>
              )}
            </div>
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

        {activeTab === 'Account' && (
          <AccountForm user={user} onUpdated={(u) => setUser(u)} />
        )}

        {invoiceOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto print:static print:bg-transparent print:p-0" onClick={() => setInvoiceOrder(null)}>
            <div className="bg-white rounded-2xl max-w-3xl w-full my-10 print:my-0 print:max-w-full print:rounded-none print:shadow-none" onClick={(e) => e.stopPropagation()} id="invoice-print-area">
              <div className="p-8 print:p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-xs text-[#7A6A55] uppercase tracking-widest">Retro Farms · Invoice</div>
                    <div className="font-serif text-2xl text-[#2B1D11]">#{invoiceOrder.order_id}</div>
                    <div className="text-xs text-[#7A6A55]">{invoiceOrder.created_at ? new Date(invoiceOrder.created_at).toLocaleString('en-IN') : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-[#E4D9C1] hover:border-[#2B1D11] text-[#2B1D11] px-4 py-2 rounded-full text-sm">
                      <Printer size={14} /> Print
                    </button>
                    <button onClick={() => setInvoiceOrder(null)} className="text-[#7A6A55] hover:text-[#2B1D11]"><X size={22} /></button>
                  </div>
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
                      {invoiceOrder.address?.landmark ? <><br />Landmark: {invoiceOrder.address.landmark}</> : null}
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
                      <tr key={idx} className="border-b border-[#EFE4CB] align-top">
                        <td className="py-2 text-[#2B1D11]">
                          {i.name}
                          {i.options && (
                            <div className="text-xs text-[#4E6A3C] mt-1">
                              {i.options.bird_type && <div>Bird: {i.options.bird_type}</div>}
                              {i.options.piece_size && <div>Cut: {i.options.piece_size}</div>}
                              {i.options.delivery_date && <div>Delivery: {i.options.delivery_date}</div>}
                              {i.options.instructions && <div>Notes: {i.options.instructions}</div>}
                            </div>
                          )}
                        </td>
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
                <div className="mt-8 pt-6 border-t border-[#EFE4CB] text-center text-xs text-[#7A6A55] print:block hidden">
                  Thank you for choosing Retro Farms · retrofarms.in · +91 80195 92049
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-[60] bg-white border-l-4 border-[#4E6A3C] shadow-2xl rounded-xl p-4 max-w-sm animate-[fadeUp_.3s_ease-out]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#DDECD1] text-[#4E6A3C] flex items-center justify-center flex-shrink-0"><Bell size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest text-[#4E6A3C] mb-1">New order</div>
                <div className="font-serif text-lg text-[#2B1D11] leading-tight">#{toast.order_id} · ₹{toast.total}</div>
                <div className="text-sm text-[#4B3826] truncate">{toast.customer_name || toast.customer_email}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => { openInvoice(toast.order_id); setToast(null); }}
                    className="text-xs bg-[#2B1D11] hover:bg-[#3A2818] text-white px-3 py-1.5 rounded-full">Open invoice</button>
                  <button onClick={() => setToast(null)} className="text-xs text-[#7A6A55] px-3 py-1.5">Dismiss</button>
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
        <FarmerEditorModal
          open={farmerEditorOpen}
          mode={farmerEditorMode}
          initial={farmerEditing}
          onClose={() => setFarmerEditorOpen(false)}
          onSaved={reload}
        />

        {customerOrders && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setCustomerOrders(null)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full my-10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between px-8 py-5 border-b border-[#EFE4CB]">
                <div>
                  <div className="text-[#C96C1B] tracking-[0.3em] text-xs">CUSTOMER</div>
                  <div className="font-serif text-2xl text-[#2B1D11]">{customerOrders.user?.name || '—'}</div>
                  <div className="text-sm text-[#7A6A55]">
                    {customerOrders.user?.email}
                    {customerOrders.user?.phone ? ` · ${customerOrders.user.phone}` : ''}
                  </div>
                  <div className="text-xs text-[#7A6A55] mt-1">
                    {customerOrders.orders.length} total order{customerOrders.orders.length === 1 ? '' : 's'} ·
                    Lifetime spend: ₹{customerOrders.orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => setCustomerOrders(null)} className="text-[#7A6A55] hover:text-[#2B1D11]"><X size={22} /></button>
              </div>

              <div className="p-4 md:p-6">
                {customerOrders.orders.length === 0 ? (
                  <div className="text-center py-10 text-[#7A6A55]">This customer hasn't placed any orders yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-widest text-[#7A6A55] border-b border-[#EFE4CB]">
                          <th className="py-2 pr-2">Order</th>
                          <th className="py-2 pr-2">Date</th>
                          <th className="py-2 pr-2">Items</th>
                          <th className="py-2 pr-2">Payment</th>
                          <th className="py-2 pr-2">Status</th>
                          <th className="py-2 pr-2 text-right">Total</th>
                          <th className="py-2 pr-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerOrders.orders.map((o) => (
                          <tr key={o.order_id} className="border-b border-[#EFE4CB]">
                            <td className="py-3 pr-2 text-[#2B1D11]">#{o.order_id}</td>
                            <td className="py-3 pr-2 text-[#4B3826] whitespace-nowrap">{o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : ''}</td>
                            <td className="py-3 pr-2 text-[#4B3826]">
                              <div className="text-[#4B3826]">{o.items?.length} item{o.items?.length === 1 ? '' : 's'}</div>
                              <div className="text-xs text-[#7A6A55]">{o.items?.map((i) => `${i.name} × ${i.qty}`).join(', ')}</div>
                            </td>
                            <td className="py-3 pr-2 text-[#4B3826] whitespace-nowrap">{o.payment_method?.toUpperCase()} · {o.payment_status}</td>
                            <td className="py-3 pr-2"><span className={statusColors[o.status] || 'text-[#2B1D11]'}>{o.status}</span></td>
                            <td className="py-3 pr-2 text-right font-serif text-[#2B1D11]">₹{o.total}</td>
                            <td className="py-3 pr-2 text-right">
                              <button onClick={() => { openInvoice(o.order_id); setCustomerOrders(null); }}
                                className="px-3 py-1 border border-[#E4D9C1] rounded-full text-xs text-[#2B1D11] hover:border-[#2B1D11]">
                                Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
