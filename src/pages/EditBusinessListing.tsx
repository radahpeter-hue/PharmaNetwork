import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button } from '../components/Button';
import { Toast, ToastType } from '../components/Toast';
import { Store, ChevronLeft, HelpCircle, Save, Info, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const WHAT_IS_INCLUDED_OPTIONS = [
  { id: 'inventory', label: 'Inventory (stock at cost)' },
  { id: 'fixtures_fittings', label: 'Fixtures and fittings' },
  { id: 'pharmacy_software', label: 'Pharmacy management software' },
  { id: 'supplier_relationships', label: 'Existing supplier relationships' },
  { id: 'client_base', label: 'Existing client base' },
  { id: 'nda_licence', label: 'NDA licence (transfer subject to NDHPA approval)' },
  { id: 'lease_agreement', label: 'Lease agreement (transfer subject to landlord approval)' },
  { id: 'staff', label: 'Current staff (if buyer wishes to retain them)' },
];

export const EditBusinessListing: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  // Form states to update
  const [businessDescription, setBusinessDescription] = useState('');
  const [askingPriceUGX, setAskingPriceUGX] = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(true);
  const [whatsIncluded, setWhatsIncluded] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  const [listingTitle, setListingTitle] = useState(''); // Read-only for header context

  useEffect(() => {
    if (!id) return;
    const loadListing = async () => {
      try {
        const docRef = doc(db, 'businessListings', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Verify ownership
          if (user && data.sellerUserId !== user.uid) {
            setToast({ isVisible: true, message: 'Unauthorized edit access to this listing.', type: 'error' });
            setTimeout(() => {
              navigate(`/marketplace/businesses/${id}`);
            }, 1500);
            return;
          }

          setListingTitle(data.listingTitle || '');
          setBusinessDescription(data.businessDescription || '');
          setAskingPriceUGX(data.askingPriceUGX !== null && data.askingPriceUGX !== undefined ? data.askingPriceUGX.toString() : '');
          setPriceNegotiable(data.priceNegotiable !== false);
          setWhatsIncluded(data.whatsIncluded || []);
          if (data.photoUrls && Array.isArray(data.photoUrls)) {
            setPhotoUrlInput(data.photoUrls.join(', '));
          }
        } else {
          setToast({ isVisible: true, message: 'Business listing not found.', type: 'error' });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `businessListings/${id}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadListing();
  }, [id, user]);

  const handleCheckboxChange = (optionId: string, checked: boolean) => {
    if (checked) {
      setWhatsIncluded(prev => [...prev, optionId]);
    } else {
      setWhatsIncluded(prev => prev.filter(item => item !== optionId));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (businessDescription.trim().length < 80) {
      setToast({ isVisible: true, message: 'Description must be at least 80 characters.', type: 'error' });
      return;
    }

    if (businessDescription.trim().length > 800) {
      setToast({ isVisible: true, message: 'Description cannot exceed 800 characters.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      // Split user photos by commas
      let photos: string[] = [];
      if (photoUrlInput.trim()) {
        photos = photoUrlInput.split(',').map(s => s.trim()).filter(Boolean);
      }

      const updateData = {
        businessDescription: businessDescription.trim(),
        askingPriceUGX: askingPriceUGX.trim() ? Number(askingPriceUGX) : null,
        priceNegotiable,
        whatsIncluded,
        photoUrls: photos
      };

      await updateDoc(doc(db, 'businessListings', id), updateData);

      setToast({ isVisible: true, message: 'Listing changes saved successfully!', type: 'success' });
      setTimeout(() => {
        navigate(`/marketplace/businesses/${id}`);
      }, 1500);

    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `businessListings/${id}`);
      setToast({ isVisible: true, message: 'Failed to save listing changes.', type: 'error' });
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-primary mb-4"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Toast 
        isVisible={toast.isVisible} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />

      <Link 
        to={`/marketplace/businesses/${id}`} 
        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 font-bold text-xs mb-8 uppercase tracking-widest transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Listing
      </Link>

      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4 border border-amber-250">
          <Store size={32} />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">Edit Business Listing</h1>
        <p className="text-zinc-500 mt-2 max-w-lg mx-auto text-sm truncate font-medium">
          Editing: {listingTitle}
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden p-8 space-y-10 md:p-12">
        
        {/* 1. Description Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
            <h2 className="text-sm font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
              <span className="bg-amber-655 w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] bg-amber-500 text-white font-extrabold">1</span>
              Business Pitch & Description
            </h2>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-md",
              businessDescription.length >= 80 && businessDescription.length <= 800 ? "bg-green-50 text-green-700" : "bg-zinc-105 text-zinc-400 bg-zinc-100"
            )}>
              {businessDescription.length}/800 CHARACTERS
            </span>
          </div>

          <div>
            <textarea
              required
              rows={8}
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder="Provide a comprehensive summary of your business location, client retention rates, equipment systems included, and average stock turn lengths..."
              className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-zinc-700 outline-none focus:ring-2 focus:ring-amber-500/25 resize-y min-h-[140px]"
            />
            <p className="text-[11px] text-zinc-400 font-bold mt-1.5 uppercase tracking-wide">
              * Minimum 80 characters needed to keep dossier comprehensive. Max 800 characters.
            </p>
          </div>
        </div>

        {/* 2. Financial Options */}
        <div className="space-y-6">
          <h2 className="text-sm font-black uppercase text-zinc-400 tracking-widest pb-2 border-b border-zinc-100 flex items-center gap-2">
            <span className="bg-amber-550 w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] bg-amber-500 text-white font-extrabold">2</span>
            Financial Offering
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Asking Price (UGX)</label>
              <input
                type="number"
                min={0}
                placeholder="Leave blank for 'Price on Request'"
                value={askingPriceUGX}
                onChange={(e) => setAskingPriceUGX(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-bold text-zinc-805 outline-none focus:ring-2 focus:ring-amber-500/25"
              />
            </div>

            {askingPriceUGX.trim() !== '' && (
              <div className="flex items-center gap-3 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100 h-fit self-end cursor-pointer" onClick={() => setPriceNegotiable(!priceNegotiable)}>
                <input
                  type="checkbox"
                  id="priceNegotiable"
                  checked={priceNegotiable}
                  onChange={(e) => setPriceNegotiable(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="priceNegotiable" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                  Asking Price is negotiable
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 3. What is Included Checklist */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase text-zinc-400 tracking-widest pb-2 border-b border-zinc-100 flex items-center gap-2">
            <span className="bg-amber-550 w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] bg-amber-500 text-white font-extrabold">3</span>
            Included Assets & Agreements
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {WHAT_IS_INCLUDED_OPTIONS.map((option) => {
              const isChecked = whatsIncluded.includes(option.id);
              return (
                <div 
                  key={option.id}
                  onClick={() => handleCheckboxChange(option.id, !isChecked)}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all",
                    isChecked 
                      ? "bg-primary/[0.04] border-primary/20 text-primary" 
                      : "bg-zinc-50/50 border-zinc-100 text-zinc-600 hover:border-zinc-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <span className="text-xs font-bold leading-none">{option.label}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-100 text-[11px] text-zinc-450 italic">
            Inclusion of NDA licences and lease agreement transfers are subject to separate regulatory approvals.
          </div>
        </div>

        {/* 4. Photo Gallery URLs */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase text-zinc-400 tracking-widest pb-2 border-b border-zinc-100 flex items-center gap-2">
            <span className="bg-amber-550 w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] bg-amber-500 text-white font-extrabold">4</span>
            Premises Photos
          </h3>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <ImageIcon size={14} />
              Photo URLs (Maximum 3 items, comma-separated)
            </label>
            <input
              type="text"
              value={photoUrlInput}
              onChange={(e) => setPhotoUrlInput(e.target.value)}
              placeholder="e.g. https://domain.com/photo1.jpg, https://domain.com/photo2.jpg"
              className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3.5 text-sm font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-zinc-100 flex items-center justify-end gap-4">
          <Link to={`/marketplace/businesses/${id}`}>
            <Button variant="ghost" type="button">Cancel</Button>
          </Link>
          <Button 
            type="submit" 
            disabled={isSaving}
            className="gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white border-none shadow-md rounded-2xl font-bold text-sm"
          >
            <Save size={16} />
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default EditBusinessListing;
