import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  increment,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { readFile } from 'node:fs/promises';

const projectId = 'demo-pharmanetwork';
let testEnv;

const seed = async (callback) => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await callback(context.firestore());
  });
};

test.before(async () => {
  const firestoreRules = await readFile('firestore.rules', 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: firestoreRules
    },
    storage: {
      host: '127.0.0.1',
      port: 9199
    }
  });
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

test.after(async () => {
  await testEnv.cleanup();
});

test('professional self-registration is pending and cannot self-activate', async () => {
  const uid = 'professional-1';
  const db = testEnv.authenticatedContext(uid).firestore();

  await assertSucceeds(setDoc(doc(db, 'users', uid), {
    id: uid,
    accountType: 'individual',
    accountClass: 'professional',
    accountStatus: 'PENDING_PROFILE',
    isActive: false,
    isVerified: false
  }));

  await assertFails(updateDoc(doc(db, 'users', uid), {
    accountStatus: 'ACTIVE',
    isActive: true,
    isVerified: true
  }));
});

test('pending professional cannot browse another professional while active member can read a visible profile', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'pending-user'), {
      id: 'pending-user',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'PENDING_PROFILE',
      isActive: false,
      isVerified: false
    });
    await setDoc(doc(db, 'users', 'active-user'), {
      id: 'active-user',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'individualProfiles', 'target-user'), {
      fullName: 'Visible Professional',
      primaryCadre: 'pharmacist',
      profileCompleteness: 80,
      isDirectoryVisible: true
    });
  });

  const pendingDb = testEnv.authenticatedContext('pending-user').firestore();
  const activeDb = testEnv.authenticatedContext('active-user').firestore();

  await assertFails(getDoc(doc(pendingDb, 'individualProfiles', 'target-user')));
  await assertSucceeds(getDoc(doc(activeDb, 'individualProfiles', 'target-user')));
});

test('active member cannot read a hidden professional profile', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'active-user'), {
      id: 'active-user',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'individualProfiles', 'hidden-user'), {
      fullName: 'Hidden Professional',
      primaryCadre: 'pharmacist',
      profileCompleteness: 90,
      isDirectoryVisible: false
    });
  });

  const activeDb = testEnv.authenticatedContext('active-user').firestore();
  await assertFails(getDoc(doc(activeDb, 'individualProfiles', 'hidden-user')));
});

test('professional cannot modify authoritative verification fields', async () => {
  const uid = 'professional-2';

  await seed(async db => {
    await setDoc(doc(db, 'users', uid), {
      id: uid,
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'PENDING_AUTHORITY_VERIFICATION',
      isActive: false,
      isVerified: false
    });
    await setDoc(doc(db, 'individualProfiles', uid), {
      fullName: 'Pending Professional',
      primaryCadre: 'pharmacist',
      registrationNumber: 'REG-001',
      credentialVerificationStatus: 'unverified',
      profileCompleteness: 80,
      isDirectoryVisible: false
    });
  });

  const db = testEnv.authenticatedContext(uid).firestore();

  await assertFails(updateDoc(doc(db, 'individualProfiles', uid), {
    credentialVerificationStatus: 'verified'
  }));
});

test('verification officer can update verification fields but not compliance fields', async () => {
  await seed(async db => {
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
    await setDoc(doc(db, 'individualProfiles', 'target-professional'), {
      fullName: 'Target Professional',
      primaryCadre: 'pharmacist',
      registrationNumber: 'REG-002',
      credentialVerificationStatus: 'unverified',
      practisingLicenceStatus: 'not_renewed',
      profileCompleteness: 80,
      isDirectoryVisible: false
    });
  });

  const db = testEnv.authenticatedContext('verifier-1', { authority_admin: true }).firestore();

  await assertSucceeds(updateDoc(doc(db, 'individualProfiles', 'target-professional'), {
    credentialVerificationStatus: 'verified',
    isDirectoryVisible: false
  }));

  await assertFails(updateDoc(doc(db, 'individualProfiles', 'target-professional'), {
    practisingLicenceStatus: 'renewed_current',
    isDirectoryVisible: false
  }));
});

