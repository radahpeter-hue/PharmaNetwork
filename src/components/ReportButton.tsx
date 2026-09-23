import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Flag, X, AlertCircle } from 'lucide-react';
import { Toast } from './Toast';
import { Button } from './Button';

interface ReportButtonProps {
  contentType: 'profile' | 'job_posting' | 'availability_post' | 'business_listing';
  contentId: string;
  contentOwnerId: string;
  contentTitle: string;
  className?: string;
}

export const ReportButton: React.FC<ReportButtonProps> = ({
  contentType,
  contentId,
  contentOwnerId,
  contentTitle,
  className
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Do not show report button if user is not logged in, or if user is the owner of the content
  if (!user || user.uid === contentOwnerId) {
    return null;
  }

  const handleOpen = () => {
    setReason('spam');
    setDetails('');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'contentFlags'), {
        reporterUserId: user.uid,
        contentType,
        contentId,
        contentOwnerId,
        reason,
        details: details.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setIsOpen(false);
      setToastMsg('Thank you for your report. Our team will review it.');
      setToastType('success');
      setShowToast(true);
    } catch (err: any) {
      console.error('Report submission failed:', err);
      setToastMsg('Failed to submit report. Please try again.');
      setToastType('error');
      setShowToast(true);
      handleFirestoreError(err, OperationType.WRITE, 'contentFlags');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Human-readable labels for display
  const contentTypeLabels: Record<string, string> = {
    profile: 'User Profile',
    job_posting: 'Job Posting',
    availability_post: 'Professional Availability Post',
    business_listing: 'Business Listing'
  };

  const reasons = [
    { value: 'spam', label: 'Spam or irrelevant' },
    { value: 'misleading', label: 'Misleading or false information' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'fake_credentials', label: 'Fake or unverifiable credentials' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <>
      <button
        onClick={handleOpen}
        className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-red-500 transition-colors cursor-pointer ${className}`}
        title="Report this marketplace content"
      >
        <Flag size={12} />
        <span>Report</span>
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-zinc-100">
              <h3 className="font-extrabold text-zinc-900 text-lg uppercase tracking-wider flex items-center gap-2">
                <Flag size={18} className="text-red-500" />
                Report Content
              </h3>
              <button
                onClick={handleClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-grow">
              {/* Pre-filled readonly content title & type */}
              <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-0.5">Content Type</label>
                  <p className="text-xs font-semibold text-zinc-700">{contentTypeLabels[contentType] || contentType}</p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-0.5">Content Title</label>
                  <p className="text-sm font-bold text-zinc-800 line-clamp-1">{contentTitle}</p>
                </div>
              </div>

              {/* Reason Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-600">
                  Reason for Report <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-medium text-sm text-zinc-800 focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
                >
                  {reasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Details Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-600">
                    Additional Details
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {details.length}/300
                  </span>
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Provide supporting details or information to help us review this content (optional)..."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm text-zinc-800 placeholder-zinc-400 focus:ring-2 focus:ring-primary outline-none resize-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 font-bold border-red-600 hover:border-red-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success/Error Toast Feedback */}
      <Toast
        message={toastMsg}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  );
};
