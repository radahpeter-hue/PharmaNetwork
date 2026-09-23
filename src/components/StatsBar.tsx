import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const StatsBar: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [targetStats, setTargetStats] = useState({
    registeredPharmacists: 0,
    pharmacyOwners: 0,
    auxiliaryProfessionals: 0,
    manufacturersDistributors: 0,
    activeOpportunities: 0
  });
  const [displayStats, setDisplayStats] = useState({
    registeredPharmacists: 0,
    pharmacyOwners: 0,
    auxiliaryProfessionals: 0,
    manufacturersDistributors: 0,
    activeOpportunities: 0
  });

  useEffect(() => {
    let active = true;
    async function fetchStats() {
      try {
        const docSnap = await getDoc(doc(db, 'platformStats', 'counts'));
        if (docSnap.exists() && active) {
          const data = docSnap.data();
          const parsed = {
            registeredPharmacists: Number(data.registeredPharmacists || 0),
            pharmacyOwners: Number(data.pharmacyOwners || 0),
            auxiliaryProfessionals: Number(data.auxiliaryProfessionals || 0),
            manufacturersDistributors: Number(data.manufacturersDistributors || 0),
            activeOpportunities: Number(data.activeOpportunities || 0)
          };
          setTargetStats(parsed);
          
          // Animate counting up from 0 to actual value over 1.5 seconds
          const startTime = performance.now();
          const duration = 1500; // 1.5s

          function step(now: number) {
            if (!active) return;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Elegant easeOutQuad
            const ease = 1 - (1 - progress) * (1 - progress);

            setDisplayStats({
              registeredPharmacists: Math.floor(parsed.registeredPharmacists * ease),
              pharmacyOwners: Math.floor(parsed.pharmacyOwners * ease),
              auxiliaryProfessionals: Math.floor(parsed.auxiliaryProfessionals * ease),
              manufacturersDistributors: Math.floor(parsed.manufacturersDistributors * ease),
              activeOpportunities: Math.floor(parsed.activeOpportunities * ease),
            });

            if (progress < 1) {
              requestAnimationFrame(step);
            }
          }
          requestAnimationFrame(step);
        } else if (active) {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchStats();
    return () => {
      active = false;
    };
  }, []);

  const statLabels: Record<keyof typeof displayStats, string> = {
    'registeredPharmacists': 'Registered Pharmacists',
    'pharmacyOwners': 'Pharmacy Owners',
    'auxiliaryProfessionals': 'Auxiliary Professionals',
    'manufacturersDistributors': 'Manufacturers & Distributors',
    'activeOpportunities': 'Active Opportunities'
  };

  const getStatDisplay = (key: keyof typeof displayStats) => {
    if (loading) return '...';
    if (error) return 'Growing daily';
    const target = targetStats[key];
    if (target === 0) return 'Growing daily';
    return displayStats[key].toLocaleString();
  };

  return (
    <div className="bg-primary py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
          {(Object.keys(statLabels) as (keyof typeof displayStats)[]).map((key) => {
            const label = statLabels[key];
            const displayValue = getStatDisplay(key);
            
            return (
              <div key={key} className="flex flex-col items-center text-center group">
                <span className={`font-bold text-white mb-2 tracking-tighter ${displayValue === 'Growing daily' ? 'text-lg sm:text-xl lg:text-2xl font-light whitespace-normal min-h-[40px] flex items-center justify-center' : 'text-4xl lg:text-5xl'}`}>
                  {displayValue}
                </span>
                <span className="text-primary-light brightness-150 text-xs font-semibold uppercase tracking-widest text-center mt-auto">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
