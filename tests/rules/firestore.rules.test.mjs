import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { readFile } from 'node:fs/promises';

const projectId = 'demo-pharmanetwork';
let testEnv;

const seed = async (callback) => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await callback(context.firestore());
  });
};

const quotaSlotRef = (db, ownerUid, type, slotKey) =>
  doc(db, 'postingQuotaSlots', ownerUid, 'slots', `${type}_${slotKey}`);

const setQuotaSlot = (transaction, db, { ownerUid, type, slotKey, postingId, expiresAt }) => {
  transaction.set(quotaSlotRef(db, ownerUid, type, slotKey), {
    ownerUserId: ownerUid,
    resourceType: type,
    slotKey,
    postingId,
    expiresAt,
    updatedAt: Timestamp.now()
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

test('isActive flag alone does not grant member-network access when accountStatus is not ACTIVE', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'status-drift-user'), {
      id: 'status-drift-user',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'SUSPENDED_BY_AUTHORITY',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'individualProfiles', 'visible-target'), {
      fullName: 'Visible Target',
      primaryCadre: 'pharmacist',
      profileCompleteness: 90,
      isDirectoryVisible: true
    });
  });

  const driftDb = testEnv.authenticatedContext('status-drift-user').firestore();
  await assertFails(getDoc(doc(driftDb, 'individualProfiles', 'visible-target')));
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

test('authority privilege is disabled when the parent professional authority is inactive', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'professionalAuthorities', 'disabled-authority'), {
      id: 'disabled-authority',
      governedCadres: ['pharmacist'],
      isActive: false
    });
    await setDoc(doc(db, 'professionalAuthorityAdmins', 'disabled-authority-user'), {
      uid: 'disabled-authority-user',
      authorityId: 'disabled-authority',
      scopedCadres: ['pharmacist'],
      role: 'verification_officer',
      isActive: true
    });
    await setDoc(doc(db, 'individualProfiles', 'target-disabled-authority'), {
      fullName: 'Target Professional',
      primaryCadre: 'pharmacist',
      registrationNumber: 'REG-DISABLED',
      credentialVerificationStatus: 'unverified',
      profileCompleteness: 80,
      isDirectoryVisible: false
    });
  });

  const db = testEnv.authenticatedContext(
    'disabled-authority-user',
    { authority_admin: true }
  ).firestore();

  await assertFails(getDoc(doc(db, 'individualProfiles', 'target-disabled-authority')));
  await assertFails(updateDoc(doc(db, 'individualProfiles', 'target-disabled-authority'), {
    credentialVerificationStatus: 'verified',
    isDirectoryVisible: false
  }));
});

