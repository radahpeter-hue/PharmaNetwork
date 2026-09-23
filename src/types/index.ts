export type AccountType = 'individual' | 'organisation';

export type AccountClass =
  | 'professional'
  | 'organisation'
  | 'professional_authority'
  | 'platform_admin';

export type AccountStatus =
  | 'PENDING_PROFILE'
  | 'PENDING_AUTHORITY_VERIFICATION'
  | 'MORE_INFORMATION_REQUIRED'
  | 'ACTIVE'
  | 'INACTIVE_ANNUAL_COMPLIANCE'
  | 'SUSPENDED_BY_AUTHORITY'
  | 'REJECTED'
  | 'DEACTIVATED_BY_PLATFORM';

export type AuthorityRole =
  | 'authority_super_admin'
  | 'verification_officer'
  | 'compliance_officer'
  | 'communications_officer'
  | 'reviewer';

export interface ProfessionalAuthority {
  id: string;
  name: string;
  shortName?: string;
  governedCadres: PrimaryCadre[];
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface ProfessionalAuthorityAdmin {
  uid: string;
  fullName: string;
  email: string;
  authorityId: string;
  authorityName: string;
  scopedCadres: PrimaryCadre[];
  role: AuthorityRole;
  isActive: boolean;
  notes?: string;
  addedAt?: any;
  lastLoginAt?: any;
}

export type PrimaryCadre =
  | 'pharmacist'
  | 'pharmacy_technician'
  | 'pharmacy_assistant'
  | 'dispenser'
  | 'drug_shop_auxiliary'
  | 'nurse'
  | 'midwife'
  | 'clinical_officer'
  | 'medical_laboratory_professional'
  | 'physiotherapist'
  | 'radiographer'
  | 'occupational_therapist'
  | 'nutritionist_dietitian'
  | 'medical_practitioner'
  | 'dental_practitioner'
  | 'other_allied_health_professional'
  | 'qa_qc_officer'
  | 'procurement_officer'
  | 'medical_sales_rep'
  | 'pharmacovigilance_officer'
  | 'regulatory_affairs'
  | 'production_personnel'
  | 'stores_officer'
  | 'stores_manager'
  | 'other';

export type AvailabilityStatus = 'actively_seeking' | 'open_to_offers' | 'not_available';

export type EmploymentType = 'full_time' | 'part_time' | 'locum' | 'contract';

export type OrganizationType = 
  | 'retail_pharmacy' 
  | 'wholesale_pharmacy' 
  | 'drug_shop' 
  | 'importer' 
  | 'distributor' 
  | 'manufacturer' 
  | 'other';

export interface UserAccount {
  id: string;
  accountType: AccountType;
  accountClass?: AccountClass;
  accountStatus?: AccountStatus;
  isActive: boolean;
  isVerified: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface IndividualProfile {
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
  roles: string[];
  bio: string;
  profilePhotoUrl?: string;
  cvUrl?: string;
  cvStoragePath?: string;
  profileCompleteness: number;
  isDirectoryVisible?: boolean;
  createdAt: any;
  updatedAt: any;
  // Verification updates (Part 10 & 11)
  credentialVerificationStatus?: 'unverified' | 'pending_review' | 'verified' | 'rejected';
  credentialVerifiedByBody?: string;
  credentialVerifiedAt?: any;
  credentialRejectionReason?: string;
  practisingLicenceStatus?: 'not_renewed' | 'renewed_current' | 'suspended' | 'lapsed';
  practisingLicenceYear?: number;
  id?: string;
}

export interface OrganisationProfile {
  organisations: {
    id: string;
    organisationName: string;
    organisationTypes: OrganizationType[];
    ndaLicenceNumber?: string;
    district: string;
    contactPhone: string;
    about: string;
    branchCount: string;
    isHiring: boolean;
    logoUrl?: string;
  }[];
  createdAt: any;
  updatedAt: any;
}

export interface PlatformStats {
  registeredPharmacists: number;
  pharmacyOwners: number;
  auxiliaryProfessionals: number;
  manufacturersDistributors: number;
  activeOpportunities: number;
}

export interface JobPosting {
  id?: string;
  organisationUserId: string;
  organisationName: string;
  organisationTypes: string[];
  organisationDistrict: string;
  organisationLogoUrl: string;
  title: string;
  cadreRequired: PrimaryCadre | string;
  district: string;
  employmentType: string;
  description: string;
  requirements: string;
  contactMethod: 'whatsapp' | 'email';
  contactDetail: string;
  status: 'active' | 'closed' | 'expired';
  createdAt: any;
  expiresAt: any;
  interestCount: number;
}

export interface AvailabilityPost {
  id?: string;
  individualUserId: string;
  fullName: string;
  primaryCadre: PrimaryCadre | string;
  district: string;
  profilePhotoUrl: string;
  registrationNumber: string;
  headline: string;
  preferredEmploymentTypes: string[];
  description: string;
  contactMethod: 'whatsapp' | 'email';
  contactDetail: string;
  status: 'active' | 'closed' | 'expired';
  createdAt: any;
  expiresAt: any;
  interestCount: number;
}

export interface InterestEvent {
  id?: string;
  actorId: string;
  targetId: string;
  type: 'job_interest' | 'availability_interest';
  timestamp: any;
}

export interface BusinessListing {
  id?: string;
  sellerUserId: string;
  isConfidential: boolean;
  listingTitle: string;
  businessType: 'retail_pharmacy' | 'wholesale_pharmacy' | 'drug_shop' | 'distribution_company' | 'manufacturing_facility' | 'pharmaceutical_equipment' | 'other';
  district: string;
  locationDescription?: string;
  yearsInOperation: number;
  ndaLicenceStatus?: 'licensed_current' | 'licence_expired' | 'no_licence_equipment_only';
  staffCount: number;
  businessDescription: string;
  askingPriceUGX: number | null;
  priceNegotiable: boolean;
  monthlySalesRange: 'below_5m' | '5m_to_15m' | '15m_to_30m' | '30m_to_50m' | 'above_50m' | 'prefer_not_to_say';
  reasonForSale: 'retirement' | 'relocation' | 'restructuring' | 'health_reasons' | 'other' | 'prefer_not_to_say';
  whatsIncluded: string[];
  contactMethod?: 'whatsapp' | 'email';
  contactDetail?: string;
  contactName?: string;
  photoUrls: string[];
  status: 'active' | 'under_offer' | 'sold' | 'withdrawn';
  createdAt: any;
  expiresAt: any;
  viewCount: number;
}

export interface Conversation {
  id: string; // sorted UIDs joined with underscore
  participants: string[];
  participantNames: { [uid: string]: string };
  participantPhotos: { [uid: string]: string };
  lastMessage: string;
  lastMessageAt: any;
  lastMessageSenderId: string;
  unreadCount: { [uid: string]: number };
  createdAt: any;
  relatedPostingId?: string;
  relatedPostingTitle?: string;
}

export interface Message {
  id?: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: any;
  isRead: boolean;
}

export interface ContentFlag {
  id?: string;
  reporterUserId: string;
  contentType: 'profile' | 'job_posting' | 'availability_post' | 'business_listing' | 'message';
  contentId: string;
  contentOwnerId: string;
  reason: 'spam' | 'misleading' | 'inappropriate' | 'fake_credentials' | 'other';
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  createdAt: any;
  reviewedAt?: any | null;
  reviewedBy?: string | null;
}
