import { AvailabilityStatus, PrimaryCadre } from '../types';

export interface ProfessionalCompletenessInput {
  fullName?: string;
  phone?: string;
  district?: string;
  primaryCadre?: PrimaryCadre | string;
  availabilityStatus?: AvailabilityStatus | string;
  registrationNumber?: string;
  qualification?: string;
  yearsExperience?: string | number;
  bio?: string;
  profilePhotoUrl?: string;
  cvUrl?: string;
  cvStoragePath?: string;
}

const hasText = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;

export const calculateProfessionalProfileCompleteness = (
  profile: ProfessionalCompletenessInput
): number => {
  let score = 0;

  if (hasText(profile.fullName)) score += 10;
  if (hasText(profile.phone)) score += 10;
  if (hasText(profile.district)) score += 5;
  if (hasText(profile.primaryCadre)) score += 10;
  if (hasText(profile.availabilityStatus)) score += 10;
  if (hasText(profile.registrationNumber)) score += 15;
  if (hasText(profile.qualification)) score += 10;

  if (
    (typeof profile.yearsExperience === 'number' && Number.isFinite(profile.yearsExperience))
    || hasText(profile.yearsExperience)
  ) {
    score += 5;
  }

  if (typeof profile.bio === 'string' && profile.bio.trim().length >= 50) score += 10;
  if (hasText(profile.profilePhotoUrl)) score += 10;
  if (hasText(profile.cvStoragePath) || hasText(profile.cvUrl)) score += 5;

  return Math.min(score, 100);
};


export interface ProfileMissingItem {
  key: string;
  label: string;
}

export const getProfessionalProfileMissingItems = (
  profile: ProfessionalCompletenessInput
): ProfileMissingItem[] => {
  const items: ProfileMissingItem[] = [];

  if (!hasText(profile.fullName)) items.push({ key: 'fullName', label: 'Full name' });
  if (!hasText(profile.phone)) items.push({ key: 'phone', label: 'Phone / WhatsApp number' });
  if (!hasText(profile.district)) items.push({ key: 'district', label: 'District' });
  if (!hasText(profile.primaryCadre)) items.push({ key: 'primaryCadre', label: 'Primary cadre' });
  if (!hasText(profile.availabilityStatus)) items.push({ key: 'availabilityStatus', label: 'Professional availability' });
  if (!hasText(profile.registrationNumber)) items.push({ key: 'registrationNumber', label: 'Professional registration number' });
  if (!hasText(profile.qualification)) items.push({ key: 'qualification', label: 'Highest qualification' });

  if (
    !(
      (typeof profile.yearsExperience === 'number' && Number.isFinite(profile.yearsExperience))
      || hasText(profile.yearsExperience)
    )
  ) {
    items.push({ key: 'yearsExperience', label: 'Years of experience' });
  }

  if (!(typeof profile.bio === 'string' && profile.bio.trim().length >= 50)) {
    items.push({ key: 'bio', label: 'Bio of at least 50 characters' });
  }

  if (!hasText(profile.profilePhotoUrl)) items.push({ key: 'profilePhotoUrl', label: 'Profile photo' });
  if (!hasText(profile.cvStoragePath) && !hasText(profile.cvUrl)) items.push({ key: 'cv', label: 'CV' });

  return items;
};
