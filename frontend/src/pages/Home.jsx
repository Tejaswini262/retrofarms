import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { ArrowRight, Sprout, Leaf, Truck, Egg } from 'lucide-react';

const Home = () => {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    api.get('/products').then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const featured = products.slice(0, 4);
  const cats = [
    { id: 'eggs', label: 'Country Eggs' },
    { id: 'chicken', label: 'Country Chicken' },
    { id: 'fruits', label: 'Farm Fruits' },
    { id: 'vegetables', label: 'Fresh Vegetables' },
  ];

  return (
    <div className="bg-[#F7F1E5]">
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <img src="https://images.unsplash.com/photo-1508930993032-fbbaf4f2821a?auto=format&fit=crop&w=2000&q=80" alt="farm" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#F7F1E5]/85 via-[#F7F1E5]/60 to-transparent" />
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-24">
          <div className="max-w-2xl fade-up">
            <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-6">A 6-ACRE FREE-RANGE FAMILY FARM</div>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-[#2B1D11] leading-[1.05] mb-8">Honest food,<br />grown the old way.</h1>
            <p className="text-lg text-[#4B3826] leading-relaxed max-w-xl mb-10">
              Country eggs, pasture-raised chicken, sun-ripened mangoes, guavas & seasonal vegetables — delivered from our farm to your kitchen.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/shop" className="inline-flex items-center gap-2 bg-[#2B1D11] hover:bg-[#3A2818] text-[#F7F1E5] px-8 py-4 rounded-full transition-colors">
                Shop the Farm <ArrowRight size={17} />
              </Link>
              <Link to="/about" className="inline-flex items-center gap-2 border border-[#2B1D11]/30 hover:border-[#2B1D11] text-[#2B1D11] px-8 py-4 rounded-full transition-colors">Our Story</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#EFE4CB] border-y border-[#E4D9C1]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Sprout, t: 'Pesticide-free', s: 'Naturally grown' },
            { icon: Leaf, t: 'Antibiotic-free', s: 'Ethically raised' },
            { icon: Egg, t: 'Free-range hens', s: 'Roaming happily' },
            { icon: Truck, t: 'Farm-fresh delivery', s: 'Harvested to order' },
          ].map(({ icon: Icon, t, s }) => (
            <div key={t} className="flex items-start gap-4">
              <Icon size={28} className="text-[#4E6A3C] mt-1" strokeWidth={1.5} />
              <div>
                <div className="font-serif text-lg text-[#2B1D11]">{t}</div>
                <div className="text-sm text-[#7A6A55]">{s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-14">
            <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3">WHAT WE GROW</div>
            <h2 className="font-serif text-4xl md:text-5xl text-[#2B1D11] max-w-2xl mx-auto leading-tight">Four categories, one honest promise.</h2>
            <Link to="/shop" className="inline-block mt-6 text-[#C96C1B] hover:text-[#A85512] transition-colors">View entire shop →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {cats.map((c, i) => (
              <Link key={c.id} to={`/shop?cat=${c.id}`} className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover-lift border border-[#E4D9C1] fade-up delay-${i + 1}`}>
                <div className="aspect-[4/5] overflow-hidden bg-[#EFE4CB]">
                  <img src={products.find((p) => p.category === c.id)?.image} alt={c.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <div className="font-serif text-xl text-[#2B1D11]">{c.label}</div>
                  <div className="text-sm text-[#C96C1B] mt-1 group-hover:translate-x-1 transition-transform">Browse →</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#EFE4CB] py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-4">OUR FARM</div>
            <h2 className="font-serif text-4xl md:text-5xl text-[#2B1D11] leading-tight mb-6">Six acres.<br />Countless little miracles.</h2>
            <p className="text-lg text-[#4B3826] leading-relaxed mb-6">
              We lease six acres of red earth where our country hens roam under mango, guava, sapota, papaya and moringa trees. Everything you see on our shop grew here — season by season, patiently.
            </p>
            <Link to="/about" className="inline-flex items-center gap-2 text-[#2B1D11] border-b border-[#2B1D11] pb-1 hover:text-[#C96C1B] hover:border-[#C96C1B] transition-colors">
              Read our story <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="https://images.unsplash.com/photo-1535275226173-7ee8b465f0c1?auto=format&fit=crop&w=1200&q=80" alt="chickens" className="rounded-2xl aspect-[3/4] object-cover w-full" />
            <img src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80" alt="orchard" className="rounded-2xl aspect-[3/4] object-cover w-full mt-10" />
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-14">
            <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3">THIS WEEK'S HARVEST</div>
            <h2 className="font-serif text-4xl md:text-5xl text-[#2B1D11]">Freshly picked, ready to order</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((p, i) => (
              <Link key={p.slug} to={`/product/${p.slug}`} className={`group bg-white rounded-2xl overflow-hidden border border-[#E4D9C1] shadow-sm hover-lift card-shine fade-up delay-${i + 1}`}>
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
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
