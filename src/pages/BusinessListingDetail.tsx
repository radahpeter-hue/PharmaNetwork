import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '../components/Button';
import { Toast, ToastType } from '../components/Toast';
import { ReportButton } from '../components/ReportButton';
import { 
  Store, 
  MapPin, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  MessageSquare, 
  Phone, 
  Mail, 
  Eye, 
  ToggleLeft, 
  ToggleRight, 
  Lock,
  ChevronLeft,
  CheckCircle2,
  Users,
  Info,
  XCircle,
  TrendingUp,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConversationView } from '../components/ConversationView';
import { cn } from '../lib/utils';
import { PostingQuotaExceededError, renewPostingWithQuota } from '../lib/postingQuota';

const ALL_8_ITEMS = [
  { id: 'inventory', label: 'Inventory (stock at cost)' },
  { id: 'fixtures_fittings', label: 'Fixtures and fittings' },
  { id: 'pharmacy_software', label: 'Pharmacy management software' },
  { id: 'supplier_relationships', label: 'Existing supplier relationships' },
  { id: 'client_base', label: 'Existing client base' },
  { id: 'nda_licence', label: 'Regulatory licence / approval where applicable' },
  { id: 'lease_agreement', label: 'Lease agreement (transfer subject to landlord approval)' },
  { id: 'staff', label: 'Current staff (if buyer wishes to retain them)' },
];

