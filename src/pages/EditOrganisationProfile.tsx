import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Building2, Plus, Save, Trash2, UploadCloud } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { OrganisationProfile, OrganizationType } from '../types';
import { ORGANISATION_TYPES, UGANDA_DISTRICTS } from '../constants';

type OrganisationEntry = OrganisationProfile['organisations'][number];

const createBlankOrganisation = (): OrganisationEntry => ({
  id: `org_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  organisationName: '',
  organisationTypes: [],
  ndaLicenceNumber: '',
  district: 'Kampala',
  contactPhone: '',
  about: '',
  branchCount: '1',
  isHiring: false
});

const EditOrganisationProfile: React.FC = () => {
  const { user, profile, refreshUserData } = useAuth();
  const navigate = useNavigate();

  if (!user || !profile || !('organisations' in profile)) return null;

  const current = profile as OrganisationProfile;
  const [organisations, setOrganisations] = useState<OrganisationEntry[]>(
    current.organisations?.length ? current.organisations.map(item => ({ ...item })) : [createBlankOrganisation()]
  );
  const [logoFiles, setLogoFiles] = useState<Record<string, File>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOrganisation = (index: number, fields: Partial<OrganisationEntry>) => {
    setOrganisations(prev => prev.map((item, idx) => idx === index ? { ...item, ...fields } : item));
  };

  const toggleType = (index: number, type: OrganizationType) => {
    const currentTypes = organisations[index].organisationTypes || [];
    updateOrganisation(index, {
      organisationTypes: currentTypes.includes(type)
        ? currentTypes.filter(item => item !== type)
        : [...currentTypes, type]
    });
  };

  const handleLogo = (orgId: string, file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Organisation logo must be a JPG or PNG image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Organisation logo must be 2MB or smaller.');
      return;
    }
    setLogoFiles(prev => ({ ...prev, [orgId]: file }));
    setError(null);
  };

  const removeOrganisation = (index: number) => {
    if (organisations.length === 1) {
      setError('An organisation account must contain at least one organisation.');
      return;
    }
    setOrganisations(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (organisations.some(org => !org.organisationName.trim())) {
      setError('Every organisation must have a name.');
      return;
    }

    if (organisations.some(org => org.organisationTypes.length === 0)) {
      setError('Select at least one organisation type for every organisation.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const storage = getStorage();
      const nextOrganisations: OrganisationEntry[] = [];

      for (const organisation of organisations) {
        let logoUrl = organisation.logoUrl || '';
        const logoFile = logoFiles[organisation.id];

        if (logoFile) {
          const logoRef = ref(storage, `orgLogos/${user.uid}/${organisation.id}/logo.jpg`);
          const uploaded = await uploadBytes(logoRef, logoFile, { contentType: logoFile.type });
          logoUrl = await getDownloadURL(uploaded.ref);
        }

        nextOrganisations.push({
          ...organisation,
          organisationName: organisation.organisationName.trim(),
          contactPhone: organisation.contactPhone.trim(),
          ndaLicenceNumber: organisation.ndaLicenceNumber?.trim() || '',
          about: organisation.about.trim(),
          logoUrl
        });
      }

      await updateDoc(doc(db, 'organisationProfiles', user.uid), {
        organisations: nextOrganisations,
        updatedAt: serverTimestamp()
      });

      await refreshUserData();
      navigate('/profile', { replace: true });
    } catch (err) {
      console.error('Organisation profile save failed:', err);
      setError('Something went wrong while saving the organisation profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Organisation profile</p>
        <h1 className="text-3xl font-bold text-zinc-900">Manage organisations</h1>
        <p className="text-sm text-zinc-500 mt-2">Each organisation registered under this account will appear separately in the organisation directory.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {organisations.map((org, index) => (
          <section key={org.id} className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Organisation {index + 1}</p>
                <h2 className="font-bold text-lg mt-1">{org.organisationName || 'New organisation'}</h2>
              </div>
              {organisations.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeOrganisation(index)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-xl"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Organisation name">
                <input className="org-input" value={org.organisationName} onChange={e => updateOrganisation(index, { organisationName: e.target.value })} />
              </Field>

              <Field label="District">
                <select className="org-input" value={org.district} onChange={e => updateOrganisation(index, { district: e.target.value })}>
                  {UGANDA_DISTRICTS.map(district => <option key={district} value={district}>{district}</option>)}
                </select>
              </Field>

              <Field label="Organisation phone">
                <input className="org-input" value={org.contactPhone} onChange={e => updateOrganisation(index, { contactPhone: e.target.value })} />
              </Field>

              <Field label="Licence / registration number">
                <input className="org-input" value={org.ndaLicenceNumber || ''} onChange={e => updateOrganisation(index, { ndaLicenceNumber: e.target.value })} />
              </Field>

              <Field label="Number of branches">
                <select className="org-input" value={org.branchCount} onChange={e => updateOrganisation(index, { branchCount: e.target.value })}>
                  <option value="1">1</option>
                  <option value="2_to_5">2 to 5</option>
                  <option value="6_to_10">6 to 10</option>
                  <option value="10_plus">10+</option>
                </select>
              </Field>

              <Field label="Hiring status">
                <select className="org-input" value={org.isHiring ? 'yes' : 'no'} onChange={e => updateOrganisation(index, { isHiring: e.target.value === 'yes' })}>
                  <option value="no">Not currently hiring</option>
                  <option value="yes">Currently hiring</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-zinc-700 block mb-3">Organisation types</label>
                <div className="flex flex-wrap gap-2">
                  {ORGANISATION_TYPES.map(option => (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => toggleType(index, option.id as OrganizationType)}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold ${org.organisationTypes.includes(option.id as OrganizationType) ? 'bg-primary text-white border-primary' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="About the organisation" className="md:col-span-2">
                <textarea
                  maxLength={800}
                  className="org-input min-h-32 resize-none"
                  value={org.about}
                  onChange={e => updateOrganisation(index, { about: e.target.value })}
                />
                <p className="text-[11px] text-zinc-400 mt-1 text-right">{org.about.length}/800</p>
              </Field>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-zinc-700 block mb-3">Organisation logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center">
                    {logoFiles[org.id] ? (
                      <img src={URL.createObjectURL(logoFiles[org.id])} alt="" className="w-full h-full object-cover" />
                    ) : org.logoUrl ? (
                      <img src={org.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="text-zinc-400" />
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold cursor-pointer hover:bg-zinc-50">
                    <UploadCloud size={16} />
                    Change logo
                    <input type="file" accept="image/jpeg,image/png" hidden onChange={e => handleLogo(org.id, e.target.files?.[0])} />
                  </label>
                </div>
                <p className="text-xs text-zinc-400 mt-2">JPG or PNG, maximum 2MB.</p>
              </div>
            </div>
          </section>
        ))}

        <button
          type="button"
          onClick={() => setOrganisations(prev => [...prev, createBlankOrganisation()])}
          className="w-full border-2 border-dashed border-zinc-200 rounded-3xl p-6 text-sm font-bold text-zinc-600 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add another organisation
        </button>

        <div className="flex justify-between gap-3 pb-10">
          <Button variant="ghost" onClick={() => navigate('/profile')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <style>{`
        .org-input {
          width: 100%;
          border: 1px solid rgb(228 228 231);
          background: rgb(250 250 250);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          outline: none;
          font-size: 0.875rem;
        }
        .org-input:focus {
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

export default EditOrganisationProfile;
