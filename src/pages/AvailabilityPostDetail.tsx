import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, Timestamp, runTransaction } from 'firebase/firestore';
import { Button } from '../components/Button';
import { AvailabilityPost, OrganisationProfile } from '../types';
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
  Briefcase,
  AlertCircle,
  Award,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConversationView } from '../components/ConversationView';
import { cn } from '../lib/utils';

const AvailabilityPostDetail: React.FC = () => {
  const { postId } = useParams();
  const { user, userAccount, profile } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<AvailabilityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInterest, setHasInterest] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      try {
        const docSnap = await getDoc(doc(db, 'availabilityPosts', postId));
        if (docSnap.exists()) {
          const data = { ...docSnap.data(), id: docSnap.id } as AvailabilityPost;
          setPost(data);
        }
      } catch (err) {
        console.error('Error fetching post:', err);
      } finally {
        setLoading(false);
      }
    };

    const checkInterest = async () => {
      if (!user || userAccount?.accountType !== 'organisation' || !postId) return;
      const eventId = `availability_interest__${postId}__${user.uid}`;
      const snap = await getDoc(doc(db, 'interestEvents', eventId));
      setHasInterest(snap.exists());
    };

    fetchPost();
    checkInterest();
  }, [postId, user, userAccount]);

  const handleContact = async () => {
    if (!post || !user || userAccount?.accountType !== 'organisation' || !post.id) return;

    try {
      const eventId = `availability_interest__${post.id}__${user.uid}`;
      const eventRef = doc(db, 'interestEvents', eventId);
      const postRef = doc(db, 'availabilityPosts', post.id);

      const created = await runTransaction(db, async transaction => {
        const existingInterest = await transaction.get(eventRef);
        if (existingInterest.exists()) return false;

        transaction.set(eventRef, {
          actorId: user.uid,
          targetId: post.id,
          type: 'availability_interest',
          timestamp: Timestamp.now()
        });

        transaction.update(postRef, {
          interestCount: increment(1)
        });

        return true;
      });

      setHasInterest(true);
      setToast({
        isVisible: true,
        message: created ? 'Contact interest logged.' : 'Interest was already recorded.',
        type: 'success'
      });

      // Open contact link
      const orgProfile = profile as OrganisationProfile;
      const orgName = orgProfile.organisations?.[0]?.organisationName || 'an organisation';
      const message = encodeURIComponent(`Hello ${post.fullName}, I saw your availability post on PharmaNetwork Uganda and would like to discuss an opportunity. I am from ${orgName}.`);
      
      if (post.contactMethod === 'whatsapp') {
        const phone = post.contactDetail.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      } else {
        window.location.href = `mailto:${post.contactDetail}?subject=${encodeURIComponent('Opportunity - PharmaNetwork Uganda')}&body=${message}`;
      }
    } catch (err) {
      console.error('Error contacting professional:', err);
      setToast({ isVisible: true, message: 'Something went wrong.', type: 'error' });
    }
  };

  const handleClosePost = async () => {
     if (!post) return;
     try {
       await updateDoc(doc(db, 'availabilityPosts', post.id!), { status: 'closed' });
       setToast({ isVisible: true, message: 'Post closed.', type: 'success' });
       setTimeout(() => navigate('/my-postings'), 1500);
     } catch (err) {
       setToast({ isVisible: true, message: 'Failed to close.', type: 'error' });
     }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Loading Profile...</p>
    </div>
  );

  const postExpired = !!post?.expiresAt
    && (post.expiresAt.toMillis ? post.expiresAt.toMillis() : new Date(post.expiresAt).getTime()) <= Date.now();

  if (!post || post.status !== 'active' || postExpired) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300 mx-auto mb-6">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-4">This posting is no longer available.</h2>
      <Button variant="ghost" onClick={() => navigate('/jobs')}>Back to Job Board</Button>
    </div>
  );

  const isOwner = user?.uid === post.individualUserId;
  const formatDate = (ts: any) => ts?.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link to="/jobs" className="inline-flex items-center gap-2 text-zinc-400 hover:text-amber-600 transition-colors mb-8 group font-bold uppercase text-[10px] tracking-widest">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Board
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
           <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                 <span className="bg-green-50 text-primary-light text-[10px] font-bold px-3 py-1.5 rounded-full uppercase border border-primary/10 flex items-center gap-1.5">
                   <Award size={12} />
                   {post.primaryCadre.replace(/_/g, ' ')}
                 </span>
                 {post.preferredEmploymentTypes.map(t => (
                    <span key={t} className="bg-amber-50 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase border border-amber-200/50 flex items-center gap-1.5">
                      <Clock size={12} />
                      {t.replace(/_/g, ' ')}
                    </span>
                 ))}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-zinc-900 leading-[0.9] tracking-tight">{post.headline}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-zinc-500 text-sm py-4 border-y border-zinc-50 font-medium uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-zinc-300" />
                  <span>{post.district}, Uganda</span>
                </div>
                <div className="flex items-center gap-2">
                   <Calendar size={18} className="text-zinc-300" />
                   <span>Posted {formatDate(post.createdAt)}</span>
                </div>
             </div>

              <div className="pt-2">
                <ReportButton
                  contentType="availability_post"
                  contentId={post.id!}
                  contentOwnerId={post.individualUserId}
                  contentTitle={post.headline}
                />
              </div>
           </div>

           <div className="prose prose-zinc max-w-none">
             <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Availability & Experience</h3>
             <p className="text-zinc-700 text-lg leading-relaxed italic whitespace-pre-wrap">"{post.description}"</p>
           </div>

           <div className="pt-8 border-t border-zinc-50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6">Professional Credentials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <ShieldCheck className="text-zinc-300 shrink-0" size={20} />
                    <div>
                       <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Registration</p>
                       <p className="text-sm font-bold text-zinc-700">{post.registrationNumber || "Self-declared Professional"}</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <MapPin className="text-zinc-300 shrink-0" size={20} />
                    <div>
                       <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Primary District</p>
                       <p className="text-sm font-bold text-zinc-700">{post.district}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl sticky top-24">
              <div className="flex items-center gap-4 mb-8 pb-8 border-b border-zinc-50">
                <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 text-4xl font-black italic overflow-hidden shadow-inner">
                  {post.profilePhotoUrl ? <img src={post.profilePhotoUrl} className="w-full h-full object-cover" /> : post.fullName[0]}
                </div>
                <div>
                   <h2 className="font-bold text-zinc-900 border-b border-amber-50 pb-1 mb-1">{post.fullName}</h2>
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      <Award size={12} />
                      {post.primaryCadre.replace(/_/g, ' ')}
                   </div>
                </div>
              </div>

              {!user ? (
                <div className="text-center space-y-4">
                   <p className="text-sm text-zinc-500">Log in to contact this professional.</p>
                   <Link to="/login" state={{ from: window.location.pathname }}>
                     <Button fullWidth>Log In</Button>
                   </Link>
                </div>
              ) : isOwner ? (
                <div className="space-y-4">
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-center">Your Post</p>
                   <Button variant="outline" fullWidth onClick={() => navigate(`/availability/${post.id}/edit`)}>Edit Post</Button>
                   <button 
                     onClick={handleClosePost}
                     className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
                   >
                     Close Post
                   </button>
                </div>
              ) : userAccount?.accountType === 'individual' ? (
                <div className="bg-zinc-50 p-6 rounded-2xl text-center border-t border-amber-200">
                   <AlertCircle className="mx-auto text-zinc-400 mb-3" size={24} />
                   <p className="text-xs text-zinc-500 font-medium">Contact details are reserved for hiring organisations.</p>
                </div>
              ) : (
                <div className="space-y-6">
                   <p className="text-xs text-zinc-500 leading-relaxed text-center font-bold uppercase tracking-tight">Express interest to start hiring process</p>
                   <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-amber-600 shadow-sm">
                        {post.contactMethod === 'whatsapp' ? <MessageSquare size={16} /> : <Mail size={16} />}
                      </div>
                      <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{post.contactMethod} Available</span>
                   </div>
                   <Button fullWidth size="lg" onClick={handleContact}>Contact Professional</Button>
                   <button 
                     onClick={() => setShowChat(true)}
                     className="w-full bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-extrabold py-3.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                   >
                     <MessageSquare size={14} />
                     Send Platform Message
                   </button>
                   <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-bold uppercase">
                      <Users size={12} />
                      {post.interestCount} total interests
                   </div>
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
                recipientUid={post.individualUserId}
                recipientName={post.fullName}
                recipientPhotoUrl={post.profilePhotoUrl || undefined}
                relatedPostingId={post.id}
                relatedPostingTitle={post.headline}
                onClose={() => setShowChat(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AvailabilityPostDetail;
