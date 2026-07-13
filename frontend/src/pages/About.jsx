import React from 'react';

const About = () => (
  <div className="bg-[#F7F1E5] min-h-screen">
    <section className="max-w-[1200px] mx-auto px-6 lg:px-10 py-20">
      <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-4">ABOUT US</div>
      <h1 className="font-serif text-5xl md:text-6xl text-[#2B1D11] leading-tight mb-10">
        Where tradition meets<br />sustainability.
      </h1>
      <div className="grid md:grid-cols-2 gap-12 mb-20">
        <div className="space-y-6 text-[#4B3826] leading-relaxed">
          <p>
            Retro Farms is a proud, family-owned farm dedicated to raising country hens in a free-range environment. Our hens roam freely across the farm — healthy, stress-free and raised as nature intended. The result is the finest quality eggs and poultry, rich in flavor and nutrients.
          </p>
          <p>
            At Retro Farms, we believe in <strong>ethical farming</strong> and maintain the highest standards of care for our animals. Our free-range hens produce eggs that are not only fresh but packed with wholesome goodness — delivered directly from our fields to your table.
          </p>
          <p>
            Focused on quality and transparency, our goal is to connect you to the <em>roots of sustainable farming</em>. Experience the taste of tradition — where natural, free-range farming is at the heart of everything we do.
          </p>
        </div>
        <div>
          <img
            src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80"
            alt="orchard"
            className="rounded-2xl aspect-[4/5] object-cover w-full"
          />
        </div>
      </div>

      <div className="bg-[#EFE4CB] rounded-3xl p-10 md:p-16 mb-20">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-4">ABOUT OUR FARM</div>
        <p className="text-lg md:text-xl text-[#2B1D11] leading-relaxed max-w-4xl font-serif">
          We proudly operate on a sprawling <strong>6-acre farm</strong> nestled in rich red soil, surrounded by lush <strong>guava and mango orchards</strong>. Our free-range country hens are raised in this serene environment with ample space to roam — resulting in healthier birds and higher-quality eggs and poultry.
        </p>
      </div>

      <div className="mb-20">
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-4">WHY FREE-RANGE?</div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#2B1D11] mb-10">
          Five reasons to eat free-range food.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {['Good for health', 'Rich in antioxidants', 'Antibiotic-resistant', 'Better taste', 'Rich in vitamin D'].map((r) => (
            <div
              key={r}
              className="bg-white rounded-xl p-6 border border-[#E4D9C1] font-serif text-[#2B1D11]"
            >
              {r}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[#C96C1B] tracking-[0.3em] text-xs mb-4">PRODUCTS WE DELIVER</div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#2B1D11] mb-10">
          Straight from the farm to your kitchen.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {['Country Eggs', 'Country Chicken', 'Premium Mutton', 'Non-veg & Veg Pickles', 'Cold-Pressed Oils'].map((r) => (
            <div
              key={r}
              className="bg-[#EFE4CB] rounded-xl p-6 border border-[#E4D9C1] font-serif text-[#2B1D11]"
            >
              {r}
            </div>
          ))}
        </div>
        <p className="text-sm text-[#7A6A55]">
          Free Home Delivery Available · Premium quality mutton also available
        </p>
      </div>
    </section>
  </div>
);

export default About;
