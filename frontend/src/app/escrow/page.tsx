'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getEscrowBalance, getEscrowPayments, depositToEscrow } from '@/lib/api';
import { EscrowAccount, EscrowPayment } from '@/lib/types';

export default function EscrowPage() {
  const { user } = useAuth();
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null);
  const [payments, setPayments] = useState<EscrowPayment[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    Promise.all([getEscrowBalance(user.nearAccountId), getEscrowPayments()])
      .then(([balance, history]) => {
        setEscrow(balance);
        setPayments(history);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (USE_DUMMY) {
      alert(`Deposit of ${amount} NEAR initiated (mock).`);
    } else {
      const nearAmount = (amount * 1e24).toLocaleString('fullwide', { useGrouping: false });
      const txParams = await depositToEscrow(nearAmount);
      alert(
        `Transaction prepared:\nContract: ${txParams.contractId}\nMethod: ${txParams.methodName}\nDeposit: ${amount} NEAR\n\nWallet signing will be available in Stage 7.`
      );
    }
    setDepositAmount('');
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            Escrow Account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your escrow funds on NEAR Protocol
          </p>
        </div>
        <div className="rounded-2xl border border-border/10 bg-card p-12 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-muted-foreground animate-spin">
            progress_activity
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Escrow Account
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your escrow funds on NEAR Protocol
        </p>
      </div>

      {/* Balance + Deposit Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance Card */}
        <div className="rounded-2xl border border-border/10 bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined text-lg">account_balance</span>
            <span className="text-sm font-medium">Available Balance</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-[var(--font-manrope)] text-4xl font-extrabold text-foreground tracking-tight">
              {escrow?.balance.toFixed(2) ?? '0.00'}
            </span>
            <div className="flex items-center gap-1.5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" />
                <text
                  x="12"
                  y="16"
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  N
                </text>
              </svg>
              <span className="text-lg font-semibold text-muted-foreground">NEAR</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span
              className={`w-2 h-2 rounded-full ${escrow?.agentKeySet ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-xs text-muted-foreground">
              Agent Key: {escrow?.agentKeySet ? 'Configured' : 'Not Set'}
            </span>
          </div>
        </div>

        {/* Deposit Card */}
        <div className="rounded-2xl border border-border/10 bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span className="text-sm font-medium">Deposit Funds</span>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full bg-muted rounded-xl px-4 py-3 pr-16 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                NEAR
              </span>
            </div>
            <button
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
              Deposit
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Funds are held in a NEAR smart contract and released upon agreement completion.
          </p>
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-2xl border border-border/10 bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/10 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-muted-foreground">receipt_long</span>
          <h2 className="font-[var(--font-manrope)] text-base font-bold text-foreground">
            Payment History
          </h2>
          <span className="ml-auto px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            {payments.length} transactions
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-muted-foreground/50 mb-2">
              receipt_long
            </span>
            <p className="text-sm text-muted-foreground">No payment history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/10">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    TX Hash
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Payment Row ─────────────────────────── */

function PaymentRow({ payment }: { payment: EscrowPayment }) {
  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // The dummy EscrowPayment type uses seekerId + amount + timestamp + txHash.
  // We display all payments as "Release" type since the dummy data represents completed payments.
  const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
    DEPOSIT: {
      label: 'Deposit',
      color: 'bg-green-500/10 text-green-400 border-green-500/20',
      icon: 'arrow_downward',
    },
    HOLD: {
      label: 'Hold',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: 'lock',
    },
    RELEASE: {
      label: 'Release',
      color: 'bg-primary/10 text-primary border-primary/20',
      icon: 'arrow_upward',
    },
    REFUND: {
      label: 'Refund',
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      icon: 'undo',
    },
  };

  const config = typeConfig['RELEASE'];

  return (
    <tr className="border-b border-border/5 hover:bg-accent/30 transition-colors">
      <td className="px-6 py-4">
        <div>
          <p className="text-sm text-foreground">{formatDate(payment.timestamp)}</p>
          <p className="text-xs text-muted-foreground">{formatTime(payment.timestamp)}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${config.color}`}
        >
          <span className="material-symbols-outlined text-sm">{config.icon}</span>
          {config.label}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="text-sm font-semibold text-foreground">
          {payment.amount.toFixed(2)} NEAR
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Completed
        </span>
      </td>
      <td className="px-6 py-4">
        {payment.txHash ? (
          <span className="text-xs text-muted-foreground font-mono">
            {payment.txHash}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">{'\u2014'}</span>
        )}
      </td>
    </tr>
  );
}
