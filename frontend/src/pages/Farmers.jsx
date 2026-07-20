import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const Farmers = () => {
  const [farmers, setFarmers] = useState([]);
  useEffect(() => {
    api.get('/farmers').then((r) => setFarmers(r.data)).catch(() => setFarmers([]));
  }, []);

  return (
    <div className="bg-[#F7F1E5] min-h-screen">
      <section className="max-w-[1200px] mx-auto px-6 lg:px-10 py-20">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-4">THE HANDS BEHIND THE HARVEST</div>
        <h1 className="font-serif text-5xl md:text-6xl text-[#2B1D11] leading-tight mb-6">
          Meet our farmers.
        </h1>
        <p className="text-lg text-[#4B3826] max-w-2xl leading-relaxed mb-16">
          Retro Farms is run by scientists-turned-farmers who bring a lab-honed obsession for quality to every egg, every bird and every harvest.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {farmers.map((f) => (
            <div key={f.farmer_id || f.name} className="group bg-white rounded-2xl overflow-hidden border border-[#E4D9C1] shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="aspect-[4/5] overflow-hidden bg-[#EFE4CB] relative">
                {f.photo ? (
                  <img src={f.photo} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-serif text-6xl text-[#C4A97F]">
                    {(f.name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#2B1D11]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-6">
                <h3 className="font-serif text-2xl text-[#2B1D11] mb-1">{f.name}</h3>
                <div className="text-sm text-[#7A6A55] mb-3">{f.creds}</div>
                <div className="inline-block px-3 py-1 rounded-full bg-[#EFE4CB] text-xs text-[#4E6A3C]">{f.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#EFE4CB] rounded-3xl p-10 md:p-16">
          <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-3">FEED & CARE</div>
          <h2 className="font-serif text-4xl md:text-5xl text-[#2B1D11] mb-6">What we feed our hens.</h2>
          <p className="text-[#4B3826] leading-relaxed mb-4 max-w-3xl">
            At Retro Farms, our hens' wellbeing is the priority. We carefully hand-mix a wholesome grain diet of <strong>jowar (sorghum), ragi (finger millet), soya and other nutritious millets</strong> — a balanced blend that gives them everything they need to thrive naturally.
          </p>
          <p className="text-[#4B3826] leading-relaxed mb-4 max-w-3xl">
            We enhance their vitality with <strong>garlic and turmeric-infused water</strong> at regular intervals — a traditional natural remedy that boosts immunity without a single antibiotic or synthetic supplement.
          </p>
          <p className="text-[#4B3826] leading-relaxed mb-10 max-w-3xl">
            The result: happy, hardy birds and eggs that taste the way eggs used to taste.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { t: 'Grain mix', s: 'Jowar, ragi, soya + millets' },
              { t: 'Turmeric water', s: 'Natural immunity boost' },
              { t: 'Garlic-infused', s: 'Old-school wellness' },
              { t: 'Free-range days', s: 'Roam all day, every day' },
            ].map((i) => (
              <div key={i.t} className="bg-white rounded-xl p-5 border border-[#E4D9C1] hover:border-[#4E6A3C] transition-colors">
                <div className="font-serif text-lg text-[#2B1D11]">{i.t}</div>
                <div className="text-sm text-[#7A6A55] mt-1">{i.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Farmers;
