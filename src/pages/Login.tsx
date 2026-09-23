import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '../components/Button';
import { ShieldCheck, Mail, Lock, AlertCircle, User, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Atomic activation status check immediately after sign-in
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.isActive === false) {
          await auth.signOut();
          setError('This account has been deactivated. Please contact support.');
          setLoading(false);
          return;
        }
      }

      navigate(from);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Email or password is incorrect. Please try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'individual' | 'organisation') => {
    setLoading(true);
    setError(null);
    setResetSent(false);

    const demoEmail = type === 'individual' 
      ? 'ronald.mukasa@pharmagh.com' 
      : 'acacia.pharmacy@pharmagh.com';
    const demoPassword = 'demo_password_123';
    const demoName = type === 'individual' ? 'Dr. Ronald Mukasa' : 'Acacia Pharmacy Group';

    try {
      // Try to sign in first
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      navigate(from);
    } catch (err: any) {
      // If user not found or auth details fail, create on-the-fly
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/invalid-credential' || 
        err.message?.includes('invalid-credential') ||
        err.message?.includes('user-not-found')
      ) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          const userId = userCredential.user.uid;
          
          await updateProfile(userCredential.user, {
            displayName: demoName
          });

          await setDoc(doc(db, 'users', userId), {
            id: userId,
            accountType: type,
            isActive: true,
            isVerified: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          if (type === 'individual') {
            await setDoc(doc(db, 'individualProfiles', userId), {
              fullName: demoName,
              phone: '+256 772 101010',
              district: 'Kampala',
              primaryCadre: 'pharmacist',
              registrationNumber: 'PSU/PH/2023/124',
              qualification: 'Bachelor of Pharmacy BPharm',
              yearsExperience: '3_to_5',
              qualificationYear: 2022,
              availabilityStatus: 'actively_seeking',
              preferredEmploymentTypes: ['full_time', 'locum'],
              areasOfPractice: ['Retail / Community', 'Hospital / Clinical'],
              bio: 'Passionate registered community pharmacist based in central Kampala. Experienced in inventory optimization, National Drug Authority regulations, and providing patient-centric care.',
              roles: ['pharmacy_professional'],
              profileCompleteness: 90,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else {
            await setDoc(doc(db, 'organisationProfiles', userId), {
              organisations: [{
                id: 'org_acacia_1_demo',
                organisationName: 'Acacia Pharmacy (Kololo Branch)',
                organisationTypes: ['retail_pharmacy'],
                ndaLicenceNumber: 'NDA/PH/2025/119',
                district: 'Kampala',
                contactPhone: '+256 701 987654',
                branchCount: '1',
                isHiring: true,
                about: 'Acacia Pharmacy is a standard-setting retail operation located in Kampala. Specializing in family healthcare services, direct PSU oversight, and high-quality medication supply chains.'
              }],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }

          navigate(from);
        } catch (createErr: any) {
          console.error("Demo registration error:", createErr);
          setError(`Could not automatically register demo database records: ${createErr.message}`);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminDemoLogin = async () => {
    setLoading(true);
    setError(null);
    setResetSent(false);

    const demoEmail = 'admin.peter@pharmagh.com';
    const demoPassword = 'admin_password_123';
    const demoName = 'Peter (Platform Owner)';

    try {
      // Try to sign in first
      const credential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      const userId = credential.user.uid;
      
      // Ensure the admin document exists in 'admins' collection so they pass firestore.rules check
      await setDoc(doc(db, 'admins', userId), {
        role: 'admin',
        assignedAt: serverTimestamp()
      }, { merge: true });

      // Ensure they exist in 'users' collection too
      await setDoc(doc(db, 'users', userId), {
        id: userId,
        accountType: 'individual',
        isActive: true,
        isVerified: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      navigate('/admin');
    } catch (err: any) {
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/invalid-credential' || 
        err.message?.includes('invalid-credential') ||
        err.message?.includes('user-not-found')
      ) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          const userId = userCredential.user.uid;
          
          await updateProfile(userCredential.user, {
            displayName: demoName
          });

          // Create the admin doc
          await setDoc(doc(db, 'admins', userId), {
            role: 'admin',
            assignedAt: serverTimestamp()
          });

          // Create the user doc
          await setDoc(doc(db, 'users', userId), {
            id: userId,
            accountType: 'individual',
            isActive: true,
            isVerified: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Create professional profile for Peter (admin)
          await setDoc(doc(db, 'individualProfiles', userId), {
            fullName: demoName,
            phone: '+256 700 112233',
            district: 'Kampala',
            primaryCadre: 'pharmacist',
            registrationNumber: 'PSU/ADM/2026/01',
            qualification: 'Director of Pharmacy Services',
            yearsExperience: '10_plus',
            qualificationYear: 2012,
            availabilityStatus: 'not_available',
            preferredEmploymentTypes: [],
            areasOfPractice: ['Policy & Regulation'],
            bio: 'Owner and Lead Administrator of PharmaNetwork Uganda.',
            roles: ['pharmacy_professional'],
            profileCompleteness: 100,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          navigate('/admin');
        } catch (createErr: any) {
          console.error("Admin Demo registration error:", createErr);
          setError(`Could not register admin: ${createErr.message}`);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20 bg-zinc-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden"
      >
        <div className="p-8 lg:p-12">
          <div className="flex flex-col items-center text-center mb-10">
            <Link to="/" className="flex items-center gap-2 mb-8">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">P</span>
              </div>
              <div className="flex flex-col leading-tight text-left">
                <span className="font-bold text-primary text-2xl tracking-tight">PharmaNetwork</span>
                <span className="text-primary-light text-xs font-semibold uppercase tracking-widest">Uganda</span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
            <p className="text-zinc-500 mt-2">Log in to keep building your network</p>
          </div>

          {/* Quick Experience sandbox credentials */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-6 mb-8 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full">
              Demo Sandbox Gate
            </span>
            <p className="text-xs text-emerald-700/90 font-medium mt-2.5 mb-4 leading-relaxed">
              Experience the customized dashboards and features instantly with one click:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDemoLogin('individual')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-4 bg-white hover:bg-emerald-50 text-zinc-800 hover:text-emerald-950 border border-emerald-100/60 rounded-2xl transition-all cursor-pointer shadow-3xs"
              >
                <User size={20} className="text-emerald-650 mb-1.5" />
                <span className="text-[11px] font-extrabold tracking-tight">As Pharmacist</span>
                <span className="text-[9px] text-zinc-400 font-medium font-mono leading-none mt-1">Individual</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleDemoLogin('organisation')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-4 bg-white hover:bg-emerald-50 text-zinc-800 hover:text-emerald-950 border border-emerald-100/60 rounded-2xl transition-all cursor-pointer shadow-3xs"
              >
                <Building2 size={20} className="text-emerald-650 mb-1.5" />
                <span className="text-[11px] font-extrabold tracking-tight">As Pharmacy</span>
                <span className="text-[9px] text-zinc-400 font-medium font-mono leading-none mt-1">Organisation</span>
              </button>
            </div>
            
            <button
              type="button"
              onClick={handleAdminDemoLogin}
              disabled={loading}
              className="mt-3 w-full flex items-center justify-center gap-2.5 p-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-wider text-[10px] sm:text-[11px] rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <ShieldCheck size={16} />
              <span>Login as Demo Admin (Platform Owner)</span>
            </button>
            
            {loading && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 animate-pulse mt-3.5">
                Connecting to Sandbox...
              </p>
            )}
          </div>

          <div className="relative flex items-center justify-center mb-8">
            <div className="border-t border-zinc-150 w-full font-mono"></div>
            <span className="absolute bg-white px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              Or Sign In Manually
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-shake">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            
            {resetSent && (
              <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                <ShieldCheck size={18} />
                <span>Password reset email sent!</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-zinc-700">Password</label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button 
               fullWidth 
               size="lg" 
               type="submit" 
               disabled={loading}
               className="h-14"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Login'
              )}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-zinc-100 text-center">
            <p className="text-sm text-zinc-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-primary hover:underline">
                Register now
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
