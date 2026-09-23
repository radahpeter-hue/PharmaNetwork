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
