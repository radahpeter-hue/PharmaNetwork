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
  logoUrl?: string;
}

interface OrganisationCard extends OrgDetail {
  id: string;
  ownerUserId: string;
}

const BrowseOrganisations: React.FC = () => {
  const { user, userAccount } = useAuth();
  const navigate = useNavigate();

  const [organisations, setOrganisations] = useState<OrganisationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [onlyHiring, setOnlyHiring] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // messaging state
  const [activeChatRecipient, setActiveChatRecipient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchOrganisations = async () => {
      setLoading(true);
      try {
        const querySnap = await getDocs(collection(db, 'organisationProfiles'));
        const list: OrganisationCard[] = [];
        querySnap.forEach((docSnap) => {
          const profile = docSnap.data() as { organisations?: OrgDetail[] };
          (profile.organisations || []).forEach((organisation, index) => {
            if (!organisation.organisationName) return;
            list.push({
              ...organisation,
              id: organisation.id || `${docSnap.id}_org_${index}`,
              ownerUserId: docSnap.id
            });
          });
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    setVisibleCount(20);
  }, [debouncedSearchQuery, selectedDistrict, selectedType, onlyHiring]);

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

  // Filters operate on individual organisations, not only the first organisation in an account.
  const filteredOrganisations = organisations.filter((organisation) => {
    if (debouncedSearchQuery !== '') {
      const q = debouncedSearchQuery.toLowerCase();
      const nameMatch = (organisation.organisationName || '').toLowerCase().includes(q);
      const licenceMatch = (organisation.ndaLicenceNumber || '').toLowerCase().includes(q);
      const aboutMatch = (organisation.about || '').toLowerCase().includes(q);
      if (!nameMatch && !licenceMatch && !aboutMatch) return false;
    }

    if (selectedDistrict !== 'All' && organisation.district !== selectedDistrict) return false;

    if (selectedType !== 'All' && !(organisation.organisationTypes || []).includes(selectedType)) {
      return false;
    }

    if (onlyHiring && !organisation.isHiring) return false;

    return true;
  });

  const visibleOrganisations = filteredOrganisations.slice(0, visibleCount);
  const activeFilterCount = [
    selectedDistrict !== 'All',
    selectedType !== 'All',
    onlyHiring
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-zinc-950 tracking-tight">Registered Organisations</h1>
          <p className="text-zinc-500 mt-2">Browse healthcare and pharmaceutical organisations participating in the PharmaNetwork member network.</p>
        </div>

        {userAccount?.accountType === 'organisation' && (
          <Link to="/profile/edit/organisation">
            <Button className="gap-2 font-bold">
              Manage Organisation Profile
            </Button>
          </Link>
        )}
      </div>

      <div className="lg:hidden mb-6 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search organisations by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Search className="absolute left-4 top-4 text-zinc-400" size={17} />
        </div>
        <button
          type="button"
          onClick={() => setShowMobileFilters(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-bold text-zinc-700"
        >
          <Filter size={16} />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}
        </button>
      </div>

      {showMobileFilters && (
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => setShowMobileFilters(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-start">
        {/* Filter Sidebar */}
        <div className={cn(
          "space-y-8 bg-white p-6 rounded-3xl border border-zinc-150 shadow-sm",
          showMobileFilters
            ? "fixed left-4 right-4 bottom-4 z-50 max-h-[80vh] overflow-y-auto lg:static lg:max-h-none"
            : "hidden lg:block",
          "lg:col-span-1 lg:sticky lg:top-24"
        )}>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-2">
            <h3 className="font-extrabold text-zinc-900 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Filter size={16} />
              Refine Search
            </h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-[10px] font-black uppercase text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
                >
                  Clear
                  <X size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100"
                aria-label="Close filters"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {/* Search Input */}
            <div className="hidden lg:block">
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
              Showing {Math.min(visibleCount, filteredOrganisations.length)} of {filteredOrganisations.length} Organisations
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {visibleOrganisations.map((o) => {
                  return (
                    <motion.div
                      key={`${o.ownerUserId}_${o.id}`}
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
                            {o.logoUrl ? (
                              <img src={o.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Building size={24} />
                            )}
                          </div>

                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="font-black text-zinc-900 leading-snug text-base tracking-tight hover:underline cursor-pointer" onClick={() => navigate(`/organisations/${o.ownerUserId}`)}>
                                {o.organisationName}
                              </span>
                              {o.ndaLicenceNumber && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                  <ShieldCheck size={10} />
                                  Licence number provided
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
                            No organisation description has been added yet.
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
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">Organisation</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {user && user.uid !== o.ownerUserId && (
                            <button
                              onClick={() => setActiveChatRecipient({ id: o.ownerUserId, name: o.organisationName })}
                              className="p-2 sm:px-3 sm:py-2 bg-primary/5 hover:bg-primary hover:text-white text-primary transition-all rounded-xl text-xs font-bold flex items-center gap-1"
                              title="Message Organisation"
                            >
                              <MessageSquare size={14} />
                              <span className="hidden sm:inline">Message</span>
                            </button>
                          )}
                          <Link to={`/organisations/${o.ownerUserId}`}>
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

          {!loading && visibleCount < filteredOrganisations.length && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setVisibleCount(count => count + 20)}>
                Load more
              </Button>
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
