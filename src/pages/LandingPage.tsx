import React from 'react';
import { StatsBar } from '../components/StatsBar';
import { Button } from '../components/Button';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, 
  Stethoscope, 
  Building2, 
  Truck, 
  ShieldCheck, 
  Network, 
  CheckCircle2, 
  ArrowRight,
  ClipboardCheck,
  Globe,
  Briefcase
} from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center bg-white overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full animate-pulse-gentle">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill="#1B5E20" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
          </div>
          {/* Connecting lines simulation with decorative elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="w-[800px] h-[800px] border border-primary/20 rounded-full animate-spin-slow opacity-20"></div>
             <div className="absolute w-[600px] h-[600px] border border-primary/20 rounded-full animate-spin-reverse-slow opacity-10"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-3xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl lg:text-7xl font-bold text-primary mb-6 tracking-tight leading-[1.1]"
            >
              Uganda's Pharmaceutical Community, <span className="text-accent underline decoration-4 underline-offset-8">Connected.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg lg:text-xl text-zinc-600 mb-10 leading-relaxed max-w-2xl"
            >
              Find qualified pharmacy professionals. Discover suppliers. Build your network across the entire supply chain.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 mb-6"
            >
              <Link to="/register?type=individual">
                <Button size="lg" className="w-full sm:w-auto">Join as a Professional</Button>
              </Link>
              <Link to="/register?type=organisation">
                <Button size="lg" variant="accent" className="w-full sm:w-auto">Register Your Organisation</Button>
              </Link>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-zinc-400 text-sm italic"
            >
              Free to join. Trusted by pharmacy professionals across Uganda.
            </motion.p>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <StatsBar />

      {/* PROBLEM SECTION */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-zinc-900 mb-16 text-center">Finding the right person should not take months.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-6">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Building2 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-primary">For Pharmacy Owners</h3>
              <p className="text-zinc-600 leading-relaxed">
                Legally, every licensed pharmacy needs a supervising pharmacist. But finding one is slow and inefficient, often leading to compliance risks and operational delays.
              </p>
              <ul className="space-y-3 pt-4">
                {['Direct access to verified cadres', 'Simplified recruitment', 'Secure compliance'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                    <CheckCircle2 size={18} className="text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-10 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-6">
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900">For Professionals</h3>
              <p className="text-zinc-600 leading-relaxed">
                Qualified pharmaceutical professionals deserve better visibility than unstructured WhatsApp groups. Showcase your credentials to the right employers and distributors.
              </p>
              <ul className="space-y-3 pt-4">
                {['Professional profile hosting', 'Direct link to top pharmacies', 'Career growth opportunities'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                    <CheckCircle2 size={18} className="text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: '1', title: 'Create your profile', desc: 'Sign up and showcase your professional qualifications or business details.', icon: Globe },
              { step: '2', title: 'Connect with the right people', desc: 'Directly interact with pharmacy owners, distributors, and manufacturers.', icon: Network },
              { step: '3', title: 'Build Uganda\'s future', desc: 'Secure the supply chain and ensure every Ugandan has access to quality care.', icon: Stethoscope },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 mb-8 relative">
                   <item.icon size={32} />
                   <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full border-4 border-white flex items-center justify-center text-xs font-bold text-primary">
                     {item.step}
                   </div>
                </div>
                <h4 className="text-xl font-bold mb-4">{item.title}</h4>
                <p className="text-zinc-500 leading-relaxed max-w-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IS IT FOR */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-zinc-900 mb-4">Who is it for?</h2>
            <p className="text-zinc-600 max-w-2xl mx-auto">Connecting every node in the pharmaceutical value chain.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Stethoscope, title: 'Registered Pharmacists', desc: 'Licensed professionals seeking supervising or clinical roles.' },
              { icon: Building2, title: 'Pharmacy Owners', desc: 'Business owners needing qualified staff and reliable suppliers.' },
              { icon: Users, title: 'Assistants & Technicians', desc: 'Skilled auxiliary staff looking for career opportunities.' },
              { icon: Truck, title: 'Importers & Distributors', desc: 'Companies looking to expand their retail network.' },
              { icon: ShieldCheck, title: 'Manufacturers', desc: 'Local and international producers of quality medicines.' },
              { icon: Briefcase, title: 'Drug Shop Owners', desc: 'Small-scale retailers growing their pharmaceutical impact.' }
            ].map((card) => (
              <div key={card.title} className="bg-white p-8 rounded-xl border border-zinc-200 hover:border-primary/30 transition-colors shadow-sm">
                <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center text-primary mb-6">
                  <card.icon size={24} />
                </div>
                <h5 className="text-lg font-bold mb-2">{card.title}</h5>
                <p className="text-sm text-zinc-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REGULATORY SECTION */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-3xl p-10 lg:p-20 text-white relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm border border-white/10">
                <ShieldCheck size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Compliance First</span>
              </div>
              <h2 className="text-3xl lg:text-5xl font-bold mb-8 leading-tight">Built for the new era of Ugandan pharmacy regulation.</h2>
              <p className="text-lg lg:text-xl text-primary-light brightness-150 leading-relaxed mb-10">
                The incoming National Drug and Health Products Authority Bill 2025 strengthens requirements for licensed supervision across all pharmacy tiers. PharmaNetwork Uganda helps owners meet those requirements and helps qualified professionals step into those roles.
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                       <CheckCircle2 size={20} className="text-accent" />
                    </div>
                    <div>
                       <p className="font-bold">Verified Credentials</p>
                       <p className="text-sm text-white/60">Automated verification checks</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                       <CheckCircle2 size={20} className="text-accent" />
                    </div>
                    <div>
                       <p className="font-bold">Real-time Updates</p>
                       <p className="text-sm text-white/60">Stay current with NDA guidelines</p>
                    </div>
                 </div>
              </div>
            </div>
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-light/20 to-transparent opacity-50"></div>
            <div className="absolute bottom-0 right-0 p-10 opacity-10">
               <ShieldCheck size={400} />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-zinc-50 border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <h2 className="text-4xl lg:text-5xl font-bold mb-8 tracking-tight">The pharmaceutical supply chain runs on people.</h2>
           <p className="text-xl text-zinc-600 mb-12 max-w-2xl mx-auto">Connect with yours today and be part of the future of Ugandan healthcare.</p>
           <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link to="/register?type=individual">
                <Button size="lg" className="w-full sm:w-auto h-16 px-10">Join as a Professional</Button>
              </Link>
              <Link to="/register?type=organisation">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10">Register My Organisation</Button>
              </Link>
           </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
