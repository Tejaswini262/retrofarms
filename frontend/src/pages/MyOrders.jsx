import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { Star, MessageSquare, Check, X } from 'lucide-react';

const StarPicker = ({ value, onChange, size = 22, readOnly = false }) => (
  <div className="inline-flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" disabled={readOnly}
        onClick={() => onChange?.(n)}
        className={`transition-transform ${!readOnly ? 'hover:scale-110' : ''}`}>
        <Star size={size} className={n <= value ? 'fill-[#F0B849] text-[#F0B849]' : 'text-[#D9CBAF]'} />
      </button>
    ))}
  </div>
);

const FeedbackModal = ({ open, order, existing, onClose, onSaved }) => {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setRating(existing?.rating || 0); setComment(existing?.comment || ''); setError(''); }
  }, [open, existing]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (rating < 1) { setError('Please pick a star rating.'); return; }
    setBusy(true);
    try {
      if (existing) {
        const r = await api.patch(`/feedback/${existing.feedback_id}`, { rating, comment });
        onSaved?.(r.data);
      } else {
        const r = await api.post('/feedback', { order_id: order.order_id, rating, comment });
        onSaved?.(r.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not submit feedback');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EFE4CB]">
          <div>
            <div className="text-[#C96C1B] tracking-[0.3em] text-xs">FEEDBACK</div>
            <div className="font-serif text-xl text-[#2B1D11]">Order #{order.order_id}</div>
          </div>
          <button type="button" onClick={onClose} className="text-[#7A6A55] hover:text-[#2B1D11]"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="text-sm text-[#7A6A55] mb-2">How was your order?</div>
            <StarPicker value={rating} onChange={setRating} size={30} />
          </div>
          <div>
            <label className="text-sm text-[#7A6A55] mb-1 block">Tell us more (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
              placeholder="What did you love? What can we improve?"
              className="w-full px-4 py-3 border border-[#E4D9C1] rounded-xl focus:outline-none focus:border-[#2B1D11]" />
          </div>
          {existing && <div className="text-xs text-[#7A6A55]">You can edit this feedback within 48 hours of first submission.</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#EFE4CB]">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-full text-[#2B1D11] hover:bg-[#F7F1E5]">Cancel</button>
          <button disabled={busy} className="bg-[#2B1D11] hover:bg-[#3A2818] text-white px-6 py-2 rounded-full disabled:opacity-70">
            {busy ? 'Sending…' : existing ? 'Update feedback' : 'Submit feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

const MyOrders = () => {
  const { user, authLoading } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState({}); // { order_id: fb | null }
  const [modalOrder, setModalOrder] = useState(null);

  const loadFeedbackFor = async (order_id) => {
    try {
      const r = await api.get(`/feedback/order/${order_id}`);
      setFeedbacks((f) => ({ ...f, [order_id]: r.data || null }));
    } catch { setFeedbacks((f) => ({ ...f, [order_id]: null })); }
  };

  useEffect(() => {
    if (!user) return;
    api.get('/orders/my').then((r) => {
      setOrders(r.data);
      // Load feedback for delivered ones
      r.data.filter((o) => o.status === 'Delivered').forEach((o) => loadFeedbackFor(o.order_id));
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading) return <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-14">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3">MY ACCOUNT</div>
        <h1 className="font-serif text-5xl text-[#2B1D11] mb-10">Your orders</h1>
        {loading ? <div className="text-[#7A6A55]">Loading…</div> : orders.length === 0 ? (
          <div className="bg-white border border-[#E4D9C1] rounded-2xl p-10 text-center">
            <p className="text-[#2B1D11] mb-4">You haven't placed an order yet.</p>
            <Link to="/shop" className="inline-flex bg-[#2B1D11] hover:bg-[#3A2818] text-[#F7F1E5] px-6 py-3 rounded-full">Start shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const fb = feedbacks[o.order_id];
              const canFeedback = o.status === 'Delivered';
              return (
                <div key={o.order_id} className="bg-white border border-[#E4D9C1] rounded-2xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#7A6A55]">Order</div>
                      <Link to={`/order/${o.order_id}`} className="font-serif text-lg text-[#2B1D11] underline-slide">#{o.order_id}</Link>
                    </div>
                    <div>
                      <div className="text-xs text-[#7A6A55]">Items</div>
                      <div className="text-[#2B1D11]">{o.items?.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#7A6A55]">Payment</div>
                      <div className="text-[#2B1D11]">{o.payment_method?.toUpperCase()} · {o.payment_status}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#7A6A55]">Status</div>
                      <div className={o.status === 'Delivered' ? 'text-[#4E6A3C]' : 'text-[#C96C1B]'}>{o.status}</div>
                    </div>
                    <div className="font-serif text-xl text-[#2B1D11]">₹{o.total}</div>
                  </div>
                  {canFeedback && (
                    <div className="mt-4 pt-4 border-t border-[#EFE4CB] flex flex-wrap items-center justify-between gap-3">
                      {fb ? (
                        <div className="flex items-center gap-3">
                          <StarPicker value={fb.rating} readOnly size={18} />
                          {fb.comment && <span className="text-sm text-[#4B3826]">"{fb.comment}"</span>}
                          {fb.status === 'flagged' && <span className="text-xs px-2 py-0.5 rounded-full bg-[#FCE9D0] text-[#C96C1B]">Under review</span>}
                          {fb.admin_response && <span className="text-xs text-[#4E6A3C]">Farm replied</span>}
                        </div>
                      ) : (
                        <div className="text-sm text-[#7A6A55] flex items-center gap-2"><MessageSquare size={14} /> How was this order? Share feedback so our farm can improve.</div>
                      )}
                      <button onClick={() => setModalOrder(o)} className="inline-flex items-center gap-2 bg-[#4E6A3C] hover:bg-[#3D5530] text-white px-4 py-2 rounded-full text-sm">
                        {fb ? 'Edit feedback' : 'Leave feedback'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FeedbackModal
        open={!!modalOrder}
        order={modalOrder || {}}
        existing={modalOrder ? feedbacks[modalOrder.order_id] : null}
        onClose={() => setModalOrder(null)}
        onSaved={(fb) => setFeedbacks((prev) => ({ ...prev, [fb.order_id]: fb }))}
      />
    </div>
  );
};

export default MyOrders;
