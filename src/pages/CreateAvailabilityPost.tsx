import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Button } from '../components/Button';
import { Toast, ToastType } from '../components/Toast';
import { PHARMA_CADRES, UGANDA_DISTRICTS, EMPLOYMENT_TYPES, CONTACT_METHODS } from '../constants';
import { User, MapPin, Phone, Mail, Award, AlertCircle, Eye, CheckCircle2, MessageSquare, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { IndividualProfile } from '../types';
import { cn } from '../lib/utils';

const CreateAvailabilityPost: React.FC = () => {
  const { user, userAccount, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    headline: '',
    description: '',
    preferredEmploymentTypes: [] as string[],
    contactMethod: 'whatsapp' as 'whatsapp' | 'email',
    contactDetail: ''
  });

  const [existingPostId, setExistingPostId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  const indProfile = profile as IndividualProfile;

  useEffect(() => {
    const checkExisting = async () => {
      if (!user) return;
      const q = query(
        collection(db, 'availabilityPosts'),
        where('individualUserId', '==', user.uid),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setExistingPostId(snap.docs[0].id);
      }
    };
    checkExisting();
  }, [user]);

  // Access check
  if (loading) return null;
  if (!user || userAccount?.accountType !== 'individual') {
    return <Navigate to="/dashboard" replace />;
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      preferredEmploymentTypes: prev.preferredEmploymentTypes.includes(type)
        ? prev.preferredEmploymentTypes.filter(t => t !== type)
        : [...prev.preferredEmploymentTypes, type]
    }));
  };

  const validate = () => {
    if (!formData.headline || !formData.description || formData.preferredEmploymentTypes.length === 0 || !formData.contactDetail) {
      return 'Please fill all required fields.';
    }
    if (formData.description.length < 50) {
      return 'Description must be at least 50 characters.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingPostId) return;

    const error = validate();
    if (error) {
      setToast({ isVisible: true, message: error, type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 60 * 24 * 60 * 60 * 1000);

      const postData = {
        individualUserId: user.uid,
        fullName: indProfile.fullName,
        primaryCadre: indProfile.primaryCadre,
        district: indProfile.district,
        profilePhotoUrl: indProfile.profilePhotoUrl || '',
        registrationNumber: indProfile.registrationNumber,
        ...formData,
        status: 'active',
        createdAt: now,
        expiresAt: expiresAt,
        interestCount: 0
      };

      await addDoc(collection(db, 'availabilityPosts'), postData);
      
      setToast({ isVisible: true, message: 'Your availability post is live.', type: 'success' });
      setTimeout(() => navigate('/jobs'), 2000); // Redirect to board, naturally user will see available tab
    } catch (err) {
      console.error('Error creating post:', err);
      setToast({ isVisible: true, message: 'Something went wrong.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Create Availability Post</h1>
        <p className="text-zinc-500">Let hiring organisations find you by stating your availability and preferences.</p>
      </div>

      {existingPostId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4 mb-10">
          <AlertCircle className="text-amber-600 shrink-0 mt-1" size={24} />
          <div>
            <h4 className="font-bold text-amber-800 mb-1">Active Post Exists</h4>
            <p className="text-sm text-amber-700 mb-4">You already have an active availability post. Update it or close it before creating a new one.</p>
            <Link to="/my-postings" className="text-sm font-bold text-amber-900 underline hover:no-underline">Manage My Postings →</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit} className={cn("lg:col-span-3 space-y-8", existingPostId && "opacity-50 pointer-events-none")}>
          <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-8">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-zinc-900">Post Information</h2>
              
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Headline *</label>
                <input 
                  type="text"
                  name="headline"
                  required
                  maxLength={100}
                  placeholder="e.g. Registered Pharmacist available in Kampala, full-time"
                  value={formData.headline}
                  onChange={handleInputChange}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-zinc-700">Detailed Description *</label>
                  <span className="text-[10px] font-bold text-zinc-400">{formData.description.length} / 400</span>
                </div>
                <textarea 
                  name="description"
                  required
                  minLength={50}
                  maxLength={400}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your experience, what you are looking for, and your availability."
                  rows={4}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-4">Preferred Employment Types *</label>
                <div className="grid grid-cols-2 gap-4">
                  {EMPLOYMENT_TYPES.map(type => (
                    <label key={type.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 cursor-pointer hover:border-primary/30 transition-all group">
                       <div className={cn(
                         "w-5 h-5 rounded flex items-center justify-center border-2 transition-all",
                         formData.preferredEmploymentTypes.includes(type.id) ? "bg-primary border-primary text-white" : "border-zinc-200"
                       )}>
                         {formData.preferredEmploymentTypes.includes(type.id) && <CheckCircle2 size={14} />}
                       </div>
                       <input 
                         type="checkbox" 
                         className="hidden" 
                         checked={formData.preferredEmploymentTypes.includes(type.id)}
                         onChange={() => handleCheckboxChange(type.id)}
                       />
                       <span className="text-sm font-semibold text-zinc-600 group-hover:text-zinc-900">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-8 border-t border-zinc-100">
               <h2 className="text-lg font-bold text-zinc-900">Contact Preferences</h2>
               
               <div className="flex gap-4">
                 {CONTACT_METHODS.map(method => (
                   <label 
                     key={method.id}
                     className={cn(
                       "flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all uppercase text-[10px] font-bold tracking-widest",
                       formData.contactMethod === method.id 
                         ? "border-primary bg-primary/5 text-primary" 
                         : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200"
                     )}
                   >
                     <input 
                       type="radio" 
                       name="contactMethod" 
                       value={method.id} 
                       checked={formData.contactMethod === method.id}
                       onChange={(e) => setFormData(prev => ({ ...prev, contactMethod: e.target.value as any }))}
                       className="hidden"
                     />
                     {method.id === 'whatsapp' ? <MessageSquare size={16} /> : <Mail size={16} />}
                     {method.label}
                   </label>
                 ))}
               </div>

               <div>
                 <label className="block text-sm font-semibold text-zinc-700 mb-2">
                   {formData.contactMethod === 'whatsapp' ? 'WhatsApp Phone *' : 'Email Address *'}
                 </label>
                 <input 
                   type={formData.contactMethod === 'whatsapp' ? 'tel' : 'email'}
                   name="contactDetail"
                   required
                   value={formData.contactDetail}
                   onChange={handleInputChange}
                   placeholder={formData.contactMethod === 'whatsapp' ? 'e.g. 0702400004' : 'e.g. hello@sarah.ug'}
                   className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                 />
               </div>
            </div>

            <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
               Launch Availability Post
            </Button>
          </div>
        </form>

        {/* Preview */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase text-[10px] tracking-widest px-1">
              <Eye size={14} />
              Live Preview
           </div>
           
           <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl translate-x-12 -translate-y-12"></div>
              
              <div className="flex gap-4 items-start mb-6">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 text-amber-600 overflow-hidden uppercase font-bold text-xl ring-2 ring-white shadow-sm">
                  {indProfile.profilePhotoUrl ? (
                     <img src={indProfile.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                     indProfile.fullName[0]
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">{indProfile.fullName}</span>
                  <h3 className="font-bold text-zinc-900 border-b border-zinc-50 pb-2 truncate text-sm">
                    {formData.headline || 'Your Headline Here...'}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                 <span className="bg-green-50 text-primary-light text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase border border-primary/10">
                   {indProfile.primaryCadre.replace(/_/g, ' ')}
                 </span>
                 {formData.preferredEmploymentTypes.length > 0 ? (
                   formData.preferredEmploymentTypes.map(t => (
                     <span key={t} className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase">
                       {t.replace(/_/g, ' ')}
                     </span>
                   ))
                 ) : (
                    <span className="bg-zinc-50 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter italic">No selected types</span>
                 )}
              </div>

              <p className="text-xs text-zinc-500 line-clamp-2 mb-6 leading-relaxed italic">
                "{formData.description || 'Compose a description at least 50 chars long to let employers know your expertise...'}"
              </p>

              <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
                 <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-semibold">
                       <MapPin size={14} className="text-zinc-300" />
                       {indProfile.district}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                       <Clock size={12} />
                       Posted Just Now
                    </div>
                 </div>
                 <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-300 border border-zinc-100">
                    <Eye size={16} />
                 </div>
              </div>
           </div>
           
           <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 border-dashed">
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                <AlertCircle className="inline mr-1 text-zinc-400" size={14} />
                Your contact details and profile data are automatically included. You can manage visibility from your dashboard.
              </p>
           </div>
        </div>
      </div>

      <Toast {...toast} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
    </div>
  );
};

export default CreateAvailabilityPost;
