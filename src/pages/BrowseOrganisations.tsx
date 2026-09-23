import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '../components/Button';
import { ORGANISATION_TYPES, UGANDA_DISTRICTS } from '../constants';
import { 
  Search, 
  MapPin, 
  Building, 
  ChevronRight, 
  MessageSquare, 
  Filter, 
  X, 
  ShieldCheck, 
  Plus, 
  Building2,
  Mail,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ConversationView } from '../components/ConversationView';

interface OrgDetail {
  id?: string;
  organisationName: string;
  district: string;
  ndaLicenceNumber?: string;
  organisationTypes?: string[];
  contactPhone?: string;
  branchCount?: number | string;
  isHiring?: boolean;
  about?: string;
}

interface OrganisationProfileDoc {
  id: string; // docId / userId
  organisations?: OrgDetail[];
}

const BrowseOrganisations: React.FC = () => {
  const { user, userAccount } = useAuth();
  const navigate = useNavigate();

  const [organisations, setOrganisations] = useState<OrganisationProfileDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [onlyHiring, setOnlyHiring] = useState(false);

  // messaging state
  const [activeChatRecipient, setActiveChatRecipient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchOrganisations = async () => {
      setLoading(true);
      try {
        const querySnap = await getDocs(collection(db, 'organisationProfiles'));
        const list: OrganisationProfileDoc[] = [];
        querySnap.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...docSnap.data()
          } as OrganisationProfileDoc);
        });
        setOrganisations(list);
      } catch (err) {
        console.error("Error fetching organizations:", err);
        handleFirestoreError(err, OperationType.LIST, 'organisationProfiles');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganisations();
  }, []);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDistrict('All');
    setSelectedType('All');
    setOnlyHiring(false);
  };

  const hasActiveFilters = 
    searchQuery !== '' || 
    selectedDistrict !== 'All' || 
    selectedType !== 'All' || 
    onlyHiring;

  // Filters client-side on the list
  const filteredOrganisations = organisations.filter((orgDoc) => {
    const primaryOrg = orgDoc.organisations?.[0];
    if (!primaryOrg) return false; // Ignore incomplete profiles

    // Search query matching
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = (primaryOrg.organisationName || '').toLowerCase().includes(q);
      const ndaMatch = (primaryOrg.ndaLicenceNumber || '').toLowerCase().includes(q);
      const aboutMatch = (primaryOrg.about || '').toLowerCase().includes(q);
      if (!nameMatch && !ndaMatch && !aboutMatch) {
        return false;
      }
    }

    // District matching
    if (selectedDistrict !== 'All' && primaryOrg.district !== selectedDistrict) {
      return false;
    }

    // Organization Type matching
    if (selectedType !== 'All') {
      const typesList = primaryOrg.organisationTypes || [];
      if (!typesList.includes(selectedType)) {
        return false;
      }
    }

    // Hiring toggle
    if (onlyHiring && !primaryOrg.isHiring) {
      return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-zinc-950 tracking-tight">Registered Organisations</h1>
          <p className="text-zinc-500 mt-2">Browse pharmacies, wholesale drug distributors, and NDA certified medical facilities in Uganda.</p>
        </div>

        {userAccount?.accountType === 'organisation' && (
          <Link to="/profile">
            <Button className="gap-2 font-bold">
              Manage Company Profile
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
                  placeholder="Company name, licence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Search className="absolute left-3.5 top-3.5 text-zinc-400" size={16} />
              </div>
            </div>

            {/* Establishment Type Filter */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Establishment Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="All">All Types</option>
                {ORGANISATION_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">District / Location</label>
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

            {/* Hiring Filter */}
            <div className="pt-2 border-t border-zinc-50">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={onlyHiring}
                  onChange={(e) => setOnlyHiring(e.target.checked)}
                  className="rounded border-zinc-300 text-primary focus:ring-primary/20 h-4 w-4"
                />
                <span className="text-sm font-semibold text-zinc-650 group-hover:text-zinc-900 transition-colors">
                  Currently Hiring
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Results layout */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4 text-sm text-zinc-500 font-medium">
            <span className="bg-primary/5 text-primary-light ring-1 ring-primary/10 px-3 py-1 rounded-full text-xs font-bold">
              Found {filteredOrganisations.length} Organisations
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 grayscale opacity-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Loading ecosystem list...</p>
            </div>
          ) : filteredOrganisations.length === 0 ? (
            <div className="py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-150 text-center flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-zinc-200 mb-6 shadow-sm border border-zinc-100">
                <Building2 size={32} />
              </div>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-2 font-bold">No organisations match your filter criteria.</p>
              <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">Consider refining options or clearing filters to observe other establishments.</p>
              {hasActiveFilters && (
                <Button onClick={handleClearFilters} size="sm" variant="outline">Clear Filter Criteria</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredOrganisations.map((orgDoc) => {
                  const o = orgDoc.organisations![0];
                  return (
                    <motion.div
                      key={orgDoc.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white p-6 rounded-3xl border border-zinc-150 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Card Section */}
                        <div className="flex gap-4 items-start mb-5">
                          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors text-primary group-hover:text-white font-extrabold text-xl uppercase overflow-hidden">
                            <Building size={24} />
                          </div>

                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="font-black text-zinc-900 leading-snug text-base tracking-tight hover:underline cursor-pointer" onClick={() => navigate(`/organisations/${orgDoc.id}`)}>
                                {o.organisationName}
                              </span>
                              {o.ndaLicenceNumber && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                  <ShieldCheck size={10} />
                                  NDA Verified
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                              <MapPin size={12} />
                              <span>{o.district || 'Uganda Office'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Establishments Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {o.organisationTypes?.map((typeId) => {
                            const match = ORGANISATION_TYPES.find(t => t.id === typeId);
                            return (
                              <span key={typeId} className="bg-zinc-100 text-zinc-700 text-[10px] font-extrabold px-2.5 py-1 rounded shadow-xs uppercase">
                                {match ? match.label : typeId.replace(/_/g, ' ')}
                              </span>
                            );
                          })}
                          {o.branchCount && (
                            <span className="bg-zinc-50 text-zinc-500 text-[10px] font-bold px-2.5 py-1 rounded border border-zinc-200">
                              {o.branchCount} branches
                            </span>
                          )}
                        </div>

                        {o.about ? (
                          <p className="text-zinc-500 text-xs font-semibold line-clamp-3 leading-relaxed mb-6 italic">
                            "{o.about}"
                          </p>
                        ) : (
                          <p className="text-zinc-400/80 text-xs font-semibold line-clamp-3 leading-relaxed mb-6 pb-2">
                            No narrative description exists. Click to view company profiles or contact them directly.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-5 border-t border-zinc-50 mt-auto">
                        <div>
                          {o.isHiring ? (
                            <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Hiring
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">NDA Registered</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {user && user.uid !== orgDoc.id && (
                            <button
                              onClick={() => setActiveChatRecipient({ id: orgDoc.id, name: o.organisationName })}
                              className="p-2 sm:px-3 sm:py-2 bg-primary/5 hover:bg-primary hover:text-white text-primary transition-all rounded-xl text-xs font-bold flex items-center gap-1"
                              title="Message Organisation"
                            >
                              <MessageSquare size={14} />
                              <span className="hidden sm:inline">Message</span>
                            </button>
                          )}
                          <Link to={`/organisations/${orgDoc.id}`}>
                            <button className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 rounded-xl transition-all shadow-xs border border-zinc-100 cursor-pointer animate-fade-in">
                              <ChevronRight size={16} />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over active chat drawer */}
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
                recipientName={activeChatRecipient.name}
                onClose={() => setActiveChatRecipient(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BrowseOrganisations;
