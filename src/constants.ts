import type { PrimaryCadre } from './types';

export const UGANDA_DISTRICTS = [
  "Abim", "Adjumani", "Agago", "Alebtong", "Amolatar", "Amudat", "Amuria", "Amuru", "Apac", "Arua",
  "Budaka", "Bududa", "Bugiri", "Bugweri", "Buhweju", "Buikwe", "Bukedea", "Bukomansimbi", "Bukwo", "Bulambuli", "Buliisa", "Bundibugyo", "Bunyangabu", "Bushenyi", "Busia", "Butaleja", "Butambala", "Butebo", "Buvuma", "Buyende",
  "Dokolo", "Gomba", "Gulu", "Hoima", "Ibanda", "Iganga", "Isingiro", "Jinja", "Kaabong", "Kabale", "Kabarole", "Kaberamaido", "Kagadi", "Kakumiro", "Kalangala", "Kaliro", "Kalungu", "Kampala", "Kamuli", "Kamwenge", "Kanungu", "Kapchorwa", "Kapelebyong", "Kasanda", "Kasese", "Katakwi", "Kayunga", "Kibaale", "Kiboga", "Kibuku", "Kikuube", "Kiruhura", "Kiryandongo", "Kisoro", "Kitgum", "Koboko", "Kole", "Kotido", "Kumi", "Kwania", "Kween", "Kyankwanzi", "Kyegegwa", "Kyenjojo", "Kyotera",
  "Lamwo", "Lira", "Luuka", "Lwengo", "Lyantonde", "Madi-Okollo", "Manafwa", "Maracha", "Masaka", "Masindi", "Mayuge", "Mbale", "Mbarara", "Mitooma", "Mityana", "Moroto", "Moyo", "Mpigi", "Mubende", "Mukono", "Nabilatuk", "Nakapiripirit", "Nakaseke", "Nakasongola", "Namayingo", "Namisindwa", "Namutumba", "Napak", "Nebbi", "Ngora", "Ntoroko", "Ntungamo", "Nwoya", "Obongi", "Omoro", "Otuke", "Oyam", "Pader", "Pakwach", "Pallisa", "Rakai", "Rubanda", "Rubirizi", "Rukiga", "Rukungiri", "Sembabule", "Serere", "Sheema", "Sironko", "Soroti", "Tororo", "Wakiso", "Yumbe", "Zombo"
].sort();

export const PROFESSIONAL_CADRES: Array<{ id: PrimaryCadre; label: string }> = [
  { id: 'pharmacist', label: 'Registered Pharmacist' },
  { id: 'pharmacy_technician', label: 'Pharmacy Technician' },
  { id: 'pharmacy_assistant', label: 'Pharmacy Assistant' },
  { id: 'dispenser', label: 'Dispenser' },
  { id: 'drug_shop_auxiliary', label: 'Drug Shop Auxiliary Staff' },
  { id: 'nurse', label: 'Nurse' },
  { id: 'midwife', label: 'Midwife' },
  { id: 'clinical_officer', label: 'Clinical Officer' },
  { id: 'medical_laboratory_professional', label: 'Medical Laboratory Professional' },
  { id: 'physiotherapist', label: 'Physiotherapist' },
  { id: 'radiographer', label: 'Radiographer' },
  { id: 'occupational_therapist', label: 'Occupational Therapist' },
  { id: 'nutritionist_dietitian', label: 'Nutritionist / Dietitian' },
  { id: 'medical_practitioner', label: 'Medical Practitioner' },
  { id: 'dental_practitioner', label: 'Dental Practitioner' },
  { id: 'other_allied_health_professional', label: 'Other Allied Health Professional' },
  { id: 'qa_qc_officer', label: 'QA/QC Officer' },
  { id: 'procurement_officer', label: 'Procurement Officer' },
  { id: 'medical_sales_rep', label: 'Medical Sales Representative' },
  { id: 'pharmacovigilance_officer', label: 'Pharmacovigilance Officer' },
  { id: 'regulatory_affairs', label: 'Regulatory Affairs Officer' },
  { id: 'production_personnel', label: 'Production Personnel' },
  { id: 'stores_officer', label: 'Stores Officer' },
  { id: 'stores_manager', label: 'Stores Manager' },
  { id: 'other', label: 'Other' }
];

export const PHARMA_CADRES = PROFESSIONAL_CADRES.map(cadre => cadre.label);

export const professionalCadreLabel = (cadre?: string) =>
  PROFESSIONAL_CADRES.find(option => option.id === cadre)?.label
  || PROFESSIONAL_CADRES.find(option => option.label === cadre)?.label
  || (cadre || 'Professional').replace(/_/g, ' ');

export const normalizeProfessionalCadreId = (cadre?: string): string => {
  if (!cadre) return '';
  const byId = PROFESSIONAL_CADRES.find(option => option.id === cadre);
  if (byId) return byId.id;
  const byLabel = PROFESSIONAL_CADRES.find(option => option.label === cadre);
  return byLabel?.id || cadre;
};

export const EMPLOYMENT_TYPES = [
  { id: 'full_time', label: 'Full-time' },
  { id: 'part_time', label: 'Part-time' },
  { id: 'locum', label: 'Locum' },
  { id: 'contract', label: 'Contract' }
];

export const CONTACT_METHODS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' }
];

export const ORGANISATION_TYPES = [
  { id: 'retail_pharmacy', label: 'Retail Pharmacy' },
  { id: 'wholesale_pharmacy', label: 'Wholesale Pharmacy' },
  { id: 'drug_shop', label: 'Licensed Drug Shop' },
  { id: 'importer', label: 'Importer' },
  { id: 'distributor', label: 'Distributor' },
  { id: 'manufacturer', label: 'Manufacturer' },
  { id: 'other', label: 'Other' }
];
