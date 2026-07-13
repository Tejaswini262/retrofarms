import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

const Footer = () => (
  <footer className="bg-[#2B1D11] text-[#F7F1E5]">
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20">
      <div className="text-[#F0B849] tracking-[0.3em] text-xs mb-4">ORDER THROUGH</div>
      <h2 className="font-serif text-4xl lg:text-5xl mb-14">Get in touch with the farm.</h2>

      <div className="grid md:grid-cols-3 gap-6">
        <a
          href="tel:+918019592049"
          className="bg-[#3A2818] hover:bg-[#432E1D] transition-colors rounded-2xl p-8 min-h-[240px] flex flex-col"
        >
          <Phone size={26} className="text-[#F0B849] mb-6" strokeWidth={1.6} />
          <h3 className="font-serif text-2xl mb-2">Call us</h3>
          <div className="text-[#D9CBAF]">+91 80195 92049</div>
        </a>
        <a
          href="mailto:retrofarms2024@gmail.com"
          className="bg-[#3A2818] hover:bg-[#432E1D] transition-colors rounded-2xl p-8 min-h-[240px] flex flex-col"
        >
          <Mail size={26} className="text-[#F0B849] mb-6" strokeWidth={1.6} />
          <h3 className="font-serif text-2xl mb-2">Email</h3>
          <div className="text-[#D9CBAF]">retrofarms2024@gmail.com</div>
        </a>
        <div className="bg-[#3A2818] rounded-2xl p-8 min-h-[240px] flex flex-col">
          <MapPin size={26} className="text-[#F0B849] mb-6" strokeWidth={1.6} />
          <h3 className="font-serif text-2xl mb-2">Visit the farm</h3>
          <div className="text-[#D9CBAF] leading-relaxed">
            Retro Farms<br />
            Near Carmel Campus,<br />
            Kondapur Village, Ghatkesar,<br />
            Hyderabad — 501301
          </div>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-[#463322] flex flex-col md:flex-row justify-between gap-4 text-sm text-[#A08F76]">
        <div>© {new Date().getFullYear()} Retro Farms. Grown honestly.</div>
        <div className="flex gap-6">
          <span>Free-range · Antibiotic-free · Farm-fresh</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
