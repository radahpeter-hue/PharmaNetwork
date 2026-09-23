import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Button } from '../components/Button';
import { Link, useNavigate } from 'react-router-dom';
import { Toast, ToastType } from '../components/Toast';
import { 
  Store, 
  MapPin, 
  Clock, 
  Eye, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PostingQuotaExceededError, renewPostingWithQuota } from '../lib/postingQuota';

interface MyListingsProps {
  isTab?: boolean;
}

export const MyListings: React.FC<MyListingsProps> = ({ isTab = false }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'under_offer' | 'sold' | 'withdrawn'>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  const fetchListings = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const q = query(
        collection(db, 'businessListings'),
        where('sellerUserId', '==', user.uid)
      );
      
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
      setListings(data);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [user]);

  const handleAction = async (id: string, newStatus: 'under_offer' | 'sold' | 'withdrawn') => {
    try {
      await updateDoc(doc(db, 'businessListings', id), {
        status: newStatus
      });
      setToast({ isVisible: true, message: `Listing marked as ${newStatus.replace('_', ' ')}.`, type: 'success' });
      fetchListings();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `businessListings/${id}`);
      setToast({ isVisible: true, message: 'Action failed.', type: 'error' });
    }
  };

  const handleWithdraw = (id: string) => {
    const confirmed = window.confirm("Are you sure you want to withdraw this listing? It will no longer be visible to other users.");
    if (confirmed) {
      handleAction(id, 'withdrawn');
    }
  };

  const handleRenew = async (id: string) => {
    if (!user) return;
    try {
      await renewPostingWithQuota({
        quotaType: 'business',
        ownerUid: user.uid,
        postingId: id
      });
      setToast({ isVisible: true, message: 'Listing renewed for 90 days.', type: 'success' });
      fetchListings();
    } catch (err) {
      console.error('Failed to renew listing:', err);
      if (err instanceof PostingQuotaExceededError) {
        setToast({
          isVisible: true,
          message: 'Renewal would exceed the limit of 3 active business listings.',
          type: 'error'
        });
      } else {
        setToast({ isVisible: true, message: err instanceof Error ? err.message : 'Failed to renew listing.', type: 'error' });
      }
    }
  };

  const isExpiringSoonOrPassed = (listing: any) => {
    if (!listing?.expiresAt) return false;
    const expiresMillis = listing.expiresAt.toMillis ? listing.expiresAt.toMillis() : new Date(listing.expiresAt).getTime();
    const diffTime = expiresMillis - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 14;
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "Price on request";
    return `UGX ${price.toLocaleString()}`;
  };

  const businessTypeLabels: { [key: string]: string } = {
    retail_pharmacy: 'Retail Pharmacy',
    wholesale_pharmacy: 'Wholesale Pharmacy',
    drug_shop: 'Licensed Drug Shop',
    distribution_company: 'Pharmaceutical Distribution',
    manufacturing_facility: 'Manufacturing Facility',
    pharmaceutical_equipment: 'Pharmaceutical Equipment',
    other: 'Other Pharma Business'
  };

  const currentList = listings.filter(l => l.status === activeSubTab);

  if (loading) return null;

  const content = (
    <div className="space-y-6">
      {/* Sub-tabs inside Business Listings category */}
      <div className="flex flex-wrap p-1.5 bg-zinc-100 rounded-2xl w-fit gap-1">
        {[
          { id: 'active', label: 'Active', icon: CheckCircle2 },
          { id: 'under_offer', label: 'Under Offer', icon: TrendingUp },
          { id: 'sold', label: 'Sold', icon: Store },
          { id: 'withdrawn', label: 'Withdrawn', icon: XCircle },
        ].map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => setActiveSubTab(subTab.id as any)}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wider",
              activeSubTab === subTab.id ? "bg-white text-primary shadow-xs" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <subTab.icon size={13} />
            {subTab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isRefreshing && listings.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center grayscale opacity-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Syncing listings...</p>
          </div>
        ) : currentList.length > 0 ? (
          currentList.map((p) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-xs flex flex-col md:flex-row md:items-center gap-6 group hover:border-primary/20 transition-all"
            >
              <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={cn(
                    "text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest",
                    activeSubTab === 'active' ? "bg-green-100 text-green-700" :
                    activeSubTab === 'under_offer' ? "bg-amber-100 text-amber-700" :
                    activeSubTab === 'sold' ? "bg-zinc-100 text-zinc-500" :
                    "bg-red-100 text-red-700"
                  )}>
                    {activeSubTab.replace('_', ' ')}
                  </span>
                  
                  <span className="bg-primary/5 text-primary text-[9px] font-bold px-2 py-0.5 rounded tracking-widest">
                    {businessTypeLabels[p.businessType] || p.businessType}
                  </span>

                  {p.isConfidential && (
                    <span className="bg-amber-500/10 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded tracking-widest">
                      CONFIDENTIAL
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-zinc-900 group-hover:text-primary transition-colors truncate">
                  {p.listingTitle}
                </h3>

                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 text-xs text-zinc-500 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-zinc-350" />
                    {p.district}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-455">
                    <Eye size={13} className="text-zinc-350" />
                    {p.viewCount || 1} views
                  </span>
                  {p.expiresAt && (
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock size={13} className="text-zinc-350" />
                      Expires: {p.expiresAt.toDate ? p.expiresAt.toDate().toLocaleDateString() : new Date(p.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="text-xs font-bold text-primary mt-2 flex items-center gap-1">
                  <span>Asking Price:</span>
                  <span className="text-zinc-800">{formatPrice(p.askingPriceUGX)}</span>
                </div>
              </div>

              {/* Actions panel */}
              <div className="flex flex-wrap items-center gap-2.5 md:border-l md:border-zinc-100 md:pl-6 min-w-fit shrink-0">
                <Link to={`/marketplace/businesses/${p.id}`}>
                  <Button variant="ghost" size="sm" className="gap-2.5">
                    <Eye size={15} />
                    View
                  </Button>
                </Link>

                {activeSubTab === 'active' && (
                  <button 
                    onClick={() => handleAction(p.id!, 'under_offer')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-100"
                  >
                    Offer
                  </button>
                )}

                {(activeSubTab === 'active' || activeSubTab === 'under_offer') && (
                  <button 
                    onClick={() => handleAction(p.id!, 'sold')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-605 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100"
                  >
                    Sold
                  </button>
                )}

                <Link to={`/marketplace/businesses/${p.id}/edit`}>
                  <button className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-55 hover:bg-zinc-100 transition-colors border border-transparent hover:border-zinc-200">
                    Edit
                  </button>
                </Link>

                {activeSubTab !== 'withdrawn' && (
                  <button 
                    onClick={() => handleWithdraw(p.id!)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border border-transparent"
                  >
                    Withdraw
                  </button>
                )}

                {activeSubTab === 'active' && isExpiringSoonOrPassed(p) && (
                  <Button variant="ghost" size="sm" className="gap-2 text-primary" onClick={() => handleRenew(p.id!)}>
                    <RotateCcw size={14} />
                    Renew
                  </Button>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100/80 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-zinc-300 mb-6 shadow-xs border border-zinc-100">
              <Store size={32} />
            </div>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-6 font-medium italic leading-relaxed">
              You have not listed any businesses yet.
            </p>
            <Link to="/marketplace/businesses/create">
              <Button size="sm" className="gap-2.5">
                <Plus size={16} />
                Create a Listing
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Toast {...toast} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
    </div>
  );

  if (isTab) {
    return content;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
            <Store className="text-primary" />
            My Business Listings
          </h1>
          <p className="text-zinc-500 mt-2">Manage your pharmacy business listings for sale and track potential buyers.</p>
        </div>
        <Link to="/marketplace/businesses/create">
          <Button className="gap-2">
            <Plus size={18} />
            List a Business
          </Button>
        </Link>
      </div>

      {content}
    </div>
  );
};

export default MyListings;
