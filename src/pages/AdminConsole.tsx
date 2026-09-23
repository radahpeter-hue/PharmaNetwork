import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  where,
  Timestamp,
  GeoPoint
} from 'firebase/firestore';
import { 
  Shield, 
  Users, 
  FileText, 
  Flag, 
  Settings, 
  Activity, 
  User, 
  Building, 
  Briefcase, 
  AlertTriangle, 
  Check, 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Save, 
  Eye, 
  Slash,
  RefreshCw
} from 'lucide-react';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';
import { 
  UserAccount, 
  IndividualProfile, 
  OrganisationProfile, 
  JobPosting, 
  AvailabilityPost, 
  BusinessListing, 
  ContentFlag, 
  PlatformStats 
} from '../types';

type TabType = 'overview' | 'users' | 'flags' | 'postings' | 'settings';
type PostingsSubTab = 'jobs' | 'availability' | 'businesses';

export const AdminConsole: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);

  // General App check state
  const currentUser = auth.currentUser;

  // TAB 1 (Overview) State
  const [overviewStats, setOverviewStats] = useState({
    totalUsers: 0,
    individualCount: 0,
    organisationCount: 0,
    activeJobs: 0,
    activeAvailability: 0,
    activeBusinesses: 0,
    pendingFlags: 0
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  // TAB 2 (Users) State
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersHistory, setUsersHistory] = useState<any[]>([]); // holds startAfter cursors
  const [usersHasNext, setUsersHasNext] = useState(true);
  const [confirmDeactivateUser, setConfirmDeactivateUser] = useState<any | null>(null);

  // TAB 3 (Flags) State
  const [contentFlags, setContentFlags] = useState<any[]>([]);
  const [flagFilter, setFlagFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed' | 'actioned'>('all');

  // TAB 4 (Postings) State
  const [postingsSubTab, setPostingsSubTab] = useState<PostingsSubTab>('jobs');
  const [postingsList, setPostingsList] = useState<any[]>([]);
  const [postingsStatusFilter, setPostingsStatusFilter] = useState<string>('all');
  const [postingsPage, setPostingsPage] = useState(1);
  const [postingsHistory, setPostingsHistory] = useState<any[]>([]);
  const [postingsHasNext, setPostingsHasNext] = useState(true);

  // TAB 5 (Platform Settings) State
  const [manualStats, setManualStats] = useState<PlatformStats>({
    registeredPharmacists: 0,
    pharmacyOwners: 0,
    auxiliaryProfessionals: 0,
    manufacturersDistributors: 0,
    activeOpportunities: 0
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Global variables
  const [individualProfilesMap, setIndividualProfilesMap] = useState<Record<string, IndividualProfile>>({});
  const [orgProfilesMap, setOrgProfilesMap] = useState<Record<string, any>>({});

  // 1. Load initial cache & overview indices
  useEffect(() => {
    loadCachedProfiles();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewData();
    } else if (activeTab === 'users') {
      loadUsersPage(1);
    } else if (activeTab === 'flags') {
      loadFlagsData();
    } else if (activeTab === 'postings') {
      loadPostingsPage(1);
    } else if (activeTab === 'settings') {
      loadSettingsData();
    }
  }, [activeTab, postingsSubTab, postingsStatusFilter]);

  const handleSeedDemoData = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const now = Timestamp.now();
      const in30Days = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      const in45Days = Timestamp.fromDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000));
      const in60Days = Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
      const in90Days = Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
      const in120Days = Timestamp.fromDate(new Date(Date.now() + 120 * 24 * 60 * 60 * 1000));

      // 1. Seed Individual Users & Profiles
      const professionals = [
        {
          uid: 'seed_ind_brenda',
          fullName: 'Brenda Namono',
          district: 'Kampala',
          primaryCadre: 'Registered Pharmacist',
          registrationNumber: 'PSU/R/10492',
          qualification: 'Bachelor of Pharmacy (MUK)',
          yearsExperience: 6,
          bio: 'Dedicated clinical pharmacist with extensive experience in hospital inventory management and patient counselling. Looking for locum or part-time roles.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['locum', 'part_time'],
          phone: '+256772911223',
          areasOfPractice: ['Clinical_Pharmacy', 'Hospital_Pharmacy'],
          roles: ['Locum Pharmacist', 'Clinical Advisor'],
          totalProfileViews: 42
        },
        {
          uid: 'seed_ind_mark',
          fullName: 'Mark Mugisha',
          district: 'Mbarara',
          primaryCadre: 'Medical Sales Representative',
          registrationNumber: 'PSU/A/9941',
          qualification: 'Diploma in Pharmacy (KIU)',
          yearsExperience: 3,
          bio: 'Result-driven pharma representative with deep contacts in Western region clinics and retail groups. Proven sales conversion stats.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['full_time'],
          phone: '+256782334455',
          areasOfPractice: ['Pharma_Marketing', 'Wholesale_&_Distribution'],
          roles: ['Sales Executive', 'Medical Representative'],
          totalProfileViews: 19
        },
        {
          uid: 'seed_ind_john',
          fullName: 'John Okello',
          district: 'Gulu',
          primaryCadre: 'Pharmacy Assistant / Dispenser',
          registrationNumber: 'PSU/X/2034',
          qualification: 'Certificate in Dispensing (Mulago)',
          yearsExperience: 4,
          bio: 'Accurate dispenser with license compliance focus, friendly patient engagement style, and stellar inventory control records.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['full_time', 'contract'],
          phone: '+256701234567',
          areasOfPractice: ['Community_Pharmacy'],
          roles: ['Dispenser', 'Counter Assistant'],
          totalProfileViews: 8
        },
        {
          uid: 'seed_ind_sophia',
          fullName: 'Sophia Nalule',
          district: 'Wakiso',
          primaryCadre: 'Regulatory Affairs Officer',
          registrationNumber: 'PSU/R/12093',
          qualification: 'Master of Science in Regulatory Affairs',
          yearsExperience: 5,
          bio: 'Specialized in NDA dossier filing, GMP audit coordination, local import-export protocols, and general pharmaceutical regulatory compliance.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['full_time', 'contract'],
          phone: '+256752884422',
          areasOfPractice: ['Regulatory_Affairs', 'Industrial_Pharmacy', 'Quality_Assurance'],
          roles: ['Regulatory Officer', 'QA Consultant'],
          totalProfileViews: 31
        },
        {
          uid: 'seed_ind_moses',
          fullName: 'Moses Atwine',
          district: 'Jinja',
          primaryCadre: 'Pharmacy Technician',
          registrationNumber: 'PSU/T/8492',
          qualification: 'Diploma in Pharmacy',
          yearsExperience: 2,
          bio: 'Detail-oriented technician with compounding expertise and stock tracking accuracy. Ready to support busy hospital and retail dispensaries.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['full_time', 'locum'],
          phone: '+256772004488',
          areasOfPractice: ['Compounding', 'Community_Pharmacy'],
          roles: ['Pharmacy Technician', 'Locum Dispenser'],
          totalProfileViews: 14
        },
        {
          uid: 'seed_ind_flavia',
          fullName: 'Flavia Atim',
          district: 'Gulu',
          primaryCadre: 'Pharmacy Assistant / Dispenser',
          registrationNumber: 'PSU/X/5591',
          qualification: 'Certificate in Dispensing (Mulago)',
          yearsExperience: 5,
          bio: 'Experienced dispenser with absolute dedication to service delivery in Northern Uganda. Over 5 years of retail dispensing in Gulu, fluent in Luo, Swahili, and English. Stellar inventory management track record.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['full_time', 'locum'],
          phone: '+256773123456',
          areasOfPractice: ['Community_Pharmacy'],
          roles: ['Pharmacy Assistant', 'Junior Dispenser'],
          totalProfileViews: 22
        },
        {
          uid: 'seed_ind_david',
          fullName: 'David Mukasa',
          district: 'Mbale',
          primaryCadre: 'Registered Pharmacist',
          registrationNumber: 'PSU/R/8873',
          qualification: 'Bachelor of Pharmacy (MUK)',
          yearsExperience: 8,
          bio: 'Seasoned hospital and community pharmacist. Certified by PSU, expert in pharmaceutical logistics, local team training, and inventory audit. Seeking clinical supervision roles or retail locum.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['part_time', 'locum'],
          phone: '+256781223344',
          areasOfPractice: ['Hospital_Pharmacy', 'Clinical_Pharmacy'],
          roles: ['Senior Pharmacist', 'Locum Manager'],
          totalProfileViews: 35
        },
        {
          uid: 'seed_ind_hassan',
          fullName: 'Hassan Ssewankambo',
          district: 'Masaka',
          primaryCadre: 'Pharmacy Technician',
          registrationNumber: 'PSU/T/7091',
          qualification: 'Diploma in Pharmacy (Mulago)',
          yearsExperience: 4,
          bio: 'Technician with compounding precision and active registration. Skilled in managing busy outpatient dispensers, monitoring cold chains for biologicals, and conducting store audits.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['full_time', 'contract'],
          phone: '+256708998877',
          areasOfPractice: ['Community_Pharmacy', 'Compounding'],
          roles: ['Pharmacy Technician', 'Lab Compounding Lead'],
          totalProfileViews: 17
        },
        {
          uid: 'seed_ind_lydia',
          fullName: 'Lydia Nabakooza',
          district: 'Kampala',
          primaryCadre: 'Pharmacovigilance Officer',
          registrationNumber: 'PSU/PV/112',
          qualification: 'Bachelor of Pharmacy',
          yearsExperience: 4,
          bio: 'Accredited clinical safety professional focused on ADR (Adverse Drug Reaction) surveillance, drug safety report filing, and pharmacy safety workshops with healthcare facilities.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['full_time', 'contract'],
          phone: '+256774556677',
          areasOfPractice: ['Regulatory_Affairs', 'Clinical_Pharmacy'],
          roles: ['PV Specialist', 'Drug Safety Advocate'],
          totalProfileViews: 12
        },
        {
          uid: 'seed_ind_patrick',
          fullName: 'Patrick Ochieng',
          district: 'Tororo',
          primaryCadre: 'Procurement Officer',
          registrationNumber: 'PSU/P/4481',
          qualification: 'Diploma in Pharmacy & Procurement Certification',
          yearsExperience: 6,
          bio: 'Expert procurement and stores officer. Proven history in sourcing quality API materials and essential drugs under NDA regulations. Excellent negotiator and stock planning coordinator.',
          availabilityStatus: 'available',
          preferredEmploymentTypes: ['full_time'],
          phone: '+256752771122',
          areasOfPractice: ['Wholesale_&_Distribution', 'Procurement_&_Logistics'],
          roles: ['Procurement Officer', 'Inventory Coordinator'],
          totalProfileViews: 26
        }
      ];

      for (const p of professionals) {
        // Create user record
        await setDoc(doc(db, 'users', p.uid), {
          id: p.uid,
          accountType: 'individual',
          isActive: true,
          isVerified: true,
          createdAt: now,
          updatedAt: now
        });

        // Create individual profiles record
        await setDoc(doc(db, 'individualProfiles', p.uid), {
          fullName: p.fullName,
          phone: p.phone,
          district: p.district,
          primaryCadre: p.primaryCadre,
          registrationNumber: p.registrationNumber,
          qualification: p.qualification,
          yearsExperience: p.yearsExperience,
          availabilityStatus: p.availabilityStatus,
          preferredEmploymentTypes: p.preferredEmploymentTypes,
          areasOfPractice: p.areasOfPractice,
          bio: p.bio,
          roles: p.roles,
          totalProfileViews: p.totalProfileViews,
          createdAt: now,
          updatedAt: now
        });

        // Create availabilityPost matching professional
        const avPostId = `seed_av_post_${p.uid}`;
        await setDoc(doc(db, 'availabilityPosts', avPostId), {
          id: avPostId,
          individualUserId: p.uid,
          fullName: p.fullName,
          district: p.district,
          primaryCadre: p.primaryCadre,
          registrationNumber: p.registrationNumber,
          headline: p.primaryCadre === 'Registered Pharmacist' ? 'Clinical & Ward Pharmacist Available' :
                    p.primaryCadre === 'Medical Sales Representative' ? 'Territory Sales Representative - Western Uganda' :
                    p.primaryCadre === 'Pharmacy Assistant / Dispenser' ? 'Licensed Pharmacy Dispenser' :
                    p.primaryCadre === 'Regulatory Affairs Officer' ? 'GMP & Regulatory Compliance Specialist' :
                    p.primaryCadre === 'Pharmacovigilance Officer' ? 'Adverse Event Reporting Associate' :
                    p.primaryCadre === 'Procurement Officer' ? 'Medical Sourcing Coordinator' :
                    'Experienced Pharmacy Technician Daily Cover',
          description: p.bio,
          preferredEmploymentTypes: p.preferredEmploymentTypes,
          contactMethod: p.uid.includes('brenda') || p.uid.includes('john') || p.uid.includes('moses') || p.uid.includes('flavia') || p.uid.includes('hassan') ? 'whatsapp' : 'email',
          contactDetail: p.phone,
          status: 'active',
          interestCount: p.uid.includes('brenda') ? 4 : p.uid.includes('sophia') ? 3 : p.uid.includes('mark') ? 1 : p.uid.includes('david') ? 5 : p.uid.includes('flavia') ? 2 : 0,
          expiresAt: in45Days,
          createdAt: now,
          updatedAt: now
        });
      }

      // 2. Seed Organisations & Profiles
      const organisations = [
        {
          uid: 'seed_org_jms',
          name: 'Joint Medical Store (JMS)',
          district: 'Kampala',
          ndaLicenceNumber: 'NDA/W/772-2025',
          organisationTypes: ['wholesale_pharmacy', 'import_export'],
          contactPhone: '+256772120440',
          branchCount: 3,
          isHiring: true,
          about: "Uganda's premier non-profit medical wholesaling pharmacy group supply chain network.",
          createdAt: now
        },
        {
          uid: 'seed_org_first',
          name: 'First Pharmacy Kampala',
          district: 'Kampala',
          ndaLicenceNumber: 'NDA/R/441-2026',
          organisationTypes: ['retail_pharmacy'],
          contactPhone: '+256701889900',
          branchCount: 2,
          isHiring: true,
          about: "An ultra-modern community retail pharmacy offering elite counseling, 24/7 prescription dispensing, and clinical wellness diagnostics.",
          createdAt: now
        },
        {
          uid: 'seed_org_abacus',
          name: 'Abacus Pharma Uganda',
          district: 'Mukono',
          ndaLicenceNumber: 'NDA/M/110-2025',
          organisationTypes: ['manufacturing', 'wholesale_pharmacy'],
          contactPhone: '+256414220033',
          branchCount: 1,
          isHiring: false,
          about: "Leading domestic manufacturing facility producing high-quality essential generics, IV fluids, and sterile injectables.",
          createdAt: now
        }
      ];

      for (const o of organisations) {
        // Create user record
        await setDoc(doc(db, 'users', o.uid), {
          id: o.uid,
          accountType: 'organisation',
          isActive: true,
          isVerified: true,
          createdAt: now,
          updatedAt: now
        });

        // Create organisation profiles record
        await setDoc(doc(db, 'organisationProfiles', o.uid), {
          organisations: [
            {
              id: 'primary',
              organisationName: o.name,
              district: o.district,
              ndaLicenceNumber: o.ndaLicenceNumber,
              organisationTypes: o.organisationTypes,
              contactPhone: o.contactPhone,
              branchCount: o.branchCount,
              isHiring: o.isHiring,
              about: o.about
            }
          ],
          createdAt: now,
          updatedAt: now
        });
      }

      // 3. Seed Job Postings (10 jobs total)
      const jobs = [
        {
          id: 'seed_job_jms_head',
          organisationUserId: 'seed_org_jms',
          organisationName: 'Joint Medical Store (JMS)',
          title: 'Head of Distribution & Inventory',
          district: 'Kampala',
          cadreRequired: 'Registered Pharmacist',
          employmentType: 'full_time',
          expiresAt: in30Days,
          description: 'Oversee wholesale medical warehouse distribution logistics throughout East Africa. Design inventory supply chains, ensure GSP (Good Storage Practice) adherence, and supervise stock coordinators.',
          interestCount: 2
        },
        {
          id: 'seed_job_first_night',
          organisationUserId: 'seed_org_first',
          organisationName: 'First Pharmacy Kampala',
          title: 'Night Shift Pharmacist',
          district: 'Kampala',
          cadreRequired: 'Registered Pharmacist',
          employmentType: 'part_time',
          expiresAt: in30Days,
          description: 'Dispense critical prescriptions, manage cash registers, monitor controlled drug logs, and provide premium customer-facing patient counseling services.',
          interestCount: 4
        },
        {
          id: 'seed_job_first_disp',
          organisationUserId: 'seed_org_first',
          organisationName: 'First Pharmacy Kampala',
          title: 'Experienced Counter Dispenser',
          district: 'Wakiso',
          cadreRequired: 'Pharmacy Assistant / Dispenser',
          employmentType: 'full_time',
          expiresAt: in45Days,
          description: 'Looking for a committed pharmacy assistant to operate billing system, restock counter shelves, audit expiry timelines, and assist clinical pharmacists with customer interaction.',
          interestCount: 1
        },
        {
          id: 'seed_job_abacus_reg',
          organisationUserId: 'seed_org_abacus',
          organisationName: 'Abacus Pharma Uganda',
          title: 'Regulatory Affairs Supervisor',
          district: 'Mukono',
          cadreRequired: 'Regulatory Affairs Officer',
          employmentType: 'full_time',
          expiresAt: in60Days,
          description: 'Lead Dossier preparation for newly manufactured medical formulations. Submit compliance paperwork, conduct internal GMP lab inspections, and liaison with NDA (National Drug Authority) inspectors.',
          interestCount: 0
        },
        {
          id: 'seed_job_abacus_sales',
          organisationUserId: 'seed_org_abacus',
          organisationName: 'Abacus Pharma Uganda',
          title: 'Sales Representative (Locum)',
          district: 'Jinja',
          cadreRequired: 'Medical Sales Representative',
          employmentType: 'locum',
          expiresAt: in30Days,
          description: 'Locum rep needed to establish critical clinic pipelines in Jinja and nearby parts of Busoga subregion. Market core Generics offerings.',
          interestCount: 3
        },
        {
          id: 'seed_job_jms_procurement',
          organisationUserId: 'seed_org_jms',
          organisationName: 'Joint Medical Store (JMS)',
          title: 'Senior Sourcing & Procurement Officer',
          district: 'Kampala',
          cadreRequired: 'Procurement Officer',
          employmentType: 'full_time',
          expiresAt: in60Days,
          description: 'Direct national and international sourcing of high-quality drug batches. Evaluate manufacturer dossiers, negotiate cost margins, and ensure clean compliance alignment with NDA Import guidelines.',
          interestCount: 2
        },
        {
          id: 'seed_job_first_technician',
          organisationUserId: 'seed_org_first',
          organisationName: 'First Pharmacy Kampala',
          title: 'Pharmacy Compounding Technician',
          district: 'Wakiso',
          cadreRequired: 'Pharmacy Technician',
          employmentType: 'full_time',
          expiresAt: in45Days,
          description: 'Prepare specialized custom formulations, dermatological compounds, and pediatric suspensions. Maintain extreme sterilisation protocols, track chemicals inventories, and assist clinical leaders.',
          interestCount: 1
        },
        {
          id: 'seed_job_abacus_pv',
          organisationUserId: 'seed_org_abacus',
          organisationName: 'Abacus Pharma Uganda',
          title: 'Regional Pharmacovigilance Associate',
          district: 'Kampala',
          cadreRequired: 'Pharmacovigilance Officer',
          employmentType: 'full_time',
          expiresAt: in90Days,
          description: 'Monitor multi-district post-market reports of formulated medications. Coordinate adverse event reports, collaborate with NDA safety boards, and direct safety audits in manufacturing plants.',
          interestCount: 3
        },
        {
          id: 'seed_job_abacus_sales_east',
          organisationUserId: 'seed_org_abacus',
          organisationName: 'Abacus Pharma Uganda',
          title: 'Territory Sales Representative (Eastern Region)',
          district: 'Mbale',
          cadreRequired: 'Medical Sales Representative',
          employmentType: 'full_time',
          expiresAt: in60Days,
          description: 'Actively promote Abacus core generics catalog and critical fluid formulations to healthcare providers, sub-distributors, and retail pharmacies across Mbale, Tororo, and Jinja.',
          interestCount: 5
        },
        {
          id: 'seed_job_clinic_dispenser',
          organisationUserId: 'seed_org_first',
          organisationName: 'First Pharmacy Kampala',
          title: 'Clinic Pharmacy Assistant',
          district: 'Kampala',
          cadreRequired: 'Pharmacy Assistant / Dispenser',
          employmentType: 'part_time',
          expiresAt: in30Days,
          description: 'Operate point-of-sale systems, receive prescription files, audit stock shelf batches for expiry date compliance, and guide clients on drug dosage rules.',
          interestCount: 2
        }
      ];

      for (const j of jobs) {
        await setDoc(doc(db, 'jobPostings', j.id), {
          id: j.id,
          organisationUserId: j.organisationUserId,
          organisationName: j.organisationName,
          title: j.title,
          district: j.district,
          cadreRequired: j.cadreRequired,
          employmentType: j.employmentType,
          description: j.description,
          status: 'active',
          interestCount: j.interestCount,
          expiresAt: j.expiresAt,
          createdAt: now,
          updatedAt: now
        });
      }

      // 4. Seed Business Listings for sale (6 establishments total)
      const businessListings = [
        {
          id: 'seed_biz_retail_kla',
          sellerUserId: 'seed_ind_brenda',
          contactName: 'Brenda Namono',
          contactPhone: '+256772911223',
          listingTitle: 'High-Turnover Community Retail Pharmacy',
          businessType: 'retail_pharmacy',
          askingPriceUGX: 75000000,
          yearsInOperation: 5,
          district: 'Kampala',
          businessDescription: 'Highly lucrative licensed retail community pharmacy situated adjacent to a busy suburban health clinic in Kampala. Stable daily cash flow, fully stocked shelves, and regular loyal customer base. Registered local dispenser already contracted.',
          isConfidential: false,
          status: 'active',
          expiresAt: in90Days,
          photoUrls: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=600&auto=format&fit=crop']
        },
        {
          id: 'seed_biz_drug_jinja',
          sellerUserId: 'seed_ind_moses',
          contactName: 'Moses Atwine',
          contactPhone: '+256772004488',
          listingTitle: 'Licensed Retail Drug Shop near Municipal Market',
          businessType: 'drug_shop',
          askingPriceUGX: 18000000,
          yearsInOperation: 3,
          district: 'Jinja',
          businessDescription: 'Strategic drug shop operation in active trading center with dense foot traffic. Exceptionally low rent overhead. NDA (National Drug Authority) compliant. Ideal turn-key startup project for clinical assistants.',
          isConfidential: false,
          status: 'active',
          expiresAt: in45Days,
          photoUrls: ['https://images.unsplash.com/photo-1628771065518-0d82f1958462?q=80&w=600&auto=format&fit=crop']
        },
        {
          id: 'seed_biz_wholesale_conf',
          sellerUserId: 'seed_ind_sophia',
          contactName: 'Sophia Nalule',
          contactPhone: '+256752884422',
          listingTitle: 'NDA-Licensed Generics Wholesale Importer',
          businessType: 'wholesale_pharmacy',
          askingPriceUGX: 280000000,
          yearsInOperation: 8,
          district: 'Wakiso',
          businessDescription: 'Profitable pharmaceutical distribution and importing company. Deploys operating logistics vans, existing supplier channels in India/EU, active wholesale license, and robust private label pipeline. Strict NDAs required prior to dossier inspection.',
          isConfidential: true,
          status: 'active',
          expiresAt: in120Days,
          photoUrls: []
        },
        {
          id: 'seed_biz_drug_gulu',
          sellerUserId: 'seed_ind_flavia',
          contactName: 'Flavia Atim',
          contactPhone: '+256773123456',
          listingTitle: 'NDA-registered Drug Shop - Layout & License Seated',
          businessType: 'drug_shop',
          askingPriceUGX: 14500000,
          yearsInOperation: 2,
          district: 'Gulu',
          businessDescription: 'Fully running, custom painted, NDA-compliant drug shop. Situated in Gulu Municipality outskirts near standard secondary school boarding houses. Stocked with highly in-demand OTC medications.',
          isConfidential: false,
          status: 'active',
          expiresAt: in45Days,
          photoUrls: ['https://images.unsplash.com/photo-1586015555751-63bb77f4322a?q=80&w=600&auto=format&fit=crop']
        },
        {
          id: 'seed_biz_retail_mbale',
          sellerUserId: 'seed_ind_david',
          contactName: 'David Mukasa',
          contactPhone: '+256781223344',
          listingTitle: 'Prime Location Retail Pharmacy - Busy Mbale Street',
          businessType: 'retail_pharmacy',
          askingPriceUGX: 62000000,
          yearsInOperation: 4,
          district: 'Mbale',
          businessDescription: 'Prestigious community pharmacy layout. Positioned on Mbale standard commercial high street with high constant visitor numbers. Generates robust revenues. High-value lease hold is included.',
          isConfidential: false,
          status: 'active',
          expiresAt: in90Days,
          photoUrls: ['https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=600&auto=format&fit=crop']
        },
        {
          id: 'seed_biz_wholesale_mbarara',
          sellerUserId: 'seed_ind_mark',
          contactName: 'Mark Mugisha',
          contactPhone: '+256782334455',
          listingTitle: 'Western Region Wholesale Drug Distributor Partner',
          businessType: 'wholesale_pharmacy',
          askingPriceUGX: 185000000,
          yearsInOperation: 6,
          district: 'Mbarara',
          businessDescription: 'Established B2B wholesale operation distributing essential drugs and injectables to clinics, hospitals, and pharmacies across western districts. Assets include strong accounts lists and 2 delivery vans.',
          isConfidential: true,
          status: 'active',
          expiresAt: in120Days,
          photoUrls: []
        }
      ];

      for (const bl of businessListings) {
        await setDoc(doc(db, 'businessListings', bl.id), {
          id: bl.id,
          sellerUserId: bl.sellerUserId,
          contactName: bl.contactName,
          contactPhone: bl.contactPhone,
          listingTitle: bl.listingTitle,
          businessType: bl.businessType,
          askingPriceUGX: bl.askingPriceUGX,
          yearsInOperation: bl.yearsInOperation,
          district: bl.district,
          businessDescription: bl.businessDescription,
          isConfidential: bl.isConfidential,
          status: 'active',
          expiresAt: bl.expiresAt,
          createdAt: now,
          updatedAt: now
        });
      }

      setSeedMessage("Successfully seeded 10 professionals, 3 premium organisations, 10 job postings, and 6 active business listings!");
      
      // Force reload UI data
      loadCachedProfiles();
      loadOverviewData();
    } catch (err) {
      console.error("Error seeding platform data:", err);
      setSeedMessage(`Seeding failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSeeding(false);
    }
  };

  // Load profiles once as reference lookup maps so that details can be combined on the fly
  const loadCachedProfiles = async () => {
    try {
      const indSnap = await getDocs(collection(db, 'individualProfiles'));
      const indMap: Record<string, IndividualProfile> = {};
      indSnap.forEach((doc) => {
        indMap[doc.id] = doc.data() as IndividualProfile;
      });
      setIndividualProfilesMap(indMap);

      const orgSnap = await getDocs(collection(db, 'organisationProfiles'));
      const orgMap: Record<string, any> = {};
      orgSnap.forEach((doc) => {
        orgMap[doc.id] = doc.data();
      });
      setOrgProfilesMap(orgMap);
    } catch (err) {
      console.error("Error loading profile details maps:", err);
    }
  };

  const getProfileNameAndDistrict = (userId: string, accountType: 'individual' | 'organisation') => {
    if (accountType === 'individual') {
      const p = individualProfilesMap[userId];
      return {
        name: p?.fullName || 'Individual Member',
        district: p?.district || 'Kampala'
      };
    } else {
      const p = orgProfilesMap[userId];
      const name = p?.organisations?.[0]?.organisationName || 'Organisation Network';
      const dist = p?.organisations?.[0]?.district || 'Kampala';
      return { name, district: dist };
    }
  };

  // --- TAB 1 (Overview) Queries ---
  const loadOverviewData = async () => {
    setLoading(true);
    const pathTrace = 'overview';
    try {
      // Manual snapshot counts parallel loading
      const [uSnap, jSnap, aSnap, bSnap, fSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'jobPostings')),
        getDocs(collection(db, 'availabilityPosts')),
        getDocs(collection(db, 'businessListings')),
        getDocs(collection(db, 'contentFlags'))
      ]);

      let indCount = 0;
      let orgCount = 0;
      uSnap.forEach((doc) => {
        const u = doc.data() as UserAccount;
        if (u.accountType === 'individual') indCount++;
        else if (u.accountType === 'organisation') orgCount++;
      });

      let activeJ = 0;
      jSnap.forEach((doc) => {
        if (doc.data().status === 'active') activeJ++;
      });

      let activeA = 0;
      aSnap.forEach((doc) => {
        if (doc.data().status === 'active') activeA++;
      });

      let activeB = 0;
      bSnap.forEach((doc) => {
        if (doc.data().status === 'active') activeB++;
      });

      let pendingF = 0;
      fSnap.forEach((doc) => {
        if (doc.data().status === 'pending') pendingF++;
      });

      setOverviewStats({
        totalUsers: uSnap.size,
        individualCount: indCount,
        organisationCount: orgCount,
        activeJobs: activeJ,
        activeAvailability: activeA,
        activeBusinesses: activeB,
        pendingFlags: pendingF
      });

      // Recent 10 User Registrations
      const recentQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const recentSnap = await getDocs(recentQuery);
      const recentList: any[] = [];
      recentSnap.forEach((doc) => {
        const u = doc.data();
        const profileDetails = getProfileNameAndDistrict(doc.id, u.accountType);
        recentList.push({
          id: doc.id,
          ...u,
          displayName: profileDetails.name,
          district: profileDetails.district
        });
      });
      setRecentUsers(recentList);

    } catch (err) {
      handleFirestoreError(err, OperationType.GET, pathTrace);
    } finally {
      setLoading(false);
    }
  };

  // --- TAB 2 (Users Table) ---
  const loadUsersPage = async (pageArg: number) => {
    setLoading(true);
    const pathTrace = 'users';
    try {
      const usersRef = collection(db, 'users');
      let q = query(usersRef, orderBy('createdAt', 'desc'), limit(50));
      
      if (pageArg > 1 && usersHistory[pageArg - 2]) {
        q = query(usersRef, orderBy('createdAt', 'desc'), startAfter(usersHistory[pageArg - 2]), limit(50));
      }

      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((doc) => {
        const u = doc.data();
        const profileDetails = getProfileNameAndDistrict(doc.id, u.accountType);
        list.push({
          id: doc.id,
          ...u,
          displayName: profileDetails.name,
          district: profileDetails.district
        });
      });

      setAllUsers(list);
      setUsersPage(pageArg);
      setUsersHasNext(snap.size === 50);

      // Save cursor for next page if it does not exist
      if (snap.size > 0) {
        const lastDoc = snap.docs[snap.docs.length - 1];
        const newHist = [...usersHistory];
        newHist[pageArg - 1] = lastDoc;
        setUsersHistory(newHist);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, pathTrace);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userElement: any) => {
    const nextStatus = !userElement.isActive;
    const pathTrace = `users/${userElement.id}`;
    
    try {
      await updateDoc(doc(db, 'users', userElement.id), {
        isActive: nextStatus,
        updatedAt: Timestamp.now()
      });

      // Update state
      setAllUsers(prev => prev.map(u => u.id === userElement.id ? { ...u, isActive: nextStatus } : u));
      setConfirmDeactivateUser(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathTrace);
    }
  };

  const filteredUsers = allUsers.filter(u => {
    if (!usersSearch) return true;
    const nameMatch = u.displayName?.toLowerCase().includes(usersSearch.toLowerCase());
    const uidMatch = u.id?.toLowerCase().includes(usersSearch.toLowerCase());
    return nameMatch || uidMatch;
  });

  // --- TAB 3 (Content Flags) ---
  const loadFlagsData = async () => {
    setLoading(true);
    const pathTrace = 'contentFlags';
    try {
      const q = query(collection(db, 'contentFlags'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setContentFlags(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, pathTrace);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissFlag = async (flagId: string) => {
    const pathTrace = `contentFlags/${flagId}`;
    try {
      await updateDoc(doc(db, 'contentFlags', flagId), {
        status: 'dismissed',
        reviewedAt: Timestamp.now(),
        reviewedBy: currentUser?.uid || 'admin'
      });
      setContentFlags(prev => prev.map(f => f.id === flagId ? { ...f, status: 'dismissed', reviewedAt: Timestamp.now(), reviewedBy: currentUser?.uid } : f));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathTrace);
    }
  };

  const handleRemoveContent = async (flag: any) => {
    const pathTraceFlag = `contentFlags/${flag.id}`;
    const contentType = flag.contentType;
    const contentId = flag.contentId;
    
    try {
      // Find collection and field name
      let colName = '';
      let targetStatusValue: 'withdrawn' | 'closed' = 'withdrawn';

      if (contentType === 'job_posting' || contentType === 'job_postings') {
        colName = 'jobPostings';
        targetStatusValue = 'closed';
      } else if (contentType === 'availability_post' || contentType === 'availability_posts') {
        colName = 'availabilityPosts';
        targetStatusValue = 'closed';
      } else if (contentType === 'business_listing' || contentType === 'business_listings') {
        colName = 'businessListings';
        targetStatusValue = 'withdrawn';
      }

      if (colName) {
        await updateDoc(doc(db, colName, contentId), {
          status: targetStatusValue
        });
      }

      // Mark content flag as actioned
      await updateDoc(doc(db, 'contentFlags', flag.id), {
        status: 'actioned',
        reviewedAt: Timestamp.now(),
        reviewedBy: currentUser?.uid || 'admin'
      });

      setContentFlags(prev => prev.map(f => f.id === flag.id ? { ...f, status: 'actioned', reviewedAt: Timestamp.now() } : f));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathTraceFlag);
    }
  };

  const handleDeactivateContentUser = async (flag: any) => {
    const pathTraceFlag = `contentFlags/${flag.id}`;
    const userId = flag.contentOwnerId;
    
    try {
      // Deactivate User
      await updateDoc(doc(db, 'users', userId), {
        isActive: false,
        updatedAt: Timestamp.now()
      });

      // Mark content flag as actioned
      await updateDoc(doc(db, 'contentFlags', flag.id), {
        status: 'actioned',
        reviewedAt: Timestamp.now(),
        reviewedBy: currentUser?.uid || 'admin'
      });

      setContentFlags(prev => prev.map(f => f.id === flag.id ? { ...f, status: 'actioned', reviewedAt: Timestamp.now() } : f));
      // Reload lookup profiles reference
      loadCachedProfiles();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathTraceFlag);
    }
  };

  const filteredFlags = contentFlags.filter(f => {
    if (flagFilter === 'all') return true;
    return f.status === flagFilter;
  });

  // --- TAB 4 (Postings Lists) ---
  const loadPostingsPage = async (pageArg: number) => {
    setLoading(true);
    let colName = 'jobPostings';
    if (postingsSubTab === 'availability') colName = 'availabilityPosts';
    if (postingsSubTab === 'businesses') colName = 'businessListings';

    const pathTrace = colName;
    try {
      let q = query(collection(db, colName), orderBy('createdAt', 'desc'), limit(50));
      
      // If we filtered by status
      if (postingsStatusFilter !== 'all') {
        q = query(
          collection(db, colName), 
          where('status', '==', postingsStatusFilter),
          orderBy('createdAt', 'desc'), 
          limit(50)
        );
      }

      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        let posterName = 'Network Member';
        if (postingsSubTab === 'jobs') {
          posterName = data.organisationName || getProfileNameAndDistrict(data.organisationUserId, 'organisation').name;
        } else if (postingsSubTab === 'availability') {
          posterName = data.fullName || getProfileNameAndDistrict(data.individualUserId, 'individual').name;
        } else if (postingsSubTab === 'businesses') {
          posterName = data.contactName || getProfileNameAndDistrict(data.sellerUserId, 'individual').name;
        }

        list.push({ 
          id: doc.id, 
          ...data,
          posterName 
        });
      });

      setPostingsList(list);
      setPostingsPage(pageArg);
      setPostingsHasNext(snap.size === 50);

      if (snap.size > 0) {
        const lastDoc = snap.docs[snap.docs.length - 1];
        const newHist = [...postingsHistory];
        newHist[pageArg - 1] = lastDoc;
        setPostingsHistory(newHist);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, pathTrace);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawPosting = async (postingElement: any) => {
    let colName = 'jobPostings';
    let targetVal: 'closed' | 'withdrawn' = 'closed';
    if (postingsSubTab === 'availability') {
      colName = 'availabilityPosts';
      targetVal = 'closed';
    } else if (postingsSubTab === 'businesses') {
      colName = 'businessListings';
      targetVal = 'withdrawn';
    }

    const pathTrace = `${colName}/${postingElement.id}`;
    try {
      await updateDoc(doc(db, colName, postingElement.id), {
        status: targetVal
      });

      setPostingsList(prev => prev.map(p => p.id === postingElement.id ? { ...p, status: targetVal } : p));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathTrace);
    }
  };

  // --- TAB 5 (Platform Settings) ---
  const loadSettingsData = async () => {
    setLoading(true);
    const pathStats = 'platformStats/counts';
    const pathConfig = 'platformConfig/settings';
    try {
      // 1. Fetch current platformStats overrides
      const statsDocSnap = await getDoc(doc(db, 'platformStats', 'counts'));
      if (statsDocSnap.exists()) {
        setManualStats(statsDocSnap.data() as PlatformStats);
      }

      // 2. Fetch maintenanceMode flag status
      const configDocSnap = await getDoc(doc(db, 'platformConfig', 'settings'));
      if (configDocSnap.exists()) {
        setMaintenanceMode(!!configDocSnap.data().maintenanceMode);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, pathStats);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccessMessage(null);
    try {
      // Save stats override
      await setDoc(doc(db, 'platformStats', 'counts'), {
        registeredPharmacists: Number(manualStats.registeredPharmacists || 0),
        pharmacyOwners: Number(manualStats.pharmacyOwners || 0),
        auxiliaryProfessionals: Number(manualStats.auxiliaryProfessionals || 0),
        manufacturersDistributors: Number(manualStats.manufacturersDistributors || 0),
        activeOpportunities: Number(manualStats.activeOpportunities || 0)
      }, { merge: true });

      // Save maintenanceMode
      await setDoc(doc(db, 'platformConfig', 'settings'), {
        maintenanceMode: Boolean(maintenanceMode)
      }, { merge: true });

      setSaveSuccessMessage("Platform statistics overrides and configurations deployed successfully.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'platformConfig/settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No Date';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('en-UG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[calc(100vh-90px)]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-zinc-150">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-zinc-900 text-white rounded-2xl shadow-md">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-950 tracking-tight leading-tight">Platform Owner Console</h1>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1 font-semibold font-sans">
              Peter's Administrator Workspace — PharmaNetwork Uganda
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {maintenanceMode && (
            <span className="bg-yellow-500/10 text-yellow-600 px-3.5 py-1.5 rounded-full text-[10px] font-black border border-yellow-250 animate-pulse uppercase tracking-wider">
              Maintenance Active
            </span>
          )}
          <span className="text-[10px] font-extrabold text-zinc-500 bg-zinc-100 rounded-full px-3.5 py-1.5 uppercase tracking-wide">
            Secure Auth Claim Loaded
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Navigation Tabs - Left Sidebar (Desktop) or Top scroll (Mobile) */}
        <div className="w-full lg:w-64 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible bg-white p-2 border border-zinc-150 rounded-3xl shrink-0 gap-1.5 shadow-md">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all text-left whitespace-nowrap cursor-pointer select-none",
              activeTab === 'overview' 
                ? "bg-zinc-900 text-white shadow-md scale-[1.02]" 
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Activity size={16} />
            Overview
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all text-left whitespace-nowrap cursor-pointer select-none",
              activeTab === 'users' 
                ? "bg-zinc-900 text-white shadow-md scale-[1.02]" 
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Users size={16} />
            Users & Profiles
          </button>

          <button
            onClick={() => setActiveTab('flags')}
            className={cn(
              "px-4 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all text-left whitespace-nowrap cursor-pointer select-none",
              activeTab === 'flags' 
                ? "bg-zinc-900 text-white shadow-md scale-[1.02]" 
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Flag size={16} />
            Content Flags
            {overviewStats.pendingFlags > 0 && (
              <span className="bg-red-500 text-white text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center font-black animate-pulse ml-auto">
                {overviewStats.pendingFlags}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('postings')}
            className={cn(
              "px-4 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all text-left whitespace-nowrap cursor-pointer select-none",
              activeTab === 'postings' 
                ? "bg-zinc-900 text-white shadow-md scale-[1.02]" 
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <FileText size={16} />
            Postings Manager
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all text-left whitespace-nowrap cursor-pointer select-none",
              activeTab === 'settings' 
                ? "bg-zinc-900 text-white shadow-md scale-[1.02]" 
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Settings size={16} />
            Platform Config
          </button>
        </div>

        {/* Dynamic Inner Tab View */}
        <div className="flex-grow w-full min-h-[500px]">
          {loading && (
            <div className="flex flex-col items-center justify-center p-14 bg-white/70 backdrop-blur-md rounded-3xl border border-zinc-100 shadow-md">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
              <p className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Syncing database operations...</p>
            </div>
          )}

          {!loading && activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-zinc-150 p-6 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block">Total Registered</span>
                    <Users size={16} className="text-zinc-400" />
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 leading-none">{overviewStats.totalUsers}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 mt-2">Collective database document objects</p>
                </div>

                <div className="bg-white border border-zinc-150 p-6 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block">Professionals</span>
                    <User size={16} className="text-primary" />
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 leading-none">{overviewStats.individualCount}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 mt-2">Individual accounts signed up</p>
                </div>

                <div className="bg-white border border-zinc-150 p-6 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block">Organisations</span>
                    <Building size={16} className="text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 leading-none">{overviewStats.organisationCount}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 mt-2">Corporate business owners listed</p>
                </div>

                <div className="bg-white border border-zinc-150 p-6 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block">Active Jobs</span>
                    <Briefcase size={16} className="text-orange-500" />
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 leading-none">{overviewStats.activeJobs}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 mt-2">Currently open opportunities available</p>
                </div>

                <div className="bg-white border border-zinc-150 p-6 rounded-3xl shadow-sm">
                  <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block">Active Availability</span>
                  <h2 className="text-3xl font-black text-zinc-900 leading-none mt-2">{overviewStats.activeAvailability}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 mt-2">Pharmacists seeking work</p>
                </div>

                <div className="bg-white border border-zinc-150 p-6 rounded-3xl shadow-sm">
                  <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block">Businesses for Sale</span>
                  <h2 className="text-3xl font-black text-zinc-900 leading-none mt-2">{overviewStats.activeBusinesses}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 mt-2">Commercial business listings</p>
                </div>

                <div className={`border p-6 rounded-3xl shadow-sm transition-colors ${overviewStats.pendingFlags > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-white border-zinc-150'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest block">Content Flags</span>
                    <Flag size={16} className={overviewStats.pendingFlags > 0 ? 'text-red-500' : 'text-zinc-400'} />
                  </div>
                  <h2 className="text-3xl font-black leading-none">{overviewStats.pendingFlags}</h2>
                  <p className="text-[10px] font-bold mt-2">Pending administrative inspection</p>
                </div>
              </div>

              {/* Recent Registers Feed */}
              <div className="bg-white rounded-3xl border border-zinc-150 p-6 shadow-md">
                <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider mb-4">Recent User Registrations</h3>
                <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-100">
                  {recentUsers.length === 0 ? (
                    <p className="p-6 text-center text-zinc-400 font-semibold text-xs py-8">No recent accounts created.</p>
                  ) : (
                    recentUsers.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white hover:bg-zinc-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-700 text-xs uppercase font-sans">
                            {item.accountType === 'individual' ? <User size={14} className="text-primary" /> : <Building size={14} className="text-emerald-500" />}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-950 text-sm">{item.displayName}</span>
                            <span className="text-[10px] text-zinc-400 mt-0.5 font-bold block">
                              UUID: {item.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2 sm:mt-0">
                          <span className="text-xs bg-zinc-100 px-3 py-1 rounded-full text-zinc-600 font-bold uppercase">
                            {item.accountType}
                          </span>
                          <span className="text-xs font-semibold text-zinc-400">
                            {item.district}
                          </span>
                          <span className="text-xs font-semibold text-zinc-400 whitespace-nowrap">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'users' && (
            <div className="bg-white rounded-3xl border border-zinc-150 p-6 shadow-md space-y-6">
              {/* Header search filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Registered User Accounts</h3>
                  <p className="text-[10px] text-zinc-400 font-bold mt-1">Client-side lookup searches verified cache map</p>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    placeholder="Search member name/ID..."
                    className="pl-10 pr-4 py-2 border border-zinc-200 rounded-2xl text-xs font-semibold w-full sm:w-64 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Table User list */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                      <th className="p-4">Name / ID</th>
                      <th className="p-4">Account Type</th>
                      <th className="p-4">District</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4">Active Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-700">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-zinc-400">
                          No users matching search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((elem) => (
                        <tr key={elem.id} className="hover:bg-zinc-50/40">
                          <td className="p-4">
                            <span className="font-extrabold text-zinc-950 block">{elem.displayName}</span>
                            <span className="text-[10px] font-bold text-zinc-400 block mt-0.5 tracking-tight font-sans">
                              {elem.id}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="uppercase text-[9px] bg-zinc-100 text-zinc-600 font-extrabold px-2.5 py-1 rounded-full inline-block">
                              {elem.accountType}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-zinc-500">{elem.district}</td>
                          <td className="p-4 font-semibold text-zinc-500">{formatDate(elem.createdAt)}</td>
                          <td className="p-4">
                            {elem.isActive ? (
                              <span className="text-green-500 flex items-center gap-1.5">
                                <Check size={16} />
                                Active
                              </span>
                            ) : (
                              <span className="text-red-500 flex items-center gap-1.5">
                                <X size={16} />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link 
                                to={elem.accountType === 'individual' ? `/professionals/${elem.id}` : `/organisations/${elem.id}`}
                                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wide inline-flex items-center gap-1"
                              >
                                <Eye size={12} />
                                View Profile
                              </Link>
                              
                              {elem.isActive ? (
                                <button
                                  onClick={() => setConfirmDeactivateUser(elem)}
                                  className="bg-red-50 hover:bg-red-100 text-red-650 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wide cursor-pointer"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserStatus(elem)}
                                  className="bg-green-50 hover:bg-green-100 text-green-650 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wide cursor-pointer"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Simple pagination */}
              <div className="flex items-center justify-between border-t border-zinc-150 pt-5">
                <span className="text-xs text-zinc-500 font-semibold">
                  Page {usersPage}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={usersPage === 1}
                    onClick={() => loadUsersPage(usersPage - 1)}
                    className="font-bold text-xs"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!usersHasNext}
                    onClick={() => loadUsersPage(usersPage + 1)}
                    className="font-bold text-xs"
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'flags' && (
            <div className="space-y-6 animate-fade-in">
              {/* Filter Row */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-4 border border-zinc-150 rounded-2xl shadow-sm gap-3">
                <span className="text-xs font-black text-zinc-900 uppercase tracking-widest pl-1">
                  Filtration Filter
                </span>
                <div className="flex flex-wrap gap-1 bg-zinc-100 p-1 rounded-2xl">
                  {(['all', 'pending', 'reviewed', 'dismissed', 'actioned'] as const).map((filterVal) => (
                    <button
                      key={filterVal}
                      onClick={() => setFlagFilter(filterVal)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl font-extrabold text-[10px] uppercase tracking-wider select-none cursor-pointer",
                        flagFilter === filterVal ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                      )}
                    >
                      {filterVal}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flag List rendering */}
              <div className="space-y-4">
                {filteredFlags.length === 0 ? (
                  <div className="bg-white rounded-3xl p-14 border border-zinc-150 text-center text-zinc-400">
                    <Flag size={32} className="mx-auto mb-3 text-zinc-350" />
                    <p className="font-black text-xs uppercase tracking-widest">{flagFilter} content flags is empty</p>
                  </div>
                ) : (
                  filteredFlags.map((flag) => {
                    let pathDestination = '#';
                    if (flag.contentType === 'job_posting' || flag.contentType === 'job_postings') {
                      pathDestination = `/jobs/${flag.contentId}`;
                    } else if (flag.contentType === 'availability_post' || flag.contentType === 'availability_posts') {
                      pathDestination = `/availability/${flag.contentId}`;
                    } else if (flag.contentType === 'business_listing' || flag.contentType === 'business_listings') {
                      pathDestination = `/marketplace/businesses/${flag.contentId}`;
                    } else if (flag.contentType === 'profile') {
                      pathDestination = `/professionals/${flag.contentId}`;
                    }

                    return (
                      <div key={flag.id} className="bg-white rounded-3xl border border-zinc-150 shadow-md p-6 flex flex-col md:flex-row gap-6 justify-between items-start">
                        <div className="space-y-3.5 min-w-0 flex-grow">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-orange-50 text-orange-700 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-orange-100">
                              {flag.contentType?.replace(/_/g, ' ')}
                            </span>
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2.5 py-1 rounded-full",
                              flag.status === 'pending' ? "bg-red-50 text-red-700 border border-red-100" :
                              flag.status === 'dismissed' ? "bg-zinc-100 text-zinc-650" : "bg-green-50 text-green-700"
                            )}>
                              {flag.status}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold ml-auto sm:ml-0">
                              {formatDate(flag.createdAt)}
                            </span>
                          </div>

                          <div className="text-sm">
                            <p className="font-black text-zinc-950">
                              Logged Reason: <span className="text-red-650 font-bold uppercase">{flag.reason}</span>
                            </p>
                            {flag.details && (
                              <p className="text-zinc-500 font-medium text-xs mt-1 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                {flag.details}
                              </p>
                            )}
                          </div>

                          <div className="text-[10px] font-bold text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
                            <span>Reporter Token: <strong className="font-mono text-zinc-700">{flag.reporterUserId?.slice(0, 10)}...</strong></span>
                            <span>Target Owner Reference: <strong className="font-mono text-zinc-700">{flag.contentOwnerId?.slice(0, 10)}...</strong></span>
                            <span>Content Object ID: <strong className="font-mono text-zinc-700">{flag.contentId?.slice(0, 10)}...</strong></span>
                          </div>
                        </div>

                        {/* Actions for Flags */}
                        <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto self-stretch justify-end border-t border-zinc-100 pt-4 md:border-t-0 md:pt-0">
                          <a 
                            href={pathDestination}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-black px-3.5 py-2 rounded-xl uppercase tracking-wider inline-flex items-center justify-center gap-1.5 grow sm:grow-0"
                          >
                            <Eye size={12} />
                            View Content
                          </a>

                          {flag.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleDismissFlag(flag.id)}
                                className="bg-zinc-900 hover:bg-zinc-850 text-white text-[10px] font-black px-3.5 py-2 rounded-xl uppercase tracking-wider cursor-pointer selection:none text-center grow sm:grow-0"
                              >
                                Dismiss Flag
                              </button>
                              <button
                                onClick={() => handleRemoveContent(flag)}
                                className="bg-red-50 hover:bg-red-100 text-red-650 text-[10px] font-black px-3.5 py-2 rounded-xl uppercase tracking-wider cursor-pointer text-center grow sm:grow-0"
                              >
                                Take Action / Remove Content
                              </button>
                              <button
                                onClick={() => handleDeactivateContentUser(flag)}
                                className="bg-zinc-950 border border-red-200 hover:bg-red-50 text-red-650 text-[10px] font-black px-3.5 py-2 rounded-xl uppercase tracking-wider cursor-pointer text-center grow sm:grow-0"
                              >
                                Deactivate Author Profile
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {!loading && activeTab === 'postings' && (
            <div className="bg-white rounded-3xl border border-zinc-150 p-6 shadow-md space-y-6">
              {/* Top Sub navigation / dropdown */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-100 pb-5 gap-4">
                <div className="flex bg-zinc-100 p-1 rounded-2xl shrink-0 gap-1 self-start">
                  <button
                    onClick={() => { setPostingsSubTab('jobs'); setPostingsPage(1); }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider select-none cursor-pointer",
                      postingsSubTab === 'jobs' ? "bg-white text-zinc-900 shadow-md" : "text-zinc-500 hover:text-zinc-800"
                    )}
                  >
                    Job Postings
                  </button>
                  <button
                    onClick={() => { setPostingsSubTab('availability'); setPostingsPage(1); }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider select-none cursor-pointer",
                      postingsSubTab === 'availability' ? "bg-white text-zinc-900 shadow-md" : "text-zinc-500 hover:text-zinc-800"
                    )}
                  >
                    Availabilities
                  </button>
                  <button
                    onClick={() => { setPostingsSubTab('businesses'); setPostingsPage(1); }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider select-none cursor-pointer",
                      postingsSubTab === 'businesses' ? "bg-white text-zinc-900 shadow-md" : "text-zinc-500 hover:text-zinc-800"
                    )}
                  >
                    Business Listings
                  </button>
                </div>

                {/* Status Dropdowns */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Status filter:</label>
                  <select
                    value={postingsStatusFilter}
                    onChange={(e) => { setPostingsStatusFilter(e.target.value); setPostingsPage(1); }}
                    className="border border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary-light"
                  >
                    <option value="all">All listings</option>
                    <option value="active">Active Only</option>
                    <option value="closed">Closed Only</option>
                    <option value="withdrawn">Withdrawn Only</option>
                    {postingsSubTab === 'businesses' && (
                      <>
                        <option value="sold">Sold</option>
                        <option value="under_offer">Under Offer</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Post Table listings */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                      <th className="p-4">Listing Title / Headline</th>
                      <th className="p-4">Author Profile</th>
                      <th className="p-4">District</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Dates</th>
                      <th className="p-4 text-center">Inquiries</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-750">
                    {postingsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-zinc-400">
                          No active listings logged under this category.
                        </td>
                      </tr>
                    ) : (
                      postingsList.map((post) => {
                        let viewLink = '#';
                        if (postingsSubTab === 'jobs') viewLink = `/jobs/${post.id}`;
                        if (postingsSubTab === 'availability') viewLink = `/availability/${post.id}`;
                        if (postingsSubTab === 'businesses') viewLink = `/marketplace/businesses/${post.id}`;

                        const countMetric = postingsSubTab === 'businesses' ? (post.viewCount || 0) : (post.interestCount || 0);

                        return (
                          <tr key={post.id} className="hover:bg-zinc-50/40">
                            <td className="p-4 min-w-[200px]">
                              <span className="font-extrabold text-zinc-950 block leading-snug">
                                {postingsSubTab === 'jobs' ? post.title : (post.headline || post.listingTitle || 'No Title')}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-sans block mt-0.5 max-w-[180px] truncate">
                                ID: {post.id}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-zinc-900 block font-bold">{post.posterName}</span>
                            </td>
                            <td className="p-4 text-zinc-500">{post.district || 'Kampala'}</td>
                            <td className="p-4">
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2.5 py-1 rounded-full",
                                post.status === 'active' ? "bg-green-50 text-green-700" :
                                post.status === 'sold' ? "bg-blue-50 text-blue-700" : "bg-zinc-100 text-zinc-650"
                              )}>
                                {post.status}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-400 whitespace-nowrap leading-relaxed font-sans text-[10px]">
                              <div>Published: <strong className="text-zinc-600">{formatDate(post.createdAt)}</strong></div>
                              {post.expiresAt && (
                                <div>Expires: <strong className="text-zinc-600">{formatDate(post.expiresAt)}</strong></div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <span className="bg-zinc-100 text-zinc-800 font-extrabold px-3 py-1 rounded-full text-[10px]">
                                {countMetric} {postingsSubTab === 'businesses' ? 'views' : 'express limits'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <a
                                  href={viewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-zinc-100 hover:bg-zinc-250 text-zinc-800 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide inline-flex items-center gap-1 w-full justify-center"
                                >
                                  <Eye size={12} />
                                  View
                                </a>

                                {post.status !== 'closed' && post.status !== 'withdrawn' && (
                                  <button
                                    onClick={() => handleWithdrawPosting(post)}
                                    className="bg-red-50 hover:bg-red-100 text-red-650 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer w-full text-center"
                                  >
                                    Withdraw
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between border-t border-zinc-100 pt-5">
                <span className="text-xs text-zinc-500 font-semibold">
                  Page {postingsPage}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={postingsPage === 1}
                    onClick={() => loadPostingsPage(postingsPage - 1)}
                    className="font-bold text-xs"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!postingsHasNext}
                    onClick={() => loadPostingsPage(postingsPage + 1)}
                    className="font-bold text-xs"
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'settings' && (
            <div className="bg-white rounded-3xl border border-zinc-150 p-8 shadow-md space-y-8 animate-fade-in">
              <form onSubmit={handleSavePlatformSettings} className="space-y-8">
                {/* Platform Stats Manual Override Section */}
                <div>
                  <h3 className="text-base font-black text-zinc-950 uppercase tracking-wide">Platform Stats Override</h3>
                  <p className="text-xs text-zinc-400 mt-1 font-semibold leading-relaxed">
                    Set explicit numeric counts to bypass automatic index updates if stats drift or need manual synchronization.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Registered Pharmacists</label>
                      <input
                        type="number"
                        min="0"
                        value={manualStats.registeredPharmacists || 0}
                        onChange={(e) => setManualStats({ ...manualStats, registeredPharmacists: Number(e.target.value) })}
                        className="w-full border border-zinc-350 rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:border-primary-light"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Pharmacy Owners</label>
                      <input
                        type="number"
                        min="0"
                        value={manualStats.pharmacyOwners || 0}
                        onChange={(e) => setManualStats({ ...manualStats, pharmacyOwners: Number(e.target.value) })}
                        className="w-full border border-zinc-350 rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:border-primary-light"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Auxiliary Professionals</label>
                      <input
                        type="number"
                        min="0"
                        value={manualStats.auxiliaryProfessionals || 0}
                        onChange={(e) => setManualStats({ ...manualStats, auxiliaryProfessionals: Number(e.target.value) })}
                        className="w-full border border-zinc-350 rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:border-primary-light"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Manufacturers & Distributors</label>
                      <input
                        type="number"
                        min="0"
                        value={manualStats.manufacturersDistributors || 0}
                        onChange={(e) => setManualStats({ ...manualStats, manufacturersDistributors: Number(e.target.value) })}
                        className="w-full border border-zinc-350 rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:border-primary-light"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Active Opportunities</label>
                      <input
                        type="number"
                        min="0"
                        value={manualStats.activeOpportunities || 0}
                        onChange={(e) => setManualStats({ ...manualStats, activeOpportunities: Number(e.target.value) })}
                        className="w-full border border-zinc-350 rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:border-primary-light"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-zinc-400 mt-4 font-sans italic bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    * Automatic stat updates occur when users register or post. Use manual override only if counts become inaccurate.
                  </p>
                </div>

                {/* Maintenance Mode Section */}
                <div className="border-t border-zinc-150 pt-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 w-2/3">
                      <h3 className="text-base font-black text-zinc-950 uppercase tracking-wide">Maintenance Protocol</h3>
                      <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
                        When active, non-administrator accounts see a top notification banner alerting them to platform adjustments. Features remain operational but warn of intermittent changes.
                      </p>
                    </div>

                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setMaintenanceMode(!maintenanceMode)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none",
                          maintenanceMode ? "bg-red-500" : "bg-zinc-250"
                        )}
                      >
                        <span className="sr-only">Enable Maintenance Mode</span>
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-250 ease-in-out",
                            maintenanceMode ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ecosystem Demo Data Setup Card */}
                <div className="border-t border-zinc-150 pt-8 space-y-4">
                  <div>
                    <h3 className="text-base font-black text-zinc-950 uppercase tracking-wide">Ecosystem Sandbox Seeder</h3>
                    <p className="text-xs text-zinc-400 mt-1 font-semibold leading-relaxed">
                      Seed high-fidelity Ugandan pharmaceutical demo data into your Firebase Firestore sandbox environment to instantly test searching, browsing, messaging, and detail views.
                    </p>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-3.5">
                    <p className="text-[11px] font-black uppercase text-zinc-500 tracking-wider">Seeding Plan (29 Total Entities):</p>
                    <ul className="text-xs text-zinc-600 font-semibold space-y-1.5 list-disc pl-5">
                      <li><strong>10 Healthcare Professionals</strong>: Registered Pharmacists, Pharmacy Technicians, Pharmacy Assistants/Dispensers, Pharmacovigilance Officers, and Procurement Officers across Kampala, Mbarara, Gulu, Wakiso, Jinja, Mbale, Tororo, Masaka.</li>
                      <li><strong>3 Premium Pharmaceutical Organizations</strong>: Joint Medical Store (JMS), First Pharmacy Kampala, Abacus Pharma Uganda.</li>
                      <li><strong>10 Active Opportunities (Jobs Matching Cadres)</strong>: Senior Procurement, Compounding Tech, PV Associate, Sales Rep, Hospital Pharmacist, Counter Assistant, etc.</li>
                      <li><strong>6 Real-Estate & Business Listings</strong>: Pharmacies, Drug Shops, and Wholesale operations for sale across Kampala, Jinja, Wakiso, Gulu, Mbale, Mbarara.</li>
                    </ul>

                    {seedMessage && (
                      <p className={cn(
                        "text-xs font-extrabold p-3 rounded-xl border mt-2",
                        seedMessage.includes("failed") 
                          ? "bg-red-50 text-red-650 border-red-150" 
                          : "bg-emerald-50 text-emerald-750 border-emerald-150"
                      )}>
                        {seedMessage}
                      </p>
                    )}

                    <div>
                      <button
                        type="button"
                        disabled={seeding}
                        onClick={handleSeedDemoData}
                        className={cn(
                          "px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 text-white transition-all cursor-pointer shadow-sm select-none",
                          seeding ? "bg-zinc-400" : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                        )}
                      >
                        {seeding ? (
                          <>
                            <RefreshCw className="animate-spin" size={14} />
                            Seeding Firebase database...
                          </>
                        ) : (
                          <>
                            <Activity size={14} />
                            Deploy All 16 Uganda Seed Records
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Feedback and Save Trigger */}
                <div className="border-t border-zinc-150 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  {saveSuccessMessage && (
                    <p className="text-xs text-green-650 font-extrabold flex items-center gap-1 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <Check size={16} />
                      {saveSuccessMessage}
                    </p>
                  )}
                  <div className="sm:ml-auto">
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 px-6 py-3 shrink-0"
                    >
                      {savingSettings ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Controls
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for user deactivation / reactivation */}
      {confirmDeactivateUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-zinc-150 p-8 max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 tracking-tight">Deactivate this account?</h3>
            <p className="text-zinc-500 text-xs mt-2 font-medium leading-relaxed">
              The user with name "{confirmDeactivateUser.displayName}" will be signed out and cannot log in until reactivated. Are you absolutely sure?
            </p>
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setConfirmDeactivateUser(null)}
                className="flex-grow bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-black py-3 rounded-2xl uppercase tracking-wider transition-all cursor-pointer select-none"
              >
                No, cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleUserStatus(confirmDeactivateUser)}
                className="flex-grow bg-red-600 hover:bg-red-750 text-white text-xs font-black py-3 rounded-2xl uppercase tracking-wider transition-all cursor-pointer select-none"
              >
                Yes, deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