test('compliance officer can update compliance fields but not verification fields', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'professionalAuthorities', 'authority-1'), {
      id: 'authority-1',
      governedCadres: ['pharmacist'],
      isActive: true
    });
    await setDoc(doc(db, 'professionalAuthorityAdmins', 'compliance-1'), {
      uid: 'compliance-1',
      authorityId: 'authority-1',
      scopedCadres: ['pharmacist'],
      role: 'compliance_officer',
      isActive: true
    });
    await setDoc(doc(db, 'individualProfiles', 'target-professional'), {
      fullName: 'Target Professional',
      primaryCadre: 'pharmacist',
      registrationNumber: 'REG-002',
      credentialVerificationStatus: 'verified',
      practisingLicenceStatus: 'not_renewed',
      profileCompleteness: 80,
      isDirectoryVisible: false
    });
  });

  const db = testEnv.authenticatedContext('compliance-1', { authority_admin: true }).firestore();

  await assertSucceeds(updateDoc(doc(db, 'individualProfiles', 'target-professional'), {
    practisingLicenceStatus: 'renewed_current',
    isDirectoryVisible: false
  }));

  await assertFails(updateDoc(doc(db, 'individualProfiles', 'target-professional'), {
    credentialVerificationStatus: 'rejected',
    isDirectoryVisible: false
  }));
});

test('message sender cannot impersonate another participant', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'member-a'), {
      id: 'member-a',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'users', 'member-b'), {
      id: 'member-b',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'messages', 'conversation-1'), {
      participants: ['member-a', 'member-b'],
      unreadCount: { 'member-a': 0, 'member-b': 0 }
    });
  });

  const db = testEnv.authenticatedContext('member-a').firestore();

  await assertFails(setDoc(doc(db, 'messages', 'conversation-1', 'messageThread', 'm1'), {
    senderId: 'member-b',
    body: 'spoofed message'
  }));

  await assertSucceeds(setDoc(doc(db, 'messages', 'conversation-1', 'messageThread', 'm2'), {
    senderId: 'member-a',
    body: 'valid message'
  }));
});

test('normal member cannot write platform statistics', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'active-user'), {
      id: 'active-user',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
  });

  const db = testEnv.authenticatedContext('active-user').firestore();

  await assertFails(setDoc(doc(db, 'platformStats', 'counts'), {
    activeOpportunities: 999
  }));
});

test('platform admin can manage authority records', async () => {
  const db = testEnv.authenticatedContext('platform-admin', { admin: true }).firestore();

  await assertSucceeds(setDoc(doc(db, 'professionalAuthorities', 'authority-2'), {
    id: 'authority-2',
    governedCadres: ['pharmacist'],
    isActive: true
  }));
});


test('job interest count can increase only with a first deterministic interest event', async () => {
  const now = Date.now();

  await seed(async db => {
    await setDoc(doc(db, 'users', 'professional-interest'), {
      id: 'professional-interest',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'jobPostings', 'job-1'), {
      organisationUserId: 'organisation-owner',
      status: 'active',
      expiresAt: Timestamp.fromMillis(now + 86400000),
      interestCount: 0
    });
  });

  const db = testEnv.authenticatedContext('professional-interest').firestore();
  const eventRef = doc(db, 'interestEvents', 'job_interest__job-1__professional-interest');
  const jobRef = doc(db, 'jobPostings', 'job-1');

  await assertFails(updateDoc(jobRef, { interestCount: increment(1) }));

  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.set(eventRef, {
      actorId: 'professional-interest',
      targetId: 'job-1',
      type: 'job_interest',
      timestamp: Timestamp.now()
    });
    transaction.update(jobRef, { interestCount: increment(1) });
  }));

  await assertFails(updateDoc(jobRef, { interestCount: increment(1) }));
});

