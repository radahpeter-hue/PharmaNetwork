import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '../components/Button';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { AccountType, AvailabilityStatus, EmploymentType, OrganizationType, PrimaryCadre } from '../types';

const DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Entebbe', 'Gulu', 'Mbarara', 'Jinja', 'Mbale', 'Arua', 'Lira', 
  'Masaka', 'Fort Portal', 'Soroti', 'Kabale', 'Kasese', 'Hoima', 'Tororo', 'Iganga', 'Moroto', 'Kitgum', 'Other'
];

type RegistrationStep = 1 | 2 | 3 | 4;

const Register: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();
  const initialType = (searchParams.get('type') as AccountType) || null;
  
  const [step, setStep] = useState<RegistrationStep>(1);
  const [accountType, setAccountType] = useState<AccountType | null>(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [baseInfo, setBaseInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    district: 'Kampala',
    termsAccepted: false
  });

  // Individual Specific
  const [individualRoles, setIndividualRoles] = useState<string[]>([]);
  const [individualDetails, setIndividualDetails] = useState({
    primaryCadre: 'pharmacist' as PrimaryCadre,
    registrationNumber: '',
    qualification: 'Bachelor of Pharmacy BPharm',
    qualificationYear: new Date().getFullYear(),
    yearsExperience: 'less_than_1',
    areasOfPractice: [] as string[],
    availabilityStatus: 'actively_seeking' as AvailabilityStatus,
    preferredEmploymentTypes: [] as EmploymentType[],
    bio: ''
  });

  // Organisation Specific (support multiple)
  const [organisations, setOrganisations] = useState<any[]>([{
    id: 'org_' + Math.random().toString(36).substr(2, 9),
    organisationName: '',
    organisationTypes: [] as OrganizationType[],
    ndaLicenceNumber: '',
    district: 'Kampala',
    contactPhone: '',
    branchCount: '1',
    isHiring: false,
    about: ''
  }]);

  const handleNext = () => setStep((prev) => (prev + 1) as RegistrationStep);
  const handleBack = () => setStep((prev) => (prev - 1) as RegistrationStep);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (baseInfo.password !== baseInfo.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // 1. Sign up user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        baseInfo.email, 
        baseInfo.password
      );
      
      const userId = userCredential.user.uid;
      
      // Update profile display name
      await updateProfile(userCredential.user, {
        displayName: baseInfo.fullName
      });

      // 2. Create user account record
      const isProfessional = accountType === 'individual';

      await setDoc(doc(db, 'users', userId), {
        id: userId,
        accountType: accountType,
        accountClass: isProfessional ? 'professional' : 'organisation',
        accountStatus: isProfessional ? 'PENDING_PROFILE' : 'ACTIVE',
        isActive: !isProfessional,
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Create profile(s)
      if (accountType === 'individual') {
        await setDoc(doc(db, 'individualProfiles', userId), {
          fullName: baseInfo.fullName,
          phone: baseInfo.phone,
          district: baseInfo.district,
          primaryCadre: individualDetails.primaryCadre,
          registrationNumber: individualDetails.registrationNumber,
          qualification: individualDetails.qualification,
          qualificationYear: individualDetails.qualificationYear,
          yearsExperience: individualDetails.yearsExperience,
          availabilityStatus: individualDetails.availabilityStatus,
          preferredEmploymentTypes: individualDetails.preferredEmploymentTypes,
          areasOfPractice: individualDetails.areasOfPractice,
          bio: individualDetails.bio,
          roles: individualRoles,
          profileCompleteness: calculateCompleteness('individual'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Create an org profile document with all orgs
        await setDoc(doc(db, 'organisationProfiles', userId), {
          organisations: organisations,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      await refreshUserData();
      setStep(4);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'registration');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompleteness = (type: AccountType) => {
    if (type === 'individual') {
      let score = 0;
      if (baseInfo.fullName) score += 10;
      if (baseInfo.phone) score += 10;
      if (individualDetails.bio) score += 20;
      if (individualDetails.registrationNumber) score += 20;
      if (individualDetails.primaryCadre) score += 20;
      if (individualDetails.areasOfPractice.length > 0) score += 20;
      return score;
    }
    return 60;
  };

  if (!accountType) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl w-full">
           <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-primary mb-4">Choose your path</h1>
              <p className="text-zinc-600">How will you be using PharmaNetwork Uganda?</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <button 
                onClick={() => setAccountType('individual')}
                className="bg-white p-10 rounded-3xl shadow-sm border-2 border-transparent hover:border-primary transition-all text-left group"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
                  <User size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-4">Professional</h2>
                <p className="text-zinc-500 text-sm leading-relaxed mb-6">For pharmacy and health professionals creating a verified professional profile and network.</p>
                <ChevronRight className="text-zinc-300 group-hover:text-primary transition-colors" />
              </button>

              <button 
                onClick={() => setAccountType('organisation')}
                className="bg-white p-10 rounded-3xl shadow-sm border-2 border-transparent hover:border-primary transition-all text-left group"
              >
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-8 group-hover:scale-110 transition-transform">
                  <Building2 size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-4">Organisation</h2>
                <p className="text-zinc-500 text-sm leading-relaxed mb-6">For pharmacies, distributors, and manufacturers looking to hire staff and discover partners.</p>
                <ChevronRight className="text-zinc-300 group-hover:text-primary transition-colors" />
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-4">
      <div className="max-w-3xl mx-auto">
        {step < 4 && (
          <div className="mb-12">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Step {step} of 3</span>
              <span className="text-xs font-medium text-zinc-400 capitalize">{accountType} Registration</span>
            </div>
            <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: '0%' }}
                 animate={{ width: `${(step / 3) * 100}%` }}
                 className="h-full bg-primary"
               />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-8 lg:p-12 rounded-3xl shadow-sm border border-zinc-100"
            >
              <h2 className="text-3xl font-bold text-zinc-900 mb-8">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-zinc-700">Full Name</label>
                   <input 
                     type="text" 
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                     placeholder="John Doe"
                     value={baseInfo.fullName}
                     onChange={e => setBaseInfo({...baseInfo, fullName: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-zinc-700">Email Address</label>
                   <input 
                     type="email" 
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                     placeholder="john@example.com"
                     value={baseInfo.email}
                     onChange={e => setBaseInfo({...baseInfo, email: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-zinc-700">WhatsApp Number</label>
                   <input 
                     type="tel" 
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                     placeholder="077..."
                     value={baseInfo.phone}
                     onChange={e => setBaseInfo({...baseInfo, phone: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-zinc-700">District</label>
                   <select 
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                     value={baseInfo.district}
                     onChange={e => setBaseInfo({...baseInfo, district: e.target.value})}
                   >
                     {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-zinc-700">Password (min 6 chars)</label>
                   <input 
                     type="password" 
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                     placeholder="••••••••"
                     value={baseInfo.password}
                     onChange={e => setBaseInfo({...baseInfo, password: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-zinc-700">Confirm Password</label>
                   <input 
                     type="password" 
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                     placeholder="••••••••"
                     value={baseInfo.confirmPassword}
                     onChange={e => setBaseInfo({...baseInfo, confirmPassword: e.target.value})}
                   />
                 </div>
              </div>

              <div className="bg-zinc-50 p-6 rounded-2xl mb-10">
                 <label className="flex items-start gap-4 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-5 h-5 rounded border-zinc-300 text-primary focus:ring-primary"
                      checked={baseInfo.termsAccepted}
                      onChange={e => setBaseInfo({...baseInfo, termsAccepted: e.target.checked})}
                    />
                    <span className="text-xs text-zinc-500 leading-relaxed">
                      By registering you agree to our <Link to="/terms" className="text-primary font-bold">Terms of Use</Link> and <Link to="/privacy" className="text-primary font-bold">Privacy Policy</Link>. Professional registration details are submitted for verification within PharmaNetwork. Registration alone does not grant access to the member network.
                    </span>
                 </label>
              </div>

              <div className="flex gap-4">
                 <Button variant="ghost" onClick={() => setAccountType(null)}>Back</Button>
                 <Button className="ml-auto flex items-center gap-2" disabled={!baseInfo.termsAccepted} onClick={handleNext}>
                   Continue <ChevronRight size={18} />
                 </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && accountType === 'individual' && (
            <motion.div 
               key="step2-indiv"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="bg-white p-8 lg:p-12 rounded-3xl shadow-sm border border-zinc-100"
            >
               <h2 className="text-3xl font-bold text-zinc-900 mb-4">Tell us about your professional role.</h2>
               <p className="text-zinc-500 mb-10">Select all that apply. You can update this at any time.</p>

               <div className="space-y-4 mb-12">
                  {[
                    { id: 'pharmacy_professional', label: 'I am a pharmacy professional (pharmacist, technician, assistant, dispenser)' },
                    { id: 'pharmacy_owner', label: 'I own or manage a pharmacy or pharmaceutical business' },
                    { id: 'manufacturing', label: 'I work in pharmaceutical manufacturing or production' },
                    { id: 'import_distribution', label: 'I work in pharmaceutical import, distribution, or wholesale' },
                    { id: 'medical_sales', label: 'I am a medical sales representative or marketing agent' },
                    { id: 'regulatory_qa', label: 'I work in regulatory affairs or quality assurance' }
                  ].map(role => (
                    <label 
                      key={role.id} 
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all",
                        individualRoles.includes(role.id) ? "border-primary bg-primary/5" : "border-zinc-100 hover:border-zinc-200"
                      )}
                    >
                       <input 
                         type="checkbox" 
                         className="w-6 h-6 rounded border-zinc-300 text-primary focus:ring-primary"
                         checked={individualRoles.includes(role.id)}
                         onChange={e => {
                            if (e.target.checked) setIndividualRoles([...individualRoles, role.id]);
                            else setIndividualRoles(individualRoles.filter(r => r !== role.id));
                         }}
                       />
                       <span className="font-semibold text-zinc-700">{role.label}</span>
                    </label>
                  ))}
               </div>

               <div className="flex gap-4">
                 <Button variant="ghost" onClick={handleBack}>Back</Button>
                 <Button className="ml-auto" onClick={handleNext} disabled={individualRoles.length === 0}>
                   Continue
                 </Button>
               </div>
            </motion.div>
          )}

          {step === 2 && accountType === 'organisation' && (
             <motion.div 
                key="step2-org"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
             >
                <OrganisationForm 
                   organisations={organisations} 
                   setOrganisations={setOrganisations} 
                   onBack={handleBack} 
                   onNext={handleNext} 
                />
             </motion.div>
          )}

          {step === 3 && accountType === 'individual' && (
             <motion.div 
               key="step3-indiv"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
             >
               <IndividualDetailsForm 
                  roles={individualRoles}
                  details={individualDetails}
                  setDetails={setIndividualDetails}
                  organisations={organisations}
                  setOrganisations={setOrganisations}
                  onBack={handleBack}
                  onSubmit={handleSubmit}
                  loading={loading}
                  error={error}
               />
             </motion.div>
          )}

          {step === 3 && accountType === 'organisation' && (
             <motion.div 
               key="step3-org"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="bg-white p-12 rounded-3xl shadow-sm border border-zinc-100 text-center"
             >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                   <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-4">Almost there!</h2>
                <p className="text-zinc-500 mb-10">We're ready to create your organisation network profile.</p>

                {error && (
                   <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                     <AlertCircle size={16} /> {error}
                   </div>
                )}

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={handleBack}>Back</Button>
                  <Button className="ml-auto" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Creating..." : "Confirm & Register"}
                  </Button>
                </div>
             </motion.div>
          )}

          {step === 4 && (
             <motion.div 
               key="step4"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white p-12 rounded-3xl shadow-lg border border-zinc-100 text-center"
             >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600">
                   <CheckCircle2 size={40} />
                </div>
                <h2 className="text-4xl font-bold text-zinc-900 mb-4">
                  {accountType === 'individual' ? 'Registration received' : 'Organisation account created'}
                </h2>
                <p className="text-zinc-500 mb-10 max-w-md mx-auto">
                  {accountType === 'individual'
                    ? 'Your professional account has been created. Complete your profile and submit the required verification information. Member-network access begins after verification and activation.'
                    : 'Your organisation account has been created and is ready to use.'}
                </p>
                
                <div className="bg-zinc-50 p-8 rounded-2xl mb-10 text-left">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-400">Profile Completeness</h4>
                      <span className="font-bold text-primary">{calculateCompleteness(accountType)}%</span>
                   </div>
                   <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden mb-6">
                      <div className="h-full bg-primary" style={{ width: `${calculateCompleteness(accountType)}%` }}></div>
                   </div>
                   <div className="space-y-3">
                      <p className="text-xs font-bold text-zinc-400">NEXT STEPS:</p>
                      {(accountType === 'individual'
                        ? [
                            'Add a profile photo',
                            'Upload your CV / Qualifications',
                            'Submit professional verification documents'
                          ]
                        : [
                            'Review your organisation details',
                            'Add complete contact information',
                            'Start building your organisation profile'
                          ]
                      ).map(step => (
                        <div key={step} className="flex items-center gap-3 text-sm text-zinc-600 hover:text-primary cursor-pointer group">
                           <div className="w-5 h-5 rounded-full border border-zinc-200 group-hover:border-primary transition-colors"></div>
                           {step}
                        </div>
                      ))}
                   </div>
                </div>

                <Button
                  fullWidth
                  size="lg"
                  onClick={() => navigate(accountType === 'individual' ? '/account-status' : '/dashboard')}
                >
                  {accountType === 'individual' ? 'View account status' : 'Go to my dashboard'}
                </Button>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const OrganisationForm = ({ organisations, setOrganisations, onBack, onNext, hideNav }: any) => {
   const addOrg = () => setOrganisations([...organisations, {
      id: 'org_' + Math.random().toString(36).substr(2, 9),
      organisationName: '',
      organisationTypes: [],
      ndaLicenceNumber: '',
      district: 'Kampala',
      contactPhone: '',
      branchCount: '1',
      isHiring: false,
      about: ''
   }]);

   const updateOrg = (index: number, fields: any) => {
      const newOrgs = [...organisations];
      newOrgs[index] = { ...newOrgs[index], ...fields };
      setOrganisations(newOrgs);
   };

   return (
      <div className="bg-white p-8 lg:p-12 rounded-3xl shadow-sm border border-zinc-100">
         <h2 className="text-3xl font-bold text-zinc-900 mb-4">Organisation Details</h2>
         <p className="text-zinc-500 mb-10 italic">You can register multiple pharmacy businesses under one account.</p>

         <div className="space-y-12">
            {organisations.map((org: any, idx: number) => (
               <div key={org.id} className="p-8 bg-zinc-50 rounded-2xl border border-zinc-100 relative">
                  <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm">{idx + 1}</div>
                    Business Entity
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-sm font-semibold">Organisation Name</label>
                        <input 
                           className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                           placeholder="Pharma Limited"
                           value={org.organisationName}
                           onChange={e => updateOrg(idx, { organisationName: e.target.value })}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-sm font-semibold">NDA Licence Number (Optional)</label>
                        <input 
                           className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                           placeholder="NDA/..."
                           value={org.ndaLicenceNumber}
                           onChange={e => updateOrg(idx, { ndaLicenceNumber: e.target.value })}
                        />
                     </div>
                     <div className="md:col-span-2 space-y-3">
                        <label className="text-sm font-semibold">Organisation Type</label>
                        <div className="flex flex-wrap gap-2">
                           {['retail_pharmacy', 'wholesale_pharmacy', 'drug_shop', 'importer', 'distributor', 'manufacturer', 'other'].map(t => (
                              <button
                                 key={t}
                                 type="button"
                                 onClick={() => {
                                    const types = org.organisationTypes.includes(t) 
                                       ? org.organisationTypes.filter((x: any) => x !== t)
                                       : [...org.organisationTypes, t];
                                    updateOrg(idx, { organisationTypes: types });
                                 }}
                                 className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all",
                                    org.organisationTypes.includes(t) ? "bg-primary text-white" : "bg-white border border-zinc-200 text-zinc-500 hover:border-primary/50"
                                 )}
                              >
                                 {t.replace('_', ' ')}
                              </button>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-sm font-semibold">Branch Count</label>
                        <select 
                           className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                           value={org.branchCount}
                           onChange={e => updateOrg(idx, { branchCount: e.target.value })}
                        >
                           <option value="1">1</option>
                           <option value="2_to_5">2 to 5</option>
                           <option value="6_to_10">6 to 10</option>
                           <option value="10_plus">10 plus</option>
                        </select>
                     </div>
                  </div>
               </div>
            ))}
         </div>

         <button 
           onClick={addOrg}
           className="w-full mt-8 py-5 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-bold"
         >
           Add Another Organisation
         </button>

         {!hideNav && (
           <div className="flex gap-4 mt-12">
              <Button variant="ghost" onClick={onBack}>Back</Button>
              <Button className="ml-auto" onClick={onNext} disabled={organisations.some((o: any) => !o.organisationName)}>
                Continue
              </Button>
           </div>
         )}
      </div>
   );
};

const IndividualDetailsForm = ({ roles, details, setDetails, organisations, setOrganisations, onBack, onSubmit, loading, error }: any) => {
   const isProfessional = roles.includes('pharmacy_professional');
   const isOwner = roles.includes('pharmacy_owner');

   return (
      <div className="space-y-8">
         <div className="bg-white p-8 lg:p-12 rounded-3xl shadow-sm border border-zinc-100">
            <h2 className="text-3xl font-bold text-zinc-900 mb-8">Professional Profile</h2>
            
            <div className="space-y-12">
               {isProfessional && (
                  <div className="space-y-6 bg-zinc-50 p-8 rounded-2xl">
                     <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
                        <ShieldCheck size={20} />
                        Professional Qualifications
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-sm font-semibold">Primary Cadre</label>
                           <select 
                              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                              value={details.primaryCadre}
                              onChange={e => setDetails({...details, primaryCadre: e.target.value})}
                           >
                              <option value="pharmacist">Registered Pharmacist</option>
                              <option value="pharmacy_technician">Pharmacy Technician</option>
                              <option value="pharmacy_assistant">Pharmacy Assistant / Dispenser</option>
                              <option value="drug_shop_auxiliary">Drug Shop Auxiliary Staff</option>
                              <option value="other">Other</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-semibold">Registration Number</label>
                           <input 
                              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Enter your PSU or NDA number"
                              value={details.registrationNumber}
                              onChange={e => setDetails({...details, registrationNumber: e.target.value})}
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-semibold">Highest Qualification</label>
                           <select 
                              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                              value={details.qualification}
                              onChange={e => setDetails({...details, qualification: e.target.value})}
                           >
                              <option value="Bachelor of Pharmacy BPharm">Bachelor of Pharmacy BPharm</option>
                              <option value="Diploma in Pharmacy">Diploma in Pharmacy</option>
                              <option value="Certificate in Pharmacy">Certificate in Pharmacy</option>
                              <option value="Enrolled Nurse / Midwife">Enrolled Nurse / Midwife</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-semibold">Years Experience</label>
                           <select 
                             className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                             value={details.yearsExperience}
                             onChange={e => setDetails({...details, yearsExperience: e.target.value})}
                           >
                             <option value="less_than_1">Less than 1 year</option>
                             <option value="1_to_3">1 to 3 years</option>
                             <option value="3_to_5">3 to 5 years</option>
                             <option value="5_to_10">5 to 10 years</option>
                             <option value="10_plus">10+ years</option>
                           </select>
                        </div>
                     </div>
                  </div>
               )}

               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-sm font-semibold">Areas of Practice</label>
                     <div className="flex flex-wrap gap-2">
                        {['Retail / Community', 'Hospital / Clinical', 'Industrial / Manufacturing', 'Wholesale / Distribution', 'Regulatory Affairs', 'Research', 'Drug Shop'].map(area => (
                           <button 
                             key={area}
                             onClick={() => {
                               const areas = details.areasOfPractice.includes(area)
                                 ? details.areasOfPractice.filter((a: string) => a !== area)
                                 : [...details.areasOfPractice, area];
                               setDetails({...details, areasOfPractice: areas});
                             }}
                             className={cn(
                               "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                               details.areasOfPractice.includes(area) ? "bg-primary text-white" : "bg-zinc-50 border border-zinc-200 text-zinc-400"
                             )}
                           >
                             {area}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="text-sm font-semibold">Employment Status</label>
                        <div className="space-y-2">
                           {[
                             { id: 'actively_seeking', label: 'Actively seeking' },
                             { id: 'open_to_offers', label: 'Open to opportunities' },
                             { id: 'not_available', label: 'Not seeking' }
                           ].map(status => (
                              <label key={status.id} className="flex items-center gap-3 cursor-pointer group">
                                 <input 
                                   type="radio" 
                                   name="status"
                                   className="w-5 h-5 text-primary border-zinc-300 focus:ring-primary"
                                   checked={details.availabilityStatus === status.id}
                                   onChange={() => setDetails({...details, availabilityStatus: status.id})}
                                 />
                                 <span className="text-sm text-zinc-600 group-hover:text-primary transition-colors">{status.label}</span>
                              </label>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-semibold">Brief Bio</label>
                     <textarea 
                        className="w-full px-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary h-32 resize-none text-sm"
                        placeholder="Tell us about yourself..."
                        maxLength={300}
                        value={details.bio}
                        onChange={e => setDetails({...details, bio: e.target.value})}
                     />
                  </div>
               </div>
            </div>

            {isOwner && (
               <div className="mt-16 pt-16 border-t border-zinc-100">
                  <OrganisationForm 
                     organisations={organisations} 
                     setOrganisations={setOrganisations}
                     hideNav={true}
                  />
               </div>
            )}

            {error && (
               <div className="mt-8 bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-2">
                 <AlertCircle size={16} /> {error}
               </div>
            )}

            <div className="flex gap-4 mt-8 pt-8 border-t border-zinc-100">
              <Button variant="ghost" onClick={onBack}>Back</Button>
              <Button className="ml-auto flex items-center gap-2" onClick={onSubmit} disabled={loading}>
                {loading ? "Registering..." : <>Finalize Registration <ShieldCheck size={18} /></>}
              </Button>
            </div>
         </div>
      </div>
   );
};

export default Register;
