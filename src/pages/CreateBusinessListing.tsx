import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { Button } from '../components/Button';
import { UGANDA_DISTRICTS, CONTACT_METHODS } from '../constants';
import { Toast, ToastType } from '../components/Toast';
import { Store, EyeOff, ShieldCheck, ChevronRight, HelpCircle, Info, Image as ImageIcon, UploadCloud, X } from 'lucide-react';
import { motion } from 'motion/react';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

const WHAT_IS_INCLUDED_OPTIONS = [
  { id: 'inventory', label: 'Inventory / Stock' },
  { id: 'fixtures_fittings', label: 'Fixtures & Fittings' },
  { id: 'pharmacy_software', label: 'Pharmacy Software System' },
  { id: 'supplier_relationships', label: 'Supplier / Distributor Contracts' },
  { id: 'client_base', label: 'Established Client / Patient Base' },
  { id: 'nda_licence', label: 'NDA Licence / Approvals' },
  { id: 'lease_agreement', label: 'Premises Lease Agreement' },
  { id: 'staff', label: 'Trained staff willing to stay' }
];

export const CreateBusinessListing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  // Form Fields
  const [formData, setFormData] = useState({
    listingTitle: '',
    isConfidential: false,
    businessType: 'retail_pharmacy',
    district: 'Kampala',
    locationDescription: '',
    yearsInOperation: 1,
    ndaLicenceStatus: 'licensed_current',
    staffCount: 1,
    businessDescription: '',
    askingPriceUGX: '',
    priceNegotiable: true,
    monthlySalesRange: 'prefer_not_to_say',
    reasonForSale: 'prefer_not_to_say',
    contactMethod: 'whatsapp',
    contactDetail: '',
    contactName: ''
  });

  const [whatsIncluded, setWhatsIncluded] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [activeListingCount, setActiveListingCount] = useState(0);

  useEffect(() => {
    const loadActiveListingCount = async () => {
      if (!user) return;

      try {
        const listingsQuery = query(
          collection(db, 'businessListings'),
          where('sellerUserId', '==', user.uid),
          where('status', '==', 'active')
        );
        const snap = await getDocs(listingsQuery);
        const now = Date.now();
        const count = snap.docs.filter(listingDoc => {
          const expiresAt = listingDoc.data().expiresAt;
          if (!expiresAt) return false;
          const expiresMillis = expiresAt.toMillis ? expiresAt.toMillis() : new Date(expiresAt).getTime();
          return expiresMillis > now;
        }).length;
        setActiveListingCount(count);
      } catch (error) {
        console.error('Failed to count active business listings:', error);
      }
    };

    loadActiveListingCount();
  }, [user]);

  const handlePhotoFiles = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);

    if (selected.length > 3) {
      setToast({ isVisible: true, message: 'You can upload a maximum of 3 photos.', type: 'error' });
      return;
    }

    const invalid = selected.find(file =>
      !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024
    );

    if (invalid) {
      setToast({
        isVisible: true,
        message: 'Each photo must be a JPG or PNG file no larger than 5MB.',
        type: 'error'
      });
      return;
    }

    setPhotoFiles(selected);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setWhatsIncluded(prev => [...prev, id]);
    } else {
      setWhatsIncluded(prev => prev.filter(item => item !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setToast({ isVisible: true, message: 'Please log in to submit a listing.', type: 'error' });
      return;
    }

    if (activeListingCount >= 3) {
      setToast({
        isVisible: true,
        message: 'You already have 3 active business listings. Close, sell, or withdraw one before creating another.',
        type: 'error'
      });
      return;
    }

    if (!formData.listingTitle.trim()) {
      setToast({ isVisible: true, message: 'Please enter a title for your listing.', type: 'error' });
      return;
    }

    if (formData.businessDescription.trim().length < 80) {
      setToast({ isVisible: true, message: 'Business description must be at least 80 characters.', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const listingRef = doc(collection(db, 'businessListings'));
      const storage = getStorage();
      const photoUrls: string[] = [];

      for (let index = 0; index < photoFiles.length; index += 1) {
        const file = photoFiles[index];
        const extension = file.type === 'image/png' ? 'png' : 'jpg';
        const photoRef = ref(storage, `businessPhotos/${user.uid}/${listingRef.id}/photo_${index + 1}.${extension}`);
        const uploaded = await uploadBytes(photoRef, file, { contentType: file.type });
        photoUrls.push(await getDownloadURL(uploaded.ref));
      }

      const now = Timestamp.now();
      await setDoc(listingRef, {
        sellerUserId: user.uid,
        listingTitle: formData.listingTitle.trim(),
        isConfidential: formData.isConfidential,
        businessType: formData.businessType,
        district: formData.district,
        locationDescription: formData.locationDescription.trim(),
        yearsInOperation: Number(formData.yearsInOperation) || 0,
        ndaLicenceStatus: formData.ndaLicenceStatus,
        staffCount: Number(formData.staffCount) || 0,
        businessDescription: formData.businessDescription.trim(),
        askingPriceUGX: formData.askingPriceUGX ? Number(formData.askingPriceUGX) : null,
        priceNegotiable: formData.priceNegotiable,
        monthlySalesRange: formData.monthlySalesRange,
        reasonForSale: formData.reasonForSale,
        whatsIncluded,
        contactMethod: formData.contactMethod,
        contactDetail: formData.contactDetail.trim(),
        contactName: formData.contactName.trim() || 'Seller',
        photoUrls,
        status: 'active',
        createdAt: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() + 90 * 24 * 60 * 60 * 1000),
        viewCount: 0
      });

      setToast({ isVisible: true, message: 'Business listed successfully!', type: 'success' });
      setTimeout(() => navigate(`/marketplace/businesses/${listingRef.id}`), 1200);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'businessListings');
      setToast({ isVisible: true, message: 'Failed to post business listing.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Toast 
        isVisible={toast.isVisible} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />

      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4 border border-amber-200">
          <Store size={32} />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Sell Your Pharmacy Business</h1>
        <p className="text-zinc-500 mt-2 max-w-lg mx-auto text-sm">
          Connect with qualified, licensed pharmacists and corporate networks in Uganda. List confidentially or publicly.
        </p>
      </div>

      {activeListingCount >= 3 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          You have reached the current limit of 3 active business listings.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden p-8 space-y-12 md:p-12">
        {/* SECTION 1: Core Identity */}
        <div className="space-y-6">
          <h2 className="text-lg font-black text-zinc-900 pb-2 border-b border-zinc-100 flex items-center gap-2">
            <span className="bg-amber-600 text-white rounded-md w-6 h-6 inline-flex items-center justify-center text-xs">1</span>
            Listing Baseline Identity
          </h2>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Listing Headline Title</label>
              <input
                type="text"
                name="listingTitle"
                required
                placeholder="e.g. Established Retail Pharmacy For Sale in High-Traffic Kampala Suburb"
                value={formData.listingTitle}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-amber-500/35"
              />
            </div>

            <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 flex flex-col md:flex-row gap-4 items-start">
              <input
                type="checkbox"
                name="isConfidential"
                id="isConfidential"
                checked={formData.isConfidential}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 mt-1 cursor-pointer"
              />
              <div>
                <label htmlFor="isConfidential" className="font-bold text-sm text-zinc-900 flex items-center gap-1 cursor-pointer">
                  <EyeOff size={16} className="text-amber-500" />
                  CONFIDENTIAL LISTING (Highly Recommended)
                </label>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Protect patients, suppliers and staff. If checked, the public can only view general details, sales bands and district name. Photo gallery, exact block locations, licenses, and specific brand names remain entirely hidden until a confidentiality request or secure platform chat is initiated.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Business Setup Type</label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="retail_pharmacy">Retail Pharmacy</option>
                <option value="wholesale_pharmacy">Wholesale Pharmacy</option>
                <option value="drug_shop">Licensed Drug Shop</option>
                <option value="distribution_company">Pharmaceutical Distribution Company</option>
                <option value="manufacturing_facility">Manufacturing Facility / Plant</option>
                <option value="pharmaceutical_equipment">Manufacturing or Lab Equipment</option>
                <option value="other">Other Business Model</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Uganda District</label>
              <select
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                {UGANDA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">General Location Description</label>
            <input
              type="text"
              name="locationDescription"
              required
              placeholder="e.g. Near main central market, close to major referral hospital (Hidden if confidential)"
              value={formData.locationDescription}
              onChange={handleInputChange}
              className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-amber-500/35"
            />
          </div>
        </div>

        {/* SECTION 2: Business Metrics */}
        <div className="space-y-6">
          <h2 className="text-lg font-black text-zinc-900 pb-2 border-b border-zinc-100 flex items-center gap-2">
            <span className="bg-amber-600 text-white rounded-md w-6 h-6 inline-flex items-center justify-center text-xs">2</span>
            Performance Metrics & Licence info
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Years in Operation</label>
              <input
                type="number"
                name="yearsInOperation"
                min={0}
                required
                value={formData.yearsInOperation}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Active Staff Count</label>
              <input
                type="number"
                name="staffCount"
                min={0}
                required
                value={formData.staffCount}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">NDA Licencing Status</label>
              <select
                name="ndaLicenceStatus"
                value={formData.ndaLicenceStatus}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-750 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="licensed_current">Current NDA Licensed</option>
                <option value="licence_expired">License Needs Renewal</option>
                <option value="no_licence_equipment_only">No Active License (Selling assets only)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Monthly Gross Revenue Band (UGX)</label>
              <select
                name="monthlySalesRange"
                value={formData.monthlySalesRange}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="prefer_not_to_say">Prefer Not To Say</option>
                <option value="below_5m">Below 5 Million UGX</option>
                <option value="5m_to_15m">5M to 15 Million UGX</option>
                <option value="15m_to_30m">15M to 30 Million UGX</option>
                <option value="30m_to_50m">30M to 50 Million UGX</option>
                <option value="above_50m">Above 50 Million UGX</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Primary Reason For Sale</label>
              <select
                name="reasonForSale"
                value={formData.reasonForSale}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="prefer_not_to_say">Prefer Not To Say</option>
                <option value="restructuring">Business Restructuring</option>
                <option value="relocation">Relocating Overseas or Upcountry</option>
                <option value="retirement">Owner Retirement</option>
                <option value="health_reasons">Health & Personal Reasons</option>
                <option value="other">Other Venture Focus</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: Content and Value */}
        <div className="space-y-6">
          <h2 className="text-lg font-black text-zinc-900 pb-2 border-b border-zinc-100 flex items-center gap-2">
            <span className="bg-amber-600 text-white rounded-md w-6 h-6 inline-flex items-center justify-center text-xs">3</span>
            Value Proposition & Asset Detail
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">What's Included in the Sale?</label>
              <div className="space-y-3.5 max-h-[250px] overflow-y-auto p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                {WHAT_IS_INCLUDED_OPTIONS.map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={whatsIncluded.includes(opt.id)}
                      onChange={(e) => handleCheckboxChange(opt.id, e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-zinc-705 group-hover:text-zinc-900 transition-colors">
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Asking Price (UGX)</label>
              <input
                type="number"
                name="askingPriceUGX"
                placeholder="e.g., 45000000 (Leave blank for confidential / price on request)"
                value={formData.askingPriceUGX}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-850 outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              
              <div className="flex items-center gap-3 mt-4 border border-zinc-100 p-4 rounded-xl bg-zinc-50/50">
                <input
                  type="checkbox"
                  name="priceNegotiable"
                  id="priceNegotiable"
                  checked={formData.priceNegotiable}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="priceNegotiable" className="text-xs font-bold text-zinc-650 cursor-pointer">
                  The asking price is negotiable
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Business Description</label>
            <textarea
              name="businessDescription"
              required
              rows={5}
              placeholder="Provide a detailed outline of your clientele, layout, average margins, daily operational footprint, list of key fixtures, and location dynamics..."
              value={formData.businessDescription}
              onChange={handleInputChange}
              className="w-full bg-zinc-50 border-none rounded-xl p-4 text-sm font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-amber-500/35"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <ImageIcon size={14} />
              Premises Photos
            </label>
            <label className="flex items-center justify-center gap-2 w-full min-h-28 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50 cursor-pointer hover:border-amber-400 transition-colors">
              <UploadCloud size={20} className="text-amber-600" />
              <span className="text-sm font-bold text-zinc-600">Select up to 3 photos</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                hidden
                onChange={e => handlePhotoFiles(e.target.files)}
              />
            </label>
            <p className="text-[10px] text-zinc-400 font-bold mt-2">
              JPG or PNG only, maximum 5MB per photo. Photos are stored in PharmaNetwork Storage.
            </p>
            {photoFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {photoFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="p-3 rounded-xl border border-zinc-200 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setPhotoFiles(files => files.filter((_, fileIndex) => fileIndex !== index))}
                        className="text-rose-600"
                        aria-label="Remove photo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: Gated contacts */}
        <div className="space-y-6">
          <h2 className="text-lg font-black text-zinc-900 pb-2 border-b border-zinc-100 flex items-center gap-2">
            <span className="bg-amber-600 text-white rounded-md w-6 h-6 inline-flex items-center justify-center text-xs">4</span>
            Contact Gating
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Owner Contact Name</label>
              <input
                type="text"
                name="contactName"
                required
                placeholder="Manager or Owner Name"
                value={formData.contactName}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Contact Method</label>
              <select
                name="contactMethod"
                value={formData.contactMethod}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="whatsapp">WhatsApp Phone Number</option>
                <option value="email">Email Address</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Contact Detail</label>
              <input
                type="text"
                name="contactDetail"
                required
                placeholder="e.g. +256701234567 or contact@email.com"
                value={formData.contactDetail}
                onChange={handleInputChange}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 font-bold bg-zinc-50 p-4 rounded-xl border border-dashed border-zinc-100">
            For Confidential listings: Guest users can NOT view these details. Logged-in verified pharmacists can reach out directly via our real-time messenger in complete privacy.
          </p>
        </div>

        {/* Buttons */}
        <div className="pt-6 border-t border-zinc-100 flex items-center justify-end gap-4">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => navigate('/jobs')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white min-w-[150px] gap-2 shadow-md border-none"
          >
            {isSubmitting ? 'Posting Listing...' : 'List Business'}
            <ChevronRight size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateBusinessListing;
