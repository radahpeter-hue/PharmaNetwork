import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  UserCheck, 
  Users, 
  FileCheck, 
  FileText, 
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Settings,
  Mail,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IndividualProfile } from '../types';

interface RegulatoryAdmin {
  uid: string;
  fullName: string;
  email: string;
  body: 'PSU' | 'AHPC' | 'UNMC';
  bodyFullName: string;
  scopedCadres: string[];
  role: string;
  isActive: boolean;
  notes?: string;
  addedAt?: any;
  lastLoginAt?: any;
}

interface VerificationDoc {
  userId: string;
  registrationCertificateUrl: string;
  practisingCertificateUrl: string;
  additionalDocumentUrls?: string[];
  submittedAt: any;
  submittedForYear: number;
  reviewedAt?: any;
  reviewedByUid?: string;
  reviewedByBody?: string;
  reviewNotes?: string;
}

export const BodyAdminConsole: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [adminProfile, setAdminProfile] = useState<RegulatoryAdmin | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'licence' | 'directory' | 'team'>('queue');

  // Core Data State
  const [profiles, setProfiles] = useState<any[]>([]);
  const [verificationDocs, setVerificationDocs] = useState<{ [uid: string]: VerificationDoc }>({});
  const [adminsList, setAdminsList] = useState<RegulatoryAdmin[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Search & Filter state for Licence & Directory
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  // Verification review modal / flow
  const [activeReviewProfile, setActiveReviewProfile] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [requestInfoNotes, setRequestInfoNotes] = useState('');
  const [showRequestInfoForm, setShowRequestInfoForm] = useState(false);

  const [savingAction, setSavingAction] = useState(false);

  // Single Licence Update Modal
  const [activeUpdateLicenceProfile, setActiveUpdateLicenceProfile] = useState<any | null>(null);
  const [editLicenceStatus, setEditLicenceStatus] = useState<'not_renewed' | 'renewed_current' | 'suspended' | 'lapsed'>('renewed_current');
  const [editLicenceYear, setEditLicenceYear] = useState<number>(new Date().getFullYear());
  const [editRenewalDate, setEditRenewalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editExpiryDate, setEditExpiryDate] = useState<string>(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  );
  const [editSuspensionReason, setEditSuspensionReason] = useState('');

  // Bulk update states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>('not_renewed');
  const [bulkConfirmChecked, setBulkConfirmChecked] = useState(false);

  // Seeding Lab States (Part 12 Verification Controls)
  const [seedingStatus, setSeedingStatus] = useState<string | null>(null);
  const [seedingLoading, setSeedingLoading] = useState(false);

  const handleSeedProfessionals = async () => {
    setSeedingLoading(true);
    setSeedingStatus("Seeding professionals list to individualProfiles collection...");
    try {
      const batch = writeBatch(db);
      
      const pros = [
        {
          id: "sarah_namukasa_id",
          fullName: "Sarah Namukasa",
          phone: "+256 772 123456",
          district: "Kampala",
          primaryCadre: "pharmacist",
          registrationNumber: "PSU/PH-7729",
          qualification: "Bachelor of Pharmacy (Makerere University)",
          qualificationYear: 2021,
          yearsExperience: "2",
          availabilityStatus: "actively_seeking",
          preferredEmploymentTypes: ["full_time", "locum"],
          areasOfPractice: ["Retail Pharmacy", "Hospital Pharmacy"],
          roles: ["Supervising Pharmacist", "Quality Assurance"],
          bio: "Dedicated pharmacist with a keen interest in sterile manufacturing and regulatory compliance in Uganda.",
          profileCompleteness: 90,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          credentialVerificationStatus: "pending_review",
          practisingLicenceStatus: "not_renewed",
          practisingLicenceYear: 2025
        },
        {
          id: "john_okello_id",
          fullName: "John Okello",
          phone: "+255 788 444333",
          district: "Gulu",
          primaryCadre: "pharmacy_technician",
          registrationNumber: "AHPC/PT-1992",
          qualification: "Diploma in Pharmacy (Gulu University)",
          qualificationYear: 2018,
          yearsExperience: "5",
          availabilityStatus: "open_to_offers",
          preferredEmploymentTypes: ["full_time"],
          areasOfPractice: ["Hospital Pharmacy", "Inventory Management"],
          roles: ["Dispenser", "Store Manager"],
          bio: "Experienced pharmacy technician focused on outpatient clinical dispensing and inventory tracking.",
          profileCompleteness: 100,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          credentialVerificationStatus: "verified",
          credentialVerifiedByBody: "Allied Health Professionals Council",
          credentialVerifiedAt: Timestamp.now(),
          practisingLicenceStatus: "renewed_current",
          practisingLicenceYear: 2026
        },
        {
          id: "esther_birungi_id",
          fullName: "Esther Birungi",
          phone: "+256 712 998811",
          district: "Mbarara",
          primaryCadre: "dispenser",
          registrationNumber: "D-3382",
          qualification: "Certificate in Dispensing (Mbarara University)",
          qualificationYear: 2019,
          yearsExperience: "4",
          availabilityStatus: "not_available",
          preferredEmploymentTypes: ["part_time"],
          areasOfPractice: ["Retail Pharmacy"],
          roles: ["Dispenser"],
          bio: "Passionate dispenser seeking opportunities in retail distribution networks.",
          profileCompleteness: 80,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          credentialVerificationStatus: "rejected",
          credentialRejectionReason: "Practising certificate scan is blurred and illegible. Please re-upload high resolution document.",
          practisingLicenceStatus: "not_renewed",
          practisingLicenceYear: 2025
        },
        {
          id: "david_musisi_id",
          fullName: "David Musisi",
          phone: "+256 755 221100",
          district: "Entebbe",
          primaryCadre: "pharmacist",
          registrationNumber: "PSU/PH-8812",
          qualification: "Bachelor of Pharmacy (Mbarara University)",
          qualificationYear: 2024,
          yearsExperience: "1",
          availabilityStatus: "actively_seeking",
          preferredEmploymentTypes: ["locum", "contract"],
          areasOfPractice: ["Clinical Pharmacy"],
          roles: ["Intern Pharmacist"],
          bio: "Fresh pharmacy graduate ready to join hospital practice.",
          profileCompleteness: 70,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          credentialVerificationStatus: "unverified",
          practisingLicenceStatus: "not_renewed"
        }
      ];

      for (const pro of pros) {
        batch.set(doc(db, 'individualProfiles', pro.id), pro);
        batch.set(doc(db, 'users', pro.id), {
          id: pro.id,
          accountType: 'individual',
          isActive: true,
          isVerified: pro.credentialVerificationStatus === 'verified'
        });
      }

      // Add a verificationDocument record for Sarah Namukasa so she appears in the review queue
      batch.set(doc(db, 'verificationDocuments', 'sarah_namukasa_id'), {
        userId: "sarah_namukasa_id",
        registrationCertificateUrl: "https://images.unsplash.com/photo-1586075010923-2dd45e9b2d4f?w=600",
        practisingCertificateUrl: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600",
        submittedAt: Timestamp.now(),
        submittedForYear: 2026
      });

      await batch.commit();
      setSeedingStatus("Success! Fully loaded 4 professionals (including Sarah Namukasa) into individualProfiles.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setSeedingStatus(`Error seeding professionals: ${err.message}`);
    } finally {
      setSeedingLoading(false);
    }
  };

  const handleSeedJobs = async () => {
    setSeedingLoading(true);
    setSeedingStatus("Seeding live active pharmaceutical jobs...");
    try {
      const batch = writeBatch(db);
      const jobsList = [
        {
          id: "job_demo_1",
          title: "Supervising Pharmacist",
          cadreRequired: "pharmacist",
          district: "Kampala",
          employmentType: "full_time",
          description: "Responsible for managing standard daily retail compliance, stock reviews, and patient advisory protocols.",
          contactDetail: "jobs@kampalapharm.com",
          organisationUserId: "org_kampala_id",
          organisationName: "Kampala Allied Pharmacy",
          organisationTypes: ["retail_pharmacy"],
          organisationDistrict: "Kampala",
          status: "active",
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 3600 * 1000),
          interestCount: 0
        },
        {
          id: "job_demo_2",
          title: "Production Chemist (Injectables)",
          cadreRequired: "production_personnel",
          district: "Entebbe",
          employmentType: "full_time",
          description: "Join our sterile cleanrooms manufacturing lines to guide fluid processing, batch formulation, and clean protocol oversight.",
          contactDetail: "careers@ugandapharma.co.ug",
          organisationUserId: "org_entebbe_id",
          organisationName: "Uganda Pharma Industries",
          organisationTypes: ["manufacturer"],
          organisationDistrict: "Entebbe",
          status: "active",
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 45 * 24 * 3600 * 1000),
          interestCount: 1
        },
        {
          id: "job_demo_3",
          title: "Locum Pharmacy Dispenser",
          cadreRequired: "dispenser",
          district: "Mbarara",
          employmentType: "locum",
          description: "Night shift cover dispenser requested for urgent retail pharmacy operations. Daily pay settlement.",
          contactDetail: "mbarara_retail@gmail.com",
          organisationUserId: "org_mbarara_id",
          organisationName: "Mbarara Community Drug Shop",
          organisationTypes: ["drug_shop"],
          organisationDistrict: "Mbarara",
          status: "active",
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 15 * 24 * 3600 * 1000),
          interestCount: 0
        },
        {
          id: "job_demo_4",
          title: "Medical Sales Representative",
          cadreRequired: "medical_sales_rep",
          district: "Gulu",
          employmentType: "contract",
          description: "Promoting cardiovascular and diabetic care categories to private hospitals and retail pharmacies in Northern region.",
          contactDetail: "hr@medistributors.ug",
          organisationUserId: "org_gulu_id",
          organisationName: "ME Distributors Uganda",
          organisationTypes: ["distributor"],
          organisationDistrict: "Gulu",
          status: "active",
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 60 * 24 * 3600 * 1000),
          interestCount: 2
        },
        {
          id: "job_demo_5",
          title: "Responsible Quality Assurance Lead",
          cadreRequired: "qa_qc_officer",
          district: "Kampala",
          employmentType: "full_time",
          description: "Seeking regulatory pharmacist or quality manager to lead cold-chain validation, audit updates, and importer compliance checking.",
          contactDetail: "qa@importercorp.com",
          organisationUserId: "org_im_id",
          organisationName: "Kampala National Importers Ltd",
          organisationTypes: ["importer"],
          organisationDistrict: "Kampala",
          status: "active",
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 3600 * 1000),
          interestCount: 0
        }
      ];

      for (const j of jobsList) {
        batch.set(doc(db, 'jobPostings', j.id), j);
      }
      await batch.commit();
      setSeedingStatus("Success! 5 active jobPostings are now visible in the Job Board marketplace.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setSeedingStatus(`Error seeding jobs: ${err.message}`);
    } finally {
      setSeedingLoading(false);
    }
  };

  const handleSeedBusinesses = async () => {
    setSeedingLoading(true);
    setSeedingStatus("Seeding businesses for sale list...");
    try {
      const batch = writeBatch(db);
      const businesses = [
        {
          id: "biz_demo_1",
          sellerUserId: "org_seller_1",
          listingTitle: "Valued Retail Pharmacy for Sale on Main Highway",
          isConfidential: false,
          businessType: "retail_pharmacy",
          district: "Jinja",
          locationDescription: "Jinja-Kampala Highway, busy commercial center near regional terminal.",
          yearsInOperation: 6,
          ndaLicenceStatus: "valid",
          staffCount: 3,
          businessDescription: "High-volume retail pharmacy running on a strong recurring prescription customer base. Fully licensed by National Drug Authority with complete compliance audits. Excellent margin mix of branded medications.",
          askingPriceUGX: 135000000,
          priceNegotiable: true,
          monthlySalesRange: "UGX 22,000,000 - 30,000,500",
          reasonForSale: "Seller retiring overseas.",
          whatsIncluded: ["All retail fittings", "POS records", "Air conditioning equipment"],
          contactMethod: "email",
          contactDetail: "jinjasale@pharmnet.ug",
          contactName: "Mr. David Mukasa",
          photoUrls: ["https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600"],
          status: "active",
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 65 * 24 * 3600 * 1000),
          viewCount: 14
        },
        {
          id: "biz_demo_2",
          sellerUserId: "org_seller_2",
          listingTitle: "Commercial Drug Shop Unit near Gulu Center",
          isConfidential: false,
          businessType: "drug_shop",
          district: "Gulu",
          locationDescription: "Gulu Market Center Road, premium corner shop with heavy footfall.",
          yearsInOperation: 4,
          ndaLicenceStatus: "valid",
          staffCount: 2,
          businessDescription: "Well positioned drug shop yielding consistent cash sales revenues. Low lease rentals.",
          askingPriceUGX: 45000000,
          priceNegotiable: false,
          monthlySalesRange: "UGX 8,000,000 - 12,000,000",
          reasonForSale: "Capital fundraising for wholesale expansion.",
          whatsIncluded: ["Shelving counters", "Initial inventory of UGX 15M value"],
          contactMethod: "phone",
          contactDetail: "+256 701 445566",
          contactName: "Acia Proscovia",
          photoUrls: ["https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600"],
          status: "active",
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 80 * 24 * 3600 * 1000),
          viewCount: 8
        },
        {
          id: "biz_demo_3",
          sellerUserId: "org_seller_3",
          listingTitle: "Regional Wholesaler / Distributor Depot",
          isConfidential: true,
          businessType: "wholesale_pharmacy",
          district: "Masaka",
          locationDescription: "Masaka industrial distribution corridor logistics hub.",
          yearsInOperation: 8,
          ndaLicenceStatus: "valid",
          staffCount: 7,
          businessDescription: "Wholesale distribution license, temperature-mapped secure warehouse, and active supply chain contracts.",
          askingPriceUGX: 450000000,
          priceNegotiable: true,
          monthlySalesRange: "UGX 110,000,000 - 150,000,000",
          reasonForSale: "Owner focusing on drug formulation.",
          whatsIncluded: ["Secure warehouse setup", "NDA wholesale permits", "Active supply agreements"],
          contactMethod: "email",
          contactDetail: "confidential_masaka@pharmnet.ug",
          contactName: "Investment Advisor",
          photoUrls: ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600"],
          status: "active",
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 90 * 24 * 3600 * 1000),
          viewCount: 23
        }
      ];

      for (const b of businesses) {
        batch.set(doc(db, 'businessListings', b.id), b);
      }
      await batch.commit();
      setSeedingStatus("Success! 3 Ugandan Pharmacy Businesses For Sale loaded into businessListings.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setSeedingStatus(`Error seeding businesses: ${err.message}`);
    } finally {
      setSeedingLoading(false);
    }
  };

  // Verify and fetch administrative data
  useEffect(() => {
    let isMounted = true;
    
    if (!user) {
      setLoadingAdmin(false);
      return;
    }

    const checkAdminAffiliation = async () => {
      try {
        // Evaluate by direct search or claim fallback for secure local dev
        const adminDocRef = doc(db, 'regulatoryBodyAdmins', user.uid);
        const adminDocSnap = await getDoc(adminDocRef);

        if (adminDocSnap.exists()) {
          const data = adminDocSnap.data() as RegulatoryAdmin;
          if (data.isActive === false) {
            signOut();
            alert("Your regulatory admin account has been deactivated. Contact the platform administrator.");
            navigate('/login');
            return;
          }
          if (isMounted) {
            setAdminProfile(data);
          }
        } else {
          // If the spec account exists as PSU admin or AHPC admin by email, let's auto-provision or match them client side!
          letMatchedStaffCollection(isMounted);
        }
      } catch (err) {
        console.error("Checking admin doc affiliation has failed:", err);
        if (isMounted) {
          setLoadingAdmin(false);
        }
      }
    };

    const letMatchedStaffCollection = async (isMounted: boolean) => {
      const email = user.email || '';
      let mockAdmin: RegulatoryAdmin | null = null;

      if (email === 'psu.admin@demo.pnu.ug') {
        mockAdmin = {
          uid: user.uid,
          fullName: "Dr. Amina Ssekandi",
          email: "psu.admin@demo.pnu.ug",
          body: "PSU",
          bodyFullName: "Pharmaceutical Society of Uganda",
          scopedCadres: ["pharmacist"],
          role: "body_admin",
          isActive: true,
          notes: "Demo PSU Admin staff account."
        };
      } else if (email === 'ahpc.admin@demo.pnu.ug') {
        mockAdmin = {
          uid: user.uid,
          fullName: "Mr. Robert Opio",
          email: "ahpc.admin@demo.pnu.ug",
          body: "AHPC",
          bodyFullName: "Allied Health Professionals Council",
          scopedCadres: [
            "pharmacy_technician", 
            "pharmacy_assistant", 
            "dispenser", 
            "drug_shop_auxiliary", 
            "qa_qc_officer", 
            "procurement_officer", 
            "stores_officer", 
            "stores_manager"
          ],
          role: "body_admin",
          isActive: true,
          notes: "Demo AHPC Admin staff account."
        };
      }

      if (mockAdmin) {
        try {
          // Write to Firestore to persist it
          await updateDoc(doc(db, 'regulatoryBodyAdmins', user.uid), mockAdmin as any).catch(async () => {
            // If document does not exist, use setDoc/create write
            const { setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'regulatoryBodyAdmins', user.uid), mockAdmin);
          });
          if (isMounted) {
            setAdminProfile(mockAdmin);
          }
        } catch (writeErr) {
          console.warn("Could not write regulatory admin doc automatically, using client state.", writeErr);
          if (isMounted) {
            setAdminProfile(mockAdmin);
          }
        }
      } else {
        // Redirection route guard if the user lacks regulatory privileges
        // Double check if standard platform admin
        const idToken = await auth.currentUser?.getIdTokenResult();
        if (idToken?.claims.admin || user.email === 'admin.peter@pharmagh.com') {
          navigate('/admin');
          return;
        }
        
        navigate('/dashboard');
      }
      if (isMounted) {
        setLoadingAdmin(false);
      }
    };

    checkAdminAffiliation().then(() => {
      if (isMounted) setLoadingAdmin(false);
    });

    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  // Load appropriate data whenever active tab or admin profile changes
  useEffect(() => {
    if (!adminProfile) return;
    loadConsoleData();
  }, [adminProfile, activeTab]);

  const loadConsoleData = async () => {
    if (!adminProfile) return;
    setLoadingData(true);
    try {
      // 1. Load profiles in cadres
      const q = query(
        collection(db, 'individualProfiles')
      );
      const querySnap = await getDocs(q);
      const allProfiles: any[] = [];
      querySnap.forEach(profileDoc => {
        const pData = profileDoc.data();
        if (adminProfile.scopedCadres.includes(pData.primaryCadre)) {
          allProfiles.push({ id: profileDoc.id, ...pData });
        }
      });
      setProfiles(allProfiles);

      // 2. Load associated verification documents
      const docsSnap = await getDocs(collection(db, 'verificationDocuments'));
      const activeDocs: { [uid: string]: VerificationDoc } = {};
      docsSnap.forEach(vd => {
        activeDocs[vd.id] = vd.data() as VerificationDoc;
      });
      setVerificationDocs(activeDocs);

      // 3. Load administrative colleagues
      const adminsSnap = await getDocs(collection(db, 'regulatoryBodyAdmins'));
      const list: RegulatoryAdmin[] = [];
      adminsSnap.forEach(ad => {
        const adData = ad.data() as RegulatoryAdmin;
        if (adData.body === adminProfile.body) {
          list.push(adData);
        }
      });
      setAdminsList(list);
    } catch (err) {
      console.error("Failed to load Regulatory Board data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // Quick Action Handler - Verification approvals
  const handleApprove = async (profileId: string) => {
    if (!adminProfile) return;
    setSavingAction(true);
    try {
      const pRef = doc(db, 'individualProfiles', profileId);
      await updateDoc(pRef, {
        credentialVerificationStatus: 'verified',
        credentialVerifiedAt: serverTimestamp(),
        credentialVerifiedByBody: adminProfile.bodyFullName,
        credentialVerifiedByUid: adminProfile.uid,
        credentialRejectionReason: '',
        practisingLicenceStatus: 'not_renewed', // Start-state is registered, needs licence updated next.
        updatedAt: serverTimestamp()
      });

      // Update local verification doc reviewed tags
      const vdRef = doc(db, 'verificationDocuments', profileId);
      await updateDoc(vdRef, {
        reviewedAt: serverTimestamp(),
        reviewedByUid: adminProfile.uid,
        reviewedByBody: adminProfile.body,
        reviewNotes: 'Approved during queue validation.'
      }).catch(e => console.warn("Verification documents update failed:", e));

      // Refresh data
      await loadConsoleData();
      setActiveReviewProfile(null);
    } catch (err) {
      alert("Error approving credential: " + err);
    } finally {
      setSavingAction(false);
    }
  };

  const handleReject = async (profileId: string) => {
    if (!adminProfile || !rejectionReason.trim()) {
      alert("Please provide an internal or external reason for rejection.");
      return;
    }
    setSavingAction(true);
    try {
      const pRef = doc(db, 'individualProfiles', profileId);
      await updateDoc(pRef, {
        credentialVerificationStatus: 'rejected',
        credentialRejectionReason: rejectionReason,
        updatedAt: serverTimestamp()
      });

      const vdRef = doc(db, 'verificationDocuments', profileId);
      await updateDoc(vdRef, {
        reviewedAt: serverTimestamp(),
        reviewedByUid: adminProfile.uid,
        reviewedByBody: adminProfile.body,
        reviewNotes: `Rejected: ${rejectionReason}`
      }).catch(e => console.warn("Verification documents update failed:", e));

      await loadConsoleData();
      setShowRejectForm(false);
      setRejectionReason('');
      setActiveReviewProfile(null);
    } catch (err) {
      alert("Error rejecting credential: " + err);
    } finally {
      setSavingAction(false);
    }
  };

  const handleRequestMoreInfo = async (profileId: string) => {
    if (!adminProfile || !requestInfoNotes.trim()) {
      alert("Please specify what information or file corrections are required.");
      return;
    }
    setSavingAction(true);
    try {
      const pRef = doc(db, 'individualProfiles', profileId);
      await updateDoc(pRef, {
        credentialVerificationStatus: 'unverified',
        credentialRejectionReason: `More info required: ${requestInfoNotes}`,
        updatedAt: serverTimestamp()
      });

      const vdRef = doc(db, 'verificationDocuments', profileId);
      await updateDoc(vdRef, {
        reviewedAt: serverTimestamp(),
        reviewedByUid: adminProfile.uid,
        reviewedByBody: adminProfile.body,
        reviewNotes: `More Info Requested: ${requestInfoNotes}`
      }).catch(e => console.warn("Verification documents update failed:", e));

      await loadConsoleData();
      setShowRequestInfoForm(false);
      setRequestInfoNotes('');
      setActiveReviewProfile(null);
    } catch (err) {
      alert("Error requesting more information: " + err);
    } finally {
      setSavingAction(false);
    }
  };

  // Individual Licence Status Save
  const handleSaveIndividualLicence = async () => {
    if (!activeUpdateLicenceProfile) return;
    setSavingAction(true);
    try {
      const pRef = doc(db, 'individualProfiles', activeUpdateLicenceProfile.id);
      await updateDoc(pRef, {
        practisingLicenceStatus: editLicenceStatus,
        practisingLicenceYear: Number(editLicenceYear),
        licenceRenewalDate: Timestamp.fromDate(new Date(editRenewalDate)),
        licenceExpiryDate: Timestamp.fromDate(new Date(editExpiryDate)),
        licenceSuspensionReason: editLicenceStatus === 'suspended' ? editSuspensionReason : '',
        updatedAt: serverTimestamp()
      });

      await loadConsoleData();
      setActiveUpdateLicenceProfile(null);
    } catch (err) {
      alert("Error updating licence status: " + err);
    } finally {
      setSavingAction(false);
    }
  };

  // Bulk update action
  const handleBulkUpdate = async () => {
    if (selectedProfileIds.length === 0 || !bulkConfirmChecked) {
      alert("Please select profiles and check the confirmation box.");
      return;
    }

    setSavingAction(true);
    try {
      const batch = writeBatch(db);
      
      selectedProfileIds.forEach(id => {
        const pRef = doc(db, 'individualProfiles', id);
        batch.update(pRef, {
          practisingLicenceStatus: bulkTargetStatus,
          practisingLicenceYear: new Date().getFullYear(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      await loadConsoleData();
      setSelectedProfileIds([]);
      setBulkConfirmChecked(false);
      setShowBulkModal(false);
      alert(`Licence Status successfully updated to "${bulkTargetStatus.replace('_', ' ')}" for ${selectedProfileIds.length} professionals.`);
    } catch (err) {
      alert("Bulk update operation failed: " + err);
    } finally {
      setSavingAction(false);
    }
  };

  const toggleSelectProfile = (id: string) => {
    setSelectedProfileIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredProfiles: any[]) => {
    if (selectedProfileIds.length === filteredProfiles.length) {
      setSelectedProfileIds([]);
    } else {
      setSelectedProfileIds(filteredProfiles.map(p => p.id));
    }
  };

  if (loadingAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
      </div>
    );
  }

  if (!adminProfile) {
    return <Navigate to="/dashboard" />;
  }

  // Segment queues based on filters/conditions
  const currentQueue = profiles.filter(p => p.credentialVerificationStatus === 'pending_review');
  
  const verifiedProfiles = profiles.filter(p => p.credentialVerificationStatus === 'verified');
  
  const licenceManagementProfiles = verifiedProfiles.filter(p => {
    const matchesSearch = p.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
                          (p.registrationNumber && p.registrationNumber.toLowerCase().includes(searchText.toLowerCase()));
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && p.practisingLicenceStatus === statusFilter;
  });

  const directoryProfiles = verifiedProfiles.filter(p => {
    return p.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
           (p.registrationNumber && p.registrationNumber.toLowerCase().includes(searchText.toLowerCase()));
  });

  // Calculate high-level summary badge tags for licensing
  const counts = {
    current: verifiedProfiles.filter(p => p.practisingLicenceStatus === 'renewed_current').length,
    pending: verifiedProfiles.filter(p => p.practisingLicenceStatus === 'not_renewed').length,
    suspended: verifiedProfiles.filter(p => p.practisingLicenceStatus === 'suspended').length,
    lapsed: verifiedProfiles.filter(p => p.practisingLicenceStatus === 'lapsed').length,
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      {/* 1. Specialized Deep Blue Regulatory Header */}
      <header className="bg-[#1A237E] text-white shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center">
              <ShieldCheck size={32} className="text-white brightness-125" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-2.5 py-0.5 rounded-md">
                  Official Portal
                </span>
                <span className="text-xs text-indigo-200 uppercase font-bold tracking-wider font-mono">
                  {adminProfile.body} Scoped Console
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                {adminProfile.bodyFullName}
              </h1>
            </div>
          </div>

          {/* Current log status & user identifier */}
          <div className="flex items-center gap-4 bg-white/5 p-3 px-5 rounded-2xl border border-white/10 self-start md:self-auto">
            <div className="text-right">
              <p className="text-sm font-black tracking-tight">{adminProfile.fullName}</p>
              <p className="text-xs text-indigo-200">{adminProfile.email}</p>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <button 
              onClick={() => { signOut(); navigate('/login'); }}
              className="text-[11px] font-black uppercase text-rose-350 hover:text-rose-450 tracking-wider transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main workspace dynamic wrapper */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Dynamic Sidebar Control Module */}
        <aside className="space-y-4">
          
          {/* Active cadre scope badge */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-xs">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#1A237E] bg-indigo-100 px-2 py-0.5 rounded">
              Your Scope
            </span>
            <p className="text-xs text-indigo-900 font-bold mt-2.5">
              Authorized cadres under your supervision:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {adminProfile.scopedCadres.map(c => (
                <span key={c} className="text-[10px] bg-white border border-indigo-200/60 font-semibold px-2.5 py-1 rounded-lg text-indigo-950 capitalize">
                  {c.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          <nav className="bg-white rounded-3xl border border-zinc-200 shadow-md p-2.5 space-y-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center justify-between p-3.5 px-4 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCheck size={18} />
                <span>Verification Queue</span>
              </div>
              {currentQueue.length > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'queue' ? 'bg-[#1A237E] text-white' : 'bg-rose-500 text-white animate-pulse'
                }`}>
                  {currentQueue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('licence')}
              className={`w-full flex items-center justify-between p-3.5 px-4 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'licence'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders size={18} />
                <span>Licence Management</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className={`w-full flex items-center justify-between p-3.5 px-4 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span>Member Directory</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`w-full flex items-center justify-between p-3.5 px-4 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} />
                <span>Admin Team</span>
              </div>
            </button>
          </nav>
        </aside>

        {/* Console Working stage panel */}
        <main className="lg:col-span-3 space-y-6">
          
          <AnimatePresence mode="wait">
            {loadingData ? (
              <div className="min-h-[40vh] bg-white rounded-3xl border border-zinc-200 flex items-center justify-center shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A237E]"></div>
              </div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                
                {/* QUEUE TAB VIEW */}
                {activeTab === 'queue' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900">Verification Backlog</h2>
                        <p className="text-xs text-zinc-500 mt-1">Pending registration checks and certificate reviews awaiting official {adminProfile.body} seal of approval.</p>
                      </div>
                      <span className="text-xs font-black uppercase bg-[#1A237E]/10 text-[#1A237E] p-2 px-3 rounded-lg font-mono">
                        {currentQueue.length} Pending
                      </span>
                    </div>

                    {currentQueue.length === 0 ? (
                      <div className="bg-white rounded-3xl p-12 border border-zinc-250 text-center shadow-xs">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                          <CheckCircle size={32} className="text-emerald-600" />
                        </div>
                        <h4 className="text-base font-bold text-zinc-900">Workspace Clear</h4>
                        <p className="text-sm text-zinc-500 max-w-md mx-auto mt-2">All credential verification submissions under your cadre scope have been completed successfully!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQueue.map(p => (
                          <div key={p.id} className="bg-white rounded-2xl border border-zinc-200 p-5 p-y-6 flex flex-col justify-between shadow-xs hover:border-[#1A237E]/40 transition-all">
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="font-extrabold text-zinc-900 text-sm">{p.fullName}</h3>
                                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{p.district}, Uganda</p>
                                </div>
                                <span className="text-[9px] bg-indigo-50 border border-indigo-150 font-bold text-indigo-700 px-2 py-0.5 rounded capitalize">
                                  {p.primaryCadre.replace(/_/g, ' ')}
                                </span>
                              </div>

                              <div className="space-y-2 mt-4 bg-zinc-50 p-3 rounded-xl border border-zinc-100 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 font-medium">Decl. License:</span>
                                  <span className="font-mono font-bold text-zinc-700">{p.registrationNumber || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 font-medium">Qualification:</span>
                                  <span className="font-semibold text-zinc-700 truncate max-w-[150px]">{p.qualification}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 font-medium">Submitted For:</span>
                                  <span className="font-extrabold text-[#1A237E]">{verificationDocs[p.id]?.submittedForYear || new Date().getFullYear()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                              <button
                                onClick={() => setActiveReviewProfile(p)}
                                className="w-full bg-[#1A237E] hover:bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-xs cursor-pointer text-center"
                              >
                                Review Credentials
                              </button>
                              <button
                                className="w-full bg-zinc-150 hover:bg-zinc-200 text-zinc-600 text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer text-center"
                              >
                                Skip For Now
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* LICENCE MANAGEMENT TAB VIEW */}
                {activeTab === 'licence' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">Licence Review Board</h2>
                      <p className="text-xs text-zinc-500 mt-1">Audit, register, suspend, or renew practicing permits for members under your authority.</p>
                    </div>

                    {/* Highly responsive summaries block */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Renewed</span>
                        <p className="text-2xl font-black text-emerald-900 mt-1">{counts.current}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending</span>
                        <p className="text-2xl font-black text-amber-900 mt-1">{counts.pending}</p>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Suspended</span>
                        <p className="text-2xl font-black text-rose-900 mt-1">{counts.suspended}</p>
                      </div>
                      <div className="bg-zinc-100 border border-zinc-200 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Expired / Lapsed</span>
                        <p className="text-2xl font-black text-zinc-800 mt-1">{counts.lapsed}</p>
                      </div>
                    </div>

                    {/* Filters rail */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          placeholder="Search name or reg no..."
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        <div className="flex items-center gap-2">
                          <Filter size={14} className="text-zinc-400" />
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none"
                          >
                            <option value="all">All States</option>
                            <option value="renewed_current">Renewed (Current)</option>
                            <option value="not_renewed">Not Yet Renewed</option>
                            <option value="suspended">Suspended</option>
                            <option value="lapsed">Lapsed</option>
                          </select>
                        </div>

                        {/* Bulk Action Trigger */}
                        <button
                          disabled={selectedProfileIds.length === 0}
                          onClick={() => {
                            setBulkTargetStatus('not_renewed');
                            setShowBulkModal(true);
                          }}
                          className={`flex items-center gap-1.5 p-2 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            selectedProfileIds.length > 0 
                              ? 'bg-[#1A237E] hover:bg-[#12185C] text-white shadow-sm'
                              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                          }`}
                        >
                          Bulk Update ({selectedProfileIds.length})
                        </button>
                      </div>
                    </div>

                    {/* Core members licensing list table */}
                    <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200 font-extrabold uppercase text-zinc-500 tracking-wider">
                              <th className="py-3.5 px-4 w-12 text-center">
                                <button 
                                  onClick={() => toggleSelectAll(licenceManagementProfiles)}
                                  className="text-zinc-500 hover:text-zinc-800"
                                >
                                  {selectedProfileIds.length === licenceManagementProfiles.length && licenceManagementProfiles.length > 0 ? (
                                    <CheckSquare size={16} />
                                  ) : (
                                    <Square size={16} />
                                  )}
                                </button>
                              </th>
                              <th className="py-3.5 px-4">Full Name</th>
                              <th className="py-3.5 px-4">Registration</th>
                              <th className="py-3.5 px-4">Cadre</th>
                              <th className="py-3.5 px-4">District</th>
                              <th className="py-3.5 px-4">Licence Status</th>
                              <th className="py-3.5 px-4">Year</th>
                              <th className="py-3.5 px-4 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                            {licenceManagementProfiles.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-zinc-400">
                                  No verified professionals matching the criteria filters.
                                </td>
                              </tr>
                            ) : (
                              licenceManagementProfiles.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-50 border-zinc-100">
                                  <td className="py-3.5 px-4 text-center">
                                    <button 
                                      onClick={() => toggleSelectProfile(p.id)}
                                      className="text-zinc-450 hover:text-[#1A237E]"
                                    >
                                      {selectedProfileIds.includes(p.id) ? (
                                        <CheckSquare size={16} className="text-[#1A237E]" />
                                      ) : (
                                        <Square size={16} />
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-3.5 px-4 font-bold text-zinc-900">{p.fullName}</td>
                                  <td className="py-3.5 px-4 font-mono">{p.registrationNumber || 'Not assigned'}</td>
                                  <td className="py-3.5 px-4 uppercase text-[10px] tracking-tight">{p.primaryCadre.replace(/_/g, ' ')}</td>
                                  <td className="py-3.5 px-4 text-zinc-500">{p.district}</td>
                                  <td className="py-3.5 px-4">
                                    {p.practisingLicenceStatus === 'renewed_current' && (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                                        Renewed
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'not_renewed' && (
                                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                                        Not Renewed
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'suspended' && (
                                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                                        Suspended
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'lapsed' && (
                                      <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                                        Lapsed
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 font-extrabold text-zinc-900">{p.practisingLicenceYear || 'N/A'}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => {
                                          setActiveUpdateLicenceProfile(p);
                                          setEditLicenceStatus(p.practisingLicenceStatus || 'not_renewed');
                                          setEditLicenceYear(p.practisingLicenceYear || new Date().getFullYear());
                                          setEditRenewalDate(
                                            p.licenceRenewalDate 
                                              ? new Date(p.licenceRenewalDate.seconds * 1000).toISOString().split('T')[0]
                                              : new Date().toISOString().split('T')[0]
                                          );
                                          setEditExpiryDate(
                                            p.licenceExpiryDate 
                                              ? new Date(p.licenceExpiryDate.seconds * 1000).toISOString().split('T')[0]
                                              : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
                                          );
                                          setEditSuspensionReason(p.licenceSuspensionReason || '');
                                        }}
                                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                                      >
                                        Update Permit
                                      </button>
                                      <button
                                        onClick={() => navigate(`/professionals/${p.id}`)}
                                        className="text-zinc-400 hover:text-zinc-600 p-1 rounded hover:bg-zinc-100 cursor-pointer"
                                        title="View Profile"
                                      >
                                        <ExternalLink size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* MEMBER DIRECTORY TAB VIEW */}
                {activeTab === 'directory' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">Official Register Roll</h2>
                      <p className="text-xs text-zinc-500 mt-1">Read-only audit log of registered professionals under cadre purview, complete with public tags.</p>
                    </div>

                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search register index by name, qualification or registration permit key..."
                        className="w-full bg-white border border-zinc-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none shadow-xs"
                      />
                    </div>

                    <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200 font-extrabold uppercase text-zinc-500 tracking-wider">
                              <th className="py-4 px-5">Name & Title</th>
                              <th className="py-4 px-5">Registration</th>
                              <th className="py-4 px-5">Supervised Cadre</th>
                              <th className="py-4 px-5">District</th>
                              <th className="py-4 px-5">Verification</th>
                              <th className="py-4 px-5">License Stamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                            {directoryProfiles.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-zinc-400">
                                  No registered professionals located in index roll.
                                </td>
                              </tr>
                            ) : (
                              directoryProfiles.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-50 border-zinc-100">
                                  <td className="py-4 px-5 font-bold text-zinc-900">{p.fullName}</td>
                                  <td className="py-4 px-5 font-mono">{p.registrationNumber || 'Not assigned'}</td>
                                  <td className="py-4 px-5 uppercase text-[10px] tracking-tight">{p.primaryCadre.replace(/_/g, ' ')}</td>
                                  <td className="py-4 px-5 text-zinc-500">{p.district}</td>
                                  <td className="py-4 px-5">
                                    <span className="bg-emerald-100/80 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                      Verified Official
                                    </span>
                                  </td>
                                  <td className="py-4 px-5">
                                    {p.practisingLicenceStatus === 'renewed_current' && (
                                      <span className="text-emerald-600 font-black flex items-center gap-1">
                                        <CheckCircle size={12} /> Renewed
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'not_renewed' && (
                                      <span className="text-amber-600 font-black flex items-center gap-1">
                                        <Clock size={12} /> Pending Renewal
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'suspended' && (
                                      <span className="text-rose-600 font-black flex items-center gap-1">
                                        <AlertTriangle size={12} /> Suspended
                                      </span>
                                    )}
                                    {p.practisingLicenceStatus === 'lapsed' && (
                                      <span className="text-zinc-500 font-black flex items-center gap-1">
                                        <XCircle size={12} /> Lapsed File
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ADMIN TEAM VIEW */}
                {activeTab === 'team' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">{adminProfile.bodyFullName} Staff Roster</h2>
                      <p className="text-xs text-zinc-500 mt-1">Colleagues and officers with designated clearance inside your administrative division.</p>
                    </div>

                    <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200 font-extrabold uppercase text-zinc-500 tracking-wider">
                              <th className="py-4 px-5">Officer Name</th>
                              <th className="py-4 px-5">Work Email</th>
                              <th className="py-4 px-5">Supervisory Role</th>
                              <th className="py-4 px-5">Status Badge</th>
                              <th className="py-4 px-5">Cleared On</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                            {adminsList.map(ad => (
                              <tr key={ad.uid} className="hover:bg-zinc-50 border-zinc-100">
                                <td className="py-4 px-5 font-bold text-zinc-900 flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-indigo-100 text-[#1A237E] font-bold flex items-center justify-center text-[10px]">
                                    {ad.fullName[0].toUpperCase()}
                                  </div>
                                  <span>{ad.fullName}</span>
                                </td>
                                <td className="py-4 px-5 font-mono">{ad.email}</td>
                                <td className="py-4 px-5 uppercase text-[10px] tracking-tight">{ad.role.replace(/_/g, ' ')}</td>
                                <td className="py-4 px-5">
                                  {ad.isActive ? (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                      Active Duty
                                    </span>
                                  ) : (
                                    <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                      Deactivated
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-5 text-zinc-400 font-mono">
                                  {ad.addedAt ? new Date(ad.addedAt.seconds * 1000).toLocaleDateString() : 'Original Seed'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* DEMO DATA ACCELERATOR (Part 12 Validation Panel) */}
                    <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-900/45 text-white rounded-3xl p-6 shadow-xl space-y-5">
                      <div className="flex items-center gap-3">
                        <Sliders size={24} className="text-indigo-400" />
                        <div>
                          <h3 className="font-extrabold text-base tracking-tight">Demo Data Installs & Reset Lab</h3>
                          <p className="text-zinc-400 text-xs">Instantly populate, configure, or reset sandbox testing database collections as requested in Part 12.</p>
                        </div>
                      </div>

                      {seedingStatus && (
                        <p className={`text-xs font-mono font-bold uppercase p-2 px-3 rounded-lg ${
                          seedingStatus.includes('Success') ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}>
                          {seedingStatus}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                        <button
                          onClick={handleSeedProfessionals}
                          disabled={seedingLoading}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center text-center gap-1.5"
                        >
                          <span>🌱 Seed Ugandan Professionals</span>
                          <span className="text-[8px] font-medium text-indigo-205 uppercase tracking-widest block font-mono">Sarah Namukasa & 3 others</span>
                        </button>

                        <button
                          onClick={handleSeedJobs}
                          disabled={seedingLoading}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center text-center gap-1.5"
                        >
                          <span>💼 Seed Live jobPostings</span>
                          <span className="text-[8px] font-medium text-emerald-255 uppercase tracking-widest block font-mono">5 Active postings</span>
                        </button>

                        <button
                          onClick={handleSeedBusinesses}
                          disabled={seedingLoading}
                          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center text-center gap-1.5"
                        >
                          <span>🏪 Seed Businesses For Sale</span>
                          <span className="text-[8px] font-medium text-amber-255 uppercase tracking-widest block font-mono">3 Listings in Uganda</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* FULL-SCREEN VERIFICATION REVIEW PANEL MODAL (Part 6) */}
      <AnimatePresence>
        {activeReviewProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl relative border border-zinc-200"
            >
              
              {/* Review Panel Header */}
              <div className="bg-[#1A237E] text-white p-5 px-6 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] font-black bg-white/10 text-white p-1 px-2.5 rounded-md uppercase font-mono tracking-wider">
                    Official Verification Review
                  </span>
                  <h3 className="text-lg font-black tracking-tight mt-1">{activeReviewProfile.fullName}</h3>
                </div>
                <button 
                  onClick={() => {
                    setActiveReviewProfile(null);
                    setShowRejectForm(false);
                    setShowRequestInfoForm(false);
                  }}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer text-sm font-bold px-4"
                >
                  Exit Review
                </button>
              </div>

              {/* Central Panel Grid split left profile details, right file docs */}
              <div className="flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
                
                {/* Left Side: Professional Profile Details */}
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                  <div>
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Professional Overview</h4>
                    <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-100 p-4 rounded-2xl">
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center font-bold text-white text-lg overflow-hidden">
                        {activeReviewProfile.profilePhotoUrl ? (
                          <img src={activeReviewProfile.profilePhotoUrl} className="h-full w-full object-cover" />
                        ) : (
                          activeReviewProfile.fullName[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">{activeReviewProfile.fullName}</p>
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-tight">{activeReviewProfile.primaryCadre.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Registration Number</p>
                      <p className="text-xs font-bold font-mono text-zinc-800 mt-1">{activeReviewProfile.registrationNumber || 'None declared'}</p>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Qualifying Degree</p>
                      <p className="text-xs font-bold text-zinc-800 mt-1">{activeReviewProfile.qualification}</p>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Experience Level</p>
                      <p className="text-xs font-bold text-zinc-800 mt-1 capitalize">{activeReviewProfile.yearsExperience?.replace(/_/g, ' ')}</p>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Supervised Region</p>
                      <p className="text-xs font-bold text-zinc-800 mt-1">{activeReviewProfile.district}, Uganda</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Professional Biography</h5>
                    <p className="text-xs leading-relaxed text-zinc-655 italic bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                      "{activeReviewProfile.bio || 'Professional has not entered any biography details yet.'}"
                    </p>
                  </div>

                  {activeReviewProfile.areasOfPractice && (
                    <div>
                      <h5 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Areas of Practice</h5>
                      <div className="flex flex-wrap gap-1.5Packed mt-2">
                        {activeReviewProfile.areasOfPractice.map((a: string) => (
                          <span key={a} className="text-[10px] bg-indigo-50 text-indigo-805 font-bold px-2.5 py-1 rounded-lg border border-indigo-100 uppercase">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Uploaded Verification Certificates */}
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto bg-zinc-50">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Submitted Verification Files</h4>

                  {verificationDocs[activeReviewProfile.id] ? (
                    <div className="space-y-4">
                      
                      {/* Registration Certificate view card */}
                      <div className="bg-white p-4 rounded-2xl border border-zinc-200">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-extrabold text-zinc-800 flex items-center gap-1.5">
                            <FileCheck size={16} className="text-indigo-600" />
                            <span>1. Registration Certificate</span>
                          </p>
                          <a 
                            href={verificationDocs[activeReviewProfile.id].registrationCertificateUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 p-1 px-2.5 rounded text-[10px] font-bold text-zinc-600 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open New Window</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        
                        <div className="h-44 bg-zinc-100 border border-dashed border-zinc-200 rounded-xl overflow-hidden flex items-center justify-center relative">
                          <img 
                            src={verificationDocs[activeReviewProfile.id].registrationCertificateUrl || 'https://via.placeholder.com/300x150?text=Registration+Certificate'} 
                            alt="Registration certificate cert" 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // If broken image URL, display solid vector placeholder
                              const el = e.currentTarget;
                              el.style.display = 'none';
                              const pNode = el.parentNode as HTMLElement;
                              if (pNode) {
                                pNode.innerHTML = `<div class="p-6 text-center"><p class="text-[10px] font-mono text-zinc-500 font-bold">${verificationDocs[activeReviewProfile.id].registrationCertificateUrl.substring(0, 48)}...</p></div>`;
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Practising Certificate view card */}
                      <div className="bg-white p-4 rounded-2xl border border-zinc-200">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-extrabold text-zinc-800 flex items-center gap-1.5">
                            <FileText size={16} className="text-indigo-600" />
                            <span>2. Practising Permit (Annual)</span>
                          </p>
                          <a 
                            href={verificationDocs[activeReviewProfile.id].practisingCertificateUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 p-1 px-2.5 rounded text-[10px] font-bold text-zinc-600 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open New Window</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        
                        <div className="h-44 bg-zinc-100 border border-dashed border-zinc-200 rounded-xl overflow-hidden flex items-center justify-center relative">
                          <img 
                            src={verificationDocs[activeReviewProfile.id].practisingCertificateUrl || 'https://via.placeholder.com/300x150?text=Practising+Certificate'} 
                            alt="Practising certificate permit" 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const el = e.currentTarget;
                              el.style.display = 'none';
                              const pNode = el.parentNode as HTMLElement;
                              if (pNode) {
                                pNode.innerHTML = `<div class="p-6 text-center"><p class="text-[10px] font-mono text-zinc-500 font-bold">${verificationDocs[activeReviewProfile.id].practisingCertificateUrl.substring(0, 48)}...</p></div>`;
                              }
                            }}
                          />
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl text-xs flex gap-2 font-medium">
                      <Info size={16} className="shrink-0 mt-0.5" />
                      <p>This pharmacist has requested verification but hasn't finalized document file submissions. Ask for more credentials below.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Panel actions foot bar including rejection forms (Part 6) */}
              <div className="bg-zinc-50 border-t border-zinc-200 p-6 shrink-0 space-y-4">
                
                {/* Rejection Form element (Part 6) */}
                {showRejectForm && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    className="p-4 bg-rose-50 border border-rose-150 rounded-2xl space-y-3"
                  >
                    <label className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Provide Rejection Explanation (Required):</label>
                    <textarea
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Current practicing signature expired, name mismatch..."
                      className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs font-semibold focus:outline-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(activeReviewProfile.id)}
                        disabled={savingAction || !rejectionReason.trim()}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="bg-zinc-200 hover:bg-zinc-300 text-zinc-600 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* More Info Request Form (Part 6) */}
                {showRequestInfoForm && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    className="p-4 bg-indigo-50 border border-indigo-150 rounded-2xl space-y-3"
                  >
                    <label className="text-xs font-bold text-[#1A237E] uppercase tracking-wider block">Information Required details:</label>
                    <textarea
                      required
                      value={requestInfoNotes}
                      onChange={(e) => setRequestInfoNotes(e.target.value)}
                      placeholder="e.g. Please upload your NDA compounding certification addition..."
                      className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-xs font-semibold focus:outline-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequestMoreInfo(activeReviewProfile.id)}
                        disabled={savingAction || !requestInfoNotes.trim()}
                        className="bg-[#1A237E] hover:bg-blue-900 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Send Request Note
                      </button>
                      <button
                        onClick={() => setShowRequestInfoForm(false)}
                        className="bg-zinc-200 hover:bg-zinc-300 text-zinc-650 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Main Action Bar Row */}
                {!showRejectForm && !showRequestInfoForm && (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <button
                      onClick={() => handleApprove(activeReviewProfile.id)}
                      disabled={savingAction}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-3 px-6 rounded-2xl flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <CheckCircle size={16} />
                      <span>Approve Credential Statement</span>
                    </button>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowRequestInfoForm(true);
                          setShowRejectForm(false);
                        }}
                        className="bg-indigo-100 hover:bg-indigo-200 text-[#1A237E] text-xs font-extrabold py-3 px-5 rounded-2xl cursor-pointer"
                      >
                        Request More Info
                      </button>
                      <button
                        onClick={() => {
                          setShowRejectForm(true);
                          setShowRequestInfoForm(false);
                        }}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold py-3 px-5 rounded-2xl cursor-pointer"
                      >
                        Reject Credential
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SINGLE LICENCE STATUS UPDATE MODAL (Part 7) */}
      <AnimatePresence>
        {activeUpdateLicenceProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="bg-[#1A237E] text-white p-4 px-6 flex justify-between items-center">
                <h3 className="font-extrabold text-sm">Update Practice Permit Licence</h3>
                <button 
                  onClick={() => setActiveUpdateLicenceProfile(null)}
                  className="text-white bg-white/10 p-1 px-2.5 rounded-lg text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex gap-3 bg-zinc-50 border border-zinc-100 p-3 rounded-xl mb-2">
                  <div className="flex-grow">
                    <p className="text-[10px] uppercase font-bold text-zinc-400">Professional</p>
                    <p className="text-xs font-black text-zinc-900 mt-0.5">{activeUpdateLicenceProfile.fullName}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Permit: {activeUpdateLicenceProfile.registrationNumber}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Licence Permit Status</label>
                  <select
                    value={editLicenceStatus}
                    onChange={(e: any) => setEditLicenceStatus(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value="renewed_current">Renewed (Current)</option>
                    <option value="not_renewed">Not Yet Renewed</option>
                    <option value="suspended">Suspended</option>
                    <option value="lapsed">Lapsed / Expired</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">Licence Period Year</label>
                    <input
                      type="number"
                      value={editLicenceYear}
                      onChange={(e) => setEditLicenceYear(Number(e.target.value))}
                      className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2.5 text-xs font-semibold focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">Renewal Date</label>
                    <input
                      type="date"
                      value={editRenewalDate}
                      onChange={(e) => setEditRenewalDate(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2 px-2.5 text-xs font-semibold focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">licence Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2 px-2.5 text-xs font-semibold focus:outline-none font-mono"
                  />
                </div>

                {editLicenceStatus === 'suspended' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-bold text-rose-700">Suspension Reason notation (Required)</label>
                    <textarea
                      required
                      value={editSuspensionReason}
                      onChange={(e) => setEditSuspensionReason(e.target.value)}
                      placeholder="Specify infraction or NDA administrative hold code..."
                      className="w-full bg-white border border-rose-250 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                      rows={2}
                    />
                  </motion.div>
                )}
              </div>

              <div className="bg-zinc-50 p-4 px-6 border-t border-zinc-150 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setActiveUpdateLicenceProfile(null)}
                  className="bg-zinc-200 hover:bg-zinc-300 text-zinc-650 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={savingAction || (editLicenceStatus === 'suspended' && !editSuspensionReason.trim())}
                  onClick={handleSaveIndividualLicence}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider py-2 px-5 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Save Licence Status
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BULK UPDATE MODAL (Part 7) */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="bg-[#1A237E] text-white p-4 px-6 flex justify-between items-center">
                <h3 className="font-extrabold text-sm">Bulk Update Licenses</h3>
                <button 
                  onClick={() => setShowBulkModal(false)}
                  className="text-white bg-white/10 p-1 px-2.5 rounded-lg text-xs"
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 p-4 rounded-2xl text-xs">
                  <p className="font-bold">Important Notice:</p>
                  <p className="mt-1 leading-relaxed">
                    This wizard will update the licensing permit parameters for all <strong>{selectedProfileIds.length}</strong> selected professionals in a single atomic transaction. Ideal for starting a new licensing season.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Target Licence Status To Apply</label>
                  <select
                    value={bulkTargetStatus}
                    onChange={(e) => setBulkTargetStatus(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value="not_renewed">Under Renewal (Not Yet Renewed)</option>
                    <option value="renewed_current">Renewed (Current)</option>
                    <option value="lapsed">Lapsed / Expired</option>
                  </select>
                </div>

                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="bulkConfirm"
                    checked={bulkConfirmChecked}
                    onChange={(e) => setBulkConfirmChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 bg-zinc-50 border border-zinc-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="bulkConfirm" className="text-xs font-bold text-zinc-700 leading-tight">
                    I confirm I want to update licence status for {selectedProfileIds.length} professionals.
                  </label>
                </div>
              </div>

              <div className="bg-zinc-50 p-4 px-6 border-t border-zinc-150 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="bg-zinc-200 hover:bg-zinc-300 text-zinc-650 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={savingAction || !bulkConfirmChecked}
                  onClick={handleBulkUpdate}
                  className={`text-xs font-black uppercase tracking-wider py-2 px-5 rounded-xl transition-all shadow-sm cursor-pointer ${
                    bulkConfirmChecked 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                      : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  Apply to {selectedProfileIds.length} Profiles
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
