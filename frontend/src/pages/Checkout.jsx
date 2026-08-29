import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { Truck, Wallet, CreditCard, MapPin } from 'lucide-react';
import MapPicker from '../components/MapPicker';

const RZP_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID;

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

const Checkout = () => {
  const navigate = useNavigate();
  const { user, cart, cartSubtotal, deliveryCharge, cartTotal, clearCart } = useApp();
  const [address, setAddress] = useState({
    full_name: '', phone: '', line1: '', line2: '', city: 'Hyderabad', pincode: '', landmark: '',
  });
  const [geo, setGeo] = useState(null);
  const [payment, setPayment] = useState('razorpay');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (cart.length === 0) { navigate('/cart'); return; }
    setAddress((a) => ({ ...a, full_name: a.full_name || user.name || '', phone: a.phone || user.phone || '' }));
  }, [user, cart, navigate]);

  const handleField = (k, v) => setAddress((a) => ({ ...a, [k]: v }));

  const applyPicked = (picked) => {
    setAddress((a) => ({
      ...a,
      line1: picked.line1 || a.line1,
      line2: picked.line2 || a.line2,
      city: picked.city || a.city,
      pincode: picked.pincode || a.pincode,
      landmark: picked.landmark || a.landmark,
    }));
    setGeo({ lat: picked.lat, lng: picked.lng });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!address.full_name || !address.phone || !address.line1 || !address.city || !address.pincode) {
      setError('Please fill all required fields.'); return;
    }
    setPlacing(true);
    try {
      const items = cart.map((c) => ({ slug: c.slug, variant_id: c.variantId, qty: c.qty, options: c.options || null }));
      const addr = geo ? { ...address, lat: geo.lat, lng: geo.lng } : address;
      const r = await api.post('/orders/create', {
        items, address: addr, payment_method: payment,
      });
      if (payment === 'cod') {
        clearCart();
        navigate(`/order/${r.data.order_id}`);
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Failed to load Razorpay');
      const opts = {
        key: r.data.key_id || RZP_KEY,
        amount: r.data.amount,
        currency: r.data.currency,
        order_id: r.data.razorpay_order_id,
        name: 'Retro Farms',
        description: 'Farm order',
        prefill: { name: address.full_name, email: user.email, contact: address.phone },
        theme: { color: '#2B1D11' },
        handler: async (resp) => {
          try {
            await api.post('/orders/verify', {
              order_id: r.data.order_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            clearCart();
            navigate(`/order/${r.data.order_id}`);
          } catch (e) {
            setError(e.response?.data?.detail || 'Payment verification failed');
            setPlacing(false);
          }
        },
        modal: { ondismiss: () => setPlacing(false) },
      };
      const rzpInst = new window.Razorpay(opts);
      rzpInst.open();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to place order');
      setPlacing(false);
    }
  };

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-16">
        <h1 className="font-serif text-4xl md:text-5xl text-[#2B1D11] mb-10">Checkout</h1>

        <form onSubmit={submit} className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-[#E4D9C1] rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-[#4E6A3C]" />
                <h2 className="font-serif text-2xl text-[#2B1D11]">Pick your location</h2>
              </div>
              <MapPicker onAddress={applyPicked} />
            </div>

            <div className="bg-white border border-[#E4D9C1] rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Truck size={20} className="text-[#4E6A3C]" />
                <h2 className="font-serif text-2xl text-[#2B1D11]">Delivery address</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <input value={address.full_name} onChange={(e) => handleField('full_name', e.target.value)} placeholder="Full name*" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
                <input value={address.phone} onChange={(e) => handleField('phone', e.target.value)} placeholder="Phone*" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
                <input value={address.line1} onChange={(e) => handleField('line1', e.target.value)} placeholder="Address line 1*" className="sm:col-span-2 w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
                <input value={address.line2} onChange={(e) => handleField('line2', e.target.value)} placeholder="Address line 2" className="sm:col-span-2 w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
                <input value={address.city} onChange={(e) => handleField('city', e.target.value)} placeholder="City*" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
                <input value={address.pincode} onChange={(e) => handleField('pincode', e.target.value)} placeholder="Pincode*" className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
                <input value={address.landmark} onChange={(e) => handleField('landmark', e.target.value)} placeholder="Landmark (optional)" className="sm:col-span-2 w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
              </div>
              <div className="text-xs text-[#7A6A55] mt-3">All fields are freely editable — use the map above to speed up or type your address by hand.</div>
            </div>

            <div className="bg-white border border-[#E4D9C1] rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6"><CreditCard size={20} className="text-[#4E6A3C]" /><h2 className="font-serif text-2xl text-[#2B1D11]">Payment method</h2></div>
              <div className="space-y-3">
                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${payment === 'razorpay' ? 'border-[#2B1D11] bg-[#FBF7EC]' : 'border-[#E4D9C1] hover:border-[#2B1D11]/50'}`}>
                  <input type="radio" name="pay" value="razorpay" checked={payment === 'razorpay'} onChange={() => setPayment('razorpay')} />
                  <CreditCard size={20} className="text-[#2B1D11]" />
                  <div>
                    <div className="text-[#2B1D11] font-medium">Razorpay</div>
                    <div className="text-xs text-[#7A6A55]">Cards, UPI, wallets, netbanking</div>
                  </div>
                </label>
                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${payment === 'cod' ? 'border-[#2B1D11] bg-[#FBF7EC]' : 'border-[#E4D9C1] hover:border-[#2B1D11]/50'}`}>
                  <input type="radio" name="pay" value="cod" checked={payment === 'cod'} onChange={() => setPayment('cod')} />
                  <Wallet size={20} className="text-[#2B1D11]" />
                  <div>
                    <div className="text-[#2B1D11] font-medium">Cash on Delivery</div>
                    <div className="text-xs text-[#7A6A55]">Pay when your order arrives</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E4D9C1] rounded-2xl p-6 md:p-8 h-fit lg:sticky lg:top-24">
            <div className="font-serif text-2xl text-[#2B1D11] mb-6">Order summary</div>
            <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
              {cart.map((c) => (
                <div key={c.key} className="flex gap-3 text-sm">
                  <img src={c.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="text-[#2B1D11]">{c.name}</div>
                    <div className="text-xs text-[#7A6A55]">{c.variantLabel} · x{c.qty}</div>
                  </div>
                  <div className="text-[#2B1D11]">₹{c.price * c.qty}</div>
                </div>
              ))}
            </div>
            <div className="h-px bg-[#E4D9C1] my-4" />
            <div className="flex justify-between text-[#4B3826] mb-2"><span>Subtotal</span><span>₹{cartSubtotal}</span></div>
            <div className="flex justify-between text-[#4B3826] mb-2">
              <span>Delivery</span>
              <span className={deliveryCharge === 0 ? 'text-[#4E6A3C]' : ''}>{deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`}</span>
            </div>
            {deliveryCharge > 0 && <div className="text-xs text-[#C96C1B] mb-2">Orders under ₹200 include ₹100 delivery.</div>}
            <div className="h-px bg-[#E4D9C1] my-3" />
            <div className="flex justify-between font-serif text-xl text-[#2B1D11] mb-6"><span>Total</span><span>₹{cartTotal}</span></div>
            {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
            <button disabled={placing} className="w-full bg-[#2B1D11] hover:bg-[#3A2818] text-[#F7F1E5] rounded-full py-3 transition-colors disabled:opacity-70">
              {placing ? 'Placing…' : payment === 'cod' ? 'Place order (COD)' : `Pay ₹${cartTotal}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
