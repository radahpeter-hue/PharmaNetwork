import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { IndividualProfile, OrganisationProfile } from '../types';
import { openProtectedStorageFile } from '../lib/storageAccess';
import { Button } from '../components/Button';
import { ReportButton } from '../components/ReportButton';
import { 
  User as UserIcon, 
  MapPin, 
  Phone, 
  Award, 
  Calendar, 
  FileText, 
  Building, 
  Globe,
  Tag, 
  ShieldCheck, 
  ChevronLeft,
  Briefcase,
  AlertTriangle
} from 'lucide-react';

export const PublicProfile: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<IndividualProfile | OrganisationProfile | null>(null);
  const [errorOnLoad, setErrorOnLoad] = useState<string | null>(null);

  const isIndividual = location.pathname.startsWith('/professionals/');

  useEffect(() => {
    if (!uid) return;

    const fetchMemberProfile = async () => {
      setLoading(true);
      setErrorOnLoad(null);

      try {
        const profileCollection = isIndividual ? 'individualProfiles' : 'organisationProfiles';
        const profileDocRef = doc(db, profileCollection, uid);
        const profileDocSnap = await getDoc(profileDocRef);

        if (!profileDocSnap.exists()) {
          setProfile(null);
          setErrorOnLoad('This member profile is not currently available.');
          return;
        }

        setProfile(profileDocSnap.data() as IndividualProfile | OrganisationProfile);
      } catch (err) {
        console.error('Error loading member profile:', err);
        setProfile(null);
        setErrorOnLoad('Unable to retrieve this member profile at this time.');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberProfile();
  }, [uid, isIndividual]);

  const goBackAndPrev = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const openCv = async (profile: IndividualProfile) => {
    try {
      if (profile.cvStoragePath) {
        await openProtectedStorageFile(profile.cvStoragePath, 'professional-cv.pdf');
        return;
      }

      if (profile.cvUrl) {
        window.open(profile.cvUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Unable to open CV:', error);
      alert('Unable to open this CV. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Loading Profile details...</p>
      </div>
    );
  }

  if (errorOnLoad || !profile) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Profile Unavailable</h2>
        <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
          {errorOnLoad || "The requested user profile does not exist or cannot be accessed."}
        </p>
        <Button onClick={goBackAndPrev} className="w-full font-bold">
          Go Back
        </Button>
      </div>
    );
  }

  const indProfile = isIndividual ? (profile as IndividualProfile) : null;
  const orgProfile = !isIndividual ? (profile as OrganisationProfile) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      <button 
        onClick={goBackAndPrev}
        className="flex items-center gap-2 text-zinc-500 hover:text-primary font-bold text-sm mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back
      </button>

      {/* Profile Card Header */}
      <div className="bg-white rounded-3xl border border-zinc-150 shadow-xl overflow-hidden mb-8">
        <div className="h-40 bg-gradient-to-r from-primary to-emerald-600 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          {/* Active indicator */}
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-white/15">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
            <span className="text-[10px] text-white font-black uppercase tracking-wider">
              Member Profile
            </span>
          </div>
        </div>

        <div className="px-8 pb-10 relative">
          {/* Avatar placement */}
          <div className="absolute -top-16 left-8">
            <div className="w-28 h-28 bg-white border-4 border-white shadow-lg rounded-3xl overflow-hidden flex items-center justify-center text-zinc-400 uppercase text-4xl font-extrabold select-none">
              {isIndividual ? (
                indProfile?.profilePhotoUrl ? (
                  <img src={indProfile.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  indProfile?.fullName?.[0] || 'U'
                )
              ) : (
                orgProfile?.organisations?.[0]?.organisationName?.[0] || 'O'
              )}
            </div>
          </div>

          <div className="pt-16">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tight flex items-center gap-2 flex-wrap">
              {isIndividual 
                ? indProfile?.fullName || 'Individual Professional'
                : orgProfile?.organisations?.[0]?.organisationName || 'Registered Organisation'}
              {isIndividual && indProfile?.credentialVerificationStatus === 'verified' && (
                <span className="inline-flex items-center gap-1.5 bg-indigo-650 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  <ShieldCheck size={12} className="fill-white text-indigo-600" />
                  Verified Pro
                </span>
              )}
            </h1>

            <div className="mt-2 flex flex-wrap gap-4 text-sm font-semibold text-zinc-500">
              <span className="flex items-center gap-1.5">
                <MapPin size={16} className="text-primary-light" />
                {isIndividual ? indProfile?.district : orgProfile?.organisations?.[0]?.district || 'Uganda'}
              </span>
              <span className="flex items-center gap-1.5 uppercase text-xs bg-zinc-100 text-zinc-700 font-extrabold px-3 py-1 rounded-full">
                {isIndividual ? 'Professional' : 'Organisation Office'}
              </span>
            </div>

            {isIndividual && indProfile?.primaryCadre && (
              <p className="mt-4 text-primary font-bold text-sm bg-primary/10 px-4 py-1.5 rounded-xl inline-block">
                {indProfile.primaryCadre.replace(/_/g, ' ').toUpperCase()}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between items-center">
              <ReportButton
                contentType="profile"
                contentId={uid!}
                contentOwnerId={uid!}
                contentTitle={isIndividual ? (indProfile?.fullName || 'Individual Professional') : (orgProfile?.organisations?.[0]?.organisationName || 'Registered Organisation')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Info rail */}
        <div className="space-y-6 md:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-zinc-150 shadow-md">
            <h3 className="font-black text-zinc-900 mb-4 text-xs uppercase tracking-widest text-[10px] border-b border-zinc-100 pb-2">
              Credentials & Network
            </h3>

            {isIndividual ? (
              <div className="space-y-4 text-sm font-semibold text-zinc-600">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5 font-sans">Professional Registration No.</label>
                  <p className="text-zinc-900 flex items-center gap-1.5 font-semibold text-xs leading-none">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    {indProfile?.registrationNumber || 'Pending Verification'}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Verification Status</label>
                  <p className={`font-bold text-[10px] px-2 py-0.5 rounded inline-block uppercase tracking-wider ${
                    indProfile?.credentialVerificationStatus === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    indProfile?.credentialVerificationStatus === 'pending_review' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                    indProfile?.credentialVerificationStatus === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    'bg-zinc-100 text-zinc-500 border border-zinc-200'
                  }`}>
                    {indProfile?.credentialVerificationStatus ? indProfile.credentialVerificationStatus.replace(/_/g, ' ') : 'unverified'}
                  </p>
                  {indProfile?.credentialVerificationStatus === 'verified' && (
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Verified by {indProfile.credentialVerifiedByBody || 'Authorized Board'}
                    </p>
                  )}
                </div>
                {indProfile?.credentialVerificationStatus === 'verified' && (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Practice Permit Status</label>
                    <p className={`font-black text-xs uppercase tracking-wider ${
                      indProfile?.practisingLicenceStatus === 'renewed_current' ? 'text-emerald-600' : 'text-amber-500'
                    }`}>
                      {indProfile?.practisingLicenceStatus ? indProfile.practisingLicenceStatus.replace(/_/g, ' ') : 'N/A'}
                    </p>
                    <p className="text-[9px] text-zinc-400 font-mono">
                      Permit Year: {indProfile?.practisingLicenceYear || 'Current'}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Qualification</label>
                  <p className="text-zinc-950">{indProfile?.qualification || 'Not provided'}</p>
                </div>
                {(indProfile?.cvStoragePath || indProfile?.cvUrl) && (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Curriculum Vitae</label>
                    <button
                      type="button"
                      onClick={() => indProfile && openCv(indProfile)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-700"
                    >
                      <FileText size={14} className="text-primary" />
                      Open CV
                    </button>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5 font-sans">Experience</label>
                  <p className="text-zinc-950">{indProfile?.yearsExperience ? `${indProfile.yearsExperience} Years` : 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Phone Contact</label>
                  <p className="text-zinc-950 flex items-center gap-1.5">
                    <Phone size={14} className="text-zinc-400" />
                    {indProfile?.phone || 'Hidden'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm font-semibold text-zinc-650">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">NDA License Number</label>
                  <p className="text-zinc-900 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    {orgProfile?.organisations?.[0]?.ndaLicenceNumber || 'Not documented'}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Company Type</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {orgProfile?.organisations?.[0]?.organisationTypes?.map((typ) => (
                      <span key={typ} className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded font-bold uppercase">
                        {typ.replace(/_/g, ' ')}
                      </span>
                    )) || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Phone Contact</label>
                  <p className="text-zinc-900 flex items-center gap-1.5">
                    <Phone size={14} className="text-zinc-400" />
                    {orgProfile?.organisations?.[0]?.contactPhone || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Company branches</label>
                  <p className="text-zinc-900">{orgProfile?.organisations?.[0]?.branchCount || '1'} active branches</p>
                </div>
                {orgProfile?.organisations?.[0]?.isHiring && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Actively hiring professionals
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right main panel */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-zinc-150 shadow-md">
            <h3 className="font-extrabold text-zinc-950 mb-4 text-lg">About & Bio</h3>
            <p className="text-zinc-600 leading-relaxed font-semibold text-sm whitespace-pre-wrap">
              {isIndividual 
                ? indProfile?.bio || 'No public bio has been set up for this pharmacist or professional.'
                : orgProfile?.organisations?.[0]?.about || 'No detailed background is available for this organisation.'}
            </p>

            {isIndividual && indProfile?.areasOfPractice && indProfile?.areasOfPractice.length > 0 && (
              <div className="mt-8 border-t border-zinc-100 pt-6">
                <h4 className="text-sm font-bold text-zinc-800 mb-3 block">Areas of Practice</h4>
                <div className="flex flex-wrap gap-1.5">
                  {indProfile.areasOfPractice.map(area => (
                    <span key={area} className="text-xs bg-primary/10 text-primary-light font-black px-3.5 py-1.5 rounded-xl">
                      {area.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {isIndividual && indProfile?.roles && indProfile?.roles.length > 0 && (
              <div className="mt-6 border-t border-zinc-100 pt-6">
                <h4 className="text-sm font-bold text-zinc-800 mb-3 block">Target Professional Roles</h4>
                <div className="flex flex-wrap gap-1.5">
                  {indProfile.roles.map(role => (
                    <span key={role} className="text-xs bg-zinc-150 text-zinc-800 font-extrabold px-3 py-1 rounded-xl">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isIndividual && orgProfile?.organisations && orgProfile.organisations.length > 1 && (
            <div className="bg-white rounded-3xl p-8 border border-zinc-150 shadow-md">
              <h3 className="font-black text-zinc-950 mb-6 text-lg">Connected Subsidiaries</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {orgProfile.organisations.slice(1).map((sub, i) => (
                  <div key={sub.id || i} className="border border-zinc-100 p-4 rounded-2xl bg-zinc-50/50">
                    <span className="font-bold text-zinc-900 block text-sm">{sub.organisationName}</span>
                    <span className="text-zinc-400 text-xs mt-1 block font-semibold">{sub.district} — {sub.branchCount || '1'} branch</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