test('authority staff cannot cross authority boundaries and reviewer cannot mutate standing', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'professionalAuthorities', 'authority-a'), {
      id: 'authority-a',
      governedCadres: ['pharmacist'],
      isActive: true
    });
    await setDoc(doc(db, 'professionalAuthorities', 'authority-b'), {
      id: 'authority-b',
      governedCadres: ['nurse'],
      isActive: true
    });
    await setDoc(doc(db, 'professionalAuthorityAdmins', 'reviewer-a'), {
      uid: 'reviewer-a',
      authorityId: 'authority-a',
      scopedCadres: ['pharmacist'],
      role: 'reviewer',
      isActive: true
    });
    await setDoc(doc(db, 'professionalAuthorityAdmins', 'staff-b'), {
      uid: 'staff-b',
      authorityId: 'authority-b',
      scopedCadres: ['nurse'],
      role: 'verification_officer',
      isActive: true
    });
    await setDoc(doc(db, 'individualProfiles', 'pharmacist-target'), {
      fullName: 'Pharmacist Target',
      primaryCadre: 'pharmacist',
      registrationNumber: 'REG-A',
      credentialVerificationStatus: 'unverified',
      practisingLicenceStatus: 'not_renewed',
      profileCompleteness: 80,
      isDirectoryVisible: false
    });
    await setDoc(doc(db, 'individualProfiles', 'nurse-target'), {
      fullName: 'Nurse Target',
      primaryCadre: 'nurse',
      registrationNumber: 'REG-B',
      credentialVerificationStatus: 'unverified',
      profileCompleteness: 80,
      isDirectoryVisible: false
    });
  });

  const reviewerDb = testEnv.authenticatedContext('reviewer-a', { authority_admin: true }).firestore();

  await assertSucceeds(getDoc(doc(reviewerDb, 'individualProfiles', 'pharmacist-target')));
  await assertFails(getDoc(doc(reviewerDb, 'individualProfiles', 'nurse-target')));
  await assertFails(getDoc(doc(reviewerDb, 'professionalAuthorityAdmins', 'staff-b')));

  await assertFails(updateDoc(doc(reviewerDb, 'individualProfiles', 'pharmacist-target'), {
    credentialVerificationStatus: 'verified',
    isDirectoryVisible: false
  }));

  await assertFails(updateDoc(doc(reviewerDb, 'individualProfiles', 'pharmacist-target'), {
    practisingLicenceStatus: 'renewed_current',
    isDirectoryVisible: false
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

test('privilege audit logs are immutable from clients and readable only by platform admins', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'privilegeAuditLogs', 'audit-1'), {
      action: 'GRANT_PLATFORM_ADMIN',
      actor: 'bootstrap-operator',
      targetUid: 'target-admin',
      privilege: 'admin'
    });
  });

  const memberDb = testEnv.authenticatedContext('normal-member').firestore();
  const adminDb = testEnv.authenticatedContext('platform-admin', { admin: true }).firestore();

  await assertFails(getDoc(doc(memberDb, 'privilegeAuditLogs', 'audit-1')));
  await assertSucceeds(getDoc(doc(adminDb, 'privilegeAuditLogs', 'audit-1')));

  await assertFails(setDoc(doc(adminDb, 'privilegeAuditLogs', 'client-created'), {
    action: 'CLIENT_WRITE_SHOULD_FAIL'
  }));

  await assertFails(updateDoc(doc(adminDb, 'privilegeAuditLogs', 'audit-1'), {
    action: 'MUTATED'
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
      status: 'active',
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
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


test('opportunity creation rejects expiry windows beyond the allowed period', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'org-expiry'), {
      id: 'org-expiry',
      accountType: 'organisation',
      accountClass: 'organisation',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: false
    });
    await setDoc(doc(db, 'users', 'professional-expiry'), {
      id: 'professional-expiry',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
  });

  const orgDb = testEnv.authenticatedContext('org-expiry').firestore();
  const professionalDb = testEnv.authenticatedContext('professional-expiry').firestore();
  const now = Date.now();

  const validJobExpiry = Timestamp.fromMillis(now + 59 * 24 * 60 * 60 * 1000);
  await assertSucceeds(runTransaction(orgDb, async transaction => {
    transaction.set(doc(orgDb, 'jobPostings', 'job-valid-expiry'), {
      organisationUserId: 'org-expiry',
      status: 'active',
      interestCount: 0,
      quotaSlot: '0',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: validJobExpiry
    });
    setQuotaSlot(transaction, orgDb, {
      ownerUid: 'org-expiry',
      type: 'job',
      slotKey: '0',
      postingId: 'job-valid-expiry',
      expiresAt: validJobExpiry
    });
  }));

  const tooLongJobExpiry = Timestamp.fromMillis(now + 61 * 24 * 60 * 60 * 1000);
  await assertFails(runTransaction(orgDb, async transaction => {
    transaction.set(doc(orgDb, 'jobPostings', 'job-too-long'), {
      organisationUserId: 'org-expiry',
      status: 'active',
      interestCount: 0,
      quotaSlot: '1',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: tooLongJobExpiry
    });
    setQuotaSlot(transaction, orgDb, {
      ownerUid: 'org-expiry',
      type: 'job',
      slotKey: '1',
      postingId: 'job-too-long',
      expiresAt: tooLongJobExpiry
    });
  }));

  const tooLongAvailabilityExpiry = Timestamp.fromMillis(now + 61 * 24 * 60 * 60 * 1000);
  await assertFails(runTransaction(professionalDb, async transaction => {
    transaction.set(doc(professionalDb, 'availabilityPosts', 'availability-too-long'), {
      individualUserId: 'professional-expiry',
      status: 'active',
      interestCount: 0,
      quotaSlot: '0',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: tooLongAvailabilityExpiry
    });
    setQuotaSlot(transaction, professionalDb, {
      ownerUid: 'professional-expiry',
      type: 'availability',
      slotKey: '0',
      postingId: 'availability-too-long',
      expiresAt: tooLongAvailabilityExpiry
    });
  }));
});

