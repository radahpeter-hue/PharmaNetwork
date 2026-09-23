import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '../components/Button';
import { ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';
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

      if (!userDocSnap.exists()) {
        await auth.signOut();
        setError('Your PharmaNetwork account setup is incomplete. Please contact support.');
        return;
      }

      const userData = userDocSnap.data();
      if (userData.isActive === false) {
        await auth.signOut();
        setError('This account has been deactivated. Please contact support.');
        return;
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
