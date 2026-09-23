import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  UserCheck, 
  Users, 
  FileCheck, 
  FileText, 
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Settings,
  Mail,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IndividualProfile, ProfessionalAuthorityAdmin } from '../types';

interface VerificationDoc {
  userId: string;
  registrationCertificateUrl: string;
  practisingCertificateUrl: string;
  additionalDocumentUrls?: string[];
  submittedAt: any;
  submittedForYear: number;
  reviewedAt?: any;
  reviewedByUid?: string;
  reviewedByBody?: string;
  reviewNotes?: string;
}

export const BodyAdminConsole: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [adminProfile, setAdminProfile] = useState<ProfessionalAuthorityAdmin | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'licence' | 'directory' | 'team'>('queue');

  // Core Data State
  const [profiles, setProfiles] = useState<any[]>([]);
  const [verificationDocs, setVerificationDocs] = useState<{ [uid: string]: VerificationDoc }>({});
  const [adminsList, setAdminsList] = useState<ProfessionalAuthorityAdmin[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Search & Filter state for Licence & Directory
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  // Verification review modal / flow
  const [activeReviewProfile, setActiveReviewProfile] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [requestInfoNotes, setRequestInfoNotes] = useState('');
  const [showRequestInfoForm, setShowRequestInfoForm] = useState(false);

  const [savingAction, setSavingAction] = useState(false);

  // Single Licence Update Modal
  const [activeUpdateLicenceProfile, setActiveUpdateLicenceProfile] = useState<any | null>(null);
  const [editLicenceStatus, setEditLicenceStatus] = useState<'not_renewed' | 'renewed_current' | 'suspended' | 'lapsed'>('renewed_current');
  const [editLicenceYear, setEditLicenceYear] = useState<number>(new Date().getFullYear());
  const [editRenewalDate, setEditRenewalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editExpiryDate, setEditExpiryDate] = useState<string>(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  );
  const [editSuspensionReason, setEditSuspensionReason] = useState('');

  // Bulk update states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>('not_renewed');
  const [bulkConfirmChecked, setBulkConfirmChecked] = useState(false);

  const canVerify = !!adminProfile
    && ['authority_super_admin', 'verification_officer'].includes(adminProfile.role);
  const canManageCompliance = !!adminProfile
    && ['authority_super_admin', 'compliance_officer'].includes(adminProfile.role);

  // Verify and fetch professional-authority administrative data.
  // Authority accounts must be provisioned through trusted backend processes.
  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setLoadingAdmin(false);
      return;
    }

    const checkAdminAffiliation = async () => {
      try {
        const adminDocRef = doc(db, 'professionalAuthorityAdmins', user.uid);
        const adminDocSnap = await getDoc(adminDocRef);

        if (!adminDocSnap.exists()) {
          navigate('/dashboard');
          return;
        }

        const data = adminDocSnap.data() as ProfessionalAuthorityAdmin;
        if (data.isActive === false) {
          await signOut();
          navigate('/login');
          return;
        }

        if (isMounted) setAdminProfile(data);
      } catch (err) {
        console.error('Checking professional authority affiliation failed:', err);
        if (isMounted) setAdminProfile(null);
      } finally {
        if (isMounted) setLoadingAdmin(false);
      }
    };

    checkAdminAffiliation();

    return () => {
      isMounted = false;
    };
  }, [user, navigate, signOut]);

  // Load appropriate data whenever active tab or admin profile changes
  useEffect(() => {
    if (!adminProfile) return;
    loadConsoleData();
  }, [adminProfile, activeTab]);

  const loadConsoleData = async () => {
    if (!adminProfile) return;
    setLoadingData(true);

    try {
      if (adminProfile.scopedCadres.length === 0) {
        setProfiles([]);
        setVerificationDocs({});
        setAdminsList([]);
        return;
      }

      // 1. Load only profiles that fall inside this authority administrator's cadre scope.
      const scopedCadres = adminProfile.scopedCadres.slice(0, 30);
      const profilesQuery = query(
        collection(db, 'individualProfiles'),
        where('primaryCadre', 'in', scopedCadres)
      );
      const querySnap = await getDocs(profilesQuery);
      const allProfiles = querySnap.docs.map(profileDoc => ({
        id: profileDoc.id,
        ...profileDoc.data()
      }));
      setProfiles(allProfiles);

      // 2. Load only verification documents belonging to the already scoped profiles.
      const verificationEntries = await Promise.all(
        allProfiles.map(async profile => {
          const verificationSnap = await getDoc(doc(db, 'verificationDocuments', profile.id));
          return verificationSnap.exists()
            ? [profile.id, verificationSnap.data() as VerificationDoc] as const
            : null;
        })
      );
      const activeDocs: { [uid: string]: VerificationDoc } = {};
      verificationEntries.forEach(entry => {
        if (entry) activeDocs[entry[0]] = entry[1];
      });
      setVerificationDocs(activeDocs);

      // 3. Load colleagues only from the same professional authority.
      const adminsQuery = query(
        collection(db, 'professionalAuthorityAdmins'),
        where('authorityId', '==', adminProfile.authorityId)
      );
      const adminsSnap = await getDocs(adminsQuery);
      const list = adminsSnap.docs.map(ad => ad.data() as ProfessionalAuthorityAdmin);
      setAdminsList(list);
    } catch (err) {
      console.error('Failed to load professional authority data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Verification actions are restricted to authority super admins and verification officers.
  const handleApprove = async (profileId: string) => {
    if (!adminProfile || !canVerify) return;

    setSavingAction(true);
    try {
      const batch = writeBatch(db);
      const pRef = doc(db, 'individualProfiles', profileId);
      const userRef = doc(db, 'users', profileId);
      const vdRef = doc(db, 'verificationDocuments', profileId);

      batch.update(pRef, {
        credentialVerificationStatus: 'verified',
        credentialVerifiedAt: serverTimestamp(),
        credentialVerifiedByBody: adminProfile.authorityName,
        credentialVerifiedByUid: adminProfile.uid,
        credentialRejectionReason: '',
        updatedAt: serverTimestamp()
      });

      batch.update(userRef, {
        accountStatus: 'INACTIVE_ANNUAL_COMPLIANCE',
        isActive: false,
        isVerified: true,
        updatedAt: serverTimestamp()
      });

      batch.update(vdRef, {
        reviewedAt: serverTimestamp(),
        reviewedByUid: adminProfile.uid,
        reviewedByBody: adminProfile.authorityId,
        reviewNotes: 'Professional credentials approved. Annual compliance confirmation is still required.',
        submissionStatus: 'approved'
      });

      await batch.commit();
      await loadConsoleData();
      setActiveReviewProfile(null);
    } catch (err) {
      alert('Error approving professional credentials: ' + err);
    } finally {
      setSavingAction(false);
    }
  };

  const handleReject = async (profileId: string) => {
    if (!adminProfile || !canVerify || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    setSavingAction(true);
    try {
      const batch = writeBatch(db);
      const pRef = doc(db, 'individualProfiles', profileId);
      const userRef = doc(db, 'users', profileId);
      const vdRef = doc(db, 'verificationDocuments', profileId);

      batch.update(pRef, {
        credentialVerificationStatus: 'rejected',
        credentialRejectionReason: rejectionReason,
        updatedAt: serverTimestamp()
      });

      batch.update(userRef, {
        accountStatus: 'REJECTED',
        isActive: false,
        isVerified: false,
        updatedAt: serverTimestamp()
      });

      batch.update(vdRef, {
        reviewedAt: serverTimestamp(),
        reviewedByUid: adminProfile.uid,
        reviewedByBody: adminProfile.authorityId,
        reviewNotes: `Rejected: ${rejectionReason}`,
        submissionStatus: 'rejected'
      });

      await batch.commit();
      await loadConsoleData();
      setShowRejectForm(false);
      setRejectionReason('');
      setActiveReviewProfile(null);
    } catch (err) {
      alert('Error rejecting professional credentials: ' + err);
    } finally {
      setSavingAction(false);
    }
  };

  const handleRequestMoreInfo = async (profileId: string) => {
    if (!adminProfile || !canVerify || !requestInfoNotes.trim()) {
      alert('Please specify what information or corrections are required.');
      return;
    }

    setSavingAction(true);
    try {
      const batch = writeBatch(db);
      const pRef = doc(db, 'individualProfiles', profileId);
      const userRef = doc(db, 'users', profileId);
      const vdRef = doc(db, 'verificationDocuments', profileId);

      batch.update(pRef, {
        credentialVerificationStatus: 'unverified',
        credentialRejectionReason: `More information required: ${requestInfoNotes}`,
        updatedAt: serverTimestamp()
      });

      batch.update(userRef, {
        accountStatus: 'MORE_INFORMATION_REQUIRED',
        isActive: false,
        isVerified: false,
        updatedAt: serverTimestamp()
      });

      batch.update(vdRef, {
        reviewedAt: serverTimestamp(),
        reviewedByUid: adminProfile.uid,
        reviewedByBody: adminProfile.authorityId,
        reviewNotes: `More information required: ${requestInfoNotes}`,
        submissionStatus: 'more_information_required'
      });

      await batch.commit();
      await loadConsoleData();
      setShowRequestInfoForm(false);
      setRequestInfoNotes('');
      setActiveReviewProfile(null);
    } catch (err) {
      alert('Error requesting more information: ' + err);
    } finally {
      setSavingAction(false);
    }
  };

  const accountStateForLicence = (status: string) => {
    if (status === 'renewed_current') {
      return { accountStatus: 'ACTIVE', isActive: true };
    }
    if (status === 'suspended') {
      return { accountStatus: 'SUSPENDED_BY_AUTHORITY', isActive: false };
    }
    return { accountStatus: 'INACTIVE_ANNUAL_COMPLIANCE', isActive: false };
  };

  // Annual compliance actions are restricted to authority super admins and compliance officers.
  const handleSaveIndividualLicence = async () => {
    if (!activeUpdateLicenceProfile || !canManageCompliance) return;

    setSavingAction(true);
    try {
      const nextAccountState = accountStateForLicence(editLicenceStatus);
      const batch = writeBatch(db);
      const pRef = doc(db, 'individualProfiles', activeUpdateLicenceProfile.id);
      const userRef = doc(db, 'users', activeUpdateLicenceProfile.id);

      batch.update(pRef, {
        practisingLicenceStatus: editLicenceStatus,
        practisingLicenceYear: Number(editLicenceYear),
        licenceRenewalDate: Timestamp.fromDate(new Date(editRenewalDate)),
        licenceExpiryDate: Timestamp.fromDate(new Date(editExpiryDate)),
        licenceSuspensionReason: editLicenceStatus === 'suspended' ? editSuspensionReason : '',
        updatedAt: serverTimestamp()
      });

      batch.update(userRef, {
        accountStatus: nextAccountState.accountStatus,
        isActive: nextAccountState.isActive,
        isVerified: true,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      await loadConsoleData();
      setActiveUpdateLicenceProfile(null);
    } catch (err) {
      alert('Error updating annual professional compliance: ' + err);
    } finally {
      setSavingAction(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!canManageCompliance) return;

    if (selectedProfileIds.length === 0 || !bulkConfirmChecked) {
      alert('Please select professionals and confirm the bulk update.');
      return;
    }

    setSavingAction(true);
    try {
      const nextAccountState = accountStateForLicence(bulkTargetStatus);
      const batch = writeBatch(db);

      selectedProfileIds.forEach(id => {
        batch.update(doc(db, 'individualProfiles', id), {
          practisingLicenceStatus: bulkTargetStatus,
          practisingLicenceYear: new Date().getFullYear(),
          updatedAt: serverTimestamp()
        });

        batch.update(doc(db, 'users', id), {
          accountStatus: nextAccountState.accountStatus,
          isActive: nextAccountState.isActive,
          isVerified: true,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      await loadConsoleData();
      setSelectedProfileIds([]);
      setBulkConfirmChecked(false);
      setShowBulkModal(false);
      alert(`Annual compliance status updated for ${selectedProfileIds.length} professionals.`);
    } catch (err) {
      alert('Bulk annual-compliance update failed: ' + err);
    } finally {
      setSavingAction(false);
    }
  };

  const toggleSelectProfile = (id: string) => {
    setSelectedProfileIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredProfiles: any[]) => {
    if (selectedProfileIds.length === filteredProfiles.length) {
      setSelectedProfileIds([]);
    } else {
      setSelectedProfileIds(filteredProfiles.map(p => p.id));
    }
  };

  if (loadingAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
      </div>
    );
  }

  if (!adminProfile) {
    return <Navigate to="/dashboard" />;
  }

  // Segment queues based on filters/conditions
  const currentQueue = profiles.filter(p => p.credentialVerificationStatus === 'pending_review');
  
  const verifiedProfiles = profiles.filter(p => p.credentialVerificationStatus === 'verified');
  
  const licenceManagementProfiles = verifiedProfiles.filter(p => {
    const matchesSearch = p.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
                          (p.registrationNumber && p.registrationNumber.toLowerCase().includes(searchText.toLowerCase()));
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && p.practisingLicenceStatus === statusFilter;
  });

  const directoryProfiles = verifiedProfiles.filter(p => {
    return p.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
           (p.registrationNumber && p.registrationNumber.toLowerCase().includes(searchText.toLowerCase()));
  });

  // Calculate high-level summary badge tags for licensing
  const counts = {
    current: verifiedProfiles.filter(p => p.practisingLicenceStatus === 'renewed_current').length,
    pending: verifiedProfiles.filter(p => p.practisingLicenceStatus === 'not_renewed').length,
    suspended: verifiedProfiles.filter(p => p.practisingLicenceStatus === 'suspended').length,
    lapsed: verifiedProfiles.filter(p => p.practisingLicenceStatus === 'lapsed').length,
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      {/* 1. Specialized Deep Blue Regulatory Header */}
      <header className="bg-[#1A237E] text-white shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center">
              <ShieldCheck size={32} className="text-white brightness-125" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-2.5 py-0.5 rounded-md">
                  Authority Portal
                </span>
                <span className="text-xs text-indigo-200 uppercase font-bold tracking-wider font-mono">
                  {adminProfile.authorityId} Scoped Console
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                {adminProfile.authorityName}
              </h1>
            </div>
          </div>

          {/* Current log status & user identifier */}
          <div className="flex items-center gap-4 bg-white/5 p-3 px-5 rounded-2xl border border-white/10 self-start md:self-auto">
            <div className="text-right">
              <p className="text-sm font-black tracking-tight">{adminProfile.fullName}</p>
              <p className="text-xs text-indigo-200">{adminProfile.email}</p>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <button 
              onClick={() => { signOut(); navigate('/login'); }}
              className="text-[11px] font-black uppercase text-rose-350 hover:text-rose-450 tracking-wider transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main workspace dynamic wrapper */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Dynamic Sidebar Control Module */}
        <aside className="space-y-4">
          
          {/* Active cadre scope badge */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-xs">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#1A237E] bg-indigo-100 px-2 py-0.5 rounded">
              Your Scope
            </span>
            <p className="text-xs text-indigo-900 font-bold mt-2.5">
              Authorized cadres under your supervision:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {adminProfile.scopedCadres.map(c => (
                <span key={c} className="text-[10px] bg-white border border-indigo-200/60 font-semibold px-2.5 py-1 rounded-lg text-indigo-950 capitalize">
                  {c.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          <nav className="bg-white rounded-3xl border border-zinc-200 shadow-md p-2.5 space-y-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center justify-between p-3.5 px-4 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCheck size={18} />
                <span>Verification Queue</span>
              </div>
              {currentQueue.length > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'queue' ? 'bg-[#1A237E] text-white' : 'bg-rose-500 text-white animate-pulse'
                }`}>
                  {currentQueue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('licence')}
              className={`w-full flex items-center justify-between p-3.5 px-4 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'licence'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders size={18} />
                <span>Annual Compliance</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className={`w-full flex items-center justify-between p-3.5 px-4 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span>Member Directory</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`w-full flex items-center justify-between p-3.5 px-4 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} />
                <span>Admin Team</span>
              </div>
            </button>
          </nav>
        </aside>

        {/* Console Working stage panel */}
        <main className="lg:col-span-3 space-y-6">
          
          <AnimatePresence mode="wait">
            {loadingData ? (
              <div className="min-h-[40vh] bg-white rounded-3xl border border-zinc-200 flex items-center justify-center shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A237E]"></div>
              </div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                
                {/* QUEUE TAB VIEW */}
                {activeTab === 'queue' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900">Verification Backlog</h2>
                        <p className="text-xs text-zinc-500 mt-1">Pending registration checks and certificate reviews awaiting official {adminProfile.authorityId} seal of approval.</p>
                      </div>
                      <span className="text-xs font-black uppercase bg-[#1A237E]/10 text-[#1A237E] p-2 px-3 rounded-lg font-mono">
                        {currentQueue.length} Pending
                      </span>
                    </div>

                    {currentQueue.length === 0 ? (
                      <div className="bg-white rounded-3xl p-12 border border-zinc-250 text-center shadow-xs">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                          <CheckCircle size={32} className="text-emerald-600" />
                        </div>
                        <h4 className="text-base font-bold text-zinc-900">Workspace Clear</h4>
                        <p className="text-sm text-zinc-500 max-w-md mx-auto mt-2">All credential verification submissions under your cadre scope have been completed successfully!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQueue.map(p => (
                          <div key={p.id} className="bg-white rounded-2xl border border-zinc-200 p-5 p-y-6 flex flex-col justify-between shadow-xs hover:border-[#1A237E]/40 transition-all">
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="font-extrabold text-zinc-900 text-sm">{p.fullName}</h3>
                                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{p.district}, Uganda</p>
                                </div>
                                <span className="text-[9px] bg-indigo-50 border border-indigo-150 font-bold text-indigo-700 px-2 py-0.5 rounded capitalize">
                                  {p.primaryCadre.replace(/_/g, ' ')}
                                </span>
                              </div>

                              <div className="space-y-2 mt-4 bg-zinc-50 p-3 rounded-xl border border-zinc-100 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 font-medium">Decl. Compliance:</span>
                                  <span className="font-mono font-bold text-zinc-700">{p.registrationNumber || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 font-medium">Qualification:</span>
                                  <span className="font-semibold text-zinc-700 truncate max-w-[150px]">{p.qualification}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 font-medium">Submitted For:</span>
                                  <span className="font-extrabold text-[#1A237E]">{verificationDocs[p.id]?.submittedForYear || new Date().getFullYear()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                              <button
                                onClick={() => setActiveReviewProfile(p)}
                                className="w-full bg-[#1A237E] hover:bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-xs cursor-pointer text-center"
                              >
                                Review Credentials
                              </button>
                              <button
                                className="w-full bg-zinc-150 hover:bg-zinc-200 text-zinc-600 text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer text-center"
                              >
                                Skip For Now
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* LICENCE MANAGEMENT TAB VIEW */}
                {activeTab === 'licence' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">Licence Review Board</h2>
                      <p className="text-xs text-zinc-500 mt-1">Audit, register, suspend, or renew practicing permits for members under your authority.</p>
                    </div>

                    {/* Highly responsive summaries block */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Renewed</span>
                        <p className="text-2xl font-black text-emerald-900 mt-1">{counts.current}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending</span>
                        <p className="text-2xl font-black text-amber-900 mt-1">{counts.pending}</p>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Suspended</span>
                        <p className="text-2xl font-black text-rose-900 mt-1">{counts.suspended}</p>
                      </div>
                      <div className="bg-zinc-100 border border-zinc-200 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Expired / Lapsed</span>
                        <p className="text-2xl font-black text-zinc-800 mt-1">{counts.lapsed}</p>
                      </div>
                    </div>

                    {/* Filters rail */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          placeholder="Search name or reg no..."
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        <div className="flex items-center gap-2">
                          <Filter size={14} className="text-zinc-400" />
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none"
                          >
                            <option value="all">All States</option>
                            <option value="renewed_current">Renewed (Current)</option>
                            <option value="not_renewed">Not Yet Renewed</option>
                            <option value="suspended">Suspended</option>
                            <option value="lapsed">Lapsed</option>
                          </select>
                        </div>

                        {/* Bulk Action Trigger */}
                        <button
                          disabled={selectedProfileIds.length === 0}
                          onClick={() => {
                            setBulkTargetStatus('not_renewed');
                            setShowBulkModal(true);
                          }}
                          className={`flex items-center gap-1.5 p-2 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            selectedProfileIds.length > 0 
                              ? 'bg-[#1A237E] hover:bg-[#12185C] text-white shadow-sm'
                              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                          }`}
                        >
                          Bulk Update ({selectedProfileIds.length})
                        </button>
                      </div>
                    </div>

                    {/* Core members licensing list table */}
                    <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200 font-extrabold uppercase text-zinc-500 tracking-wider">
                              <th className="py-3.5 px-4 w-12 text-center">
                                <button 
                                  onClick={() => toggleSelectAll(licenceManagementProfiles)}
                                  className="text-zinc-500 hover:text-zinc-800"
                                >
                                  {selectedProfileIds.length === licenceManagementProfiles.length && licenceManagementProfiles.length > 0 ? (
                                    <CheckSquare size={16} />
                                  ) : (
                                    <Square size={16} />
                                  )}
                                </button>
                              </th>
                              <th className="py-3.5 px-4">Full Name</th>
                              <th className="py-3.5 px-4">Registration</th>
                              <th className="py-3.5 px-4">Cadre</th>
                              <th className="py-3.5 px-4">District</th>
                              <th className="py-3.5 px-4">Licence Status</th>
                              <th className="py-3.5 px-4">Year</th>
                              <th className="py-3.5 px-4 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                            {licenceManagementProfiles.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-zinc-400">
                                  No verified professionals matching the criteria filters.
                                </td>
                              </tr>
                            ) : (
                              licenceManagementProfiles.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-50 border-zinc-100">
                                  <td className="py-3.5 px-4 text-center">
                                    <button 
                                      onClick={() => toggleSelectProfile(p.id)}
                                      className="text-zinc-450 hover:text-[#1A237E]"
                                    >
                                      {selectedProfileIds.includes(p.id) ? (
                                        <CheckSquare size={16} className="text-[#1A237E]" />
                                      ) : (
                                        <Square size={16} />
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-3.5 px-4 font-bold text-zinc-900">{p.fullName}</td>
                                  <td className="py-3.5 px-4 font-mono">{p.registrationNumber || 'Not assigned'}</td>
                                  <td className="py-3.5 px-4 uppercase text-[10px] tracking-tight">{p.primaryCadre.replace(/_/g, ' ')}</td>
                                  <td className="py-3.5 px-4 text-zinc-500">{p.district}</td>
                                  <td className="py-3.5 px-4">
                                    {p.practisingLicenceStatus === 'renewed_current' && (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                                        Renewed
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'not_renewed' && (
                                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                                        Not Renewed
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'suspended' && (
                                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                                        Suspended
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'lapsed' && (
                                      <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                                        Lapsed
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 font-extrabold text-zinc-900">{p.practisingLicenceYear || 'N/A'}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => {
                                          setActiveUpdateLicenceProfile(p);
                                          setEditLicenceStatus(p.practisingLicenceStatus || 'not_renewed');
                                          setEditLicenceYear(p.practisingLicenceYear || new Date().getFullYear());
                                          setEditRenewalDate(
                                            p.licenceRenewalDate 
                                              ? new Date(p.licenceRenewalDate.seconds * 1000).toISOString().split('T')[0]
                                              : new Date().toISOString().split('T')[0]
                                          );
                                          setEditExpiryDate(
                                            p.licenceExpiryDate 
                                              ? new Date(p.licenceExpiryDate.seconds * 1000).toISOString().split('T')[0]
                                              : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
                                          );
                                          setEditSuspensionReason(p.licenceSuspensionReason || '');
                                        }}
                                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                                      >
                                        Update Permit
                                      </button>
                                      <button
                                        onClick={() => navigate(`/professionals/${p.id}`)}
                                        className="text-zinc-400 hover:text-zinc-600 p-1 rounded hover:bg-zinc-100 cursor-pointer"
                                        title="View Profile"
                                      >
                                        <ExternalLink size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* MEMBER DIRECTORY TAB VIEW */}
                {activeTab === 'directory' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">Official Register Roll</h2>
                      <p className="text-xs text-zinc-500 mt-1">Read-only audit log of registered professionals under cadre purview, complete with public tags.</p>
                    </div>

                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search register index by name, qualification or registration permit key..."
                        className="w-full bg-white border border-zinc-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none shadow-xs"
                      />
                    </div>

                    <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200 font-extrabold uppercase text-zinc-500 tracking-wider">
                              <th className="py-4 px-5">Name & Title</th>
                              <th className="py-4 px-5">Registration</th>
                              <th className="py-4 px-5">Supervised Cadre</th>
                              <th className="py-4 px-5">District</th>
                              <th className="py-4 px-5">Verification</th>
                              <th className="py-4 px-5">Compliance Stamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                            {directoryProfiles.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-zinc-400">
                                  No registered professionals located in index roll.
                                </td>
                              </tr>
                            ) : (
                              directoryProfiles.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-50 border-zinc-100">
                                  <td className="py-4 px-5 font-bold text-zinc-900">{p.fullName}</td>
                                  <td className="py-4 px-5 font-mono">{p.registrationNumber || 'Not assigned'}</td>
                                  <td className="py-4 px-5 uppercase text-[10px] tracking-tight">{p.primaryCadre.replace(/_/g, ' ')}</td>
                                  <td className="py-4 px-5 text-zinc-500">{p.district}</td>
                                  <td className="py-4 px-5">
                                    <span className="bg-emerald-100/80 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                      Verified Official
                                    </span>
                                  </td>
                                  <td className="py-4 px-5">
                                    {p.practisingLicenceStatus === 'renewed_current' && (
                                      <span className="text-emerald-600 font-black flex items-center gap-1">
                                        <CheckCircle size={12} /> Renewed
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'not_renewed' && (
                                      <span className="text-amber-600 font-black flex items-center gap-1">
                                        <Clock size={12} /> Pending Renewal
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'suspended' && (
                                      <span className="text-rose-600 font-black flex items-center gap-1">
                                        <AlertTriangle size={12} /> Suspended
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'lapsed' && (
                                      <span className="text-zinc-500 font-black flex items-center gap-1">
                                        <XCircle size={12} /> Lapsed File
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ADMIN TEAM VIEW */}
                {activeTab === 'team' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">{adminProfile.authorityName} Staff Roster</h2>
                      <p className="text-xs text-zinc-500 mt-1">Colleagues and officers with designated clearance inside your administrative division.</p>
                    </div>

                    <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200 font-extrabold uppercase text-zinc-500 tracking-wider">
                              <th className="py-4 px-5">Officer Name</th>
                              <th className="py-4 px-5">Work Email</th>
                              <th className="py-4 px-5">Supervisory Role</th>
                              <th className="py-4 px-5">Status Badge</th>
                              <th className="py-4 px-5">Cleared On</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                            {adminsList.map(ad => (
                              <tr key={ad.uid} className="hover:bg-zinc-50 border-zinc-100">
                                <td className="py-4 px-5 font-bold text-zinc-900 flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-indigo-100 text-[#1A237E] font-bold flex items-center justify-center text-[10px]">
                                    {ad.fullName[0].toUpperCase()}
                                  </div>
                                  <span>{ad.fullName}</span>
                                </td>
                                <td className="py-4 px-5 font-mono">{ad.email}</td>
                                <td className="py-4 px-5 uppercase text-[10px] tracking-tight">{ad.role.replace(/_/g, ' ')}</td>
                                <td className="py-4 px-5">
                                  {ad.isActive ? (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                      Active Duty
                                    </span>
                                  ) : (
                                    <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                      Deactivated
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-5 text-zinc-400 font-mono">
                                  {ad.addedAt ? new Date(ad.addedAt.seconds * 1000).toLocaleDateString() : 'Original Seed'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* FULL-SCREEN VERIFICATION REVIEW PANEL MODAL (Part 6) */}
      <AnimatePresence>
        {activeReviewProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl relative border border-zinc-200"
            >
              
              {/* Review Panel Header */}
              <div className="bg-[#1A237E] text-white p-5 px-6 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] font-black bg-white/10 text-white p-1 px-2.5 rounded-md uppercase font-mono tracking-wider">
                    Official Verification Review
                  </span>
                  <h3 className="text-lg font-black tracking-tight mt-1">{activeReviewProfile.fullName}</h3>
                </div>
                <button 
                  onClick={() => {
                    setActiveReviewProfile(null);
                    setShowRejectForm(false);
                    setShowRequestInfoForm(false);
                  }}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer text-sm font-bold px-4"
                >
                  Exit Review
                </button>
              </div>

              {/* Central Panel Grid split left profile details, right file docs */}
              <div className="flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
                
                {/* Left Side: Professional Profile Details */}
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                  <div>
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Professional Overview</h4>
                    <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-100 p-4 rounded-2xl">
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center font-bold text-white text-lg overflow-hidden">
                        {activeReviewProfile.profilePhotoUrl ? (
                          <img src={activeReviewProfile.profilePhotoUrl} className="h-full w-full object-cover" />
                        ) : (
                          activeReviewProfile.fullName[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">{activeReviewProfile.fullName}</p>
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-tight">{activeReviewProfile.primaryCadre.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Registration Number</p>
                      <p className="text-xs font-bold font-mono text-zinc-800 mt-1">{activeReviewProfile.registrationNumber || 'None declared'}</p>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Qualifying Degree</p>
                      <p className="text-xs font-bold text-zinc-800 mt-1">{activeReviewProfile.qualification}</p>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Experience Level</p>
                      <p className="text-xs font-bold text-zinc-800 mt-1 capitalize">{activeReviewProfile.yearsExperience?.replace(/_/g, ' ')}</p>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Supervised Region</p>
                      <p className="text-xs font-bold text-zinc-800 mt-1">{activeReviewProfile.district}, Uganda</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Professional Biography</h5>
                    <p className="text-xs leading-relaxed text-zinc-655 italic bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                      "{activeReviewProfile.bio || 'Professional has not entered any biography details yet.'}"
                    </p>
                  </div>

                  {activeReviewProfile.areasOfPractice && (
                    <div>
                      <h5 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Areas of Practice</h5>
                      <div className="flex flex-wrap gap-1.5Packed mt-2">
                        {activeReviewProfile.areasOfPractice.map((a: string) => (
                          <span key={a} className="text-[10px] bg-indigo-50 text-indigo-805 font-bold px-2.5 py-1 rounded-lg border border-indigo-100 uppercase">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Uploaded Verification Certificates */}
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto bg-zinc-50">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Submitted Verification Files</h4>

                  {verificationDocs[activeReviewProfile.id] ? (
                    <div className="space-y-4">
                      
                      {/* Registration Certificate view card */}
                      <div className="bg-white p-4 rounded-2xl border border-zinc-200">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-extrabold text-zinc-800 flex items-center gap-1.5">
                            <FileCheck size={16} className="text-indigo-600" />
                            <span>1. Registration Certificate</span>
                          </p>
                          <a 
                            href={verificationDocs[activeReviewProfile.id].registrationCertificateUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 p-1 px-2.5 rounded text-[10px] font-bold text-zinc-600 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open New Window</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        
                        <div className="h-44 bg-zinc-100 border border-dashed border-zinc-200 rounded-xl overflow-hidden flex items-center justify-center relative">
                          <img 
                            src={verificationDocs[activeReviewProfile.id].registrationCertificateUrl || 'https://via.placeholder.com/300x150?text=Registration+Certificate'} 
                            alt="Registration certificate cert" 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // If broken image URL, display solid vector placeholder
                              const el = e.currentTarget;
                              el.style.display = 'none';
                              const pNode = el.parentNode as HTMLElement;
                              if (pNode) {
                                pNode.innerHTML = `<div class="p-6 text-center"><p class="text-[10px] font-mono text-zinc-500 font-bold">${verificationDocs[activeReviewProfile.id].registrationCertificateUrl.substring(0, 48)}...</p></div>`;
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Practising Certificate view card */}
                      <div className="bg-white p-4 rounded-2xl border border-zinc-200">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-extrabold text-zinc-800 flex items-center gap-1.5">
                            <FileText size={16} className="text-indigo-600" />
                            <span>2. Practising Permit (Annual)</span>
                          </p>
                          <a 
                            href={verificationDocs[activeReviewProfile.id].practisingCertificateUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 p-1 px-2.5 rounded text-[10px] font-bold text-zinc-600 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open New Window</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        
                        <div className="h-44 bg-zinc-100 border border-dashed border-zinc-200 rounded-xl overflow-hidden flex items-center justify-center relative">
                          <img 
                            src={verificationDocs[activeReviewProfile.id].practisingCertificateUrl || 'https://via.placeholder.com/300x150?text=Practising+Certificate'} 
                            alt="Practising certificate permit" 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const el = e.currentTarget;
                              el.style.display = 'none';
                              const pNode = el.parentNode as HTMLElement;
                              if (pNode) {
                                pNode.innerHTML = `<div class="p-6 text-center"><p class="text-[10px] font-mono text-zinc-500 font-bold">${verificationDocs[activeReviewProfile.id].practisingCertificateUrl.substring(0, 48)}...</p></div>`;
                              }
                            }}
                          />
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl text-xs flex gap-2 font-medium">
                      <Info size={16} className="shrink-0 mt-0.5" />
                      <p>This pharmacist has requested verification but hasn't finalized document file submissions. Ask for more credentials below.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Panel actions foot bar including rejection forms (Part 6) */}
              <div className="bg-zinc-50 border-t border-zinc-200 p-6 shrink-0 space-y-4">
                
                {/* Rejection Form element (Part 6) */}
                {showRejectForm && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    className="p-4 bg-rose-50 border border-rose-150 rounded-2xl space-y-3"
                  >
                    <label className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Provide Rejection Explanation (Required):</label>
                    <textarea
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Current practicing signature expired, name mismatch..."
                      className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs font-semibold focus:outline-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(activeReviewProfile.id)}
                        disabled={savingAction || !rejectionReason.trim()}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="bg-zinc-200 hover:bg-zinc-300 text-zinc-600 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* More Info Request Form (Part 6) */}
                {showRequestInfoForm && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    className="p-4 bg-indigo-50 border border-indigo-150 rounded-2xl space-y-3"
                  >
                    <label className="text-xs font-bold text-[#1A237E] uppercase tracking-wider block">Information Required details:</label>
                    <textarea
                      required
                      value={requestInfoNotes}
                      onChange={(e) => setRequestInfoNotes(e.target.value)}
                      placeholder="e.g. Please upload your NDA compounding certification addition..."
                      className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-xs font-semibold focus:outline-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequestMoreInfo(activeReviewProfile.id)}
                        disabled={savingAction || !requestInfoNotes.trim()}
                        className="bg-[#1A237E] hover:bg-blue-900 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Send Request Note
                      </button>
                      <button
                        onClick={() => setShowRequestInfoForm(false)}
                        className="bg-zinc-200 hover:bg-zinc-300 text-zinc-650 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Main Action Bar Row */}
                {!showRejectForm && !showRequestInfoForm && (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <button
                      onClick={() => handleApprove(activeReviewProfile.id)}
                      disabled={savingAction || !canVerify}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-3 px-6 rounded-2xl flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <CheckCircle size={16} />
                      <span>Approve Credential Statement</span>
                    </button>

                    <div className="flex gap-3">
                      <button
                        disabled={!canVerify}
                        onClick={() => {
                          setShowRequestInfoForm(true);
                          setShowRejectForm(false);
                        }}
                        className="bg-indigo-100 hover:bg-indigo-200 text-[#1A237E] text-xs font-extrabold py-3 px-5 rounded-2xl cursor-pointer"
                      >
                        Request More Info
                      </button>
                      <button
                        disabled={!canVerify}
                        onClick={() => {
                          setShowRejectForm(true);
                          setShowRequestInfoForm(false);
                        }}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold py-3 px-5 rounded-2xl cursor-pointer"
                      >
                        Reject Credential
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SINGLE LICENCE STATUS UPDATE MODAL (Part 7) */}
      <AnimatePresence>
        {activeUpdateLicenceProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="bg-[#1A237E] text-white p-4 px-6 flex justify-between items-center">
                <h3 className="font-extrabold text-sm">Update Annual Compliance</h3>
                <button 
                  onClick={() => setActiveUpdateLicenceProfile(null)}
                  className="text-white bg-white/10 p-1 px-2.5 rounded-lg text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex gap-3 bg-zinc-50 border border-zinc-100 p-3 rounded-xl mb-2">
                  <div className="flex-grow">
                    <p className="text-[10px] uppercase font-bold text-zinc-400">Professional</p>
                    <p className="text-xs font-black text-zinc-900 mt-0.5">{activeUpdateLicenceProfile.fullName}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Permit: {activeUpdateLicenceProfile.registrationNumber}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Professional Standing Status</label>
                  <select
                    value={editLicenceStatus}
                    onChange={(e: any) => setEditLicenceStatus(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value="renewed_current">Renewed (Current)</option>
                    <option value="not_renewed">Not Yet Renewed</option>
                    <option value="suspended">Suspended</option>
                    <option value="lapsed">Lapsed / Expired</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">Licence Period Year</label>
                    <input
                      type="number"
                      value={editLicenceYear}
                      onChange={(e) => setEditLicenceYear(Number(e.target.value))}
                      className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2.5 text-xs font-semibold focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">Renewal Date</label>
                    <input
                      type="date"
                      value={editRenewalDate}
                      onChange={(e) => setEditRenewalDate(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2 px-2.5 text-xs font-semibold focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">licence Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2 px-2.5 text-xs font-semibold focus:outline-none font-mono"
                  />
                </div>

                {editLicenceStatus === 'suspended' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-bold text-rose-700">Suspension Reason notation (Required)</label>
                    <textarea
                      required
                      value={editSuspensionReason}
                      onChange={(e) => setEditSuspensionReason(e.target.value)}
                      placeholder="Specify infraction or NDA administrative hold code..."
                      className="w-full bg-white border border-rose-250 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                      rows={2}
                    />
                  </motion.div>
                )}
              </div>

              <div className="bg-zinc-50 p-4 px-6 border-t border-zinc-150 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setActiveUpdateLicenceProfile(null)}
                  className="bg-zinc-200 hover:bg-zinc-300 text-zinc-650 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!canManageCompliance || savingAction || (editLicenceStatus === 'suspended' && !editSuspensionReason.trim())}
                  onClick={handleSaveIndividualLicence}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider py-2 px-5 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Save Compliance Status
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BULK UPDATE MODAL (Part 7) */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="bg-[#1A237E] text-white p-4 px-6 flex justify-between items-center">
                <h3 className="font-extrabold text-sm">Bulk Update Compliance</h3>
                <button 
                  onClick={() => setShowBulkModal(false)}
                  className="text-white bg-white/10 p-1 px-2.5 rounded-lg text-xs"
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 p-4 rounded-2xl text-xs">
                  <p className="font-bold">Important Notice:</p>
                  <p className="mt-1 leading-relaxed">
                    This wizard will update the licensing permit parameters for all <strong>{selectedProfileIds.length}</strong> selected professionals in a single atomic transaction. Ideal for starting a new licensing season.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Target Compliance Status</label>
                  <select
                    value={bulkTargetStatus}
                    onChange={(e) => setBulkTargetStatus(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value="not_renewed">Under Renewal (Not Yet Renewed)</option>
                    <option value="renewed_current">Renewed (Current)</option>
                    <option value="lapsed">Lapsed / Expired</option>
                  </select>
                </div>

                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="bulkConfirm"
                    checked={bulkConfirmChecked}
                    onChange={(e) => setBulkConfirmChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 bg-zinc-50 border border-zinc-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="bulkConfirm" className="text-xs font-bold text-zinc-700 leading-tight">
                    I confirm I want to update compliance status for {selectedProfileIds.length} professionals.
                  </label>
                </div>
              </div>

              <div className="bg-zinc-50 p-4 px-6 border-t border-zinc-150 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="bg-zinc-200 hover:bg-zinc-300 text-zinc-650 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!canManageCompliance || savingAction || !bulkConfirmChecked}
                  onClick={handleBulkUpdate}
                  className={`text-xs font-black uppercase tracking-wider py-2 px-5 rounded-xl transition-all shadow-sm cursor-pointer ${
                    bulkConfirmChecked 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                      : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  Apply to {selectedProfileIds.length} Profiles
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
