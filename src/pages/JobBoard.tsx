import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Button } from '../components/Button';
import { JobPosting, AvailabilityPost } from '../types';
import { PHARMA_CADRES, UGANDA_DISTRICTS, EMPLOYMENT_TYPES } from '../constants';
import { 
  Search, 
  MapPin, 
  Clock, 
  Users, 
  Filter, 
  Briefcase, 
  Building, 
  ChevronRight,
  Plus,
  AlertCircle,
  XCircle,
  X,
  Store,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const JobBoard: React.FC = () => {
  const { user, userAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<'jobs' | 'availability' | 'listings'>('jobs');
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [availability, setAvailability] = useState<AvailabilityPost[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Filters
  const [filters, setFilters] = useState<{
    cadre: string;
    district: string;
    employmentTypes: string[];
    businessType: string;
    askingPrice: string;
  }>({
    cadre: 'All',
    district: 'All',
    employmentTypes: [],
    businessType: 'All',
    askingPrice: 'All'
  });

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const now = Timestamp.now();
      const simplerQ = query(
        collection(db, 'jobPostings'),
        where('status', '==', 'active')
      );
      
      const snap = await getDocs(simplerQ);
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as JobPosting))
        .filter(j => j.expiresAt.toMillis() > now.toMillis())
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      
      setJobs(data);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'jobPostings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailability = async () => {
    setIsLoading(true);
    try {
      const now = Timestamp.now();
      const q = query(
        collection(db, 'availabilityPosts'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as AvailabilityPost))
        .filter(a => a.expiresAt.toMillis() > now.toMillis())
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAvailability(data);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'availabilityPosts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const now = Timestamp.now();
      const q = query(
        collection(db, 'businessListings'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any))
        .filter(b => !b.expiresAt || b.expiresAt.toMillis() > now.toMillis())
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setListings(data);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'businessListings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'jobs') fetchJobs();
    else if (activeTab === 'availability') fetchAvailability();
    else if (activeTab === 'listings') fetchListings();
  }, [activeTab]);

  const filteredJobs = jobs.filter(j => {
    if (filters.cadre !== 'All' && j.cadreRequired !== filters.cadre) return false;
    if (filters.district !== 'All' && j.district !== filters.district) return false;
    if (filters.employmentTypes.length > 0 && !filters.employmentTypes.includes(j.employmentType)) return false;
    return true;
  });

  const filteredAvailability = availability.filter(a => {
    if (filters.cadre !== 'All' && a.primaryCadre !== filters.cadre) return false;
    if (filters.district !== 'All' && a.district !== filters.district) return false;
    if (filters.employmentTypes.length > 0) {
      const hasMatch = (a.preferredEmploymentTypes || []).some(type => filters.employmentTypes.includes(type));
      if (!hasMatch) return false;
    }
    return true;
  });

  const filteredListings = listings.filter(l => {
    if (filters.district !== 'All' && l.district !== filters.district) return false;
    if (filters.businessType !== 'All' && l.businessType !== filters.businessType) return false;
    
    if (filters.askingPrice !== 'All') {
      const price = l.askingPriceUGX;
      if (price === null) return false; // Hide confidential price on bracket filter
      if (filters.askingPrice === 'under_10m' && price >= 10000000) return false;
      if (filters.askingPrice === '10m_50m' && (price < 10000000 || price > 50000000)) return false;
      if (filters.askingPrice === '50m_200m' && (price < 50000000 || price > 200000000)) return false;
      if (filters.askingPrice === 'above_200m' && price <= 200000000) return false;
    }
    return true;
  });

  const clearFilters = () => setFilters({
    cadre: 'All',
    district: 'All',
    employmentTypes: [],
    businessType: 'All',
    askingPrice: 'All'
  });

  const hasActiveFilters = filters.cadre !== 'All' || 
                           filters.district !== 'All' || 
                           filters.employmentTypes.length > 0 ||
                           filters.businessType !== 'All' ||
                           filters.askingPrice !== 'All';

  const toggleEmploymentType = (type: string) => {
    setFilters(f => ({
      ...f,
      employmentTypes: f.employmentTypes.includes(type)
        ? f.employmentTypes.filter(t => t !== type)
        : [...f.employmentTypes, type]
    }));
  };

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    const now = Date.now();
    const date = timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Marketplace</h1>
          <p className="text-zinc-500 mt-2">Connecting Uganda's pharmaceutical professional workforce and businesses.</p>
        </div>
        
        {activeTab === 'jobs' && userAccount?.accountType === 'organisation' && (
          <Link to="/jobs/create">
            <Button className="gap-2">
              <Plus size={18} />
              Post a Job
            </Button>
          </Link>
        )}
        {activeTab === 'availability' && userAccount?.accountType === 'individual' && (
          <Link to="/availability/create">
            <Button variant="secondary" className="gap-2">
              <Plus size={18} />
              Post Availability
            </Button>
          </Link>
        )}
        {activeTab === 'listings' && user && (
          <Link to="/marketplace/businesses/create">
            <Button className="gap-2 bg-amber-600 border-none hover:bg-amber-700 text-white shadow-md">
              <Plus size={18} />
              Post Business for Sale
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-zinc-100 rounded-2xl w-fit mb-12 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('jobs');
            clearFilters();
          }}
          className={cn(
            "px-6 md:px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0",
            activeTab === 'jobs' ? "bg-white text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          )}
        >
          <Briefcase size={16} />
          Job Postings
        </button>
        <button
          onClick={() => {
            setActiveTab('availability');
            clearFilters();
          }}
          className={cn(
            "px-6 md:px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0",
            activeTab === 'availability' ? "bg-white text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          )}
        >
          <Users size={16} />
          Professionals Available
        </button>
        <button
          onClick={() => {
            setActiveTab('listings');
            clearFilters();
          }}
          className={cn(
            "px-6 md:px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0",
            activeTab === 'listings' ? "bg-white text-amber-600 shadow-sm font-black" : "text-zinc-500 hover:text-zinc-900"
          )}
        >
          <Store size={16} className="text-amber-500" />
          Businesses for Sale
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-start">
        {/* Filters Sidebar */}
        <div className={cn(
          "lg:col-span-1 space-y-8 sticky top-24 transition-opacity",
          isFilterOpen ? "opacity-100" : "opacity-0 invisible lg:visible lg:opacity-100"
        )}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Filter size={18} />
              Filters
            </h3>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-[10px] font-bold uppercase text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
              >
                Clear All
                <X size={12} />
              </button>
            )}
          </div>

          <div className="space-y-6 bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm relative overflow-hidden">
             <div className={cn(
               "absolute top-0 left-0 w-1 h-full",
               activeTab === 'listings' ? "bg-amber-500" : "bg-primary/20"
             )}></div>
             
             {activeTab !== 'listings' ? (
               <div>
                 <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Cadre</label>
                 <select 
                   value={filters.cadre}
                   onChange={(e) => setFilters(f => ({ ...f, cadre: e.target.value }))}
                   className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20 animate-fade-in"
                 >
                   <option value="All">All Cadres</option>
                   {PHARMA_CADRES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
             ) : (
               <div>
                 <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Business Type</label>
                 <select 
                   value={filters.businessType}
                   onChange={(e) => setFilters(f => ({ ...f, businessType: e.target.value }))}
                   className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                 >
                   <option value="All">All Types</option>
                   <option value="retail_pharmacy">Retail Pharmacy</option>
                   <option value="wholesale_pharmacy">Wholesale Pharmacy</option>
                   <option value="drug_shop">Licensed Drug Shop</option>
                   <option value="distribution_company">Distribution Company</option>
                   <option value="manufacturing_facility">Manufacturing Facility</option>
                   <option value="pharmaceutical_equipment">Pharmaceutical Equipment</option>
                   <option value="other">Other Business</option>
                 </select>
               </div>
             )}

             <div>
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">District</label>
               <select 
                 value={filters.district}
                 onChange={(e) => setFilters(f => ({ ...f, district: e.target.value }))}
                 className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20"
               >
                 <option value="All">All Districts</option>
                 {UGANDA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
             </div>

             <div>
               {activeTab !== 'listings' ? (
                 <>
                   <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Refine By</label>
                   {activeTab === 'jobs' ? (
                     <select 
                       value={filters.employmentTypes[0] || 'All'}
                       onChange={(e) => setFilters(f => ({ ...f, employmentTypes: e.target.value === 'All' ? [] : [e.target.value] }))}
                       className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-primary/20"
                     >
                       <option value="All">All Employment Types</option>
                       {EMPLOYMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                     </select>
                   ) : (
                     <div className="space-y-2 pt-1 border-t border-zinc-50">
                       {EMPLOYMENT_TYPES.map(t => (
                         <label key={t.id} className="flex items-center gap-3 cursor-pointer group">
                           <div 
                             onClick={() => toggleEmploymentType(t.id)}
                             className={cn(
                               "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                               filters.employmentTypes.includes(t.id) 
                                 ? "bg-primary border-primary text-white" 
                                 : "bg-white border-zinc-200 group-hover:border-primary/50"
                             )}
                           >
                             {filters.employmentTypes.includes(t.id) && <X size={12} strokeWidth={4} />}
                           </div>
                           <span className={cn(
                             "text-sm font-semibold transition-colors",
                             filters.employmentTypes.includes(t.id) ? "text-zinc-900" : "text-zinc-500"
                           )}>
                             {t.label}
                           </span>
                         </label>
                       ))}
                     </div>
                   )}
                 </>
               ) : (
                 <>
                   <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Asking Price UGX</label>
                   <select 
                     value={filters.askingPrice}
                     onChange={(e) => setFilters(f => ({ ...f, askingPrice: e.target.value }))}
                     className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                   >
                     <option value="All">All Prices</option>
                     <option value="under_10m">Under 10M UGX</option>
                     <option value="10m_50m">10M - 50M UGX</option>
                     <option value="50m_200m">50M - 200M UGX</option>
                     <option value="above_200m">Above 200M UGX</option>
                   </select>
                 </>
               )}
             </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
           <div className="flex items-center gap-4 text-sm text-zinc-500 font-medium">
             <span className={cn(
               "px-3 py-1 rounded-full text-xs font-bold ring-1",
               activeTab === 'listings' 
                 ? "bg-amber-50 text-amber-700 ring-amber-500/20" 
                 : "bg-primary/5 text-primary-light ring-primary/20"
             )}>
               {activeTab === 'jobs' 
                 ? `${filteredJobs.length} active postings` 
                 : activeTab === 'availability' 
                   ? `${filteredAvailability.length} professionals listed` 
                   : `${filteredListings.length} business listings`}
             </span>
           </div>

           {isLoading ? (
             <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
               <p className="text-sm font-bold uppercase tracking-widest">Searching the ecosystem...</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {activeTab === 'jobs' ? (
                    filteredJobs.length > 0 ? (
                      filteredJobs.map((job) => <JobCard key={job.id} job={job} getRelativeTime={getRelativeTime} />)
                    ) : (
                      <EmptyState 
                        message="No job postings found. Be the first to post an opportunity." 
                        showPostButton={userAccount?.accountType === 'organisation'}
                        link="/jobs/create"
                        buttonText="Post a Job"
                        Icon={Briefcase}
                      />
                    )
                  ) : activeTab === 'availability' ? (
                    filteredAvailability.length > 0 ? (
                      filteredAvailability.map((post) => <AvailabilityCard key={post.id} post={post} getRelativeTime={getRelativeTime} />)
                    ) : (
                      <EmptyState 
                        message="No professionals found matching these filters." 
                        showPostButton={userAccount?.accountType === 'individual'}
                        link="/availability/create"
                        buttonText="Post My Availability"
                        Icon={Users}
                      />
                    )
                  ) : (
                    filteredListings.length > 0 ? (
                      filteredListings.map((listing) => <BusinessListingCard key={listing.id} listing={listing} getRelativeTime={getRelativeTime} />)
                    ) : (
                      <EmptyState 
                        message="No active businesses listings found currently." 
                        showPostButton={!!user}
                        link="/marketplace/businesses/create"
                        buttonText="Post Business for Sale"
                        Icon={Store}
                      />
                    )
                  )}
                </AnimatePresence>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const JobCard: React.FC<{ job: JobPosting; getRelativeTime: any }> = ({ job, getRelativeTime }) => {
  const isExpiringSoon = job.expiresAt.toMillis() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-primary"
    >
      <div className="flex gap-4 items-start mb-6">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors text-primary group-hover:text-white">
          {job.organisationLogoUrl ? (
             <img src={job.organisationLogoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
          ) : (
             <Building size={28} />
          )}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1 overflow-hidden">
             <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{job.organisationName}</span>
             {isExpiringSoon && (
               <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Expiring soon</span>
             )}
          </div>
          <h3 className="font-bold text-zinc-900 line-clamp-1 leading-tight group-hover:text-primary transition-colors">{job.title}</h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
         <span className="bg-green-50 text-primary-light text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase border border-primary/10">
           {job.cadreRequired.replace(/_/g, ' ')}
         </span>
         <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase border border-amber-200/50">
           {job.employmentType.replace(/_/g, ' ')}
         </span>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
         <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
               <MapPin size={14} className="text-zinc-300" />
               {job.district}
            </div>
            <div className="flex items-center gap-3">
               <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                 <Clock size={12} />
                 {getRelativeTime(job.createdAt)}
               </span>
               <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                 <Users size={12} />
                 {job.interestCount} interested
               </span>
            </div>
         </div>
         <Link to={`/jobs/${job.id}`}>
           <button className="p-2 bg-zinc-50 rounded-xl text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
             <ChevronRight size={18} />
           </button>
         </Link>
      </div>
    </motion.div>
  );
};

const AvailabilityCard: React.FC<{ post: AvailabilityPost; getRelativeTime: any }> = ({ post, getRelativeTime }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-amber-500"
    >
      <div className="flex gap-4 items-start mb-6">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500 transition-colors text-amber-600 group-hover:text-white overflow-hidden uppercase font-bold text-xl">
          {post.profilePhotoUrl ? (
             <img src={post.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
             post.fullName[0]
          )}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{post.fullName}</span>
          </div>
          <h3 className="font-bold text-zinc-900 line-clamp-1 leading-tight group-hover:text-amber-600 transition-colors uppercase text-sm tracking-tight">{post.headline}</h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
         <span className="bg-green-50 text-primary-light text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase border border-primary/10">
           {post.primaryCadre.replace(/_/g, ' ')}
         </span>
         {(post.preferredEmploymentTypes || []).map(t => (
           <span key={t} className="bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-1 rounded uppercase">
             {t.replace(/_/g, ' ')}
           </span>
         ))}
      </div>

      <p className="text-xs text-zinc-500 line-clamp-2 mb-6 leading-relaxed italic">"{post.description}"</p>

      <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
         <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
               <MapPin size={14} className="text-zinc-300" />
               {post.district}
            </div>
            <div className="flex items-center gap-3">
               <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                 <Clock size={12} />
                 {getRelativeTime(post.createdAt)}
               </span>
               <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                 <Users size={12} />
                 {post.interestCount} interested
               </span>
            </div>
         </div>
         <Link to={`/availability/${post.id}`}>
           <button className="p-2 bg-zinc-50 rounded-xl text-zinc-400 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
             <ChevronRight size={18} />
           </button>
         </Link>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ message, showPostButton, link, buttonText, Icon }: any) => (
  <div className="col-span-full py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100 text-center flex flex-col items-center">
    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-zinc-200 mb-6 shadow-sm">
      <Icon size={32} />
    </div>
    <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-8 font-medium">{message}</p>
    {showPostButton && (
      <Link to={link}>
        <Button size="sm">{buttonText}</Button>
      </Link>
    )}
  </div>
);

const BusinessListingCard: React.FC<{ listing: any; getRelativeTime: any }> = ({ listing, getRelativeTime }) => {
  const formatPrice = (price: number | null) => {
    if (price === null) return "Confidential / POA";
    return `UGX ${price.toLocaleString()}`;
  };

  const businessTypeLabels: { [key: string]: string } = {
    retail_pharmacy: 'Retail Pharmacy',
    wholesale_pharmacy: 'Wholesale Pharmacy',
    drug_shop: 'Licensed Drug Shop',
    distribution_company: 'Distribution Company',
    manufacturing_facility: 'Manufacturing Facility',
    pharmaceutical_equipment: 'Pharmaceutical Equipment',
    other: 'Other Business'
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-amber-500"
    >
      <div className="flex gap-4 items-start mb-6">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500 transition-colors text-amber-600 group-hover:text-white overflow-hidden">
          {listing.photoUrls && listing.photoUrls[0] ? (
             <img src={listing.photoUrls[0]} alt="" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
          ) : (
             <Store size={28} />
          )}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">
               {listing.isConfidential ? "Confidential Business" : businessTypeLabels[listing.businessType] || "Business"}
             </span>
             {listing.isConfidential && (
               <span className="bg-zinc-100 text-zinc-650 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 flex items-center gap-1">
                 <EyeOff size={8} />
                 Confidential
               </span>
             )}
          </div>
          <h3 className="font-bold text-zinc-900 line-clamp-1 leading-tight group-hover:text-amber-600 transition-colors text-sm tracking-tight capitalize">
            {listing.listingTitle}
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
         <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase border border-amber-200/50">
           {formatPrice(listing.askingPriceUGX)}
         </span>
         <span className="bg-zinc-50 text-zinc-500 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-zinc-200">
           {listing.yearsInOperation || 0} Years Active
         </span>
      </div>

      <p className="text-xs text-zinc-500 line-clamp-2 mb-6 leading-relaxed italic">
        "{listing.businessDescription || 'No description provided'}"
      </p>

      <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
         <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
               <MapPin size={14} className="text-zinc-300" />
               {listing.district}
            </div>
            <div className="flex items-center gap-3">
               <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                 <Clock size={12} />
                 Listed {getRelativeTime(listing.createdAt)}
               </span>
            </div>
         </div>
         <Link to={`/marketplace/businesses/${listing.id}`}>
            <button className="p-2 bg-zinc-50 rounded-xl text-zinc-400 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm cursor-pointer">
              <ChevronRight size={18} />
            </button>
         </Link>
      </div>
    </motion.div>
  );
};

export default JobBoard;