test('posting owners cannot directly rewrite interest counters', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'org-owner-counter'), {
      id: 'org-owner-counter',
      accountType: 'organisation',
      accountClass: 'organisation',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: false
    });
    await setDoc(doc(db, 'jobPostings', 'job-counter'), {
      organisationUserId: 'org-owner-counter',
      status: 'active',
      interestCount: 2,
      createdAt: Timestamp.fromMillis(Date.now() - 1000),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  });

  const db = testEnv.authenticatedContext('org-owner-counter').firestore();

  await assertFails(updateDoc(doc(db, 'jobPostings', 'job-counter'), {
    interestCount: 99
  }));

  await assertSucceeds(updateDoc(doc(db, 'jobPostings', 'job-counter'), {
    title: 'Updated owner-controlled title'
  }));
});

test('business listings enforce 90-day expiry and immutable view count', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'business-rule-owner'), {
      id: 'business-rule-owner',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
  });

  const db = testEnv.authenticatedContext('business-rule-owner').firestore();
  const now = Date.now();

  const validBusinessExpiry = Timestamp.fromMillis(now + 89 * 24 * 60 * 60 * 1000);
  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.set(doc(db, 'businessListings', 'business-valid'), {
      sellerUserId: 'business-rule-owner',
      isConfidential: false,
      photoUrls: [],
      status: 'active',
      viewCount: 0,
      quotaSlot: '0',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: validBusinessExpiry
    });
    setQuotaSlot(transaction, db, {
      ownerUid: 'business-rule-owner',
      type: 'business',
      slotKey: '0',
      postingId: 'business-valid',
      expiresAt: validBusinessExpiry
    });
  }));

  const tooLongBusinessExpiry = Timestamp.fromMillis(now + 91 * 24 * 60 * 60 * 1000);
  await assertFails(runTransaction(db, async transaction => {
    transaction.set(doc(db, 'businessListings', 'business-too-long'), {
      sellerUserId: 'business-rule-owner',
      isConfidential: false,
      photoUrls: [],
      status: 'active',
      viewCount: 0,
      quotaSlot: '1',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: tooLongBusinessExpiry
    });
    setQuotaSlot(transaction, db, {
      ownerUid: 'business-rule-owner',
      type: 'business',
      slotKey: '1',
      postingId: 'business-too-long',
      expiresAt: tooLongBusinessExpiry
    });
  }));

  await assertFails(updateDoc(doc(db, 'businessListings', 'business-valid'), {
    viewCount: 100
  }));
});


test('job posting creation requires one of five authoritative quota slots', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'quota-org'), {
      id: 'quota-org',
      accountType: 'organisation',
      accountClass: 'organisation',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: false
    });
  });

  const db = testEnv.authenticatedContext('quota-org').firestore();
  const now = Date.now();

  await assertFails(setDoc(doc(db, 'jobPostings', 'job-without-slot'), {
    organisationUserId: 'quota-org',
    status: 'active',
    interestCount: 0,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000)
  }));

  for (let index = 0; index < 5; index += 1) {
    const slotKey = String(index);
    const postingId = `quota-job-${index}`;
    const expiresAt = Timestamp.fromMillis(now + (30 + index) * 24 * 60 * 60 * 1000);

    await assertSucceeds(runTransaction(db, async transaction => {
      transaction.set(doc(db, 'jobPostings', postingId), {
        organisationUserId: 'quota-org',
        status: 'active',
        interestCount: 0,
        quotaSlot: slotKey,
        createdAt: Timestamp.fromMillis(now),
        expiresAt
      });
      setQuotaSlot(transaction, db, {
        ownerUid: 'quota-org',
        type: 'job',
        slotKey,
        postingId,
        expiresAt
      });
    }));
  }

  const sixthExpiry = Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000);
  await assertFails(runTransaction(db, async transaction => {
    transaction.set(doc(db, 'jobPostings', 'quota-job-sixth'), {
      organisationUserId: 'quota-org',
      status: 'active',
      interestCount: 0,
      quotaSlot: '5',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: sixthExpiry
    });
    setQuotaSlot(transaction, db, {
      ownerUid: 'quota-org',
      type: 'job',
      slotKey: '5',
      postingId: 'quota-job-sixth',
      expiresAt: sixthExpiry
    });
  }));
});

