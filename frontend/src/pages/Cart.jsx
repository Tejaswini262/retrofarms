import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Minus, Plus, Trash2 } from 'lucide-react';

const Cart = () => {
  const { cart, cartSubtotal, deliveryCharge, cartTotal, updateQty, removeFromCart, user } = useApp();
  const navigate = useNavigate();

  if (cart.length === 0) return (
    <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="font-serif text-4xl text-[#2B1D11] mb-4">Your basket is empty.</h1>
        <p className="text-[#7A6A55] mb-8">Nothing picked yet — head to the shop.</p>
        <Link to="/shop" className="inline-flex items-center bg-[#2B1D11] hover:bg-[#3A2818] text-[#F7F1E5] px-8 py-3 rounded-full transition-colors">Shop the farm</Link>
      </div>
    </div>
  );

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-16">
        <h1 className="font-serif text-5xl text-[#2B1D11] mb-10">Your basket</h1>
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((c) => (
              <div key={c.key} className="bg-white border border-[#E4D9C1] rounded-2xl p-4 flex gap-5 items-center">
                <img src={c.image} alt={c.name} className="w-24 h-24 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="font-serif text-lg text-[#2B1D11]">{c.name}</div>
                  <div className="text-sm text-[#7A6A55]">{c.variantLabel}</div>
                  {c.options && (
                    <div className="text-xs text-[#4E6A3C] mt-1 space-y-0.5">
                      {c.options.bird_type && <div>Bird: {c.options.bird_type}</div>}
                      {c.options.piece_size && <div>Cut: {c.options.piece_size}</div>}
                      {c.options.delivery_date && <div>Delivery: {c.options.delivery_date}</div>}
                      {c.options.instructions && <div>Notes: {c.options.instructions}</div>}
                    </div>
                  )}
                  <div className="text-[#4B3826] mt-1">₹{c.price} each</div>
                </div>
                <div className="flex items-center gap-2 border border-[#E4D9C1] rounded-full p-1">
                  <button onClick={() => updateQty(c.key, c.qty - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#EFE4CB] rounded-full text-[#2B1D11]"><Minus size={14} /></button>
                  <div className="w-6 text-center text-[#2B1D11]">{c.qty}</div>
                  <button onClick={() => updateQty(c.key, c.qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#EFE4CB] rounded-full text-[#2B1D11]"><Plus size={14} /></button>
                </div>
                <div className="font-serif text-xl text-[#2B1D11] w-20 text-right">₹{c.price * c.qty}</div>
                <button onClick={() => removeFromCart(c.key)} className="text-[#7A6A55] hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          <div className="bg-white border border-[#E4D9C1] rounded-2xl p-8 h-fit">
            <div className="font-serif text-2xl text-[#2B1D11] mb-6">Order summary</div>
            <div className="flex justify-between text-[#4B3826] mb-3"><span>Subtotal</span><span>₹{cartSubtotal}</span></div>
            <div className="flex justify-between text-[#4B3826] mb-3">
              <span>Delivery</span>
              <span className={deliveryCharge === 0 ? 'text-[#4E6A3C]' : 'text-[#2B1D11]'}>
                {deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`}
              </span>
            </div>
            {deliveryCharge > 0 && (
              <div className="text-xs text-[#C96C1B] mb-3">Add ₹{200 - cartSubtotal} more for free delivery.</div>
            )}
            <div className="h-px bg-[#E4D9C1] my-4" />
            <div className="flex justify-between font-serif text-xl text-[#2B1D11] mb-6"><span>Total</span><span>₹{cartTotal}</span></div>
            <button onClick={() => user ? navigate('/checkout') : navigate('/login')}
              className="w-full bg-[#2B1D11] hover:bg-[#3A2818] text-[#F7F1E5] rounded-full py-3 transition-colors">
              {user ? 'Proceed to checkout' : 'Sign in to checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