test('organisation cannot create a job-interest event intended for professionals', async () => {
  const now = Date.now();

  await seed(async db => {
    await setDoc(doc(db, 'users', 'organisation-interest'), {
      id: 'organisation-interest',
      accountType: 'organisation',
      accountClass: 'organisation',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: false
    });
    await setDoc(doc(db, 'jobPostings', 'job-2'), {
      organisationUserId: 'another-organisation',
      status: 'active',
      expiresAt: Timestamp.fromMillis(now + 86400000),
      interestCount: 0
    });
  });

  const db = testEnv.authenticatedContext('organisation-interest').firestore();

  await assertFails(setDoc(
    doc(db, 'interestEvents', 'job_interest__job-2__organisation-interest'),
    {
      actorId: 'organisation-interest',
      targetId: 'job-2',
      type: 'job_interest',
      timestamp: Timestamp.now()
    }
  ));
});

test('availability interest is restricted to active organisation accounts and deterministic event IDs', async () => {
  const now = Date.now();

  await seed(async db => {
    await setDoc(doc(db, 'users', 'organisation-1'), {
      id: 'organisation-1',
      accountType: 'organisation',
      accountClass: 'organisation',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: false
    });
    await setDoc(doc(db, 'availabilityPosts', 'availability-1'), {
      individualUserId: 'professional-owner',
      status: 'active',
      expiresAt: Timestamp.fromMillis(now + 86400000),
      interestCount: 0
    });
  });

  const db = testEnv.authenticatedContext('organisation-1').firestore();
  const postRef = doc(db, 'availabilityPosts', 'availability-1');
  const eventRef = doc(db, 'interestEvents', 'availability_interest__availability-1__organisation-1');

  await assertFails(setDoc(doc(db, 'interestEvents', 'random-id'), {
    actorId: 'organisation-1',
    targetId: 'availability-1',
    type: 'availability_interest',
    timestamp: Timestamp.now()
  }));

  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.set(eventRef, {
      actorId: 'organisation-1',
      targetId: 'availability-1',
      type: 'availability_interest',
      timestamp: Timestamp.now()
    });
    transaction.update(postRef, { interestCount: increment(1) });
  }));
});


test('confidential business private details are hidden from other active members', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'seller-private'), {
      id: 'seller-private',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'users', 'member-reader'), {
      id: 'member-reader',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'businessListings', 'business-private'), {
      sellerUserId: 'seller-private',
      isConfidential: true,
      photoUrls: [],
      status: 'active'
    });
    await setDoc(doc(db, 'businessListingPrivate', 'business-private'), {
      sellerUserId: 'seller-private',
      locationDescription: 'Exact private location',
      contactDetail: '+256700000000'
    });
  });

  const readerDb = testEnv.authenticatedContext('member-reader').firestore();
  const sellerDb = testEnv.authenticatedContext('seller-private').firestore();

  await assertFails(getDoc(doc(readerDb, 'businessListingPrivate', 'business-private')));
  await assertSucceeds(getDoc(doc(sellerDb, 'businessListingPrivate', 'business-private')));
});

test('non-confidential business private contact details are available to active members', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'seller-public'), {
      id: 'seller-public',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'users', 'member-reader-2'), {
      id: 'member-reader-2',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'businessListings', 'business-public'), {
      sellerUserId: 'seller-public',
      isConfidential: false,
      photoUrls: [],
      status: 'active'
    });
    await setDoc(doc(db, 'businessListingPrivate', 'business-public'), {
      sellerUserId: 'seller-public',
      locationDescription: 'Member-visible location',
      contactDetail: '+256711111111'
    });
  });

  const readerDb = testEnv.authenticatedContext('member-reader-2').firestore();
  await assertSucceeds(getDoc(doc(readerDb, 'businessListingPrivate', 'business-public')));
});

test('business listing rules reject more than three public photo references', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'business-seller'), {
      id: 'business-seller',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
  });

  const db = testEnv.authenticatedContext('business-seller').firestore();

  await assertFails(setDoc(doc(db, 'businessListings', 'too-many-photos'), {
    sellerUserId: 'business-seller',
    isConfidential: false,
    status: 'active',
    photoUrls: ['1', '2', '3', '4']
  }));
});
