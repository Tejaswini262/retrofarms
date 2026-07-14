import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';
import { Check, Download, ArrowLeft } from 'lucide-react';

const StatusPill = ({ status }) => {
  const map = {
    Placed: 'bg-[#EFE4CB] text-[#2B1D11]',
    Confirmed: 'bg-[#EFE4CB] text-[#2B1D11]',
    Processing: 'bg-[#FCE9D0] text-[#C96C1B]',
    Packed: 'bg-[#FCE9D0] text-[#C96C1B]',
    'Out for Delivery': 'bg-[#DDECD1] text-[#4E6A3C]',
    Delivered: 'bg-[#DDECD1] text-[#4E6A3C]',
    Cancelled: 'bg-red-100 text-red-700',
  };
  return <span className={`px-3 py-1 rounded-full text-xs ${map[status] || 'bg-[#EFE4CB] text-[#2B1D11]'}`}>{status}</span>;
};

const OrderSuccess = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const invoiceRef = useRef(null);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then((r) => setOrder(r.data)).catch(() => setOrder(null)).finally(() => setLoading(false));
  }, [orderId]);

  const printInvoice = () => {
    window.print();
  };

  if (loading) return <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center text-[#7A6A55]">Loading…</div>;
  if (!order) return (
    <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center">
      <div className="text-center"><p className="text-[#2B1D11] mb-4">Order not found.</p><Link to="/" className="text-[#C96C1B]">← Home</Link></div>
    </div>
  );

  const placedAt = order.created_at ? new Date(order.created_at).toLocaleString('en-IN') : '';

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-14">
        <div className="text-center mb-10 print:hidden">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#DDECD1] text-[#4E6A3C] mb-4">
            <Check size={32} />
          </div>
          <h1 className="font-serif text-4xl text-[#2B1D11] mb-2">Thank you for your order!</h1>
          <p className="text-[#7A6A55]">A confirmation has been recorded. You can view your invoice below.</p>
        </div>

        <div ref={invoiceRef} className="bg-white border border-[#E4D9C1] rounded-2xl p-10 print:border-0 print:shadow-none">
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-8">
            <div>
              <div className="font-serif text-3xl text-[#2B1D11]">Retro Farms</div>
              <div className="text-xs text-[#7A6A55]">MOVE TO ROOTS · EST. 6 ACRES</div>
              <div className="text-xs text-[#7A6A55] mt-2">Kondapur Village, Ghatkesar, Hyderabad — 501301</div>
              <div className="text-xs text-[#7A6A55]">retrofarms2024@gmail.com · +91 80195 92049</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#7A6A55] uppercase tracking-widest">Invoice</div>
              <div className="font-serif text-xl text-[#2B1D11]">#{order.order_id}</div>
              <div className="text-xs text-[#7A6A55]">{placedAt}</div>
              <div className="mt-3"><StatusPill status={order.status} /></div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-xs text-[#7A6A55] uppercase tracking-widest mb-2">Billed to</div>
              <div className="text-[#2B1D11] font-medium">{order.customer_name || order.address?.full_name}</div>
              <div className="text-sm text-[#4B3826]">{order.customer_email}</div>
              <div className="text-sm text-[#4B3826]">{order.address?.phone}</div>
            </div>
            <div>
              <div className="text-xs text-[#7A6A55] uppercase tracking-widest mb-2">Ship to</div>
              <div className="text-sm text-[#4B3826]">
                {order.address?.line1}{order.address?.line2 ? `, ${order.address.line2}` : ''}<br />
                {order.address?.city} — {order.address?.pincode}
                {order.address?.landmark ? <><br />Landmark: {order.address.landmark}</> : null}
              </div>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="text-left text-xs text-[#7A6A55] uppercase tracking-widest border-b border-[#E4D9C1]">
                <th className="py-3">Item</th>
                <th className="py-3">Variant</th>
                <th className="py-3 text-right">Qty</th>
                <th className="py-3 text-right">Price</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((i, idx) => (
                <tr key={idx} className="border-b border-[#EFE4CB]">
                  <td className="py-3 text-[#2B1D11]">{i.name}</td>
                  <td className="py-3 text-[#4B3826]">{i.variant_label}</td>
                  <td className="py-3 text-right text-[#4B3826]">{i.qty}</td>
                  <td className="py-3 text-right text-[#4B3826]">₹{i.price}</td>
                  <td className="py-3 text-right text-[#2B1D11]">₹{i.price * i.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto max-w-xs">
            <div className="flex justify-between text-[#4B3826] py-1"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
            <div className="flex justify-between text-[#4B3826] py-1"><span>Delivery</span><span>{order.delivery_charge ? `₹${order.delivery_charge}` : 'Free'}</span></div>
            <div className="h-px bg-[#E4D9C1] my-2" />
            <div className="flex justify-between font-serif text-xl text-[#2B1D11]"><span>Total</span><span>₹{order.total}</span></div>
            <div className="text-xs text-[#7A6A55] mt-2 text-right">
              Payment: {order.payment_method?.toUpperCase()} · {order.payment_status}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mt-8 print:hidden">
          <button onClick={printInvoice} className="inline-flex items-center gap-2 bg-[#2B1D11] hover:bg-[#3A2818] text-[#F7F1E5] px-6 py-3 rounded-full">
            <Download size={16} /> Download / Print invoice
          </button>
          <Link to="/my-orders" className="inline-flex items-center gap-2 border border-[#E4D9C1] hover:border-[#2B1D11] text-[#2B1D11] px-6 py-3 rounded-full">
            View all orders
          </Link>
          <Link to="/shop" className="inline-flex items-center gap-2 text-[#7A6A55] px-4 py-3 hover:text-[#2B1D11]">
            <ArrowLeft size={16} /> Continue shopping
          </Link>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          header, footer, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default OrderSuccess;
