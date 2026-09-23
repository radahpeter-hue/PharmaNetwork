import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Button } from '../components/Button';
import { Toast, ToastType } from '../components/Toast';
import { PHARMA_CADRES, UGANDA_DISTRICTS, EMPLOYMENT_TYPES, CONTACT_METHODS } from '../constants';
import { Briefcase, Building, MapPin, Phone, Mail, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { OrganisationProfile } from '../types';
import { cn } from '../lib/utils';

const CreateJobPosting: React.FC = () => {
  const { user, userAccount, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    cadreRequired: '',
    district: '',
    employmentType: '',
    description: '',
    requirements: '',
    contactMethod: 'whatsapp' as 'whatsapp' | 'email',
    contactDetail: ''
  });

  const [activeJobCount, setActiveJobCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  // Access check
  if (loading) return null;
  if (!user || userAccount?.accountType !== 'organisation') {
    return <Navigate to="/dashboard" replace />;
  }

  const orgProfile = profile as OrganisationProfile;
  const organisations = orgProfile?.organisations || [];

  useEffect(() => {
    if (organisations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(organisations[0].id);
    }
  }, [organisations]);

  useEffect(() => {
    const fetchActiveCount = async () => {
      if (!user) return;
      const q = query(
        collection(db, 'jobPostings'),
        where('organisationUserId', '==', user.uid),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      setActiveJobCount(snap.size);
    };
    fetchActiveCount();
  }, [user]);

  const selectedOrg = organisations.find(o => o.id === selectedOrgId) || organisations[0];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isLimitReached = activeJobCount >= 5;

  const validate = () => {
    if (!formData.title || !formData.cadreRequired || !formData.district || !formData.employmentType || !formData.description || !formData.contactDetail) {
      return 'Please fill all required fields.';
    }
    if (formData.description.length < 50) {
      return 'Description must be at least 50 characters.';
    }
    if (formData.contactMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactDetail)) {
      return 'Please enter a valid email address.';
    }
    if (formData.contactMethod === 'whatsapp' && formData.contactDetail.replace(/\D/g, '').length < 10) {
      return 'Please enter a valid phone number (at least 10 digits).';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      setToast({ isVisible: true, message: error, type: 'error' });
      return;
    }

    if (isLimitReached) return;

    setIsSubmitting(true);
    try {
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 60 * 24 * 60 * 60 * 1000);

      const jobData = {
        organisationUserId: user.uid,
        organisationName: selectedOrg.organisationName,
        organisationTypes: selectedOrg.organisationTypes,
        organisationDistrict: selectedOrg.district,
        organisationLogoUrl: '', // Could be added later if storage is implemented
        ...formData,
        status: 'active',
        createdAt: now,
        expiresAt: expiresAt,
        interestCount: 0
      };

      await addDoc(collection(db, 'jobPostings'), jobData);

      setToast({ isVisible: true, message: 'Your job posting is live.', type: 'success' });
      setTimeout(() => navigate('/jobs'), 2000);
    } catch (err) {
      console.error('Error creating job posting:', err);
      setToast({ isVisible: true, message: 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Post a Job Opportunity</h1>
        <p className="text-zinc-500">Connect with qualified pharmaceutical professionals across Uganda.</p>
      </div>

      {isLimitReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-8">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-amber-800">
            <strong>Limit Reached:</strong> You have reached the limit of 5 active postings. Close an existing posting to create a new one.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
        {organisations.length > 1 && (
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Posting on behalf of:</label>
            <select 
              value={selectedOrgId} 
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
            >
              {organisations.map(org => (
                <option key={org.id} value={org.id}>{org.organisationName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Briefcase size={20} className="text-primary" />
            Job Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Job Title *</label>
              <input 
                type="text"
                name="title"
                required
                maxLength={100}
                placeholder="e.g. Supervising Pharmacist"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Cadre Required *</label>
              <select 
                name="cadreRequired"
                required
                value={formData.cadreRequired}
                onChange={handleInputChange}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-white"
              >
                <option value="">Select Cadre</option>
                {PHARMA_CADRES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">District *</label>
              <select 
                name="district"
                required
                value={formData.district}
                onChange={handleInputChange}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-white"
              >
                <option value="">Select District</option>
                {UGANDA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Employment Type *</label>
              <select 
                name="employmentType"
                required
                value={formData.employmentType}
                onChange={handleInputChange}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-white"
              >
                <option value="">Select Type</option>
                {EMPLOYMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-zinc-700">Job Description *</label>
                <span className={cn("text-[10px] font-bold uppercase", formData.description.length < 50 ? "text-amber-500" : "text-zinc-400")}>
                  {formData.description.length} / 1000
                </span>
              </div>
              <textarea 
                name="description"
                required
                minLength={50}
                maxLength={1000}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the role, responsibilities, and expected outcomes..."
                rows={5}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1 italic">Minimum 50 characters required.</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-zinc-700">Requirements</label>
                <span className="text-[10px] font-bold uppercase text-zinc-400">
                  {formData.requirements.length} / 500
                </span>
              </div>
              <textarea 
                name="requirements"
                maxLength={500}
                value={formData.requirements}
                onChange={handleInputChange}
                placeholder="e.g. Minimum 2 years retail pharmacy experience, valid PSU registration..."
                rows={3}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-zinc-100">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <MessageSquare size={20} className="text-primary" />
            Contact Method
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              {CONTACT_METHODS.map(method => (
                <label 
                  key={method.id}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all uppercase text-[10px] font-bold tracking-widest",
                    formData.contactMethod === method.id 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200"
                  )}
                >
                  <input 
                    type="radio" 
                    name="contactMethod" 
                    value={method.id} 
                    checked={formData.contactMethod === method.id}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactMethod: e.target.value as any }))}
                    className="hidden"
                  />
                  {method.id === 'whatsapp' ? <MessageSquare size={16} /> : <Mail size={16} />}
                  {method.label}
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                {formData.contactMethod === 'whatsapp' ? 'Phone Number *' : 'Email Address *'}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  {formData.contactMethod === 'whatsapp' ? <Phone size={18} /> : <Mail size={18} />}
                </div>
                <input 
                  type={formData.contactMethod === 'whatsapp' ? 'tel' : 'email'}
                  name="contactDetail"
                  required
                  value={formData.contactDetail}
                  onChange={handleInputChange}
                  placeholder={formData.contactMethod === 'whatsapp' ? 'e.g. 0702400004' : 'e.g. recruitment@pharmacy.co.ug'}
                  className="w-full border border-zinc-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          fullWidth 
          size="lg" 
          isLoading={isSubmitting}
          disabled={isLimitReached}
        >
          {isLimitReached ? 'Limit Reached' : 'Post Opportunities'}
        </Button>
      </form>

      <Toast 
        {...toast} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
};

export default CreateJobPosting;
