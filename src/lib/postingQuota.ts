import {
  doc,
  runTransaction,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction
} from 'firebase/firestore';
import { db } from './firebase';

export type PostingQuotaType = 'job' | 'availability' | 'business';

type QuotaConfig = {
  collectionName: 'jobPostings' | 'availabilityPosts' | 'businessListings';
  ownerField: 'organisationUserId' | 'individualUserId' | 'sellerUserId';
  limit: number;
  renewalDays: number;
};

const QUOTA_CONFIG: Record<PostingQuotaType, QuotaConfig> = {
  job: {
    collectionName: 'jobPostings',
    ownerField: 'organisationUserId',
    limit: 5,
    renewalDays: 60
  },
  availability: {
    collectionName: 'availabilityPosts',
    ownerField: 'individualUserId',
    limit: 1,
    renewalDays: 60
  },
  business: {
    collectionName: 'businessListings',
    ownerField: 'sellerUserId',
    limit: 3,
    renewalDays: 90
  }
};

export class PostingQuotaExceededError extends Error {
  constructor(public readonly quotaType: PostingQuotaType) {
    super(`No free ${quotaType} posting quota slot is available.`);
    this.name = 'PostingQuotaExceededError';
  }
}

export class PostingRenewalNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostingRenewalNotAllowedError';
  }
}

const toMillis = (value: any): number => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const quotaSlotRef = (ownerUid: string, quotaType: PostingQuotaType, slotKey: string) =>
  doc(db, 'postingQuotaSlots', ownerUid, 'slots', `${quotaType}_${slotKey}`);

const postingRefFor = (quotaType: PostingQuotaType, postingId: string) =>
  doc(db, QUOTA_CONFIG[quotaType].collectionName, postingId);

const findAvailableQuotaSlot = async (
  transaction: Transaction,
  ownerUid: string,
  quotaType: PostingQuotaType,
  preferredPostingId?: string
): Promise<string> => {
  const config = QUOTA_CONFIG[quotaType];
  const slotSnapshots: Array<{
    slotKey: string;
    snapshot: DocumentSnapshot<DocumentData>;
  }> = [];

  for (let index = 0; index < config.limit; index += 1) {
    const slotKey = String(index);
    const snapshot = await transaction.get(quotaSlotRef(ownerUid, quotaType, slotKey));
    slotSnapshots.push({ slotKey, snapshot });
  }

  if (preferredPostingId) {
    const existing = slotSnapshots.find(
      ({ snapshot }) => snapshot.exists() && snapshot.data().postingId === preferredPostingId
    );
    if (existing) return existing.slotKey;
  }

  const nowMillis = Date.now();

  for (const { slotKey, snapshot } of slotSnapshots) {
    if (!snapshot.exists()) return slotKey;

    const slotData = snapshot.data();
    if (!slotData.postingId) return slotKey;

    const targetSnapshot = await transaction.get(
      postingRefFor(quotaType, slotData.postingId)
    );

    if (!targetSnapshot.exists()) return slotKey;

    const targetData = targetSnapshot.data();
    const stillCounts =
      targetData.status === 'active' &&
      toMillis(targetData.expiresAt) > nowMillis;

    if (!stillCounts) return slotKey;
  }

  throw new PostingQuotaExceededError(quotaType);
};

type CompanionWrite = (transaction: Transaction) => void;

export const createPostingWithQuota = async ({
  quotaType,
  ownerUid,
  postingRef,
  postingData,
  companionWrite
}: {
  quotaType: PostingQuotaType;
  ownerUid: string;
  postingRef: DocumentReference;
  postingData: Record<string, any>;
  companionWrite?: CompanionWrite;
}) => {
  return runTransaction(db, async transaction => {
    const slotKey = await findAvailableQuotaSlot(transaction, ownerUid, quotaType);
    const expiresAt = postingData.expiresAt;
    const updatedAt = Timestamp.now();

    transaction.set(postingRef, {
      ...postingData,
      quotaSlot: slotKey
    });

    transaction.set(quotaSlotRef(ownerUid, quotaType, slotKey), {
      ownerUserId: ownerUid,
      resourceType: quotaType,
      slotKey,
      postingId: postingRef.id,
      expiresAt,
      updatedAt
    });

    companionWrite?.(transaction);
    return slotKey;
  });
};

export const renewPostingWithQuota = async ({
  quotaType,
  ownerUid,
  postingId
}: {
  quotaType: PostingQuotaType;
  ownerUid: string;
  postingId: string;
}) => {
  const config = QUOTA_CONFIG[quotaType];

  return runTransaction(db, async transaction => {
    const postingRef = postingRefFor(quotaType, postingId);
    const postingSnapshot = await transaction.get(postingRef);

    if (!postingSnapshot.exists()) {
      throw new PostingRenewalNotAllowedError('The posting no longer exists.');
    }

    const posting = postingSnapshot.data();
    if (posting[config.ownerField] !== ownerUid) {
      throw new PostingRenewalNotAllowedError('Only the posting owner can renew it.');
    }

    const now = Timestamp.now();
    const nowMillis = now.toMillis();
    const expiresMillis = toMillis(posting.expiresAt);

    if (quotaType === 'business') {
      if (posting.status !== 'active') {
        throw new PostingRenewalNotAllowedError('Only active business listings can be renewed.');
      }

      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      if (expiresMillis - nowMillis > fourteenDays) {
        throw new PostingRenewalNotAllowedError('This listing is not yet within its renewal window.');
      }
    } else {
      if (posting.status === 'closed') {
        throw new PostingRenewalNotAllowedError('Closed postings cannot be renewed.');
      }

      if (expiresMillis > nowMillis) {
        throw new PostingRenewalNotAllowedError('This posting has not expired yet.');
      }
    }

    const slotKey = await findAvailableQuotaSlot(
      transaction,
      ownerUid,
      quotaType,
      postingId
    );

    const expiresAt = Timestamp.fromMillis(
      nowMillis + config.renewalDays * 24 * 60 * 60 * 1000
    );

    transaction.update(postingRef, {
      status: 'active',
      expiresAt,
      renewedAt: now,
      quotaSlot: slotKey
    });

    transaction.set(quotaSlotRef(ownerUid, quotaType, slotKey), {
      ownerUserId: ownerUid,
      resourceType: quotaType,
      slotKey,
      postingId,
      expiresAt,
      updatedAt: now
    });

    return { slotKey, expiresAt };
  });
};
