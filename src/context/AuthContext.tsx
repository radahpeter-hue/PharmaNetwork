import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { IndividualProfile, OrganisationProfile, UserAccount } from '../types';

interface AuthContextType {
  user: User | null;
  userAccount: UserAccount | null;
  profile: IndividualProfile | OrganisationProfile | null;
  loading: boolean;
  isPlatformAdmin: boolean;
  isAuthorityAdmin: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<IndividualProfile | OrganisationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isAuthorityAdmin, setIsAuthorityAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          setIsPlatformAdmin(tokenResult.claims.admin === true);
          setIsAuthorityAdmin(tokenResult.claims.authority_admin === true);
          await fetchUserData(currentUser.uid);
        } catch (error) {
          console.error('Error resolving authenticated account context:', error);
          setIsPlatformAdmin(false);
          setIsAuthorityAdmin(false);
          setLoading(false);
        }
      } else {
        setUserAccount(null);
        setProfile(null);
        setIsPlatformAdmin(false);
        setIsAuthorityAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // 1. Fetch user account
      const accountDoc = await getDoc(doc(db, 'users', userId));
      
      if (!accountDoc.exists()) {
        // A newly created Firebase Auth user may briefly exist before the
        // registration flow writes its PharmaNetwork account document.
        setUserAccount(null);
        setProfile(null);
        return;
      }

      const accountData = accountDoc.data() as UserAccount;
      setUserAccount(accountData);

      // 2. Fetch profile - doc ID == userId
      const profileCollection = accountData.accountType === 'individual'
        ? 'individualProfiles'
        : 'organisationProfiles';

      const profileDoc = await getDoc(doc(db, profileCollection, userId));

      if (profileDoc.exists()) {
        setProfile(profileDoc.data() as IndividualProfile | OrganisationProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user data from Firebase:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const refreshUserData = async () => {
    if (!auth.currentUser) {
      setUserAccount(null);
      setProfile(null);
      setIsPlatformAdmin(false);
      setIsAuthorityAdmin(false);
      return;
    }

    setLoading(true);

    try {
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      setIsPlatformAdmin(tokenResult.claims.admin === true);
      setIsAuthorityAdmin(tokenResult.claims.authority_admin === true);
      await fetchUserData(auth.currentUser.uid);
    } catch (error) {
      console.error('Error refreshing authenticated account context:', error);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userAccount,
      profile,
      loading,
      isPlatformAdmin,
      isAuthorityAdmin,
      signOut,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