export const BusinessListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  const isOwner = user && listing && user.uid === listing.sellerUserId;
  const canViewPrivateDetails = !!listing && (!listing.isConfidential || !!isOwner);

  const fetchListing = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, 'businessListings', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const publicData = docSnap.data();
        let mergedData = { ...publicData, id: docSnap.id };

        const ownerViewing = !!user && user.uid === publicData.sellerUserId;
        if (ownerViewing || publicData.isConfidential === false) {
          try {
            const privateSnap = await getDoc(doc(db, 'businessListingPrivate', docSnap.id));
            if (privateSnap.exists()) {
              mergedData = { ...mergedData, ...privateSnap.data() };
            }
          } catch (privateError) {
            console.warn('Private business listing details are not available to this viewer.', privateError);
          }
        }

        setListing(mergedData);
      } else {
        setListing(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `businessListings/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterestCount = async () => {
    if (!id) return;
    try {
      const q = query(
        collection(db, 'messages'),
        where('relatedPostingId', '==', id)
      );
      const snap = await getDocs(q);
      setTotalInterest(snap.size);
    } catch (err) {
      console.warn("Could not query interest count", err);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id, user]);

  useEffect(() => {
    if (listing) {
      fetchInterestCount();
    }
  }, [listing, user]);

  const updateStatus = async (newStatus: 'under_offer' | 'sold' | 'withdrawn') => {
    if (!id || !listing) return;
    try {
      await updateDoc(doc(db, 'businessListings', id), {
        status: newStatus
      });
      setListing((prev: any) => ({ ...prev, status: newStatus }));
      setToast({ 
        isVisible: true, 
        message: `Listing is now marked as ${statusLabel(newStatus)}.`, 
        type: 'success' 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `businessListings/${id}`);
      setToast({ isVisible: true, message: 'Failed to update listing status', type: 'error' });
    }
  };

  const handleWithdraw = () => {
    const confirmed = window.confirm("Are you sure you want to withdraw this listing? It will no longer be visible to other users.");
    if (confirmed) {
      updateStatus('withdrawn');
    }
  };

  const isExpiringSoonOrPassed = () => {
    if (!listing?.expiresAt) return false;
    const expiresMillis = listing.expiresAt.toMillis ? listing.expiresAt.toMillis() : new Date(listing.expiresAt).getTime();
    const diffTime = expiresMillis - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 14;
  };

  const handleRenew = async () => {
    if (!id || !user) return;
    try {
      const result = await renewPostingWithQuota({
        quotaType: 'business',
        ownerUid: user.uid,
        postingId: id
      });
      setListing((prev: any) => ({
        ...prev,
        expiresAt: result.expiresAt,
        status: 'active'
      }));
      setToast({ isVisible: true, message: 'Listing renewed successfully for 90 days!', type: 'success' });
    } catch (err) {
      console.error("Failed to renew listing:", err);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Retrieving business details...</p>
      </div>
    );
  }

  // If document does not exist, or status is sold or withdrawn (and viewer is not the seller)
  const isNoLongerAvailable = !listing || ((listing.status === 'sold' || listing.status === 'withdrawn') && !isOwner);

  if (isNoLongerAvailable) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <XCircle size={48} className="text-zinc-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Listing No Longer Available</h2>
        <p className="text-zinc-500 mt-2 text-sm">The business listing you are trying to view has been sold, withdrawn, or is no longer hosted on PharmaNetwork.</p>
        <button 
          onClick={() => navigate('/jobs')} 
          className="mt-6 inline-flex items-center gap-2 bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-primary/95 transition-all"
        >
          <ChevronLeft size={16} />
          Back to Marketplace
        </button>
      </div>
    );
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return "Price on request — contact seller for details.";
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

  const salesLabels: { [key: string]: string } = {
    prefer_not_to_say: 'Confidential / Under NDA',
    below_5m: 'Under 5,000,050 UGX / month',
    '5m_to_15m': '5M to 15,000,000 UGX / month',
    '15m_to_30m': '15M to 30,000,000 UGX / month',
    '30m_to_50m': '30M to 50,000,000 UGX / month',
    above_50m: 'Over 50,000,000 UGX / month'
  };

  const reasonLabels: { [key: string]: string } = {
    prefer_not_to_say: 'Prefer not to say',
    retirement: 'Retirement',
    relocation: 'Relocation',
    restructuring: 'Business Restructuring',
    health_reasons: 'Health/Personal reasons',
    other: 'Other venture directions'
  };

  const licenceBadgeColor = (status: string) => {
    switch (status) {
      case 'licensed_current': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'licence_expired': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'no_licence_equipment_only': return 'bg-zinc-100 text-zinc-500 border-zinc-200';
      default: return 'bg-zinc-100 text-zinc-405';
    }
  };

  const licenceLabels: { [key: string]: string } = {
    licensed_current: 'Licensed and Current',
    licence_expired: 'Licence Expired',
    no_licence_equipment_only: 'No Licence / Equipment Only'
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'active': return 'Active';
      case 'under_offer': return 'Under Offer';
      case 'sold': return 'Sold';
      case 'withdrawn': return 'Withdrawn';
      default: return s;
    }
  };

  const statusColorClass = (s: string) => {
    switch (s) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'under_offer': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'sold': return 'bg-zinc-100 text-zinc-500 border-zinc-200';
      case 'withdrawn': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-zinc-100 text-zinc-400';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Toast 
        isVisible={toast.isVisible} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />

      <Link 
        to="/jobs" 
        className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 font-bold text-xs mb-8 uppercase tracking-widest transition-colors"
      >
        <ChevronLeft size={14} />
        Back to Marketplace
      </Link>

      {/* Outer Flex/Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Detail Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main header block */}
          <div className="bg-white rounded-3xl border border-zinc-100 p-6 md:p-8 shadow-sm">
            
            <div className="flex flex-wrap gap-2.5 items-center mb-4">
              <span className="bg-primary/10 text-primary text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider">
                {businessTypeLabels[listing.businessType] || "Business"}
              </span>

              <span className={cn(
                "border text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider",
                statusColorClass(listing.status)
              )}>
                {statusLabel(listing.status)}
              </span>

              {listing.isConfidential && (
                <span className="bg-amber-500/10 text-amber-800 border border-amber-500/15 text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1">
                  Confidential Listing
                </span>
              )}


            </div>

            <h1 className="text-2xl md:text-3xl font-black text-zinc-900 leading-tight tracking-tight mb-4">
              {listing.listingTitle}
            </h1>

            <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs font-semibold text-zinc-500 mb-4 pb-4 border-b border-zinc-150">
              <span className="flex items-center gap-1">
                <MapPin size={14} className="text-zinc-400" />
                District: {listing.district}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-zinc-400" />
                Years Operational: {listing.yearsInOperation}
              </span>
            </div>

            <div className="pt-1">
              <ReportButton
                contentType="business_listing"
                contentId={id!}
                contentOwnerId={listing.sellerUserId}
                contentTitle={listing.listingTitle}
              />
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-5 text-zinc-800 flex items-start gap-3.5 shadow-xs">
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle size={16} />
            </div>
            <div>
              <span className="font-extrabold text-amber-900 block text-xs uppercase tracking-wider mb-1">Regulatory Notice</span>
              <p className="text-xs font-semibold text-zinc-700 leading-relaxed">
                Any licence, permit, lease, or approval associated with a listed business remains subject to the requirements of the relevant authority or contracting party. Buyers should verify transferability and current status independently before completing a transaction.
              </p>
            </div>
          </div>

          {/* Photo gallery */}
          {(!listing.isConfidential || isOwner) && listing.photoUrls && listing.photoUrls.length > 0 ? (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-100 relative">
                <img 
                  src={listing.photoUrls[activePhotoIndex]} 
                  alt={listing.listingTitle} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              {listing.photoUrls.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                  {listing.photoUrls.map((url: string, index: number) => (
                    <button
                      key={url}
                      onClick={() => setActivePhotoIndex(index)}
                      className={cn(
                        "w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all",
                        activePhotoIndex === index ? "border-primary scale-105" : "border-zinc-200 opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-64 bg-zinc-100 rounded-3xl border border-zinc-150 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <Store size={44} className="mb-2" />
              <p className="text-xs uppercase font-extrabold tracking-widest leading-relaxed max-w-sm">
                No Preview Photos Uploaded
              </p>
            </div>
          )}

          {/* Listing details sections in rounded white cards */}
          <div className="space-y-6">
            
            {/* 1. About the business card */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
              <h2 className="text-sm font-black uppercase text-zinc-400 tracking-widest">About this Business</h2>
              <div className="text-sm font-medium text-zinc-700 leading-relaxed whitespace-pre-line">
                {listing.businessDescription}
              </div>
            </div>

            {/* 2. Business Details card */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
              <h2 className="text-sm font-black uppercase text-zinc-400 tracking-widest">Business Details Dossier</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {canViewPrivateDetails && listing.ndaLicenceStatus && (
                  <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50">
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Licence / Approval Status</span>
                    <span className={cn(
                      "inline-block border text-[11px] font-bold px-2.5 py-0.5 rounded-full mt-1",
                      licenceBadgeColor(listing.ndaLicenceStatus)
                    )}>
                      {licenceLabels[listing.ndaLicenceStatus] || listing.ndaLicenceStatus}
                    </span>
                  </div>
                )}

                <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Years in Operation</span>
                  <span className="text-sm font-bold text-zinc-800">{listing.yearsInOperation} Years</span>
                </div>

                <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Number of Staff</span>
                  <span className="text-sm font-bold text-zinc-800">{listing.staffCount || 'Prefer not to say'}</span>
                </div>

                <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Monthly Sales Range</span>
                  <span className="text-sm font-bold text-zinc-800">{salesLabels[listing.monthlySalesRange] || 'Confidential'}</span>
                </div>

                {listing.reasonForSale !== 'prefer_not_to_say' && (
                  <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100/50 md:col-span-2">
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Reason for Sale</span>
                    <span className="text-sm font-bold text-zinc-850">{reasonLabels[listing.reasonForSale] || listing.reasonForSale}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. What is Included checklists card */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
              <h2 className="text-sm font-black uppercase text-zinc-400 tracking-widest">What is Included in Sale</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ALL_8_ITEMS.map((item) => {
                  const isIncluded = listing.whatsIncluded?.includes(item.id);
                  return (
                    <div 
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border transition-all text-xs font-bold",
                        isIncluded 
                          ? "bg-emerald-50/45 text-emerald-800 border-emerald-100" 
                          : "bg-zinc-50/45 text-zinc-400 border-zinc-100 grayscale opacity-70"
                      )}
                    >
                      {isIncluded ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-zinc-300 shrink-0" />
                      )}
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-100 mt-2">
                <p className="text-[11px] text-zinc-400 font-semibold italic">
                  Inclusion of NDA licence and lease agreement are subject to separate approval from the relevant authority or landlord.
                </p>
              </div>
            </div>

            {/* 4. Financial overview card */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
              <h2 className="text-sm font-black uppercase text-zinc-400 tracking-widest">Financial Parameters</h2>
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Asking Price</span>
                  <span className="text-lg font-black text-zinc-900 mt-1 block">
                    {formatPrice(listing.askingPriceUGX)}
                  </span>
                </div>

                {listing.askingPriceUGX !== null && listing.priceNegotiable && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full">
                    Price Negotiable
                  </span>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Action Panel Column (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-100 shadow-lg relative overflow-hidden">
            
            {/* Gated Contact & Handshake section */}
            {!user ? (
              // Blurred overlay gate
              <div className="text-center py-6 space-y-4 relative">
                <div className="absolute inset-0 backdrop-blur-md bg-white/20 z-0"></div>
                <div className="relative z-10">
                  <Lock size={36} className="text-amber-500 mx-auto mb-3" />
                  <h3 className="font-bold text-zinc-900 text-sm">Gated Document Access</h3>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed font-semibold">
                    You must be logged into your account to contact the seller directly.
                  </p>
                  <button 
                    onClick={() => navigate('/login')}
                    className="mt-4 w-full bg-primary text-white font-bold py-3 rounded-xl text-xs hover:bg-primary/95 transition-all"
                  >
                    Log In to Contact Seller
                  </button>
                </div>
              </div>
            ) : isOwner ? (
              // SELLER MANAGEMENT PANEL (shown only to the owner)
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest block">Seller Management Control</span>
                  <h3 className="text-base font-black text-zinc-900 mt-1 tracking-tight">Your Listing Suite</h3>
                </div>

                <div className="space-y-3">
                  {/* Action 1: Mark as Under Offer */}
                  {listing.status === 'active' && (
                    <button 
                      onClick={() => updateStatus('under_offer')}
                      className="w-full bg-amber-55 text-white bg-amber-500 hover:bg-amber-600 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm border-none"
                    >
                      <TrendingUp size={14} />
                      Mark as Under Offer
                    </button>
                  )}

                  {/* Action 2: Mark as Sold */}
                  {(listing.status === 'active' || listing.status === 'under_offer') && (
                    <button 
                      onClick={() => updateStatus('sold')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm border-none"
                    >
                      <CheckCircle2 size={14} />
                      Mark as Sold
                    </button>
                  )}

                  {/* Action 3: Edit Listing */}
                  <Link 
                    to={`/marketplace/businesses/${id}/edit`}
                    className="block"
                  >
                    <button className="w-full bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs">
                      Edit Listing
                    </button>
                  </Link>

                  {/* Action 4: Withdraw Listing */}
                  {listing.status !== 'withdrawn' && (
                    <button 
                      onClick={handleWithdraw}
                      className="w-full bg-white hover:bg-red-50 text-red-650 border border-red-200 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <XCircle size={14} />
                      Withdraw Listing
                    </button>
                  )}
                </div>

                {/* Expiry Date & Renew status info */}
                <div className="border-t border-zinc-100 pt-4 mt-4 space-y-2.5 text-xs text-zinc-500">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-400">Total Views:</span>
                    <span className="font-bold text-zinc-800">{listing.viewCount || 1}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-400">Negotiation Handshakes:</span>
                    <span className="font-bold text-zinc-800">{totalInterest} inbox threads</span>
                  </div>
                  {listing.expiresAt && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-400">Listing Expiry:</span>
                        <span className="font-bold text-zinc-800">
                          {listing.expiresAt.toDate ? listing.expiresAt.toDate().toLocaleDateString() : new Date(listing.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                      {isExpiringSoonOrPassed() && (
                        <button
                          onClick={handleRenew}
                          className="mt-2 w-full bg-primary/10 hover:bg-primary/15 text-primary font-bold py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border-none"
                        >
                          <RotateCcw size={12} />
                          Renew for 90 days
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              // CONTACT PANEL FOR VIEWERS
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest block">Transaction Gate</span>
                  <h3 className="text-base font-black text-zinc-900 mt-1 tracking-tight">Contact the Seller</h3>
                </div>

                {listing.isConfidential ? (
                  // Gated confidential instructions
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-zinc-500 leading-relaxed">
                      This is a Confidential Listing. Exact contact details and locations are protected. Submit a handshake invitation to open a secure channel directly with the owner.
                    </p>
                    <button 
                      onClick={() => setShowChat(true)}
                      className="w-full bg-primary text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md hover:bg-primary/95 border-none"
                    >
                      <MessageSquare size={14} />
                      Send Message to Seller
                    </button>
                  </div>
                ) : (
                  // Non-confidential contact options
                  <div className="space-y-4 pt-1">
                    <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Seller Name</span>
                      <span className="font-bold text-zinc-850 text-sm mt-1 block h-5">{listing.contactName || 'The Seller'}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {listing.contactMethod === 'whatsapp' ? (
                        <a 
                          href={`https://wa.me/${listing.contactDetail.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, I am interested in your business listing on PharmaNetwork Uganda: ${listing.listingTitle}. Please share more details.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm text-center"
                        >
                          <Phone size={14} />
                          Contact on WhatsApp
                        </a>
                      ) : (
                        <a 
                          href={`mailto:${listing.contactDetail}?subject=${encodeURIComponent(`Interest in: ${listing.listingTitle}`)}&body=${encodeURIComponent(`Hello, I am interested in your business listing on PharmaNetwork Uganda: ${listing.listingTitle}. Please share more details.`)}`}
                          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm text-center"
                        >
                          <Mail size={14} />
                          Send Email
                        </a>
                      )}

                      {/* Always show platform message option too */}
                      <button 
                        onClick={() => setShowChat(true)}
                        className="w-full bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                      >
                        <MessageSquare size={14} />
                        Send Platform Message
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-150 space-y-3.5">
            <h4 className="text-xs font-black text-zinc-800 tracking-tight flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-primary" />
              Secure Vetting
            </h4>
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
              Confidential listings keep seller contact, exact location, licence details, and private photos behind protected member access. Use platform messaging to contact the seller without exposing those details.
            </p>
          </div>

        </div>

      </div>

      {/* Slide-in Conversation view panel */}
      <AnimatePresence>
        {showChat && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-xs"
              onClick={() => setShowChat(false)}
            />
            {/* Sliding Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <ConversationView
                recipientUid={listing.sellerUserId}
                recipientName={listing.contactName || 'The Seller'}
                relatedPostingId={listing.id}
                relatedPostingTitle={listing.listingTitle}
                onClose={() => setShowChat(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BusinessListingDetail;
