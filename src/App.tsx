import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import JobBoard from './pages/JobBoard';
import CreateJobPosting from './pages/CreateJobPosting';
import JobPostingDetail from './pages/JobPostingDetail';
import EditJobPosting from './pages/EditJobPosting';
import CreateAvailabilityPost from './pages/CreateAvailabilityPost';
import AvailabilityPostDetail from './pages/AvailabilityPostDetail';
import MyPostings from './pages/MyPostings';
import CreateBusinessListing from './pages/CreateBusinessListing';
import BusinessListingDetail from './pages/BusinessListingDetail';
import EditBusinessListing from './pages/EditBusinessListing';
import MyListings from './pages/MyListings';
import Messages from './pages/Messages';
import { AdminConsole } from './pages/AdminConsole';
import { BodyAdminConsole } from './pages/BodyAdminConsole';
import { PublicProfile } from './pages/PublicProfile';
import BrowseProfessionals from './pages/BrowseProfessionals';
import BrowseOrganisations from './pages/BrowseOrganisations';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" state={{ from: window.location.pathname }} />;
  
  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [checking, setChecking] = React.useState(true);
  
  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    
    let active = true;
    
    const checkAdminStatus = async () => {
      try {
        const idTokenResult = await auth.currentUser?.getIdTokenResult();
        if (idTokenResult?.claims.admin) {
          if (active) setIsAdmin(true);
          return;
        }
        
        const email = auth.currentUser?.email;
        if (email === 'liamradah10@gmail.com' || email === 'admin.peter@pharmagh.com') {
          if (active) setIsAdmin(true);
          return;
        }

        const adminDocRef = doc(db, 'admins', user.uid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          if (active) setIsAdmin(true);
        } else {
          if (active) setIsAdmin(false);
        }
      } catch (err) {
        console.error("Admin check error on route:", err);
        if (active) setIsAdmin(false);
      } finally {
        if (active) setChecking(false);
      }
    };
    
    checkAdminStatus();
      
    return () => {
      active = false;
    };
  }, [user, loading]);
  
  if (loading || checking) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" state={{ from: window.location.pathname }} />;
  
  if (!isAdmin) return <Navigate to="/dashboard" />;
  
  return <>{children}</>;
};

const BodyAdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isBodyAdmin, setIsBodyAdmin] = React.useState<boolean | null>(null);
  const [checking, setChecking] = React.useState(true);
  
  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsBodyAdmin(false);
      setChecking(false);
      return;
    }
    
    let active = true;
    
    const checkStatus = async () => {
      try {
        const idTokenResult = await auth.currentUser?.getIdTokenResult();
        if (idTokenResult?.claims.body_admin) {
          if (active) setIsBodyAdmin(true);
          return;
        }
        
        const email = auth.currentUser?.email;
        if (email === 'psu.admin@demo.pnu.ug' || email === 'ahpc.admin@demo.pnu.ug') {
          if (active) setIsBodyAdmin(true);
          return;
        }

        const adminDocRef = doc(db, 'regulatoryBodyAdmins', user.uid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists() && adminDocSnap.data().isActive !== false) {
          if (active) setIsBodyAdmin(true);
        } else {
          if (active) setIsBodyAdmin(false);
        }
      } catch (err) {
        console.error("Regulatory check error on route:", err);
        if (active) setIsBodyAdmin(false);
      } finally {
        if (active) setChecking(false);
      }
    };
    
    checkStatus();
      
    return () => {
      active = false;
    };
  }, [user, loading]);
  
  if (loading || checking) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" state={{ from: window.location.pathname }} />;
  
  if (!isBodyAdmin) return <Navigate to="/dashboard" />;
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-grow pt-20">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/jobs" 
                element={
                  <ProtectedRoute>
                    <JobBoard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/jobs/create" 
                element={
                  <ProtectedRoute>
                    <CreateJobPosting />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/jobs/:postingId" 
                element={
                  <ProtectedRoute>
                    <JobPostingDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/jobs/:postingId/edit" 
                element={
                  <ProtectedRoute>
                    <EditJobPosting />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/availability/create" 
                element={
                  <ProtectedRoute>
                    <CreateAvailabilityPost />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/availability/:postId" 
                element={
                  <ProtectedRoute>
                    <AvailabilityPostDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-postings" 
                element={
                  <ProtectedRoute>
                    <MyPostings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/marketplace/businesses/create" 
                element={
                  <ProtectedRoute>
                    <CreateBusinessListing />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/marketplace/businesses/:id" 
                element={
                  <ProtectedRoute>
                    <BusinessListingDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/marketplace/businesses/:id/edit" 
                element={
                  <ProtectedRoute>
                    <EditBusinessListing />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-listings" 
                element={
                  <ProtectedRoute>
                    <MyListings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/messages" 
                element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <AdminProtectedRoute>
                    <AdminConsole />
                  </AdminProtectedRoute>
                } 
              />
              <Route 
                path="/body-admin" 
                element={
                  <BodyAdminProtectedRoute>
                    <BodyAdminConsole />
                  </BodyAdminProtectedRoute>
                } 
              />
              <Route 
                path="/professionals/:uid" 
                element={
                  <ProtectedRoute>
                    <PublicProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/browse/professionals" 
                element={
                  <ProtectedRoute>
                    <BrowseProfessionals />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/browse/organisations" 
                element={
                  <ProtectedRoute>
                    <BrowseOrganisations />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organisations/:uid" 
                element={
                  <ProtectedRoute>
                    <PublicProfile />
                  </ProtectedRoute>
                } 
              />
              {/* Fallback to home */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
