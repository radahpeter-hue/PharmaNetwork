import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Button } from '../components/Button';
import { JobPosting } from '../types';
import { Toast, ToastType } from '../components/Toast';
import { ReportButton } from '../components/ReportButton';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  Building, 
  MessageSquare, 
  ExternalLink,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConversationView } from '../components/ConversationView';
import { cn } from '../lib/utils';

const JobPostingDetail: React.FC = () => {
  const { postingId } = useParams();
  const { user, userAccount, profile } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [similarJobs, setSimilarJobs] = useState<JobPosting[]>([]);
  const [hasInterest, setHasInterest] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  useEffect(() => {
    const fetchJob = async () => {
      if (!postingId) return;
      try {
        const docSnap = await getDoc(doc(db, 'jobPostings', postingId));
        if (docSnap.exists()) {
          const jobData = { ...docSnap.data(), id: docSnap.id } as JobPosting;
          setJob(jobData);
          if (jobData.status === 'active') {
            fetchSimilar(jobData.cadreRequired, postingId);
          }
        }
      } catch (err) {
        console.error('Error fetching job:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchSimilar = async (cadre: string, currentId: string) => {
      try {
        const q = query(
          collection(db, 'jobPostings'),
          where('cadreRequired', '==', cadre),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map(doc => ({ ...doc.data(), id: doc.id } as JobPosting))
          .filter(j => j.id !== currentId)
          .slice(0, 3);
        setSimilarJobs(data);
      } catch (err) {
        console.error('Error fetching similar jobs:', err);
      }
    };

    const checkInterest = async () => {
      if (!user || userAccount?.accountType !== 'individual' || !postingId) return;
      const q = query(
        collection(db, 'interestEvents'),
        where('actorId', '==', user.uid),
        where('targetId', '==', postingId)
      );
      const snap = await getDocs(q);
      setHasInterest(!snap.empty);
    };

    fetchJob();
    checkInterest();
  }, [postingId, user, userAccount]);

  const handleInterest = async () => {
    if (!job || !user || hasInterest) return;

    try {
      // 1. Log interest event
      await addDoc(collection(db, 'interestEvents'), {
        actorId: user.uid,
        targetId: job.id,
        type: 'job_interest',
        timestamp: Timestamp.now()
      });

      // 2. Increment count
      await updateDoc(doc(db, 'jobPostings', job.id!), {
        interestCount: increment(1)
      });

      setHasInterest(true);
      setToast({ isVisible: true, message: 'Expression of interest logged.', type: 'success' });

      // 3. Open contact link
      const message = encodeURIComponent(`Hello, I saw your job posting for "${job.title}" on PharmaNetwork Uganda and am interested in applying. My name is ${(profile as any)?.fullName || 'a professional'}.`);
      if (job.contactMethod === 'whatsapp') {
        const phone = job.contactDetail.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      } else {
        window.location.href = `mailto:${job.contactDetail}?subject=${encodeURIComponent(`Interest in ${job.title}`)}&body=${message}`;
      }
    } catch (err) {
      console.error('Error expressing interest:', err);
      setToast({ isVisible: true, message: 'Something went wrong. Please try again.', type: 'error' });
    }
  };

  const handleClosePosting = async () => {
     if (!job) return;
     try {
       await updateDoc(doc(db, 'jobPostings', job.id!), { status: 'closed' });
       await updateDoc(doc(db, 'platformStats', 'counts'), { activeOpportunities: increment(-1) });
       setToast({ isVisible: true, message: 'Posting closed.', type: 'success' });
       setTimeout(() => navigate('/my-postings'), 1500);
     } catch (err) {
       setToast({ isVisible: true, message: 'Failed to close posting.', type: 'error' });
     }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Loading Opportunity...</p>
    </div>
  );

  if (!job || job.status !== 'active') return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300 mx-auto mb-6">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-4">This posting is no longer available.</h2>
      <Button variant="ghost" onClick={() => navigate('/jobs')}>Back to Job Board</Button>
    </div>
  );

  const isOwner = user?.uid === job.organisationUserId;
  const formatDate = (ts: any) => ts?.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link to="/jobs" className="inline-flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors mb-8 group font-bold uppercase text-[10px] tracking-widest">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Job Board
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-10">
          <div className="space-y-6">
             <div className="flex flex-wrap gap-2">
                <span className="bg-primary/5 text-primary text-[10px] font-bold px-3 py-1.5 rounded-full uppercase border border-primary/10 flex items-center gap-1.5">
                  <Award size={12} />
                  {job.cadreRequired.replace(/_/g, ' ')}
                </span>
                <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase border border-amber-200/50 flex items-center gap-1.5">
                  <Clock size={12} />
                  {job.employmentType.replace(/_/g, ' ')}
                </span>
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-primary leading-[0.9] tracking-tight">{job.title}</h1>
             
             <div className="flex flex-wrap items-center gap-6 text-zinc-500 text-sm py-4 border-y border-zinc-50">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-zinc-300" />
                  <span className="font-semibold">{job.district}, Uganda</span>
                </div>
                <div className="flex items-center gap-2">
                   <Calendar size={18} className="text-zinc-300" />
                   <span>Posted {formatDate(job.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                   <AlertCircle size={18} className="text-amber-500" />
                   <span className="text-amber-700 font-bold">Expires {formatDate(job.expiresAt)}</span>
                </div>
             </div>

              <div className="flex items-center gap-2 text-sm text-zinc-400">
                 <Users size={16} />
                 <span className="font-bold">{job.interestCount} professionals expressed interest</span>
              </div>

              <div className="pt-2">
                <ReportButton
                  contentType="job_posting"
                  contentId={job.id!}
                  contentOwnerId={job.organisationUserId}
                  contentTitle={job.title}
                />
              </div>
           </div>

          <div className="prose prose-zinc max-w-none">
             <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Job Description</h3>
             <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.requirements && (
            <div className="bg-zinc-50 p-8 rounded-3xl border-l-4 border-l-primary">
               <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Requirements</h3>
               <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
            </div>
          )}

          {/* Similar Postings */}
          {similarJobs.length > 0 && (
            <div className="pt-12 border-t border-zinc-100">
               <h3 className="text-lg font-bold text-zinc-900 mb-6">Similar Opportunities</h3>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {similarJobs.map(sj => (
                    <Link key={sj.id} to={`/jobs/${sj.id}`} className="block group">
                       <div className="bg-white p-4 rounded-2xl border border-zinc-100 hover:border-primary/30 transition-all h-full flex flex-col">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 line-clamp-1">{sj.organisationName}</p>
                          <h4 className="text-sm font-bold text-zinc-900 line-clamp-2 mb-4 group-hover:text-primary transition-colors">{sj.title}</h4>
                          <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
                             <div className="flex items-center gap-1">
                                <MapPin size={12} />
                                {sj.district}
                             </div>
                             <span className="text-primary font-bold">View →</span>
                          </div>
                       </div>
                    </Link>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Sidebar / Actions */}
        <div className="space-y-8">
           <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm sticky top-24">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-3xl font-bold italic">
                  {job.organisationName[0]}
                </div>
                <div>
                   <h2 className="font-bold text-zinc-900">{job.organisationName}</h2>
                   <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                      <Building size={14} className="text-zinc-300" />
                      {job.organisationDistrict}
                   </div>
                </div>
              </div>

              {!user ? (
                <div className="text-center p-6 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                   <p className="text-sm text-zinc-500 mb-4">Log in to express interest and see contact details.</p>
                   <Link to="/login" state={{ from: window.location.pathname }}>
                     <Button fullWidth>Log In</Button>
                   </Link>
                </div>
              ) : isOwner ? (
                <div className="space-y-4">
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-center">Your Posting</p>
                   <Button variant="outline" fullWidth onClick={() => navigate(`/jobs/${job.id}/edit`)}>Edit Posting</Button>
                   <button 
                     onClick={handleClosePosting}
                     className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
                   >
                     Close Posting
                   </button>
                </div>
              ) : userAccount?.accountType === 'organisation' ? (
                <div className="bg-zinc-50 p-6 rounded-2xl text-center">
                   <AlertCircle className="mx-auto text-zinc-400 mb-3" size={24} />
                   <p className="text-xs text-zinc-500">This posting is for individual professionals seeking work.</p>
                </div>
              ) : hasInterest ? (
                <div className="bg-zinc-50 p-6 rounded-2xl text-center border-t-2 border-primary">
                   <CheckCircle className="mx-auto text-primary mb-3" size={24} />
                   <p className="text-sm font-bold text-zinc-900">Interest Expressed</p>
                   <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Wait for employer contact</p>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                      <MessageSquare size={16} className="text-amber-600" />
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                        {job.contactMethod === 'whatsapp' ? 'WhatsApp Direct' : 'Email Direct'}
                      </span>
                   </div>
                   <Button fullWidth size="lg" onClick={handleInterest}>Express Interest</Button>
                   <button 
                     onClick={() => setShowChat(true)}
                     className="w-full bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-extrabold py-3.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                   >
                     <MessageSquare size={14} />
                     Send Message
                   </button>
                   <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
                     Expressing interest will notify the employer and log your engagement.
                   </p>
                </div>
              )}
           </div>
        </div>
      </div>

      <Toast {...toast} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />

      {/* Slide-in Conversation view panel */}
      <AnimatePresence>
        {showChat && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-xs"
              onClick={() => setShowChat(false)}
            />
            {/* Sliding Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <ConversationView
                recipientUid={job.organisationUserId}
                recipientName={job.organisationName}
                relatedPostingId={job.id}
                relatedPostingTitle={job.title}
                onClose={() => setShowChat(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default JobPostingDetail;

function CheckCircle({ className, size }: { className?: string, size?: number }) {
  return (
    <div className={cn("rounded-full border-2 border-current flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <div className="w-[40%] h-[60%] rotate-45 border-r-2 border-b-2 border-current -mt-0.5"></div>
    </div>
  );
}
