import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { AccountStatus as AccountStatusType } from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
  UserRoundCog
} from 'lucide-react';

const STATUS_COPY: Record<AccountStatusType, {
  title: string;
  description: string;
  guidance: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = {
  PENDING_PROFILE: {
    title: 'Complete your professional profile',
    description: 'Your PharmaNetwork account has been created, but member-network access is not active yet.',
    guidance: 'Complete your professional information and submit the requested verification documents so your account can move to authority review.',
    icon: UserRoundCog
  },
  PENDING_AUTHORITY_VERIFICATION: {
    title: 'Professional verification pending',
    description: 'Your professional details have been submitted for review by the responsible professional authority within PharmaNetwork.',
    guidance: 'You can keep your profile information up to date while you wait. Member-network access will begin only after verification and activation.',
    icon: Clock3
  },
  MORE_INFORMATION_REQUIRED: {
    title: 'More information is required',
    description: 'The reviewing professional authority needs additional or corrected information before your verification can continue.',
    guidance: 'Open your profile, review the verification section and submit the requested information.',
    icon: FileCheck2
  },
  ACTIVE: {
    title: 'Your account is active',
    description: 'Your account currently has access to the PharmaNetwork member network.',
    guidance: 'You can continue to your dashboard and use the member features available to your account.',
    icon: CheckCircle2
  },
  INACTIVE_ANNUAL_COMPLIANCE: {
    title: 'Annual professional compliance is not current',
    description: 'Your professional account is temporarily inactive because current annual professional standing has not been confirmed.',
    guidance: 'Your data is retained, but member-network access and directory visibility remain unavailable until eligibility is restored by the responsible authority.',
    icon: AlertTriangle
  },
  SUSPENDED_BY_AUTHORITY: {
    title: 'Professional access suspended',
    description: 'Your professional access has been suspended by the responsible professional authority.',
    guidance: 'Member-network access and directory visibility are unavailable while this status remains in effect.',
    icon: ShieldAlert
  },
  REJECTED: {
    title: 'Professional verification was not approved',
    description: 'Your current professional verification request was not approved.',
    guidance: 'Review any information provided to you and contact support if you believe further clarification is required.',
    icon: ShieldAlert
  },
  DEACTIVATED_BY_PLATFORM: {
    title: 'Platform access deactivated',
    description: 'Your PharmaNetwork account has been deactivated at platform level.',
    guidance: 'Member-network access is unavailable. Contact PharmaNetwork support for assistance with this account status.',
    icon: ShieldAlert
  }
};

const resolveStatus = (accountStatus: AccountStatusType | undefined, isActive: boolean): AccountStatusType => {
  if (accountStatus) return accountStatus;
  return isActive ? 'ACTIVE' : 'DEACTIVATED_BY_PLATFORM';
};

const AccountStatus: React.FC = () => {
  const { userAccount } = useAuth();

  if (!userAccount) return null;

  const status = resolveStatus(userAccount.accountStatus, userAccount.isActive);
  const copy = STATUS_COPY[status];
  const Icon = copy.icon;
  const isProfessional = userAccount.accountType === 'individual';

  return (
    <div className="min-h-[75vh] bg-zinc-50 px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm p-8 md:p-10">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">
                Account status
              </p>
              <h1 className="text-3xl font-bold text-zinc-900">{copy.title}</h1>
            </div>
          </div>

          <div className="space-y-4 text-zinc-600 leading-relaxed">
            <p>{copy.description}</p>
            <p>{copy.guidance}</p>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <ShieldCheck size={16} className="text-primary" />
              <span>Status code: {status.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {status === 'ACTIVE' ? (
              <Link to="/dashboard" className="flex-1">
                <Button fullWidth>Go to dashboard</Button>
              </Link>
            ) : (
              <>
                {isProfessional && (
                  <Link to="/profile" className="flex-1">
                    <Button fullWidth>Open my profile</Button>
                  </Link>
                )}
                <Link to="/" className="flex-1">
                  <Button fullWidth variant="outline">Back to home</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountStatus;
