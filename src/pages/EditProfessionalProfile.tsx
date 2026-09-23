import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { Save, UploadCloud, FileText, Image as ImageIcon, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import {
  AvailabilityStatus,
  EmploymentType,
  IndividualProfile,
  PrimaryCadre
} from '../types';
import { EMPLOYMENT_TYPES, PROFESSIONAL_CADRES, UGANDA_DISTRICTS } from '../constants';
import { calculateProfessionalProfileCompleteness } from '../lib/profileCompleteness';

const YEARS_OPTIONS = [
  { id: 'less_than_1', label: 'Less than 1 year' },
  { id: '1_to_3', label: '1 to 3 years' },
  { id: '3_to_5', label: '3 to 5 years' },
  { id: '5_to_10', label: '5 to 10 years' },
  { id: '10_plus', label: '10+ years' }
];

const AREAS_OF_PRACTICE = [
  'Retail / Community',
  'Hospital / Clinical',
  'Nursing / Midwifery',
  'Allied Health',
  'Medical / Dental Practice',
  'Laboratory Services',
  'Industrial / Manufacturing',
  'Wholesale / Distribution',
  'Regulatory Affairs',
  'Research',
  'Drug Shop'
];

const AVAILABILITY_OPTIONS: Array<{ id: AvailabilityStatus; label: string; description: string }> = [
  { id: 'actively_seeking', label: 'Actively Seeking', description: 'I am currently looking for a role or engagement.' },
  { id: 'open_to_offers', label: 'Open to Offers', description: 'I am employed or engaged but open to relevant opportunities.' },
  { id: 'not_available', label: 'Not Available', description: 'I am not currently seeking new opportunities.' }
];

type EditableForm = {
  fullName: string;
  phone: string;
  district: string;
  primaryCadre: PrimaryCadre;
  registrationNumber: string;
  qualification: string;
  qualificationYear: number;
  yearsExperience: string;
  availabilityStatus: AvailabilityStatus;
  preferredEmploymentTypes: EmploymentType[];
  areasOfPractice: string[];
  bio: string;
  profilePhotoUrl?: string;
  cvUrl?: string;
  cvStoragePath?: string;
};

const EditProfessionalProfile: React.FC = () => {
  const { user, userAccount, profile, refreshUserData } = useAuth();
  const navigate = useNavigate();

  if (!user || !userAccount || !profile || !('fullName' in profile)) {
    return null;
  }

  const current = profile as IndividualProfile;
  const verifiedIdentityLocked = current.credentialVerificationStatus === 'verified';

  const [form, setForm] = useState<EditableForm>({
    fullName: current.fullName || '',
    phone: current.phone || '',
    district: current.district || 'Kampala',
    primaryCadre: current.primaryCadre || 'pharmacist',
    registrationNumber: current.registrationNumber || '',
    qualification: current.qualification || '',
    qualificationYear: current.qualificationYear || new Date().getFullYear(),
    yearsExperience: current.yearsExperience || '',
    availabilityStatus: current.availabilityStatus || 'not_available',
    preferredEmploymentTypes: current.preferredEmploymentTypes || [],
    areasOfPractice: current.areasOfPractice || [],
    bio: current.bio || '',
    profilePhotoUrl: current.profilePhotoUrl,
    cvUrl: current.cvUrl,
    cvStoragePath: current.cvStoragePath
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [removeCv, setRemoveCv] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoPreview = useMemo(
    () => photoFile ? URL.createObjectURL(photoFile) : form.profilePhotoUrl,
    [photoFile, form.profilePhotoUrl]
  );

  const toggleEmploymentType = (value: EmploymentType) => {
    setForm(prev => ({
      ...prev,
      preferredEmploymentTypes: prev.preferredEmploymentTypes.includes(value)
        ? prev.preferredEmploymentTypes.filter(item => item !== value)
        : [...prev.preferredEmploymentTypes, value]
    }));
  };

  const toggleArea = (area: string) => {
    setForm(prev => ({
      ...prev,
      areasOfPractice: prev.areasOfPractice.includes(area)
        ? prev.areasOfPractice.filter(item => item !== area)
        : [...prev.areasOfPractice, area]
    }));
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Profile photo must be a JPG or PNG image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photo must be 2MB or smaller.');
      return;
    }
    setPhotoFile(file);
    setError(null);
  };

  const handleCv = (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('CV must be a PDF file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('CV must be 5MB or smaller.');
      return;
    }
    setCvFile(file);
    setRemoveCv(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    const phoneDigits = form.phone.replace(/\D/g, '');
    if (form.phone.trim() && phoneDigits.length < 10) {
      setError('Phone number must contain at least 10 digits.');
      return;
    }

    if (!form.availabilityStatus) {
      setError('Please select your current professional availability.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const storage = getStorage();
      let profilePhotoUrl = form.profilePhotoUrl || '';
      let cvUrl = form.cvUrl || '';
      let cvStoragePath = form.cvStoragePath || '';

      if (photoFile) {
        const photoRef = ref(storage, `profilePhotos/${user.uid}/photo.jpg`);
        const uploaded = await uploadBytes(photoRef, photoFile, { contentType: photoFile.type });
        profilePhotoUrl = await getDownloadURL(uploaded.ref);
      }

      if (cvFile) {
        const cvRef = ref(storage, `cvFiles/${user.uid}/cv.pdf`);
        const uploaded = await uploadBytes(cvRef, cvFile, { contentType: 'application/pdf' });
        cvStoragePath = uploaded.ref.fullPath;
        cvUrl = '';
      } else if (removeCv) {
        const cvRef = ref(storage, `cvFiles/${user.uid}/cv.pdf`);
        await deleteObject(cvRef).catch(() => undefined);
        cvStoragePath = '';
        cvUrl = '';
      }

      const completeness = calculateProfessionalProfileCompleteness({
        ...form,
        profilePhotoUrl,
        cvUrl,
        cvStoragePath
      });

      const isDirectoryVisible = userAccount.isActive === true && completeness >= 60;

      await updateDoc(doc(db, 'individualProfiles', user.uid), {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        district: form.district,
        primaryCadre: form.primaryCadre,
        registrationNumber: form.registrationNumber.trim(),
        qualification: form.qualification,
        qualificationYear: Number(form.qualificationYear),
        yearsExperience: form.yearsExperience,
        availabilityStatus: form.availabilityStatus,
        preferredEmploymentTypes: form.preferredEmploymentTypes,
        areasOfPractice: form.areasOfPractice,
        bio: form.bio.trim(),
        profilePhotoUrl,
        cvUrl,
        cvStoragePath,
        profileCompleteness: completeness,
        isDirectoryVisible,
        updatedAt: serverTimestamp()
      });

      await refreshUserData();
      navigate('/profile', { replace: true, state: { profileUpdated: true } });
    } catch (err: any) {
      console.error('Profile save failed:', err);
      setError('Something went wrong while saving your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Professional profile</p>
        <h1 className="text-3xl font-bold text-zinc-900">Edit your profile</h1>
        <p className="text-sm text-zinc-500 mt-2">Keep your professional information accurate and current.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8">
          <h2 className="font-bold text-lg mb-6">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Full name">
              <input
                className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                value={form.fullName}
                disabled={verifiedIdentityLocked}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
              />
              {verifiedIdentityLocked && (
                <p className="text-[11px] text-zinc-400 mt-1">Verified identity fields are locked. Contact the responsible professional authority if a correction is required.</p>
              )}
            </Field>
            <Field label="Phone / WhatsApp">
              <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="District">
              <select className="form-input" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })}>
                {UGANDA_DISTRICTS.map(district => <option key={district} value={district}>{district}</option>)}
              </select>
            </Field>
            <Field label="Bio" className="md:col-span-2">
              <textarea
                className="form-input min-h-32 resize-none"
                maxLength={300}
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
              />
              <p className="text-[11px] text-zinc-400 mt-1 text-right">{form.bio.length}/300</p>
            </Field>
          </div>
        </section>

        <section className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8">
          <h2 className="font-bold text-lg mb-6">Professional Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Primary cadre">
              <select
                className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                value={form.primaryCadre}
                disabled={verifiedIdentityLocked}
                onChange={e => setForm({ ...form, primaryCadre: e.target.value as PrimaryCadre })}
              >
                {PROFESSIONAL_CADRES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Professional registration number">
              <input
                className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                value={form.registrationNumber}
                disabled={verifiedIdentityLocked}
                onChange={e => setForm({ ...form, registrationNumber: e.target.value })}
              />
              <p className="text-[11px] text-zinc-400 mt-1">Submitted registration details remain subject to professional-authority verification.</p>
            </Field>
            <Field label="Highest qualification">
              <input
                className="form-input"
                value={form.qualification}
                placeholder="Enter your highest relevant qualification"
                onChange={e => setForm({ ...form, qualification: e.target.value })}
              />
            </Field>
            <Field label="Year of qualification">
              <input type="number" className="form-input" min={1950} max={new Date().getFullYear()} value={form.qualificationYear} onChange={e => setForm({ ...form, qualificationYear: Number(e.target.value) })} />
            </Field>
            <Field label="Years of experience">
              <select className="form-input" value={form.yearsExperience} onChange={e => setForm({ ...form, yearsExperience: e.target.value })}>
                {YEARS_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8">
          <h2 className="font-bold text-lg mb-6">Work Preferences</h2>
          <div className="space-y-7">
            <div>
              <label className="text-sm font-semibold text-zinc-700 block mb-3">Availability</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {AVAILABILITY_OPTIONS.map(option => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => setForm({ ...form, availabilityStatus: option.id })}
                    className={`text-left p-4 rounded-2xl border transition-all ${form.availabilityStatus === option.id ? 'border-primary bg-primary/5' : 'border-zinc-200 bg-white'}`}
                  >
                    <p className="font-bold text-sm">{option.label}</p>
                    <p className="text-xs text-zinc-500 mt-1">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-700 block mb-3">Preferred employment types</label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPES.map(option => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => toggleEmploymentType(option.id as EmploymentType)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold ${form.preferredEmploymentTypes.includes(option.id as EmploymentType) ? 'bg-primary text-white border-primary' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-700 block mb-3">Areas of practice</label>
              <div className="flex flex-wrap gap-2">
                {AREAS_OF_PRACTICE.map(area => (
                  <button
                    type="button"
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold ${form.areasOfPractice.includes(area) ? 'bg-primary text-white border-primary' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8">
          <h2 className="font-bold text-lg mb-6">Profile Photo & CV</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-semibold text-zinc-700 mb-3">Profile photo</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center">
                  {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="text-zinc-400" />}
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold cursor-pointer hover:bg-zinc-50">
                  <UploadCloud size={16} />
                  Change photo
                  <input type="file" accept="image/jpeg,image/png" hidden onChange={e => handlePhoto(e.target.files?.[0])} />
                </label>
              </div>
              <p className="text-xs text-zinc-400 mt-2">JPG or PNG, maximum 2MB.</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-700 mb-3">CV</p>
              <div className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText size={18} className="text-primary" />
                  {cvFile ? cvFile.name : ((form.cvStoragePath || form.cvUrl) && !removeCv ? 'CV uploaded' : 'No CV uploaded')}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold cursor-pointer hover:bg-zinc-50">
                    <UploadCloud size={14} />
                    Upload CV
                    <input type="file" accept="application/pdf" hidden onChange={e => handleCv(e.target.files?.[0])} />
                  </label>
                  {(form.cvStoragePath || form.cvUrl) && !removeCv && (
                    <button type="button" onClick={() => { setRemoveCv(true); setCvFile(null); }} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50">
                      <X size={14} />
                      Remove CV
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-2">PDF only, maximum 5MB.</p>
            </div>
          </div>
        </section>

        <div className="flex justify-between gap-3 pb-10">
          <Button variant="ghost" onClick={() => navigate('/profile')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <style>{`
        .form-input {
          width: 100%;
          border: 1px solid rgb(228 228 231);
          background: rgb(250 250 250);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          outline: none;
          font-size: 0.875rem;
        }
        .form-input:focus {
          border-color: rgb(27 94 32);
          box-shadow: 0 0 0 2px rgba(27, 94, 32, 0.12);
          background: white;
        }
      `}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="text-sm font-semibold text-zinc-700 block mb-2">{label}</label>
    {children}
  </div>
);

export default EditProfessionalProfile;
