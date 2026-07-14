import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Minus, Plus, Check } from 'lucide-react';

const ProductDetail = () => {
  const { slug } = useParams();
  const { addToCart } = useApp();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${slug}`).then((r) => {
      setProduct(r.data);
      setVariantId(r.data.variants[0]?.id);
    }).catch(() => setProduct(null)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center text-[#7A6A55]">Loading…</div>;
  if (!product) return (
    <div className="bg-[#F7F1E5] min-h-screen flex items-center justify-center">
      <div className="text-center"><p className="text-[#2B1D11] mb-4">Product not found.</p><Link to="/shop" className="text-[#C96C1B]">← Back to shop</Link></div>
    </div>
  );

  const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];
  const outOfStock = variant.stock <= 0;

  const handleAdd = () => {
    if (outOfStock) return;
    addToCart(product, variant, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#2B1D11] hover:text-[#C96C1B] transition-colors mb-8">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="grid md:grid-cols-2 gap-14">
          <div className="bg-white rounded-2xl overflow-hidden border border-[#E4D9C1]">
            <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-[#4E6A3C] mb-3">{product.category}</div>
            <h1 className="font-serif text-4xl md:text-5xl text-[#2B1D11] leading-tight mb-6">{product.name}</h1>
            <p className="text-[#4B3826] leading-relaxed mb-8">{product.description}</p>
            <div className="mb-8">
              <div className="text-sm text-[#7A6A55] mb-3">Choose an option</div>
              <div className="space-y-3">
                {product.variants.map((v) => (
                  <button key={v.id} onClick={() => setVariantId(v.id)}
                    className={`w-full text-left px-5 py-4 rounded-xl border transition-colors flex items-center justify-between ${variantId === v.id ? 'border-[#2B1D11] bg-white' : 'border-[#E4D9C1] bg-white/60 hover:border-[#2B1D11]/50'}`}>
                    <div>
                      <div className="text-[#2B1D11] font-medium">{v.label}</div>
                      <div className="text-xs text-[#7A6A55] mt-0.5">{v.stock > 0 ? `${v.stock} in stock` : 'Out of stock'}</div>
                    </div>
                    <div className="text-[#2B1D11] font-serif text-xl">₹{v.price}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1 border border-[#E4D9C1] rounded-full px-2 py-1 bg-white">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center text-[#2B1D11] hover:bg-[#EFE4CB] rounded-full"><Minus size={16} /></button>
                <div className="w-8 text-center text-[#2B1D11]">{qty}</div>
                <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 flex items-center justify-center text-[#2B1D11] hover:bg-[#EFE4CB] rounded-full"><Plus size={16} /></button>
              </div>
              <div className="font-serif text-2xl text-[#2B1D11]">₹{variant.price * qty}</div>
            </div>
            <button onClick={handleAdd} disabled={outOfStock}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#2B1D11] hover:bg-[#3A2818] disabled:opacity-50 text-[#F7F1E5] px-10 py-4 rounded-full transition-colors">
              {outOfStock ? 'Out of stock' : added ? (<><Check size={17} /> Added to cart</>) : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
