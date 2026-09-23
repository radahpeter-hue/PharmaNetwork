import test from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import {
  getBytes,
  ref,
  uploadBytes
} from 'firebase/storage';
import { readFile } from 'node:fs/promises';

const projectId = 'demo-pharmanetwork-storage';
let testEnv;

const seedFirestore = async (callback) => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await callback(context.firestore());
  });
};

test.before(async () => {
  const firestoreRules = await readFile('firestore.rules', 'utf8');
  const storageRules = await readFile('storage.rules', 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: firestoreRules
    },
    storage: {
      host: '127.0.0.1',
      port: 9199,
      rules: storageRules
    }
  });
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

test.after(async () => {
  await testEnv.cleanup();
});

test('profile photo upload accepts owner JPG and rejects invalid MIME type', async () => {
  const storage = testEnv.authenticatedContext('owner-1').storage();

  await assertSucceeds(uploadBytes(
    ref(storage, 'profilePhotos/owner-1/photo.jpg'),
    new Uint8Array([1, 2, 3]),
    { contentType: 'image/jpeg' }
  ));

  await assertFails(uploadBytes(
    ref(storage, 'profilePhotos/owner-1/photo.txt'),
    new Uint8Array([1, 2, 3]),
    { contentType: 'text/plain' }
  ));
});

test('pending professional cannot read another professional CV', async () => {
  await seedFirestore(async db => {
    await setDoc(doc(db, 'users', 'pending-reader'), {
      id: 'pending-reader',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'PENDING_PROFILE',
      isActive: false,
      isVerified: false
    });
    await setDoc(doc(db, 'users', 'cv-owner'), {
      id: 'cv-owner',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'individualProfiles', 'cv-owner'), {
      fullName: 'CV Owner',
      primaryCadre: 'pharmacist',
      profileCompleteness: 90,
      isDirectoryVisible: true
    });
  });

  const ownerStorage = testEnv.authenticatedContext('cv-owner').storage();
  await assertSucceeds(uploadBytes(
    ref(ownerStorage, 'cvFiles/cv-owner/cv.pdf'),
    new Uint8Array([1, 2, 3]),
    { contentType: 'application/pdf' }
  ));

  const pendingStorage = testEnv.authenticatedContext('pending-reader').storage();
  await assertFails(getBytes(ref(pendingStorage, 'cvFiles/cv-owner/cv.pdf')));
});

test('active member can read CV only for a visible professional profile', async () => {
  await seedFirestore(async db => {
    await setDoc(doc(db, 'users', 'active-reader'), {
      id: 'active-reader',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'users', 'visible-owner'), {
      id: 'visible-owner',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'users', 'hidden-owner'), {
      id: 'hidden-owner',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'individualProfiles', 'visible-owner'), {
      fullName: 'Visible Owner',
      primaryCadre: 'pharmacist',
      profileCompleteness: 90,
      isDirectoryVisible: true
    });
    await setDoc(doc(db, 'individualProfiles', 'hidden-owner'), {
      fullName: 'Hidden Owner',
      primaryCadre: 'pharmacist',
      profileCompleteness: 90,
      isDirectoryVisible: false
    });
  });

  const visibleOwnerStorage = testEnv.authenticatedContext('visible-owner').storage();
  const hiddenOwnerStorage = testEnv.authenticatedContext('hidden-owner').storage();

  await uploadBytes(
    ref(visibleOwnerStorage, 'cvFiles/visible-owner/cv.pdf'),
    new Uint8Array([1, 2, 3]),
    { contentType: 'application/pdf' }
  );
  await uploadBytes(
    ref(hiddenOwnerStorage, 'cvFiles/hidden-owner/cv.pdf'),
    new Uint8Array([1, 2, 3]),
    { contentType: 'application/pdf' }
  );

  const readerStorage = testEnv.authenticatedContext('active-reader').storage();

  await assertSucceeds(getBytes(ref(readerStorage, 'cvFiles/visible-owner/cv.pdf')));
  await assertFails(getBytes(ref(readerStorage, 'cvFiles/hidden-owner/cv.pdf')));
});

test('scoped authority admin can read verification evidence only for governed cadre', async () => {
  await seedFirestore(async db => {
    await setDoc(doc(db, 'professionalAuthorities', 'authority-1'), {
      id: 'authority-1',
      governedCadres: ['pharmacist'],
      isActive: true
    });
    await setDoc(doc(db, 'professionalAuthorityAdmins', 'verifier-1'), {
      uid: 'verifier-1',
      authorityId: 'authority-1',
      scopedCadres: ['pharmacist'],
      role: 'verification_officer',
      isActive: true
    });
    await setDoc(doc(db, 'individualProfiles', 'pharmacist-owner'), {
      fullName: 'Pharmacist Owner',
      primaryCadre: 'pharmacist',
      profileCompleteness: 80,
      isDirectoryVisible: false
    });
    await setDoc(doc(db, 'individualProfiles', 'technician-owner'), {
      fullName: 'Technician Owner',
      primaryCadre: 'pharmacy_technician',
      profileCompleteness: 80,
      isDirectoryVisible: false
    });
  });

  const pharmacistStorage = testEnv.authenticatedContext('pharmacist-owner').storage();
  const technicianStorage = testEnv.authenticatedContext('technician-owner').storage();

  await uploadBytes(
    ref(pharmacistStorage, 'verificationDocs/pharmacist-owner/registration_certificate'),
    new Uint8Array([1, 2, 3]),
    { contentType: 'application/pdf' }
  );
  await uploadBytes(
    ref(technicianStorage, 'verificationDocs/technician-owner/registration_certificate'),
    new Uint8Array([1, 2, 3]),
    { contentType: 'application/pdf' }
  );

  const authorityStorage = testEnv.authenticatedContext('verifier-1', { authority_admin: true }).storage();

  await assertSucceeds(getBytes(ref(authorityStorage, 'verificationDocs/pharmacist-owner/registration_certificate')));
  await assertFails(getBytes(ref(authorityStorage, 'verificationDocs/technician-owner/registration_certificate')));
});
