import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  onSnapshot
} from 'firebase/firestore';
import { Button } from '../components/Button';
import { 
  Users, 
  Briefcase, 
  MessageSquare, 
  CheckCircle2, 
  TrendingUp, 
  Search, 
  ExternalLink,
  ChevronRight,
  Plus,
  Eye,
  AlertCircle,
  FileText,
  Building,
  DollarSign,
  Edit,
  CheckCircle,
  Bell,
  ArrowRight,
  ShieldAlert,
  Clock,
  MapPin,
  Unlock,
  ToggleLeft,
  ToggleRight,
  User,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface MissingField {
  key: string;
  label: string;
}

const Dashboard: React.FC = () => {
  const { user, userAccount, profile } = useAuth();
  const navigate = useNavigate();

  // Common loading State
  const [loading, setLoading] = useState(true);

  // INDIVIDUAL STATE
  const [indivProfileData, setIndivProfileData] = useState<any>(null);
  const [availability, setAvailability] = useState<'available' | 'unavailable'>('unavailable');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeJobsCount, setActiveJobsCount] = useState(0);

  // ORGANISATION STATE
  const [orgJobs, setOrgJobs] = useState<any[]>([]);
  const [orgListings, setOrgListings] = useState<any[]>([]);
  const [orgChats, setOrgChats] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !userAccount) {
      setLoading(false);
      return;
    }

    // Set up subscriptions based on account type
    const unsubscibers: (() => void)[] = [];

    if (userAccount.accountType === 'individual') {
      // 1. Subscribe to individual profile to catch totalProfileViews & availabilityStatus in real-time
      const profileDocRef = doc(db, 'individualProfiles', user.uid);
      const unsubProfile = onSnapshot(profileDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIndivProfileData(data);
          setAvailability(data.availabilityStatus === 'available' ? 'available' : 'unavailable');
        } else {
          setIndivProfileData(null);
        }
        setLoading(false);
      }, (err) => {
        console.error("Failed to subscribe to individual profile details:", err);
      });
      unsubscibers.push(unsubProfile);

      // 2. Fetch active jobs status once on load
      const fetchJobs = async () => {
        try {
          const qStatus = query(collection(db, 'jobPostings'), where('status', '==', 'active'));
          const snapStatus = await getDocs(qStatus);
          setActiveJobsCount(snapStatus.size);
        } catch (e) {
          console.warn("Could not load jobs count:", e);
        }
      };
      fetchJobs();

      // 3. Real-time messages count (for individual user)
      const qMsgs = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid));
      const unsubMsgs = onSnapshot(qMsgs, (snap) => {
        let count = 0;
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.unreadCount && typeof data.unreadCount[user.uid] === 'number') {
            count += data.unreadCount[user.uid];
          }
        });
        setUnreadMessages(count);
      });
      unsubscibers.push(unsubMsgs);

    } else {
      // Organisation Account Setup
      // 1. Subscribe to org's own jobs postings
      const qJobs = query(collection(db, 'jobPostings'), where('organisationUserId', '==', user.uid));
      const unsubJobs = onSnapshot(qJobs, (snap) => {
        const jobsList: any[] = [];
        snap.forEach(docSnap => {
          jobsList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setOrgJobs(jobsList);
        setLoading(false);
      });
      unsubscibers.push(unsubJobs);

      // 2. Subscribe to org's own business listings
      const qLists = query(collection(db, 'businessListings'), where('sellerUserId', '==', user.uid));
      const unsubLists = onSnapshot(qLists, (snap) => {
        const listsObj: any[] = [];
        snap.forEach(docSnap => {
          listsObj.push({ id: docSnap.id, ...docSnap.data() });
        });
        setOrgListings(listsObj);
      });
      unsubscibers.push(unsubLists);

      // 3. Subscribe to active conversations (unread messages activity)
      const qConversations = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid));
      const unsubConversations = onSnapshot(qConversations, (snap) => {
        const chatObjects: any[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const countForThisUser = data.unreadCount?.[user.uid] || 0;
          chatObjects.push({
            id: docSnap.id,
            ...data,
            unreadCountForThisUser: countForThisUser
          });
        });
        // Sort: unread conversations on top, then by timestamp
        chatObjects.sort((a, b) => {
          if (a.unreadCountForThisUser !== b.unreadCountForThisUser) {
            return b.unreadCountForThisUser - a.unreadCountForThisUser;
          }
          const tA = a.lastMessageTimestamp?.toMillis ? a.lastMessageTimestamp.toMillis() : 0;
          const tB = b.lastMessageTimestamp?.toMillis ? b.lastMessageTimestamp.toMillis() : 0;
          return tB - tA;
        });
        setOrgChats(chatObjects.slice(0, 5));
      });
      unsubscibers.push(unsubConversations);
    }

    return () => {
      unsubscibers.forEach(unsub => unsub());
    };
  }, [user, userAccount]);

  // Handle Availability Toggle function
  const handleToggleAvailability = async () => {
    if (!user || userAccount?.accountType !== 'individual') return;
    const nextStatus = availability === 'available' ? 'unavailable' : 'available';
    setAvailability(nextStatus); // Optimistic UI update

    try {
      await updateDoc(doc(db, 'individualProfiles', user.uid), {
        availabilityStatus: nextStatus
      });
    } catch (err) {
      console.error("Failed to toggle availability status:", err);
      // Revert status state on failure
      setAvailability(availability);
    }
  };

  // Mark business listings as sold from list
  const handleQuickMarkAsSold = async (id: string) => {
    const isConfirmed = window.confirm("Are you sure you want to mark this pharmaceutical business listing as SOLD? This will flag it to prospective buyers.");
    if (!isConfirmed) return;

    try {
      await updateDoc(doc(db, 'businessListings', id), {
        status: 'sold'
      });
    } catch (err) {
      console.error("Could not complete selling update:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  // Profile Completeness Evaluator
  const getProfileCompletenessAnalysis = () => {
    if (!user || userAccount?.accountType !== 'individual') {
      return { percentage: 0, missingFieldsList: [] };
    }

    const missingFieldsList: MissingField[] = [];
    const p = indivProfileData || profile || {};

    if (!p.registrationNumber) {
      missingFieldsList.push({ key: 'registrationNumber', label: 'PSU Registration No.' });
    }
    if (!p.qualification) {
      missingFieldsList.push({ key: 'qualification', label: 'Academic Qualification' });
    }
    if (p.yearsExperience === undefined || p.yearsExperience === null || p.yearsExperience === '') {
      missingFieldsList.push({ key: 'yearsExperience', label: 'Years of Experience' });
    }
    if (!p.preferredEmploymentTypes || p.preferredEmploymentTypes.length === 0) {
      missingFieldsList.push({ key: 'preferredEmploymentTypes', label: 'Employment Preferences' });
    }
    if (!p.bio || p.bio.trim() === '') {
      missingFieldsList.push({ key: 'bio', label: 'Short Professional Bio' });
    }
    if (!p.profilePhotoUrl) {
      missingFieldsList.push({ key: 'profilePhotoUrl', label: 'Profile Photo' });
    }

    const totalCalculatedFields = 6;
    const missingCount = missingFieldsList.length;
    const percentage = Math.round(((totalCalculatedFields - missingCount) / totalCalculatedFields) * 100);

    return { percentage, missingFieldsList };
  };

  // Helper formatting dates safely
  const formatCompactDate = (timestamp: any) => {
    if (!timestamp) return 'No Date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Extract friendly display name
  const welcomeName = profile && 'fullName' in profile 
    ? profile.fullName.split(' ')[0] 
    : profile && 'organisations' in profile && profile.organisations.length > 0
      ? profile.organisations[0].organisationName 
      : 'User';

  const isIndividual = userAccount?.accountType === 'individual';
  const completenessDetails = getProfileCompletenessAnalysis();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 grayscale">
        <div className="animate-spin rounded-full h-12 w-12 border-y-2 border-primary mb-4"></div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Synchronizing Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      
      {/* Dynamic Welcome Heading */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-black text-zinc-950 tracking-tight"
          >
            Welcome, {welcomeName} 👋
          </motion.h1>
          <p className="text-sm font-semibold text-zinc-400 mt-1 uppercase tracking-wider">
            Account Type: {isIndividual ? 'Individual Healthcare Professional' : 'Registered Pharmaceutical Organisation'}
          </p>
        </div>

        {/* Action button header context */}
        <div>
          <Link to={isIndividual ? "/availability/create" : "/jobs/create"}>
            <Button className="font-extrabold flex items-center gap-2 rounded-2xl">
              <Plus size={18} />
              {isIndividual ? 'Post Availability' : 'Post New Job Opportunity'}
            </Button>
          </Link>
        </div>
      </div>

      {isIndividual ? (
        // =========================== INDIVIDUAL HEALTHCARE PROFESSIONAL LAYOUT ===========================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Left Widgets Section (2 Columns) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Quick stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              {/* Stat Card 1: Views */}
              <div className="bg-white rounded-3xl p-6 border border-zinc-150 shadow-sm relative overflow-hidden group">
                <div className="absolute right-4 top-4 bg-zinc-50 p-2.5 rounded-2xl text-zinc-400 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                  <Eye size={20} />
                </div>
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1.5">Profile Views</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-zinc-900 tracking-tight">
                    {indivProfileData?.totalProfileViews || 0}
                  </span>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md">Total</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2 font-medium">Incremented on page loads</p>
              </div>

              {/* Stat Card 2: Jobs Opportunities */}
              <div className="bg-white rounded-3xl p-6 border border-zinc-150 shadow-sm relative overflow-hidden group">
                <div className="absolute right-4 top-4 bg-zinc-50 p-2.5 rounded-2xl text-zinc-400 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                  <Briefcase size={20} />
                </div>
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1.5">Active Jobs Open</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-zinc-900 tracking-tight">
                    {activeJobsCount}
                  </span>
                  <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md">Realtime</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2 font-medium">Opportunities listed on board</p>
              </div>

              {/* Stat Card 3: Unread Messages */}
              <Link to="/messages" className="block relative">
                <div className="bg-white hover:bg-zinc-50 rounded-3xl p-6 border border-zinc-150 shadow-sm hover:shadow-md transition-all relative overflow-hidden group h-full">
                  <div className="absolute right-4 top-4 bg-zinc-50 p-2.5 rounded-2xl text-zinc-400 group-hover:bg-green-500/10 group-hover:text-green-600 transition-all">
                    <MessageSquare size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1.5">Unread Messages</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-zinc-900 tracking-tight">
                      {unreadMessages}
                    </span>
                    {unreadMessages > 0 && (
                      <span className="absolute top-4 left-4 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 font-medium flex items-center gap-1 group-hover:text-primary transition-colors">
                    Click to view messages board <ArrowRight size={12} />
                  </p>
                </div>
              </Link>
            </div>

            {/* Profile Completeness card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-150 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 tracking-tight">Profile Completeness</h3>
                  <p className="text-xs text-zinc-500 font-medium">Completing your credentials maximizes matching visibility.</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Badge from Spec */}
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border",
                    availability === 'available' 
                      ? "bg-green-50 text-green-700 border-green-200" 
                      : "bg-zinc-50 text-zinc-500 border-zinc-200"
                  )}>
                    <span className={cn("w-2 h-2 rounded-full", availability === 'available' ? "bg-green-500 animate-pulse" : "bg-zinc-400")}></span>
                    {availability === 'available' ? 'Available for work' : 'Invisible / Unavailable'}
                  </span>
                  <span className="text-2xl font-black text-primary bg-primary/5 px-3.5 py-1 rounded-2xl">{completenessDetails.percentage}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-150 h-3 rounded-full overflow-hidden mb-6 relative">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${completenessDetails.percentage}%` }}
                />
              </div>

              {/* Checklist from Spec */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">Profile Checklist Status</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { key: 'registrationNumber', label: 'PSU Registration Number Verified' },
                    { key: 'qualification', label: 'Academic Higher Qualification Listed' },
                    { key: 'yearsExperience', label: 'Professional Experience Documented' },
                    { key: 'preferredEmploymentTypes', label: 'Employment Type Preferences Configured' },
                    { key: 'bio', label: 'Personalized Bio / Overview Provided' },
                    { key: 'profilePhotoUrl', label: 'Professional Profile Avatar Uploaded' }
                  ].map((field) => {
                    const isMissing = completenessDetails.missingFieldsList.some(item => item.key === field.key);
                    return (
                      <div 
                        key={field.key} 
                        className={cn(
                          "p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold",
                          isMissing
                            ? "bg-amber-50/50 border-amber-200/50 text-amber-800"
                            : "bg-green-50/40 border-green-200/30 text-green-800"
                        )}
                      >
                        <span className="line-clamp-1">{field.label}</span>
                        {isMissing ? (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">Missing</span>
                        ) : (
                          <CheckCircle2 size={16} className="text-green-600" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {completenessDetails.missingFieldsList.length > 0 ? (
                  <div className="mt-6 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-105">
                    <div>
                      <p className="text-xs font-bold text-zinc-800">You have {completenessDetails.missingFieldsList.length} fields missing on your public profile</p>
                      <p className="text-[11px] text-zinc-400 font-semibold mt-0.5">Employers might skip unverified listings. Complete them now.</p>
                    </div>
                    <Link to="/profile">
                      <Button size="sm" className="font-extrabold flex items-center gap-1">
                        Complete Profile
                        <ArrowRight size={14} />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 p-4 rounded-2xl bg-green-50 border border-green-150 text-center flex flex-col items-center justify-center">
                    <CheckCircle className="text-green-600 mb-1.5" size={24} />
                    <p className="text-xs font-black uppercase text-green-900 tracking-wider">Your Profile is 100% Complete!</p>
                    <p className="text-[11px] text-green-700 mt-0.5">Our recommendation engine ranks your profile at peak visibility.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar Widget Column (1 Column) */}
          <div className="space-y-8">
            
            {/* Custom Availability Toggle Card from Spec */}
            <div className="bg-white rounded-3xl p-6 border border-zinc-150 shadow-sm">
              <h3 className="text-base font-black text-zinc-950 tracking-tight mb-2 uppercase tracking-wide">Looking For Work?</h3>
              <p className="text-xs text-zinc-500 font-medium mb-6 leading-relaxed">
                Toggling your availability status shows employers on the board that you are active and accepting locum or full-time opportunities.
              </p>

              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-105">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-zinc-800 uppercase tracking-widest">Status Toggle</span>
                  <span className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                    Currently: {availability === 'available' ? 'AVAILABLE' : 'OFFLINE'}
                  </span>
                </div>

                <button 
                  onClick={handleToggleAvailability}
                  className="focus:outline-none cursor-pointer p-1 rounded-full transition-all text-primary hover:scale-105"
                  title="Toggle active status"
                >
                  {availability === 'available' ? (
                    <ToggleRight size={44} className="text-primary" />
                  ) : (
                    <ToggleLeft size={44} className="text-zinc-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick links & Guides */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-3xl p-6 shadow-xl">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-zinc-400 mb-4">Quick Navigation</h3>
              
              <ul className="space-y-3 font-semibold text-sm">
                <li>
                  <Link to="/profile" className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                    <span className="flex items-center gap-2">
                      <User size={16} className="text-zinc-400" />
                      View Profile Settings
                    </span>
                    <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link to="/my-postings" className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                    <span className="flex items-center gap-2">
                      <Briefcase size={16} className="text-zinc-400" />
                      Active Availability Postings
                    </span>
                    <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link to="/messages" className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                    <span className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-zinc-400" />
                      Live Messages Chatroom
                    </span>
                    <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        // =========================== ORGANISATION WORKPLACE LAYOUT ===========================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Organisation Left Main Board (2 Columns) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Active Jobs Widget */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-150 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-zinc-950 tracking-tight">Active Job Postings</h3>
                  <p className="text-xs text-zinc-400 font-semibold mt-0.5">Listed vacancies posted by your organisation office.</p>
                </div>
                <Link to="/jobs/create">
                  <Button variant="outline" size="sm" className="font-bold flex items-center gap-1 rounded-xl">
                    <Plus size={14} /> Post Vacancy
                  </Button>
                </Link>
              </div>

              {orgJobs.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-zinc-100 rounded-2xl text-center">
                  <p className="text-sm font-bold text-zinc-400 mb-4">No active opportunities posted yet.</p>
                  <Link to="/jobs/create">
                    <Button size="sm">Create First Posting</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden bg-white">
                  {orgJobs.map((job) => (
                    <div 
                      key={job.id}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-zinc-50 cursor-pointer transition-all border-b last:border-0 border-zinc-100"
                    >
                      <div className="space-y-1.5 flex-grow">
                        <h4 className="font-black text-zinc-900 tracking-tight group-hover:text-primary transition-colors hover:underline">
                          {job.title}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-semibold">
                          <span className="bg-primary/5 text-primary text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">
                            {job.cadreRequired.replace(/_/g, ' ')}
                          </span>
                          <span className="flex items-center gap-1 uppercase text-[10px] font-bold">
                            <Clock size={12} className="text-zinc-300" /> {job.employmentType.replace(/_/g, ' ')}
                          </span>
                          <span className="flex items-center gap-1 uppercase text-[10px]">
                            <MapPin size={12} className="text-zinc-300" /> {job.district}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Responses</p>
                          <p className="text-sm font-extrabold text-zinc-800">{job.interestCount || 0} Interested</p>
                        </div>
                        <ChevronRight size={18} className="text-zinc-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Business Pharmacy Listings for Sale Widget */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-150 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-zinc-950 tracking-tight">Active Pharmacy Business Listings</h3>
                  <p className="text-xs text-zinc-400 font-semibold mt-0.5">Listed pharmacies or clinical drugstores for sale / merger.</p>
                </div>
                <Link to="/marketplace/businesses/create">
                  <Button variant="outline" size="sm" className="font-bold flex items-center gap-1 rounded-xl">
                    <Plus size={14} /> Sell Business
                  </Button>
                </Link>
              </div>

              {orgListings.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-zinc-100 rounded-2xl text-center">
                  <p className="text-sm font-bold text-zinc-400 mb-4">You have no business listings currently active.</p>
                  <Link to="/marketplace/businesses/create">
                    <Button size="sm">Create Sell Listing</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orgListings.map((list) => {
                    const priceFormatted = typeof list.askingPrice === 'number' 
                      ? `UGX ${list.askingPrice.toLocaleString()}` 
                      : list.askingPrice;

                    return (
                      <div 
                        key={list.id} 
                        className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100 flex flex-col justify-between h-full hover:shadow-sm"
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-2">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                              list.status === 'sold' ? "bg-zinc-100 text-zinc-400 border-zinc-200" :
                              list.status === 'active' ? "bg-green-50 text-green-700 border-green-200" :
                              "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              {list.status}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 uppercase">
                              <Eye size={12} /> {list.viewCount || 0} Views
                            </span>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-zinc-900 leading-snug line-clamp-1 hover:underline cursor-pointer" onClick={() => navigate(`/marketplace/businesses/${list.id}`)}>
                              {list.listingTitle}
                            </h4>
                            <p className="text-xs text-zinc-500 font-medium mt-1">District: {list.district}</p>
                            <p className="text-sm font-black text-primary mt-2">{priceFormatted || 'Confidential Asking'}</p>
                          </div>
                        </div>

                        {/* Interactive Direct Dashboard Actions from Spec */}
                        <div className="flex items-center gap-2 pt-4 border-t border-zinc-100 mt-4">
                          <Button 
                            variant="outline" 
                            fullWidth 
                            size="sm"
                            className="text-xs font-semibold py-1.5 flex items-center gap-1"
                            onClick={() => navigate(`/marketplace/businesses/${list.id}/edit`)}
                          >
                            <Edit size={12} /> Edit
                          </Button>
                          {list.status !== 'sold' && (
                            <Button 
                              fullWidth 
                              size="sm"
                              className="text-xs font-semibold py-1.5"
                              onClick={() => handleQuickMarkAsSold(list.id)}
                            >
                              Mark Sold
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Organisation Right Sidebar Widget (1 Column) */}
          <div className="space-y-8">
            
            {/* Unread messages Activity from Spec */}
            <div className="bg-white rounded-3xl p-6 border border-zinc-150 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-zinc-950 uppercase tracking-wide">Unread Active Chats</h3>
                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">LIVE</span>
              </div>
              <p className="text-xs text-zinc-400 font-semibold mb-5">Incoming messages from candidate professionals in the Uganda market.</p>

              {orgChats.length === 0 ? (
                <div className="bg-zinc-50 p-6 rounded-2xl border border-dotted border-zinc-100 text-center">
                  <p className="text-xs font-semibold text-zinc-400 leading-relaxed">No messaging conversations started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orgChats.map((chat) => (
                    <Link
                      key={chat.id}
                      to="/messages"
                      className="flex items-center justify-between p-3.5 bg-zinc-50 hover:bg-zinc-100 rounded-2xl border border-zinc-100 transition-all group cursor-pointer"
                    >
                      <div className="space-y-1.5 w-full pr-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-extrabold text-zinc-805 truncate">
                            {chat.lastSenderEmail || 'Pharmaceutics Candidate'}
                          </p>
                          {chat.unreadCountForThisUser > 0 && (
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
                          )}
                        </div>
                        
                        <p className="text-[11px] text-zinc-400 font-medium truncate italic line-clamp-1">
                          "{chat.lastMessageText || 'No message content'}"
                        </p>
                      </div>

                      <div className="shrink-0">
                        {chat.unreadCountForThisUser > 0 ? (
                          <span className="bg-green-500 text-white font-black text-[9px] h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center">
                            {chat.unreadCountForThisUser}
                          </span>
                        ) : (
                          <ChevronRight size={14} className="text-zinc-300 group-hover:translate-x-1 transition-transform" />
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Registered Entities summary info block */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-3xl p-6 shadow-xl">
              <h3 className="font-black text-sm uppercase tracking-widest text-zinc-405 border-b border-white/10 pb-2 mb-4">Company Profile</h3>
              
              {profile && 'organisations' in profile && profile.organisations.length > 0 ? (
                <div className="space-y-4">
                  {profile.organisations.map((org: any, idx: number) => (
                    <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                      <p className="text-xs font-black uppercase text-primary-light brightness-125">NDA Compliant Entity</p>
                      <h4 className="font-extrabold text-white text-base leading-tight tracking-tight">{org.organisationName}</h4>
                      <p className="text-xs text-zinc-400 font-semibold">{org.district}, Uganda</p>
                      <p className="text-[11px] text-zinc-500 font-semibold mt-1">Licence: {org.ndaLicenceNumber || 'NDA Verified'}</p>
                    </div>
                  ))}
                  <Link to="/profile">
                    <Button variant="accent" size="sm" fullWidth className="font-black rounded-xl text-center">
                      Manage Company Details
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 text-center py-4">
                  <p className="text-xs text-zinc-400">No organisation details found.</p>
                  <Link to="/profile">
                    <Button variant="accent" size="sm" fullWidth>Link Pharmacy</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
