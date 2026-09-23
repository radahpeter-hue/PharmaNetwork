import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Button } from './Button';
import { 
  Menu, 
  X, 
  User as UserIcon, 
  LogOut, 
  LayoutDashboard, 
  Search, 
  Briefcase, 
  MessageSquare, 
  FileText, 
  Building, 
  ShieldCheck, 
  Settings,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const Navigation: React.FC = () => {
  const { user, userAccount, isPlatformAdmin, isAuthorityAdmin, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [maintenanceModeOn, setMaintenanceModeOn] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);
  const activeMember = !!userAccount
    && userAccount.isActive !== false
    && (!userAccount.accountStatus || userAccount.accountStatus === 'ACTIVE');

  useEffect(() => {
    const unsubMaintenance = onSnapshot(doc(db, 'platformConfig', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        setMaintenanceModeOn(!!docSnap.data().maintenanceMode);
      } else {
        setMaintenanceModeOn(false);
      }
    }, (error) => {
      console.warn('Realtime maintenance check failed:', error);
    });
    return () => unsubMaintenance();
  }, []);

  useEffect(() => {
    if (!user || !activeMember) {
      setUnreadCount(0);
      return;
    }

    // Only active members subscribe to member-network message metadata.
    const messagesQuery = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      let sum = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.unreadCount && typeof data.unreadCount[user.uid] === 'number') {
          sum += data.unreadCount[user.uid];
        }
      });
      setUnreadCount(sum);
    }, (err) => {
      console.error('Error listening to conversations for navigation unread badges:', err);
    });

    return () => {
      unsubscribe();
    };
  }, [user, activeMember]);

  // Handle outside clicks to close user dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const navLinks = isPlatformAdmin
    ? [
        { name: 'Admin Console', href: '/admin', icon: ShieldCheck },
      ]
    : isAuthorityAdmin
      ? [
          { name: 'Authority Console', href: '/authority-admin', icon: ShieldCheck },
        ]
      : user
        ? activeMember
          ? [
              { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
              { name: 'Marketplace', href: '/jobs', icon: Briefcase },
              { name: 'Professionals', href: '/browse/professionals', icon: UserIcon },
              { name: 'Organisations', href: '/browse/organisations', icon: Building },
              {
                name: 'Messages',
                href: '/messages',
                icon: MessageSquare,
                badge: unreadCount > 0 ? (unreadCount >= 9 ? '9+' : unreadCount.toString()) : undefined
              },
            ]
          : [
              { name: 'Account Status', href: '/account-status', icon: ShieldCheck },
              { name: 'My Profile', href: '/profile', icon: UserIcon },
            ]
        : [
            { name: 'Home', href: '/' },
            { name: 'Marketplace', href: '#', tooltip: 'Login to browse', grayed: true },
          ];

  const handleLinkClick = (link: any) => {
    if (link.grayed) return;
    setIsOpen(false);
  };

  return (
    <>
      {maintenanceModeOn && !isPlatformAdmin && (
        <div id="maintenance-banner" className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white px-4 py-2.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md">
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          Scheduled Platform Maintenance: Features are active, but please expect temporary updates.
        </div>
      )}
      <nav className={cn(
        "fixed left-0 right-0 z-50 bg-white border-b border-zinc-100 shadow-sm transition-all duration-300",
        maintenanceModeOn && !isPlatformAdmin ? "top-10" : "top-0"
      )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-primary text-xl tracking-tight">PharmaNetwork</span>
                <span className="text-primary-light text-xs font-semibold uppercase tracking-widest">Uganda</span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <div key={link.name} className="relative group flex items-center">
                <Link
                  to={link.grayed ? '#' : link.href}
                  onClick={() => handleLinkClick(link)}
                  className={cn(
                    "text-sm font-semibold transition-all relative py-2 flex items-center gap-1.5",
                    location.pathname === link.href 
                      ? "text-primary border-b-2 border-primary" 
                      : link.grayed ? "text-zinc-300 cursor-not-allowed" : "text-zinc-650 hover:text-primary"
                  )}
                >
                  {link.icon && <link.icon size={16} />}
                  {link.name}
                  {link.badge && (
                    <span className="bg-green-500 text-white font-black text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center shrink-0">
                      {link.badge}
                    </span>
                  )}
                </Link>
                {link.tooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-zinc-850 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                    {link.tooltip}
                  </div>
                )}
              </div>
            ))}

            {!loading && (
              <div className="flex items-center space-x-4 border-l border-zinc-200 pl-6 ml-2">
                {user ? (
                  <div className="relative" ref={menuRef}>
                    <button 
                      onClick={toggleUserMenu}
                      className="flex items-center gap-2 group cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-primary/10 hover:bg-primary/20 hover:scale-105 rounded-full flex items-center justify-center text-primary font-bold border-2 border-primary transition-all text-sm uppercase">
                        {user.email?.[0].toUpperCase()}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-56 rounded-2xl bg-white border border-zinc-150 shadow-xl py-2 z-50 overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 mb-1">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Signed in as</p>
                            <p className="text-xs font-semibold text-zinc-700 truncate mt-0.5">{user.email}</p>
                          </div>

                          {userAccount && (
                            <>
                                                        {!activeMember && (
                                                          <Link
                                                            to="/account-status"
                                                            onClick={() => setIsUserMenuOpen(false)}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 transition-all"
                                                          >
                                                            <ShieldCheck size={16} />
                                                            Account Status
                                                          </Link>
                                                        )}
                              
                                                        <Link 
                                                          to="/profile" 
                                                          onClick={() => setIsUserMenuOpen(false)}
                                                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-primary/5 hover:text-primary transition-all"
                                                        >
                                                          <UserIcon size={16} />
                                                          My Profile
                                                        </Link>
                              
                                                        {activeMember && (
                                                          <>
                                                                                      <Link 
                                                                                        to="/my-postings" 
                                                                                        onClick={() => setIsUserMenuOpen(false)}
                                                                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-primary/5 hover:text-primary transition-all"
                                                                                      >
                                                                                        <FileText size={16} />
                                                                                        My Postings
                                                                                      </Link>
                                                            
                                                                                      <Link 
                                                                                        to="/my-listings" 
                                                                                        onClick={() => setIsUserMenuOpen(false)}
                                                                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-primary/5 hover:text-primary transition-all"
                                                                                      >
                                                                                        <Store size={16} />
                                                                                        My Listings
                                                                                      </Link>
                                                            
                                                                                        </>
                                                        )}
                              
                                                        <Link 
                                                          to="/settings" 
                                                          onClick={() => setIsUserMenuOpen(false)}
                                                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-750 hover:bg-primary/5 hover:text-primary transition-all opacity-60"
                                                        >
                                                          <Settings size={16} />
                                                          Settings
                                                        </Link>
                              
                                                          </>
                          )}

                          {isPlatformAdmin && (
                            <Link 
                              to="/admin" 
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-black text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 transition-all border-t border-b border-amber-100 my-1"
                            >
                              <ShieldCheck size={16} />
                              Admin Console
                            </Link>
                          )}

                          {isAuthorityAdmin && (
                            <Link 
                              to="/authority-admin" 
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-black text-[#1A237E] bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-850 transition-all border-t border-b border-indigo-100 my-1 font-mono uppercase text-[11px]"
                            >
                              <ShieldCheck size={16} />
                              Authority Console
                            </Link>
                          )}

                          <button 
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              signOut();
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 transition-all cursor-pointer mt-1"
                          >
                            <LogOut size={16} />
                            Logout
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="outline" size="sm">Login</Button>
                    </Link>
                    <Link to="/register">
                      <Button size="sm">Join Free</Button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            {user && activeMember && unreadCount > 0 && (
              <Link to="/messages" className="relative p-2 text-zinc-600 hover:text-primary">
                <MessageSquare size={24} />
                <span className="absolute top-1 right-1 bg-green-500 text-white text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center font-black">
                  {unreadCount >= 9 ? '9+' : unreadCount}
                </span>
              </Link>
            )}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-md text-zinc-600 hover:text-primary hover:bg-zinc-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-zinc-100"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.grayed ? '#' : link.href}
                  onClick={() => handleLinkClick(link)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md text-base font-semibold",
                    location.pathname === link.href 
                      ? "bg-primary/5 text-primary" 
                      : link.grayed ? "text-zinc-300 pointer-events-none" : "text-zinc-600"
                  )}
                >
                  {link.icon && <link.icon size={20} />}
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="ml-auto bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{link.badge}</span>
                  )}
                </Link>
              ))}
              <div className="border-t border-zinc-100 pt-4 mt-4 space-y-1">
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-md text-zinc-600 font-semibold"
                    >
                      <UserIcon size={20} />
                      My Profile
                    </Link>
                    <Link
                      to="/my-postings"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-md text-zinc-600 font-semibold"
                    >
                      <FileText size={20} />
                      My Postings
                    </Link>
                    <Link
                      to="/my-listings"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-md text-zinc-600 font-semibold cursor-pointer"
                    >
                      <Store size={20} />
                      My Listings
                    </Link>
                    {isPlatformAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-md text-amber-600 bg-amber-50/50 font-bold"
                      >
                        <ShieldCheck size={20} />
                        Admin Console
                      </Link>
                    )}
                    {isAuthorityAdmin && (
                      <Link
                        to="/body-admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-md text-[#1A237E] bg-indigo-50/50 font-bold"
                      >
                        <ShieldCheck size={20} />
                        Regulatory Console
                      </Link>
                    )}
                    <button
                      onClick={() => { signOut(); setIsOpen(false); }}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-red-500 font-semibold cursor-pointer"
                    >
                      <LogOut size={20} />
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4 p-2">
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" fullWidth>Login</Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button fullWidth>Join Free</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
    </>
  );
};


