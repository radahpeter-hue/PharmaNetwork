import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Button } from '../components/Button';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { JobPosting, AvailabilityPost } from '../types';
import { Toast, ToastType } from '../components/Toast';
import { 
  Briefcase, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  RotateCcw,
  Eye,
  Plus,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { MyListings } from './MyListings';
import { PostingQuotaExceededError, renewPostingWithQuota } from '../lib/postingQuota';

export const MyPostings: React.FC = () => {
  const { user, userAccount, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Master Tabs: 'jobs' | 'availability' | 'listings'
  const [mainTab, setMainTab] = useState<'jobs' | 'availability' | 'listings'>('jobs');
  
  // Sub-tabs for jobs and availabilities
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'expiring' | 'closed'>('active');

  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [availabilityPosts, setAvailabilityPosts] = useState<AvailabilityPost[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  // Read URL query tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'listings') {
      setMainTab('listings');
    } else if (tabParam === 'availability') {
      setMainTab('availability');
    } else if (tabParam === 'jobs') {
      setMainTab('jobs');
    } else {
      // Intelligently default main tab to what aligns with accountType
      if (userAccount?.accountType === 'organisation') {
        setMainTab('jobs');
      } else if (userAccount?.accountType === 'individual') {
        setMainTab('availability');
      }
    }
  }, [searchParams, userAccount]);

  const fetchAllPostings = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      // 1. Fetch Job Postings
      const jobsQuery = query(
        collection(db, 'jobPostings'),
        where('organisationUserId', '==', user.uid)
      );
      const jobsSnap = await getDocs(jobsQuery);
      const jobsData = jobsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
      setJobPostings(jobsData);

      // 2. Fetch Availability Posts
      const availQuery = query(
        collection(db, 'availabilityPosts'),
        where('individualUserId', '==', user.uid)
      );
      const availSnap = await getDocs(availQuery);
      const availData = availSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
      setAvailabilityPosts(availData);

    } catch (err) {
      console.error('Error fetching postings:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllPostings();
  }, [user]);

  const now = Date.now();
  const filterList = (list: any[]) => {
    return list.filter(p => {
      if (!p.expiresAt) return false;
      const expiresMillis = p.expiresAt.toMillis ? p.expiresAt.toMillis() : new Date(p.expiresAt).getTime();
      const isActive = p.status === 'active' && expiresMillis > now;
      const isExpiringSoon = isActive && (expiresMillis - now < 7 * 24 * 60 * 60 * 1000);
      const isClosedOrExpired = p.status === 'closed' || p.status === 'expired' || expiresMillis <= now;

      if (activeSubTab === 'active') return isActive && !isExpiringSoon;
      if (activeSubTab === 'expiring') return isExpiringSoon;
      if (activeSubTab === 'closed') return isClosedOrExpired;
      return false;
    });
  };

  const currentJobList = filterList(jobPostings);
  const currentAvailList = filterList(availabilityPosts);

  const canRenewOpportunity = (posting: JobPosting | AvailabilityPost) => {
    if (posting.status === 'closed' || !posting.expiresAt) return false;
    const expiresMillis = posting.expiresAt.toMillis
      ? posting.expiresAt.toMillis()
      : new Date(posting.expiresAt).getTime();
    return expiresMillis <= Date.now();
  };

  const handleAction = async (id: string, action: 'close' | 'renew', type: 'jobs' | 'availability') => {
    try {
      const col = type === 'jobs' ? 'jobPostings' : 'availabilityPosts';
      const ref = doc(db, col, id);

      if (action === 'close') {
        await updateDoc(ref, { status: 'closed' });
        setToast({ isVisible: true, message: 'Posting closed.', type: 'success' });
      } else if (action === 'renew') {
        if (!user) return;
        await renewPostingWithQuota({
          quotaType: type === 'jobs' ? 'job' : 'availability',
          ownerUid: user.uid,
          postingId: id
        });
        setToast({ isVisible: true, message: 'Posting renewed for 60 days.', type: 'success' });
      }
      fetchAllPostings();
    } catch (err) {
      console.error('Action failed:', err);
      if (err instanceof PostingQuotaExceededError) {
        setToast({
          isVisible: true,
          message: type === 'jobs'
            ? 'Renewal would exceed the limit of 5 active job postings.'
            : 'Renewal is blocked because another availability post is already active.',
          type: 'error'
        });
      } else {
        setToast({ isVisible: true, message: err instanceof Error ? err.message : 'Action failed.', type: 'error' });
      }
    }
  };

  const handleTabChange = (tab: 'jobs' | 'availability' | 'listings') => {
    setMainTab(tab);
    setSearchParams({ tab });
  };

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      
      {/* Header section with Dynamic Titles and CTA Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
            <Briefcase className="text-primary" />
            My Dashboard Postings
          </h1>
          <p className="text-zinc-500 mt-2">Manage your active recruitment adverts, availability requests and pharmacy listings.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/jobs/create">
            <Button variant="ghost" size="sm" className="gap-2">
              <Plus size={15} />
              Post Job
            </Button>
          </Link>
          <Link to="/availability/create">
            <Button variant="ghost" size="sm" className="gap-2 text-indigo-650 hover:text-indigo-700">
              <Plus size={15} />
              Share Availability
            </Button>
          </Link>
          <Link to="/marketplace/businesses/create">
            <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm">
              <Plus size={15} />
              List Business
            </Button>
          </Link>
        </div>
      </div>

      {/* THREE MAIN MASTER TABS */}
      <div className="flex border-b border-zinc-100 pb-px mb-8 gap-6">
        {[
          { id: 'jobs', label: 'Job Postings', icon: Briefcase, count: jobPostings.length },
          { id: 'availability', label: 'Availability Posts', icon: Users, count: availabilityPosts.length },
          { id: 'listings', label: 'Business Listings', icon: Store, count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={cn(
              "pb-4 font-bold text-sm tracking-tight border-b-2 transition-all flex items-center gap-2.5 relative px-1 uppercase tracking-wider",
              mainTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-zinc-400 hover:text-zinc-650"
            )}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={cn(
                "text-[10px] h-4.5 min-w-4.5 px-1.5 rounded-full flex items-center justify-center font-extrabold shadow-2xs",
                mainTab === tab.id ? "bg-primary text-white" : "bg-zinc-100 text-zinc-500"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT AREAS */}
      {mainTab === 'listings' ? (
        // Business listings modular grid tab
        <MyListings isTab={true} />
      ) : (
        // Job postings or Availability Posts list
        <div className="space-y-6">
          
          {/* Sub-tabs defining status */}
          <div className="flex p-1.5 bg-zinc-100 rounded-2xl w-fit">
            {[
              { id: 'active', label: 'Active', icon: CheckCircle2 },
              { id: 'expiring', label: 'Expiring Soon', icon: AlertCircle },
              { id: 'closed', label: 'Closed / Expired', icon: XCircle },
            ].map((subTab) => (
              <button
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id as any)}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-widest",
                  activeSubTab === subTab.id ? "bg-white text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                <subTab.icon size={13} />
                {subTab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {isRefreshing ? (
              <div className="py-20 text-center flex flex-col items-center grayscale opacity-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading dossiers...</p>
              </div>
            ) : (mainTab === 'jobs' ? currentJobList : currentAvailList).length > 0 ? (
              (mainTab === 'jobs' ? currentJobList : currentAvailList).map((p) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-xs flex flex-col md:flex-row md:items-center gap-6 group hover:border-primary/20 transition-all"
                >
                  <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest",
                        activeSubTab === 'active' ? "bg-green-100 text-green-700" :
                        activeSubTab === 'expiring' ? "bg-amber-100 text-amber-700" :
                        "bg-zinc-100 text-zinc-500"
                      )}>
                        {activeSubTab === 'active' ? 'Active' : activeSubTab === 'expiring' ? 'Expiring' : 'Closed'}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-350 font-mono">
                        REF #{p.id?.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-zinc-900 group-hover:text-primary transition-colors truncate">
                      {mainTab === 'jobs' ? (p as JobPosting).title : (p as AvailabilityPost).headline}
                    </h3>

                    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 text-xs text-zinc-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-zinc-350" />
                        Posted: {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-455">
                        <Users size={13} className="text-zinc-350" />
                        {p.interestCount || 0} interests handshakes
                      </span>
                    </div>
                  </div>

                  {/* Operational controls */}
                  <div className="flex flex-wrap items-center gap-3 md:border-l md:border-zinc-50 md:pl-6 shrink-0 min-w-fit">
                    <Link to={mainTab === 'jobs' ? `/jobs/${p.id}` : `/availability/${p.id}`}>
                      <Button variant="ghost" size="sm" className="gap-2.5">
                        <Eye size={15} />
                        View Page
                      </Button>
                    </Link>

                    {mainTab === 'jobs' && (
                      <Link to={`/jobs/${p.id}/edit`}>
                        <button className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-650 hover:bg-zinc-105 hover:bg-zinc-100 transition-colors border border-transparent hover:border-zinc-200">
                          Edit
                        </button>
                      </Link>
                    )}

                    {activeSubTab !== 'closed' ? (
                      <button 
                        onClick={() => handleAction(p.id!, 'close', mainTab)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-650 hover:bg-red-50 transition-all cursor-pointer border border-transparent"
                      >
                        Close Listing
                      </button>
                    ) : canRenewOpportunity(p) ? (
                      <Button variant="ghost" size="sm" className="gap-2 text-primary border-none" onClick={() => handleAction(p.id!, 'renew', mainTab)}>
                        <RotateCcw size={15} />
                        Renew for 60 days
                      </Button>
                    ) : (
                      <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Closed
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-24 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100/85 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-zinc-300 mb-6 shadow-sm border border-zinc-100">
                  {mainTab === 'jobs' ? <Briefcase size={32} /> : <Users size={32} />}
                </div>
                <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-6 font-medium italic leading-relaxed">
                  {mainTab === 'jobs' 
                    ? 'You have not posted any job vacancies yet.' 
                    : 'You have not shared your availability posts yet.'
                  }
                </p>
                <Link to={mainTab === 'jobs' ? "/jobs/create" : "/availability/create"}>
                  <Button size="sm" className="gap-2">
                    <Plus size={16} />
                    {mainTab === 'jobs' ? 'Create Job Post' : 'Share Availability'}
                  </Button>
                </Link>
              </div>
            )}
          </div>

        </div>
      )}

      <Toast {...toast} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
    </div>
  );
};

export default MyPostings;