test('an occupied active quota slot cannot be reassigned to another availability post', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'users', 'quota-professional'), {
      id: 'quota-professional',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
  });

  const db = testEnv.authenticatedContext('quota-professional').firestore();
  const now = Date.now();
  const firstExpiry = Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000);

  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.set(doc(db, 'availabilityPosts', 'availability-first'), {
      individualUserId: 'quota-professional',
      status: 'active',
      interestCount: 0,
      quotaSlot: '0',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: firstExpiry
    });
    setQuotaSlot(transaction, db, {
      ownerUid: 'quota-professional',
      type: 'availability',
      slotKey: '0',
      postingId: 'availability-first',
      expiresAt: firstExpiry
    });
  }));

  const secondExpiry = Timestamp.fromMillis(now + 40 * 24 * 60 * 60 * 1000);
  await assertFails(runTransaction(db, async transaction => {
    transaction.set(doc(db, 'availabilityPosts', 'availability-second'), {
      individualUserId: 'quota-professional',
      status: 'active',
      interestCount: 0,
      quotaSlot: '0',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: secondExpiry
    });
    setQuotaSlot(transaction, db, {
      ownerUid: 'quota-professional',
      type: 'availability',
      slotKey: '0',
      postingId: 'availability-second',
      expiresAt: secondExpiry
    });
  }));
});

test('expired quota slots can be atomically reused', async () => {
  const now = Date.now();

  await seed(async db => {
    await setDoc(doc(db, 'users', 'quota-reuse-owner'), {
      id: 'quota-reuse-owner',
      accountType: 'organisation',
      accountClass: 'organisation',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: false
    });
    await setDoc(doc(db, 'jobPostings', 'expired-old-job'), {
      organisationUserId: 'quota-reuse-owner',
      status: 'active',
      interestCount: 0,
      quotaSlot: '0',
      createdAt: Timestamp.fromMillis(now - 70 * 24 * 60 * 60 * 1000),
      expiresAt: Timestamp.fromMillis(now - 10 * 24 * 60 * 60 * 1000)
    });
    await setDoc(quotaSlotRef(db, 'quota-reuse-owner', 'job', '0'), {
      ownerUserId: 'quota-reuse-owner',
      resourceType: 'job',
      slotKey: '0',
      postingId: 'expired-old-job',
      expiresAt: Timestamp.fromMillis(now - 10 * 24 * 60 * 60 * 1000),
      updatedAt: Timestamp.fromMillis(now - 10 * 24 * 60 * 60 * 1000)
    });
  });

  const db = testEnv.authenticatedContext('quota-reuse-owner').firestore();
  const newExpiry = Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000);

  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.set(doc(db, 'jobPostings', 'replacement-job'), {
      organisationUserId: 'quota-reuse-owner',
      status: 'active',
      interestCount: 0,
      quotaSlot: '0',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: newExpiry
    });
    setQuotaSlot(transaction, db, {
      ownerUid: 'quota-reuse-owner',
      type: 'job',
      slotKey: '0',
      postingId: 'replacement-job',
      expiresAt: newExpiry
    });
  }));
});


