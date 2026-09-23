import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button } from '../components/Button';
import { JobPosting } from '../types';
import { Toast, ToastType } from '../components/Toast';
import { ArrowLeft, Save, FileText, MapPin } from 'lucide-react';
import { EMPLOYMENT_TYPES, PROFESSIONAL_CADRES, UGANDA_DISTRICTS, normalizeProfessionalCadreId } from '../constants';

const EditJobPosting: React.FC = () => {
  const { postingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as ToastType });

  useEffect(() => {
    const fetchJob = async () => {
      if (!postingId) return;
      try {
        const docSnap = await getDoc(doc(db, 'jobPostings', postingId));
        if (docSnap.exists()) {
          const data = { ...docSnap.data(), id: docSnap.id } as JobPosting;
          if (data.organisationUserId !== user?.uid) {
            navigate('/dashboard');
            return;
          }
          setJob({
            ...data,
            cadreRequired: normalizeProfessionalCadreId(data.cadreRequired)
          });
        }
      } catch (err) {
        console.error('Error fetching job:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [postingId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || !postingId) return;

    if (job.description.length < 50) {
      setToast({ isVisible: true, message: 'Description must be at least 50 characters.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'jobPostings', postingId), {
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        district: job.district,
        cadreRequired: job.cadreRequired,
        employmentType: job.employmentType
      });
      setToast({ isVisible: true, message: 'Posting updated.', type: 'success' });
      setTimeout(() => navigate(`/jobs/${postingId}`), 1500);
    } catch (err) {
      setToast({ isVisible: true, message: 'Update failed.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;
  if (!job) return <div>Posting not found.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link to={`/jobs/${postingId}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-primary mb-8 font-bold text-[10px] uppercase">
        <ArrowLeft size={16} />
        Back to Details
      </Link>
      
      <h1 className="text-3xl font-bold text-zinc-900 mb-8">Edit Posting</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">Job Title</label>
            <input 
              type="text"
              required
              value={job.title}
              onChange={(e) => setJob({ ...job, title: e.target.value })}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Professional Cadre</label>
              <select
                value={job.cadreRequired}
                onChange={(e) => setJob({ ...job, cadreRequired: e.target.value })}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none bg-white"
              >
                {PROFESSIONAL_CADRES.map(cadre => (
                  <option key={cadre.id} value={cadre.id}>{cadre.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Employment Type</label>
              <select
                value={job.employmentType}
                onChange={(e) => setJob({ ...job, employmentType: e.target.value })}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none bg-white"
              >
                {EMPLOYMENT_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">District</label>
            <select 
              value={job.district}
              onChange={(e) => setJob({ ...job, district: e.target.value })}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none bg-white"
            >
              {UGANDA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
             <div className="flex justify-between items-center mb-2">
               <label className="block text-sm font-bold text-zinc-700">Description</label>
               <span className="text-[10px] text-zinc-400">{job.description.length} / 1000</span>
             </div>
             <textarea 
               required
               minLength={50}
               maxLength={1000}
               rows={6}
               value={job.description}
               onChange={(e) => setJob({ ...job, description: e.target.value })}
               className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none resize-none"
             />
          </div>

          <div>
             <div className="flex justify-between items-center mb-2">
               <label className="block text-sm font-bold text-zinc-700">Requirements</label>
               <span className="text-[10px] text-zinc-400">{job.requirements.length} / 500</span>
             </div>
             <textarea 
               maxLength={500}
               rows={4}
               value={job.requirements}
               onChange={(e) => setJob({ ...job, requirements: e.target.value })}
               className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none resize-none"
             />
          </div>

          <Button type="submit" fullWidth isLoading={isSubmitting} className="gap-2">
             <Save size={18} />
             Save Changes
          </Button>
        </div>
      </form>

      <Toast {...toast} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
    </div>
  );
};

export default EditJobPosting;
