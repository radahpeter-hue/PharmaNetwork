import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { IndividualProfile, OrganisationProfile } from '../types';
import { 
  User as UserIcon, 
  MapPin, 
  Phone, 
  Award, 
  Calendar, 
  FileText, 
  Linkedin, 
  Edit, 
  CheckCircle,
  Building,
  Globe,
  Tag,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  UploadCloud,
  Loader2,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Profile: React.FC = () => {
  const { user, userAccount, profile, refreshUserData } = useAuth();
  const navigate = useNavigate();

  // Verification request workflow states
  const [uploading, setUploading] = useState(false);
  const [regFile, setRegFile] = useState<File | null>(null);
  const [pracFile, setPracFile] = useState<File | null>(null);
  const [newPracFile, setNewPracFile] = useState<File | null>(null);
  const [showRenewForm, setShowRenewForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAllowedVerificationFile = (file: File) =>
    ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);

  if (!profile) return null;

  const isIndividual = 'fullName' in profile;
  const completeness = profile.profileCompleteness || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Completeness Bar */}
      <div className="bg-zinc-900 text-white p-6 rounded-2xl mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
         <div className="relative z-10">
            <h2 className="text-xl font-bold mb-1">Your Profile</h2>
            <p className="text-zinc-400 text-sm">Complete your profile to improve the information available to other members.</p>
         </div>
         <div className="flex items-center gap-4 relative z-10">
            <div className="flex flex-col items-end">
               <span className="text-2xl font-bold">{completeness}%</span>
               <span className="text-[10px] uppercase font-bold text-primary-light brightness-150">Completeness</span>
            </div>
            <div className="w-40 bg-zinc-800 h-2 rounded-full overflow-hidden border border-zinc-700">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${completeness}%` }}
                 className="h-full bg-primary"
               />
            </div>
         </div>
         {/* Background decoration */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full translate-x-32 -translate-y-32"></div>
      </div>

      {isIndividual && completeness < 60 && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>Your profile is not yet eligible for directory visibility. Complete it to at least 60% and maintain ACTIVE professional status.</span>
          <button onClick={() => navigate('/profile/edit')} className="font-bold underline underline-offset-2">Complete profile</button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
        {/* Cover Placeholder */}
        <div className="h-40 bg-gradient-to-r from-primary/80 to-primary-light relative">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
           <button
             onClick={() => navigate(isIndividual ? '/profile/edit' : '/profile/edit/organisation')}
             className="absolute bottom-4 right-6 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all"
           >
              <Edit size={14} />
              Edit Profile
           </button>
        </div>

        <div className="px-8 pb-12 relative">
          <div className="flex flex-col md:flex-row gap-8 -mt-16 mb-12">
            {/* Photo */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-primary flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden">
                {isIndividual 
                  ? (profile as IndividualProfile).profilePhotoUrl 
                    ? <img src={(profile as IndividualProfile).profilePhotoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : (profile as IndividualProfile).fullName[0].toUpperCase()
                  : (profile as OrganisationProfile).organisations.length > 0
                    ? (profile as OrganisationProfile).organisations[0].organisationName[0].toUpperCase()
                    : <Building size={32} />
                }
              </div>
            </div>

            <div className="pt-20 md:pt-16 flex-grow">
               <div className="flex flex-wrap items-center gap-3 mb-2">
                 <h1 className="text-3xl font-bold text-zinc-900">
                   {isIndividual ? (profile as IndividualProfile).fullName : (profile as OrganisationProfile).organisations[0]?.organisationName || "Organisation"}
                 </h1>
                 {isIndividual && (profile as IndividualProfile).credentialVerificationStatus === 'verified' && (
                   <span className="bg-indigo-650 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 border border-indigo-700 shadow-sm animate-fade-in">
                     <CheckCircle size={12} className="fill-white text-indigo-600" />
                     Verified Pro
                   </span>
                 )}
                 {isIndividual && (
                   <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-primary/20">
                     <Award size={12} />
                     {(profile as IndividualProfile).primaryCadre.replace('_', ' ')}
                   </span>
                 )}
               </div>

               <div className="flex flex-wrap gap-6 text-sm text-zinc-500">
                 <div className="flex items-center gap-1.5">
                   <MapPin size={16} className="text-zinc-400" />
                   {isIndividual ? (profile as IndividualProfile).district : (profile as OrganisationProfile).organisations[0]?.district}, Uganda
                 </div>
                 {isIndividual && (profile as IndividualProfile).availabilityStatus && (
                   <div className="flex items-center gap-1.5">
                     <div className={cn(
                       "w-2 h-2 rounded-full",
                       (profile as IndividualProfile).availabilityStatus === 'actively_seeking' ? "bg-green-500 animate-pulse" : "bg-amber-500"
                     )} />
                     {(profile as IndividualProfile).availabilityStatus.replace('_', ' ')}
                   </div>
                 )}
               </div>
            </div>
          </div>

          <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-12"
              >
                {/* Main Content */}
                <div className="md:col-span-2 space-y-12">
                   <section>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">About</h3>
                      <p className="text-zinc-600 leading-relaxed italic">
                        {isIndividual 
                          ? (profile as IndividualProfile).bio || "No bio added yet."
                          : (profile as OrganisationProfile).organisations[0]?.about || "No description added yet."
                        }
                      </p>
                   </section>

                   <section>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                         {isIndividual ? (
                           <>
                              <DetailItem icon={Calendar} label="Years Experience" value={(profile as IndividualProfile).yearsExperience.replace('_', ' ')} />
                              <DetailItem icon={Award} label="Highest Qualification" value={(profile as IndividualProfile).qualification} />
                              <DetailItem icon={FileText} label="Registration" value={(profile as IndividualProfile).registrationNumber || "Not provided"} />
                              <DetailItem icon={Phone} label="Contact" value={(profile as IndividualProfile).phone} />
                           </>
                         ) : (
                           <>
                              <DetailItem icon={ShieldCheck} label="NDA License" value={(profile as OrganisationProfile).organisations[0]?.ndaLicenceNumber || "Provided"} />
                              <DetailItem icon={Building} label="Branches" value={(profile as OrganisationProfile).organisations[0]?.branchCount || "1"} />
                              <DetailItem icon={Phone} label="Contact" value={(profile as OrganisationProfile).organisations[0]?.contactPhone || "None"} />
                           </>
                         )}
                      </div>
                   </section>

                   <section>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
                        {isIndividual ? "Areas of Practice" : "Registered Entities"}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {isIndividual ? (
                           (profile as IndividualProfile).areasOfPractice.map(item => (
                             <span key={item} className="bg-primary/5 text-primary px-3 py-1.5 rounded-lg text-sm font-medium border border-primary/10">
                               {item.replace('_', ' ')}
                             </span>
                           ))
                        ) : (
                           (profile as OrganisationProfile).organisations.map(org => (
                             <div key={org.id} className="w-full p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center gap-4">
                                <Building className="text-primary" size={24} />
                                <div>
                                   <p className="font-bold text-zinc-900">{org.organisationName}</p>
                                   <p className="text-xs text-zinc-500">{org.district} | {org.organisationTypes.join(', ').replace(/_/g, ' ')}</p>
                                </div>
                             </div>
                           ))
                        )}
                      </div>
                   </section>
                </div>

                {/* Side Content */}
                <div className="space-y-8">
                   
                   {/* Verification Panel (Part 11) */}
                   {isIndividual && (() => {
                     const p = profile as IndividualProfile;
                     const status = p.credentialVerificationStatus || 'unverified';

                     const handleVerificationSubmit = async (e: React.FormEvent) => {
                       e.preventDefault();
                       if (!regFile || !pracFile) {
                         setErrorMsg("Please select both your registration certificate and annual practising certificate.");
                         return;
                       }
                       if (!isAllowedVerificationFile(regFile) || !isAllowedVerificationFile(pracFile)) {
                         setErrorMsg("Verification documents must be PDF, JPG, or PNG files.");
                         return;
                       }
                       if (regFile.size > 5 * 1024 * 1024 || pracFile.size > 5 * 1024 * 1024) {
                         setErrorMsg("All uploaded documents must be smaller than 5MB.");
                         return;
                       }

                       setUploading(true);
                       setErrorMsg(null);
                       setSuccessMsg(null);

                       try {
                         const storage = getStorage();
                         const currentYear = new Date().getFullYear();
                         const regRef = ref(storage, `verificationDocs/${user!.uid}/registration_certificate`);
                         const pracRef = ref(storage, `verificationDocs/${user!.uid}/practising_certificate_${currentYear}`);

                         const regUpload = await uploadBytes(regRef, regFile);
                         const regUrl = await getDownloadURL(regUpload.ref);
                         const pracUpload = await uploadBytes(pracRef, pracFile);
                         const pracUrl = await getDownloadURL(pracUpload.ref);

                         // Verification submission is evidence only. It does not change
                         // authoritative professional verification/licence fields.
                         const vdRef = doc(db, 'verificationDocuments', user!.uid);
                         await setDoc(vdRef, {
                           userId: user!.uid,
                           registrationCertificateUrl: regUrl,
                           practisingCertificateUrl: pracUrl,
                           submittedAt: serverTimestamp(),
                           submittedForYear: currentYear,
                           submissionType: 'initial_verification',
                           submissionStatus: 'pending_review'
                         }, { merge: true });

                         if (userAccount?.accountStatus === 'PENDING_PROFILE'
                           || userAccount?.accountStatus === 'MORE_INFORMATION_REQUIRED') {
                           await updateDoc(doc(db, 'users', user!.uid), {
                             accountStatus: 'PENDING_AUTHORITY_VERIFICATION',
                             updatedAt: serverTimestamp()
                           });
                           await refreshUserData();
                         }

                         setSuccessMsg("Your verification documents have been submitted for authority review.");
                       } catch (err: any) {
                         setErrorMsg(`Submitting verification failed: ${err.message}`);
                       } finally {
                         setUploading(false);
                       }
                     };

                     const handleLicenceRenewal = async (e: React.FormEvent) => {
                       e.preventDefault();
                       if (!newPracFile) {
                         setErrorMsg("Please select your new Practising Certificate file.");
                         return;
                       }
                       if (!isAllowedVerificationFile(newPracFile)) {
                         setErrorMsg("The practising certificate must be a PDF, JPG, or PNG file.");
                         return;
                       }
                       if (newPracFile.size > 5 * 1024 * 1024) {
                         setErrorMsg("Uploaded document file must be smaller than 5MB.");
                         return;
                       }

                       setUploading(true);
                       setErrorMsg(null);
                       setSuccessMsg(null);

                       try {
                         const storage = getStorage();
                         const currentYear = new Date().getFullYear();
                         const pracRef = ref(storage, `verificationDocs/${user!.uid}/practising_certificate_${currentYear}`);
                         const uploadSnap = await uploadBytes(pracRef, newPracFile);
                         const newPracUrl = await getDownloadURL(uploadSnap.ref);

                         const vdRef = doc(db, 'verificationDocuments', user!.uid);
                         await setDoc(vdRef, {
                           userId: user!.uid,
                           practisingCertificateUrl: newPracUrl,
                           submittedAt: serverTimestamp(),
                           submittedForYear: currentYear,
                           submissionType: 'annual_renewal',
                           submissionStatus: 'pending_review'
                         }, { merge: true });

                         setSuccessMsg("Your practising certificate renewal has been submitted for authority review.");
                         setShowRenewForm(false);
                       } catch (err: any) {
                         setErrorMsg(`Renewal submission failed: ${err.message}`);
                       } finally {
                         setUploading(false);
                       }
                     };

                     return (
                       <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                         <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                           <ShieldCheck className="text-zinc-600" size={20} />
                           <div>
                             <h4 className="font-extrabold text-xs text-zinc-900 uppercase tracking-wider">Professional Verification</h4>
                             <p className="text-[10px] text-zinc-400 font-mono font-semibold">Status: <span className="uppercase tracking-widest font-black leading-none">{status.replace(/_/g, ' ')}</span></p>
                           </div>
                         </div>

                         {errorMsg && (
                           <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-xs flex gap-1.5 font-medium leading-relaxed">
                             <AlertTriangle size={14} className="shrink-0" />
                             <span>{errorMsg}</span>
                           </div>
                         )}

                         {successMsg && (
                           <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl text-xs flex gap-1.5 font-medium">
                             <CheckCircle size={14} className="shrink-0" />
                             <span>{successMsg}</span>
                           </div>
                         )}

                         {/* UNVERIFIED STATE */}
                         {status === 'unverified' && (
                           <form onSubmit={handleVerificationSubmit} className="space-y-4">
                             <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-xl p-3.5 text-center">
                               <p className="text-[11px] font-semibold text-zinc-650 leading-relaxed">
                                 Become a <strong>Verified Pro</strong> to display official badges on your profile card and listings.
                               </p>
                             </div>

                             <div className="space-y-1">
                               <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">1. Registration Certificate (Max 5MB)</label>
                               <input 
                                 type="file" 
                                 required
                                 accept="image/*,application/pdf"
                                 onChange={(e) => setRegFile(e.target.files?.[0] || null)}
                                 className="w-full text-xs font-semibold bg-zinc-50 border border-zinc-250 p-2 rounded-lg cursor-pointer"
                               />
                             </div>

                             <div className="space-y-1">
                               <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">2. Current Practising Certificate (Max 5MB)</label>
                               <input 
                                 type="file" 
                                 required
                                 accept="image/*,application/pdf"
                                 onChange={(e) => setPracFile(e.target.files?.[0] || null)}
                                 className="w-full text-xs font-semibold bg-zinc-50 border border-zinc-250 p-2 rounded-lg cursor-pointer"
                               />
                             </div>

                             <Button type="submit" fullWidth disabled={uploading}>
                               {uploading ? (
                                 <span className="flex items-center gap-1 justify-center"><Loader2 className="animate-spin" size={14} /> Submitting...</span>
                               ) : (
                                 "Submit for Verification"
                               )}
                             </Button>
                           </form>
                         )}

                         {/* PENDING STATE */}
                         {status === 'pending_review' && (
                           <div className="bg-indigo-50 border border-indigo-150 p-4 rounded-xl space-y-2">
                             <Clock className="text-indigo-600" size={24} />
                             <p className="text-xs font-black text-indigo-900">Request Under Review</p>
                             <p className="text-[11px] font-bold text-indigo-755 leading-relaxed">
                               Your verification is under review. This usually takes 3 to 5 working days. Our registration board is validating your credentials.
                             </p>
                           </div>
                         )}

                         {/* VERIFIED STATE */}
                         {status === 'verified' && (
                           <div className="space-y-4">
                             <div className="bg-emerald-55/40 border border-emerald-100 p-4 rounded-xl space-y-1">
                               <CheckCircle className="text-emerald-600 fill-white" size={24} />
                               <p className="text-xs font-bold text-emerald-950">Credential Verified</p>
                               <p className="text-[10px] text-emerald-850 font-medium">
                                 Verified by {p.credentialVerifiedByBody || 'Authorized Body'} on {p.credentialVerifiedAt ? new Date(p.credentialVerifiedAt.seconds * 1050).toLocaleDateString() : 'Active Verification'}.
                               </p>
                             </div>

                             <div className="border-t border-zinc-150 pt-3">
                               <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Practice Permit status</p>
                               <div className="flex items-center justify-between mt-2 mb-4">
                                 <div>
                                   <p className="text-xs font-black text-zinc-805 capitalize">
                                     {p.practisingLicenceStatus ? p.practisingLicenceStatus.replace(/_/g, ' ') : 'N/A'}
                                   </p>
                                   <p className="text-[9px] text-zinc-400 font-bold font-mono">Licence Year: {p.practisingLicenceYear || 'Current'}</p>
                                 </div>
                                 <button
                                   onClick={() => setShowRenewForm(!showRenewForm)}
                                   className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-black uppercase tracking-wider py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                                 >
                                   {showRenewForm ? 'Cancel' : 'Renew Annual Licence'}
                                 </button>
                               </div>

                               {showRenewForm && (
                                 <form onSubmit={handleLicenceRenewal} className="mt-4 space-y-3 p-3.5 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl">
                                    <p className="text-[10px] font-bold text-zinc-500 leading-tight">Apply for the new calendar year by uploading your current practising permit:</p>
                                    <input 
                                      type="file"
                                      required
                                      accept="image/*,application/pdf"
                                      onChange={(e) => setNewPracFile(e.target.files?.[0] || null)}
                                      className="w-full text-xs font-semibold bg-white border border-zinc-250 p-1.5 rounded-lg cursor-pointer"
                                    />
                                    <Button type="submit" fullWidth disabled={uploading}>
                                      {uploading ? 'Uploading Certificate...' : 'Submit Licence Renewal'}
                                    </Button>
                                 </form>
                               )}
                             </div>
                           </div>
                         )}

                         {/* REJECTED STATE */}
                         {status === 'rejected' && (
                           <div className="space-y-4">
                             <div className="bg-rose-55/65 border border-rose-150 p-4 rounded-xl space-y-2">
                               <AlertTriangle className="text-rose-600" size={24} />
                               <p className="text-xs font-black text-rose-900">Verification Declined</p>
                               <p className="text-[11px] font-bold text-rose-655 leading-relaxed bg-white border border-rose-100 p-2.5 rounded">
                                 Reason: "{p.credentialRejectionReason || "No details provided"}"
                               </p>
                             </div>

                             <form onSubmit={handleVerificationSubmit} className="space-y-3.5 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                               <p className="text-[11px] text-zinc-500 font-extrabold text-center uppercase tracking-wider">Submit Corrected Credentials</p>
                               
                               <div className="space-y-1">
                                 <label className="text-[10px] font-black uppercase text-zinc-400">1. Registration Certificate</label>
                                 <input 
                                   type="file" 
                                   accept="image/*,application/pdf"
                                   onChange={(e) => setRegFile(e.target.files?.[0] || null)}
                                   className="w-full text-xs bg-white border border-zinc-200 p-1 rounded cursor-pointer"
                                 />
                               </div>

                               <div className="space-y-1">
                                 <label className="text-[10px] font-black uppercase text-zinc-400">2. Current Practising Certificate</label>
                                 <input 
                                   type="file" 
                                   accept="image/*,application/pdf"
                                   onChange={(e) => setPracFile(e.target.files?.[0] || null)}
                                   className="w-full text-xs bg-white border border-zinc-200 p-1 rounded cursor-pointer"
                                 />
                               </div>

                               <Button type="submit" fullWidth disabled={uploading}>
                                 {uploading ? 'Uploading credentials...' : 'Re-Submit Credentials'}
                               </Button>
                             </form>
                           </div>
                         )}

                       </div>
                     );
                   })()}

                   {isIndividual && (
                     <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                        <h4 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                           <Tag size={18} className="text-primary" />
                           Preferences
                        </h4>
                        <div className="space-y-4">
                           <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Employment Types</p>
                           <div className="flex flex-wrap gap-2">
                              {(profile as IndividualProfile).preferredEmploymentTypes.map(t => (
                                <span key={t} className="bg-white px-2 py-1 rounded border border-zinc-200 text-xs font-medium">
                                  {t.replace('_', ' ')}
                                </span>
                              ))}
                           </div>
                        </div>
                     </div>
                   )}
                </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-start gap-3">
    <div className="p-1.5 bg-zinc-100 rounded text-zinc-500">
      <Icon size={14} />
    </div>
    <div>
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-zinc-700">{value}</p>
    </div>
  </div>
);

export default Profile;
