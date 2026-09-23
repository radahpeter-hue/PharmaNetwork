import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const JOBS = [
  {
    organisationUserId: "mock-org-1",
    organisationName: "Guardian Pharmacy",
    organisationTypes: ["retail_pharmacy"],
    organisationDistrict: "Kampala",
    title: "Supervising Pharmacist",
    cadreRequired: "Registered Pharmacist",
    district: "Kampala",
    employmentType: "full_time",
    description: "We are looking for a dedicated pharmacist to lead our retail operations in Kampala. Responsible for stock management, prescription accuracy, and clinical advice.",
    requirements: "3+ years experience, PSU registration, leadership skills.",
    contactMethod: "whatsapp",
    contactDetail: "0700000001",
    status: "active",
    interestCount: 0
  },
  {
    organisationUserId: "mock-org-2",
    organisationName: "FirstLine Wholesalers",
    organisationTypes: ["wholesale_pharmacy"],
    organisationDistrict: "Mbarara",
    title: "Warehouse Quality Officer",
    cadreRequired: "Pharmacy Technician",
    district: "Mbarara",
    employmentType: "contract",
    description: "Ensure storage conditions meet NDA standards. Oversee incoming shipments and documentation.",
    requirements: "Diploma in Pharmacy, attention to detail.",
    contactMethod: "email",
    contactDetail: "hr@firstline.ug",
    status: "active",
    interestCount: 0
  },
  {
    organisationUserId: "mock-org-1",
    organisationName: "Guardian Pharmacy",
    organisationTypes: ["retail_pharmacy"],
    organisationDistrict: "Kampala",
    title: "Locum Dispenser",
    cadreRequired: "Pharmacy Assistant / Dispenser",
    district: "Wakiso",
    employmentType: "locum",
    description: "Weekend shifts available for a fast-paced retail environment.",
    requirements: "Certificate in pharmacy, good communication.",
    contactMethod: "whatsapp",
    contactDetail: "0700000001",
    status: "active",
    interestCount: 0
  }
];

const AVAILABILITY = [
  {
    individualUserId: "mock-ind-1",
    fullName: "Brian Mukasa",
    primaryCadre: "Registered Pharmacist",
    district: "Kampala",
    headline: "Available for locums or full-time roles in Kampala",
    description: "Experienced retail pharmacist with strong patient counseling skills. Available immediately.",
    preferredEmploymentTypes: ["full_time", "locum"],
    contactMethod: "whatsapp",
    contactDetail: "0702000001",
    status: "active",
    interestCount: 0
  }
];

async function seed() {
  console.log("Seeding mock data...");
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + 60 * 24 * 60 * 60 * 1000);
  const createdAt = Timestamp.now();

  // Set platform stats if they don't exist
  await setDoc(doc(db, 'platformStats', 'counts'), {
    registeredPharmacists: 142,
    pharmacyOwners: 58,
    auxiliaryProfessionals: 210,
    manufacturersDistributors: 12,
    activeOpportunities: JOBS.length
  }, { merge: true });

  for (const job of JOBS) {
    await addDoc(collection(db, 'jobPostings'), {
      ...job,
      createdAt,
      expiresAt
    });
  }

  for (const post of AVAILABILITY) {
    await addDoc(collection(db, 'availabilityPosts'), {
      ...post,
      createdAt,
      expiresAt
    });
  }

  console.log("Seeding complete.");
}

seed().catch(console.error);
