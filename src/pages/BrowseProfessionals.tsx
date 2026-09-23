import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Button } from '../components/Button';
import { PHARMA_CADRES, UGANDA_DISTRICTS } from '../constants';
import { 
  Search, 
  MapPin, 
  Award, 
  ChevronRight, 
  MessageSquare, 
  User as UserIcon, 
  Filter, 
  X, 
  CheckCircle2, 
  Eye, 
  Plus, 
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ConversationView } from '../components/ConversationView';

interface Professional {
  id: string; // docId / userId
  fullName: string;
  district: string;
  primaryCadre: string;
  registrationNumber?: string;
  qualification?: string;
  yearsExperience?: number | string;
  bio?: string;
  profilePhotoUrl?: string;
  availabilityStatus?: 'actively_seeking' | 'open_to_offers' | 'not_available';
  totalProfileViews?: number;
  phone?: string;
  areasOfPractice?: string[];
  roles?: string[];
  credentialVerificationStatus?: 'unverified' | 'pending_review' | 'verified' | 'rejected';
  practisingLicenceStatus?: 'not_renewed' | 'renewed_current' | 'suspended' | 'lapsed';
  practisingLicenceYear?: number;
  profileCompleteness?: number;
  isDirectoryVisible?: boolean;
}

const BrowseProfessionals: React.FC = () => {
  const { user, userAccount } = useAuth();
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedCadre, setSelectedCadre] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState<'All' | 'actively_seeking' | 'open_to_offers'>('All');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'licensed'>('all');

  // Slide-over messaging drawer state
  const [activeChatRecipient, setActiveChatRecipient] = useState<Professional | null>(null);

  useEffect(() => {
    const fetchProfessionals = async () => {
      setLoading(true);
      try {
        const professionalsQuery = query(
          collection(db, 'individualProfiles'),
          where('isDirectoryVisible', '==', true),
          where('profileCompleteness', '>=', 60)
        );
        const querySnap = await getDocs(professionalsQuery);
        const list: Professional[] = [];
        querySnap.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...docSnap.data()
          } as Professional);
        });
        setProfessionals(list);
      } catch (err) {
        console.error("Error fetching professionals:", err);
        handleFirestoreError(err, OperationType.LIST, 'individualProfiles');
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, []);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDistrict('All');
    setSelectedCadre('All');
    setSelectedAvailability('All');
    setVerificationFilter('all');
  };

  const hasActiveFilters = 
    searchQuery !== '' || 
    selectedDistrict !== 'All' || 
    selectedCadre !== 'All' || 
    selectedAvailability !== 'All' ||
    verificationFilter !== 'all';

  // Apply filters client-side
  const filteredProfessionals = professionals.filter((prof) => {
    // Search matching name, bio, qualification, registration
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = (prof.fullName || '').toLowerCase().includes(q);
      const bioMatch = (prof.bio || '').toLowerCase().includes(q);
      const qualMatch = (prof.qualification || '').toLowerCase().includes(q);
      const regMatch = (prof.registrationNumber || '').toLowerCase().includes(q);
      if (!nameMatch && !bioMatch && !qualMatch && !regMatch) {
        return false;
      }
    }

    // District matching
    if (selectedDistrict !== 'All' && prof.district !== selectedDistrict) {
      return false;
    }

    // Cadre matching
    if (selectedCadre !== 'All') {
      const profCadre = (prof.primaryCadre || '').toLowerCase().replace(/_/g, ' ');
      const targetCadre = selectedCadre.toLowerCase().replace(/_/g, ' ');
      if (!profCadre.includes(targetCadre) && !targetCadre.includes(profCadre)) {
        return false;
      }
    }

    // Availability status
    if (selectedAvailability !== 'All' && prof.availabilityStatus !== selectedAvailability) {
      return false;
    }

    // Verification and practice license status (Part 10)
    if (verificationFilter === 'verified' && prof.credentialVerificationStatus !== 'verified') {
      return false;
    }

    if (verificationFilter === 'licensed' && prof.practisingLicenceStatus !== 'renewed_current') {
      return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-zinc-950 tracking-tight">Healthcare Professionals</h1>
          <p className="text-zinc-500 mt-2">Connect with active, verified professionals across Uganda's pharmaceutical and health-professions network.</p>
        </div>

        {userAccount?.accountType === 'individual' && (
          <Link to="/profile">
            <Button className="gap-2 font-bold">
              Update My Profile
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-start">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1 space-y-8 bg-white p-6 rounded-3xl border border-zinc-150 shadow-sm sticky top-24">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-2">
            <h3 className="font-extrabold text-zinc-900 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Filter size={16} />
              Refine Search
            </h3>
            {hasActiveFilters && (
              <button 
                onClick={handleClearFilters}
                className="text-[10px] font-black uppercase text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
              >
                Clear
                <X size={12} />
              </button>
            )}
          </div>

          <div className="space-y-5">
            {/* Search Input */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Free Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name, bio, specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Search className="absolute left-3.5 top-3.5 text-zinc-400" size={16} />
              </div>
            </div>

            {/* Cadre Filter */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Professional Cadre</label>
              <select
                value={selectedCadre}
                onChange={(e) => setSelectedCadre(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="All">All Cadres</option>
                {PHARMA_CADRES.map((cadre) => (
                  <option key={cadre} value={cadre}>{cadre}</option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">District / Region</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="All">All Districts</option>
                {UGANDA_DISTRICTS.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Professional Availability</label>
              <select
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value as 'All' | 'actively_seeking' | 'open_to_offers')}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="All">Any Availability</option>
                <option value="actively_seeking">Actively Seeking</option>
                <option value="open_to_offers">Open to Offers</option>
              </select>
            </div>

            {/* Verification Status Filter (Part 10) */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Verification Status</label>
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value as 'all' | 'verified' | 'licensed')}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-zinc-750 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-[10px] uppercase tracking-wide"
              >
                <option value="all">Show All Candidates</option>
                <option value="verified">Verified Professionals Only</option>
                <option value="licensed">Active License Only (Current Year)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results layout */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4 text-sm text-zinc-500 font-medium">
            <span className="bg-primary/5 text-primary-light ring-1 ring-primary/10 px-3 py-1 rounded-full text-xs font-bold">
              Found {filteredProfessionals.length} Professionals
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 grayscale opacity-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Filtering candidates...</p>
            </div>
          ) : filteredProfessionals.length === 0 ? (
            <div className="py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-150 text-center flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-zinc-200 mb-6 shadow-sm border border-zinc-100">
                <UserIcon size={32} />
              </div>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-2 font-bold">No professionals match your query.</p>
              <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">Try adjusting or clearing your filters for alternate candidates.</p>
              {hasActiveFilters && (
                <Button onClick={handleClearFilters} size="sm" variant="outline">Clear Filter Criteria</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredProfessionals.map((prof) => (
                  <motion.div
                    key={prof.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-6 rounded-3xl border border-zinc-150 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header Card */}
                      <div className="flex gap-4 items-start mb-5">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors text-primary group-hover:text-white font-extrabold text-xl uppercase overflow-hidden">
                          {prof.profilePhotoUrl ? (
                            <img src={prof.profilePhotoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            prof.fullName?.[0] || 'U'
                          )}
                        </div>

                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="font-black text-zinc-900 leading-snug text-base tracking-tight hover:underline cursor-pointer" onClick={() => navigate(`/professionals/${prof.id}`)}>
                              {prof.fullName}
                            </span>
                            {prof.credentialVerificationStatus === 'verified' && (
                              <span className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs" title="Verified Professional Credentials">
                                <CheckCircle2 size={10} className="fill-white text-indigo-600" />
                                Verified Pro
                              </span>
                            )}
                            {prof.availabilityStatus === 'actively_seeking' && (
                              <span className="relative flex h-2 w-2 rounded-full bg-green-500" title="Looking for opportunities">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                            <MapPin size={12} />
                            <span>{prof.district || 'Anywhere, Uganda'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Display Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {prof.primaryCadre && (
                          <span className="bg-primary/5 text-primary-light text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-primary/10 uppercase">
                            {prof.primaryCadre.replace(/_/g, ' ')}
                          </span>
                        )}
                        {prof.yearsExperience ? (
                          <span className="bg-zinc-50 text-zinc-650 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-zinc-205">
                            {prof.yearsExperience} Years Exp
                          </span>
                        ) : null}
                      </div>

                      {prof.bio ? (
                        <p className="text-zinc-500 text-xs font-semibold line-clamp-3 leading-relaxed mb-6 italic">
                          "{prof.bio}"
                        </p>
                      ) : (
                        <p className="text-zinc-400/80 text-xs font-semibold line-clamp-3 leading-relaxed mb-6 pb-2">
                          No descriptive biography listed on public profile page. Click to view credentials.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-5 border-t border-zinc-50 mt-auto">
                      <div className="text-xs text-zinc-400 flex items-center gap-1 font-bold">
                        <Eye size={12} className="text-zinc-300" />
                        <span>{prof.totalProfileViews || 0} views</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {user && user.uid !== prof.id && (
                          <button
                            onClick={() => setActiveChatRecipient(prof)}
                            className="p-2 sm:px-3 sm:py-2 bg-primary/5 hover:bg-primary hover:text-white text-primary transition-all rounded-xl text-xs font-bold flex items-center gap-1"
                            title="Direct Message Candidate"
                          >
                            <MessageSquare size={14} />
                            <span className="hidden sm:inline">Message</span>
                          </button>
                        )}
                        <Link to={`/professionals/${prof.id}`}>
                          <button className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 rounded-xl transition-all shadow-xs border border-zinc-100 cursor-pointer">
                            <ChevronRight size={16} />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Floating active chat window */}
      <AnimatePresence>
        {activeChatRecipient && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-xs"
              onClick={() => setActiveChatRecipient(null)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <ConversationView
                recipientUid={activeChatRecipient.id}
                recipientName={activeChatRecipient.fullName}
                recipientPhotoUrl={activeChatRecipient.profilePhotoUrl || undefined}
                onClose={() => setActiveChatRecipient(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BrowseProfessionals;