test('non-owners can read only active unexpired opportunity and business documents', async () => {
  const now = Date.now();
  const future = Timestamp.fromMillis(now + 24 * 60 * 60 * 1000);
  const past = Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

  await seed(async db => {
    for (const [uid, accountType, accountClass] of [
      ['visibility-reader', 'individual', 'professional'],
      ['visibility-org-owner', 'organisation', 'organisation'],
      ['visibility-prof-owner', 'individual', 'professional'],
      ['visibility-business-owner', 'individual', 'professional']
    ]) {
      await setDoc(doc(db, 'users', uid), {
        id: uid,
        accountType,
        accountClass,
        accountStatus: 'ACTIVE',
        isActive: true,
        isVerified: accountType === 'individual'
      });
    }

    await setDoc(doc(db, 'jobPostings', 'job-visible'), {
      organisationUserId: 'visibility-org-owner',
      status: 'active',
      expiresAt: future
    });
    await setDoc(doc(db, 'jobPostings', 'job-closed'), {
      organisationUserId: 'visibility-org-owner',
      status: 'closed',
      expiresAt: future
    });
    await setDoc(doc(db, 'jobPostings', 'job-expired'), {
      organisationUserId: 'visibility-org-owner',
      status: 'active',
      expiresAt: past
    });

    await setDoc(doc(db, 'availabilityPosts', 'availability-visible'), {
      individualUserId: 'visibility-prof-owner',
      status: 'active',
      expiresAt: future
    });
    await setDoc(doc(db, 'availabilityPosts', 'availability-expired'), {
      individualUserId: 'visibility-prof-owner',
      status: 'active',
      expiresAt: past
    });

    await setDoc(doc(db, 'businessListings', 'business-visible'), {
      sellerUserId: 'visibility-business-owner',
      isConfidential: false,
      status: 'active',
      expiresAt: future
    });
    await setDoc(doc(db, 'businessListings', 'business-sold'), {
      sellerUserId: 'visibility-business-owner',
      isConfidential: false,
      status: 'sold',
      expiresAt: future
    });
    await setDoc(doc(db, 'businessListings', 'business-expired'), {
      sellerUserId: 'visibility-business-owner',
      isConfidential: false,
      status: 'active',
      expiresAt: past
    });
  });

  const readerDb = testEnv.authenticatedContext('visibility-reader').firestore();
  const orgOwnerDb = testEnv.authenticatedContext('visibility-org-owner').firestore();
  const profOwnerDb = testEnv.authenticatedContext('visibility-prof-owner').firestore();
  const businessOwnerDb = testEnv.authenticatedContext('visibility-business-owner').firestore();

  await assertSucceeds(getDoc(doc(readerDb, 'jobPostings', 'job-visible')));
  await assertFails(getDoc(doc(readerDb, 'jobPostings', 'job-closed')));
  await assertFails(getDoc(doc(readerDb, 'jobPostings', 'job-expired')));
  await assertSucceeds(getDoc(doc(orgOwnerDb, 'jobPostings', 'job-closed')));

  await assertSucceeds(getDoc(doc(readerDb, 'availabilityPosts', 'availability-visible')));
  await assertFails(getDoc(doc(readerDb, 'availabilityPosts', 'availability-expired')));
  await assertSucceeds(getDoc(doc(profOwnerDb, 'availabilityPosts', 'availability-expired')));

  await assertSucceeds(getDoc(doc(readerDb, 'businessListings', 'business-visible')));
  await assertFails(getDoc(doc(readerDb, 'businessListings', 'business-sold')));
  await assertFails(getDoc(doc(readerDb, 'businessListings', 'business-expired')));
  await assertSucceeds(getDoc(doc(businessOwnerDb, 'businessListings', 'business-sold')));
});

test('expired non-confidential business private details are hidden from other members', async () => {
  const past = Timestamp.fromMillis(Date.now() - 60 * 1000);

  await seed(async db => {
    await setDoc(doc(db, 'users', 'private-expired-owner'), {
      id: 'private-expired-owner',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'users', 'private-expired-reader'), {
      id: 'private-expired-reader',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'businessListings', 'private-expired-listing'), {
      sellerUserId: 'private-expired-owner',
      isConfidential: false,
      status: 'active',
      expiresAt: past
    });
    await setDoc(doc(db, 'businessListingPrivate', 'private-expired-listing'), {
      sellerUserId: 'private-expired-owner',
      contactDetail: '+256700000000'
    });
  });

  const readerDb = testEnv.authenticatedContext('private-expired-reader').firestore();
  const ownerDb = testEnv.authenticatedContext('private-expired-owner').firestore();

  await assertFails(getDoc(doc(readerDb, 'businessListingPrivate', 'private-expired-listing')));
  await assertSucceeds(getDoc(doc(ownerDb, 'businessListingPrivate', 'private-expired-listing')));
});


