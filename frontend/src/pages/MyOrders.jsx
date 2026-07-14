import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

const MyOrders = () => {
  const { user, authLoading } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get('/orders/my').then((r) => setOrders(r.data)).finally(() => setLoading(false));
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
            {orders.map((o) => (
              <Link key={o.order_id} to={`/order/${o.order_id}`} className="block bg-white border border-[#E4D9C1] rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#7A6A55]">Order</div>
                    <div className="font-serif text-lg text-[#2B1D11]">#{o.order_id}</div>
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
                    <div className="text-[#C96C1B]">{o.status}</div>
                  </div>
                  <div className="font-serif text-xl text-[#2B1D11]">₹{o.total}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
