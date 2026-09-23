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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<IndividualProfile | OrganisationProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserData(currentUser.uid);
      } else {
        setUserAccount(null);
        setProfile(null);
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
        console.warn('Authenticated user has no PharmaNetwork account record. Terminating session.');
        await firebaseSignOut(auth);
        setUserAccount(null);
        setProfile(null);
        setUser(null);
        return;
      }

      const accountData = accountDoc.data() as UserAccount;

      if (accountData.isActive === false) {
        console.warn('User account is deactivated. Terminating session.');
        await firebaseSignOut(auth);
        setUserAccount(null);
        setProfile(null);
        setUser(null);
        return;
      }

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

  return (
    <AuthContext.Provider value={{ user, userAccount, profile, loading, signOut }}>
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
