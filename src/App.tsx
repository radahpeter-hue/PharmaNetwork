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
import AccountStatus from './pages/AccountStatus';

const AuthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userAccount, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  if (!user || !userAccount) {
    return <Navigate to="/login" state={{ from: window.location.pathname }} />;
  }

  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userAccount, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  if (!user || !userAccount) {
    return <Navigate to="/login" state={{ from: window.location.pathname }} />;
  }

  if (userAccount.isActive === false || (userAccount.accountStatus && userAccount.accountStatus !== 'ACTIVE')) {
    return <Navigate to="/account-status" replace />;
  }

  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;

    const checkAdminStatus = async () => {
      if (loading) return;
      if (!user) {
        if (active) setIsAdmin(false);
        return;
      }

      try {
        const idTokenResult = await user.getIdTokenResult();
        if (active) setIsAdmin(idTokenResult.claims.admin === true);
      } catch (err) {
        console.error('Admin claim check failed:', err);
        if (active) setIsAdmin(false);
      }
    };

    checkAdminStatus();
    return () => {
      active = false;
    };
  }, [user, loading]);

  if (loading || isAdmin === null) return (
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

  React.useEffect(() => {
    let active = true;

    const checkStatus = async () => {
      if (loading) return;
      if (!user) {
        if (active) setIsBodyAdmin(false);
        return;
      }

      try {
        const idTokenResult = await user.getIdTokenResult();
        if (active) setIsBodyAdmin(idTokenResult.claims.body_admin === true);
      } catch (err) {
        console.error('Professional authority claim check failed:', err);
        if (active) setIsBodyAdmin(false);
      }
    };

    checkStatus();
    return () => {
      active = false;
    };
  }, [user, loading]);

  if (loading || isBodyAdmin === null) return (
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
                path="/account-status"
                element={
                  <AuthenticatedRoute>
                    <AccountStatus />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <AuthenticatedRoute>
                    <Profile />
                  </AuthenticatedRoute>
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
