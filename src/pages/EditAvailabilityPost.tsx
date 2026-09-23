import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { Button } from '../components/Button';
import { Toast, ToastType } from '../components/Toast';
import { AvailabilityPost } from '../types';
import { CONTACT_METHODS, EMPLOYMENT_TYPES } from '../constants';
import { cn } from '../lib/utils';

const EditAvailabilityPost: React.FC = () => {
  const { postId } = useParams();
  const { user, userAccount, loading } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<AvailabilityPost | null>(null);
  const [formData, setFormData] = useState({
    headline: '',
    description: '',
    preferredEmploymentTypes: [] as string[],
    contactMethod: 'whatsapp' as 'whatsapp' | 'email',
    contactDetail: ''
  });
  const [loadingPost, setLoadingPost] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success' as ToastType
  });

  useEffect(() => {
    const loadPost = async () => {
      if (!postId || !user) return;

      try {
        const snap = await getDoc(doc(db, 'availabilityPosts', postId));
        if (!snap.exists()) {
          setToast({ isVisible: true, message: 'Availability post not found.', type: 'error' });
          return;
        }

        const data = { ...snap.data(), id: snap.id } as AvailabilityPost;
        if (data.individualUserId !== user.uid) {
          setToast({ isVisible: true, message: 'You do not own this availability post.', type: 'error' });
          return;
        }

        setPost(data);
        setFormData({
          headline: data.headline || '',
          description: data.description || '',
          preferredEmploymentTypes: data.preferredEmploymentTypes || [],
          contactMethod: data.contactMethod || 'whatsapp',
          contactDetail: data.contactDetail || ''
        });
      } catch (error) {
        console.error('Failed to load availability post:', error);
        setToast({ isVisible: true, message: 'Unable to load this availability post.', type: 'error' });
      } finally {
        setLoadingPost(false);
      }
    };

    if (user) loadPost();
  }, [postId, user]);

  if (loading) return null;
  if (!user || userAccount?.accountType !== 'individual') {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleEmploymentType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      preferredEmploymentTypes: prev.preferredEmploymentTypes.includes(type)
        ? prev.preferredEmploymentTypes.filter(item => item !== type)
        : [...prev.preferredEmploymentTypes, type]
    }));
  };

  const validate = () => {
    if (!formData.headline.trim() || !formData.description.trim() || !formData.contactDetail.trim()) {
      return 'Please complete all required fields.';
    }

    if (formData.description.trim().length < 50) {
      return 'Description must be at least 50 characters.';
    }

    if (formData.preferredEmploymentTypes.length === 0) {
      return 'Select at least one preferred employment type.';
    }

    if (formData.contactMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactDetail.trim())) {
      return 'Please enter a valid email address.';
    }

    if (formData.contactMethod === 'whatsapp' && formData.contactDetail.replace(/\D/g, '').length < 10) {
      return 'Please enter a valid phone number.';
    }

    return null;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!postId || !post) return;

    const error = validate();
    if (error) {
      setToast({ isVisible: true, message: error, type: 'error' });
      return;
    }

    if (post.status !== 'active') {
      setToast({
        isVisible: true,
        message: 'Only active availability posts can be edited. Renew the post first.',
        type: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'availabilityPosts', postId), {
        headline: formData.headline.trim(),
        description: formData.description.trim(),
        preferredEmploymentTypes: formData.preferredEmploymentTypes,
        contactMethod: formData.contactMethod,
        contactDetail: formData.contactDetail.trim(),
        updatedAt: serverTimestamp()
      });

      setToast({ isVisible: true, message: 'Availability post updated.', type: 'success' });
      setTimeout(() => navigate(`/availability/${postId}`), 900);
    } catch (error) {
      console.error('Failed to update availability post:', error);
      setToast({ isVisible: true, message: 'Failed to save changes.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle size={42} className="mx-auto text-zinc-300 mb-4" />
        <h1 className="text-xl font-bold text-zinc-900">Availability post unavailable</h1>
        <Button className="mt-6" onClick={() => navigate('/my-postings?tab=availability')}>
          Back to My Postings
        </Button>
        <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />

      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Professional availability</p>
        <h1 className="text-3xl font-bold text-zinc-900">Edit availability post</h1>
        <p className="text-zinc-500 mt-2">Update the opportunity preferences organisations will see.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 space-y-7">
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-2">Headline</label>
          <input
            value={formData.headline}
            maxLength={100}
            onChange={e => setFormData(prev => ({ ...prev, headline: e.target.value }))}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <div className="flex justify-between gap-4 mb-2">
            <label className="text-sm font-semibold text-zinc-700">Description</label>
            <span className="text-xs text-zinc-400">{formData.description.length}/400</span>
          </div>
          <textarea
            value={formData.description}
            minLength={50}
            maxLength={400}
            rows={5}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-3">Preferred employment types</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EMPLOYMENT_TYPES.map(type => {
              const checked = formData.preferredEmploymentTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleEmploymentType(type.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border text-left',
                    checked ? 'border-primary bg-primary/5 text-primary' : 'border-zinc-200 text-zinc-600'
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    checked ? 'bg-primary border-primary text-white' : 'border-zinc-300'
                  )}>
                    {checked && <CheckCircle2 size={14} />}
                  </span>
                  <span className="text-sm font-semibold">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Contact method</label>
            <select
              value={formData.contactMethod}
              onChange={e => setFormData(prev => ({ ...prev, contactMethod: e.target.value as 'whatsapp' | 'email' }))}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 bg-white"
            >
              {CONTACT_METHODS.map(method => (
                <option key={method.id} value={method.id}>{method.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Contact detail</label>
            <input
              value={formData.contactDetail}
              onChange={e => setFormData(prev => ({ ...prev, contactDetail: e.target.value }))}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t border-zinc-100">
          <Button type="button" variant="ghost" onClick={() => navigate(`/availability/${postId}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditAvailabilityPost;