test('member board queries satisfy active and unexpired read rules', async () => {
  const now = Date.now();
  const future = Timestamp.fromMillis(now + 24 * 60 * 60 * 1000);
  const past = Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

  await seed(async db => {
    await setDoc(doc(db, 'users', 'board-reader'), {
      id: 'board-reader',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });
    await setDoc(doc(db, 'jobPostings', 'board-job-active'), {
      organisationUserId: 'another-org',
      status: 'active',
      expiresAt: future
    });
    await setDoc(doc(db, 'jobPostings', 'board-job-expired'), {
      organisationUserId: 'another-org',
      status: 'active',
      expiresAt: past
    });
  });

  const db = testEnv.authenticatedContext('board-reader').firestore();
  const cutoff = Timestamp.now();
  const boardQuery = query(
    collection(db, 'jobPostings'),
    where('status', '==', 'active'),
    where('expiresAt', '>', cutoff)
  );

  const snapshot = await assertSucceeds(getDocs(boardQuery));
  assert.equal(snapshot.size, 1);
  assert.equal(snapshot.docs[0].id, 'board-job-active');
});


test('posting owners can list their own closed and expired history', async () => {
  const now = Date.now();
  const future = Timestamp.fromMillis(now + 24 * 60 * 60 * 1000);
  const past = Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

  await seed(async db => {
    await setDoc(doc(db, 'users', 'history-org'), {
      id: 'history-org',
      accountType: 'organisation',
      accountClass: 'organisation',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: false
    });
    await setDoc(doc(db, 'users', 'history-professional'), {
      id: 'history-professional',
      accountType: 'individual',
      accountClass: 'professional',
      accountStatus: 'ACTIVE',
      isActive: true,
      isVerified: true
    });

    await setDoc(doc(db, 'jobPostings', 'history-job-closed'), {
      organisationUserId: 'history-org',
      status: 'closed',
      expiresAt: future
    });
    await setDoc(doc(db, 'jobPostings', 'history-job-expired'), {
      organisationUserId: 'history-org',
      status: 'active',
      expiresAt: past
    });

    await setDoc(doc(db, 'availabilityPosts', 'history-availability-closed'), {
      individualUserId: 'history-professional',
      status: 'closed',
      expiresAt: future
    });
    await setDoc(doc(db, 'availabilityPosts', 'history-availability-expired'), {
      individualUserId: 'history-professional',
      status: 'active',
      expiresAt: past
    });

    await setDoc(doc(db, 'businessListings', 'history-business-sold'), {
      sellerUserId: 'history-professional',
      status: 'sold',
      expiresAt: future
    });
    await setDoc(doc(db, 'businessListings', 'history-business-expired'), {
      sellerUserId: 'history-professional',
      status: 'active',
      expiresAt: past
    });
  });

  const orgDb = testEnv.authenticatedContext('history-org').firestore();
  const professionalDb = testEnv.authenticatedContext('history-professional').firestore();

  const jobHistory = await assertSucceeds(getDocs(query(
    collection(orgDb, 'jobPostings'),
    where('organisationUserId', '==', 'history-org')
  )));
  assert.equal(jobHistory.size, 2);

  const availabilityHistory = await assertSucceeds(getDocs(query(
    collection(professionalDb, 'availabilityPosts'),
    where('individualUserId', '==', 'history-professional')
  )));
  assert.equal(availabilityHistory.size, 2);

  const businessHistory = await assertSucceeds(getDocs(query(
    collection(professionalDb, 'businessListings'),
    where('sellerUserId', '==', 'history-professional')
  )));
  assert.equal(businessHistory.size, 2);
});
