import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-primary text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-primary font-bold text-xl">P</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-white text-xl tracking-tight">PharmaNetwork</span>
                <span className="text-primary-light brightness-150 text-xs font-semibold uppercase tracking-widest">Uganda</span>
              </div>
            </Link>
            <p className="text-primary-light brightness-125 text-sm leading-relaxed max-w-xs">
              Uganda's Pharmaceutical Community, Connected. Building the future of healthcare supply chain.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-lg mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-primary-light brightness-125">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/browse" className="hover:text-white transition-colors">Browse Professionals</Link></li>
              <li><Link to="/jobs" className="hover:text-white transition-colors">Job Board</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-primary-light brightness-125">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Stay Connected</h4>
            <p className="text-sm text-primary-light brightness-125 mb-4">
              Join our community on professional networks.
            </p>
            <div className="flex gap-4">
              {/* Placeholders for social icons */}
              <div className="w-10 h-10 rounded-full bg-primary-light/30 flex items-center justify-center hover:bg-primary-light/50 cursor-pointer transition-colors shadow-inner">
                <span className="text-[10px] font-bold">IN</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-light/30 flex items-center justify-center hover:bg-primary-light/50 cursor-pointer transition-colors shadow-inner">
                <span className="text-[10px] font-bold">WA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-light/20 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center text-sm text-primary-light brightness-110">
          <p>© PharmaNetwork Uganda 2025. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Built by a pharmacist with a vision.</p>
        </div>
      </div>
    </footer>
  );
};
