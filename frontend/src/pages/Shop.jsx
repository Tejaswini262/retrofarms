import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

const Shop = () => {
  const [params, setParams] = useSearchParams();
  const active = params.get('cat') || 'all';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/products').then((r) => setProducts(r.data)).catch(() => {});
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const items = useMemo(
    () => (active === 'all' ? products : products.filter((p) => p.category === active)),
    [active, products],
  );

  const allCats = [{ id: 'all', label: 'All' }, ...categories];

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-16 pb-10">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-4">THE SHOP</div>
        <h1 className="font-serif text-5xl md:text-6xl text-[#2B1D11] leading-tight mb-10">Straight from our fields.</h1>
        <div className="flex flex-wrap gap-3">
          {allCats.map((c) => (
            <button key={c.id} onClick={() => setParams(c.id === 'all' ? {} : { cat: c.id })}
              className={`px-5 py-2 rounded-full text-sm transition-colors ${active === c.id ? 'bg-[#2B1D11] text-[#F7F1E5]' : 'bg-white border border-[#E4D9C1] text-[#2B1D11] hover:border-[#2B1D11]'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((p) => (
            <Link key={p.slug} to={`/product/${p.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-[#E4D9C1] shadow-sm hover-lift card-shine">
              <div className="aspect-square overflow-hidden bg-[#EFE4CB]">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <div className="text-xs uppercase tracking-widest text-[#4E6A3C] mb-2">{p.category}</div>
                <div className="font-serif text-lg text-[#2B1D11] mb-3">{p.name}</div>
                <div className="flex items-center justify-between">
                  <div className="text-[#4B3826]">From ₹{p.from_price}</div>
                  <div className="text-[#C96C1B] group-hover:translate-x-1 transition-transform">Order →</div>
                </div>
              </div>
            </Link>
          ))}
          {items.length === 0 && <div className="col-span-full text-center py-14 text-[#7A6A55]">No products in this category yet.</div>}
        </div>
      </section>
    </div>
  );
};

export default Shop;
