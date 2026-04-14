'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getEscrowBalance, getEscrowPayments, depositToEscrow } from '@/lib/api';
import { depositViaWallet, addAgentKey, getEscrowBalanceOnChain } from '@/lib/near';
import { EscrowAccount, EscrowPayment } from '@/lib/types';
import { AINudge } from '@/components/ui/AINudge';

export default function EscrowPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'EMPLOYER') router.replace('/dashboard/seeker');
  }, [user, router]);

  const [escrow, setEscrow] = useState<EscrowAccount | null>(null);
  const [payments, setPayments] = useState<EscrowPayment[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [agentPubKey, setAgentPubKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isSettingKey, setIsSettingKey] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);

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

  const refreshBalance = async () => {
    if (!user) return;
    try {
      const balance = await getEscrowBalance(user.nearAccountId);
      setEscrow(balance);
    } catch {
      // Fallback to on-chain RPC query
      try {
        const rpcBalance = await getEscrowBalanceOnChain(user.nearAccountId);
        setEscrow(prev => prev ? { ...prev, balance: Number(BigInt(rpcBalance)) / 1e24 } : prev);
      } catch { /* ignore */ }
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsDepositing(true);
    setTxStatus(null);

    try {
      if (USE_DUMMY) {
        setTxStatus(`Deposit of ${amount} NEAR initiated (mock).`);
      } else {
        const nearKey = typeof window !== 'undefined' ? localStorage.getItem('nearPrivateKey') : null;
        if (nearKey && user) {
          await depositViaWallet(user.nearAccountId, nearKey, depositAmount);
          setTxStatus(`Successfully deposited ${amount} NEAR.`);
          await refreshBalance();
        } else {
          // Fallback: prepare transaction params via backend
          const nearAmount = (amount * 1e24).toLocaleString('fullwide', { useGrouping: false });
          const txParams = await depositToEscrow(nearAmount);
          setTxStatus(
            `Transaction prepared — Contract: ${txParams.contractId}, Method: ${txParams.methodName}, Deposit: ${amount} NEAR. Sign with your wallet to complete.`
          );
        }
      }
    } catch (e) {
      setTxStatus(`Deposit failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsDepositing(false);
      setDepositAmount('');
    }
  };

  const handleAddAgentKey = async () => {
    if (!agentPubKey.trim() || !user) return;

    setIsSettingKey(true);
    setTxStatus(null);

    try {
      if (USE_DUMMY) {
        setTxStatus('Agent key configured (mock).');
        setEscrow(prev => prev ? { ...prev, agentKeySet: true } : prev);
      } else {
        const nearKey = typeof window !== 'undefined' ? localStorage.getItem('nearPrivateKey') : null;
        if (nearKey) {
          await addAgentKey(user.nearAccountId, nearKey, agentPubKey.trim());
          setTxStatus('Agent key added successfully.');
          setEscrow(prev => prev ? { ...prev, agentKeySet: true } : prev);
        } else {
          setTxStatus('No NEAR private key found in localStorage. Please set "nearPrivateKey" first.');
        }
      }
    } catch (e) {
      setTxStatus(`Failed to add agent key: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsSettingKey(false);
      setAgentPubKey('');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            Escrow Account
          </h1>
          <p className="text-base text-muted-foreground mt-1">
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
        <p className="text-base text-muted-foreground mt-1">
          Manage your escrow funds on NEAR Protocol
        </p>
      </div>

      {/* AI Nudge */}
      {escrow && escrow.balance === 0 && (
        <AINudge id="escrow-zero" message="Deposit NEAR to start matching with candidates. Agent key setup is required for autonomous negotiation." ctaLabel="Learn More" ctaHref="/escrow" />
      )}
      {escrow && !escrow.agentKeySet && escrow.balance > 0 && (
        <AINudge id="escrow-nokey" message="Add an agent key to let AI negotiate on your behalf without manual approval each round." />
      )}

      {/* Balance + Deposit Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance Card */}
        <div className="rounded-2xl border border-border/10 bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined text-lg">account_balance</span>
            <span className="text-base font-medium">Available Balance</span>
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
                className="text-[#39FF14]"
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
            <span className="text-sm text-muted-foreground">
              Agent Key: {escrow?.agentKeySet ? 'Configured' : 'Not Set'}
            </span>
          </div>
        </div>

        {/* Deposit Card */}
        <div className="rounded-2xl border border-border/10 bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span className="text-base font-medium">Deposit Funds</span>
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
                className="w-full bg-muted rounded-xl px-4 py-3 pr-16 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#39FF14]/30 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                NEAR
              </span>
            </div>
            <button
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositing}
              className="w-full py-3 rounded-xl bg-[#39FF14] text-[#0a0a0a] text-base font-semibold hover:bg-[#39FF14]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDepositing ? (
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
              )}
              {isDepositing ? 'Processing...' : 'Deposit'}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Funds are held in a NEAR smart contract and released upon agreement completion.
          </p>
        </div>
      </div>

      {/* Status Message */}
      {txStatus && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
          txStatus.includes('failed') || txStatus.includes('Failed') || txStatus.includes('No NEAR')
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-[#39FF14]/10 border-[#39FF14]/20'
        }`}>
          <span className={`material-symbols-outlined text-lg shrink-0 ${
            txStatus.includes('failed') || txStatus.includes('Failed') || txStatus.includes('No NEAR')
              ? 'text-red-400' : 'text-[#39FF14]'
          }`}>
            {txStatus.includes('failed') || txStatus.includes('Failed') || txStatus.includes('No NEAR') ? 'error' : 'check_circle'}
          </span>
          <p className={`text-base ${
            txStatus.includes('failed') || txStatus.includes('Failed') || txStatus.includes('No NEAR')
              ? 'text-red-400' : 'text-[#39FF14]'
          }`}>{txStatus}</p>
        </div>
      )}

      {/* Agent Key Setup */}
      <div className="rounded-2xl border border-border/10 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="material-symbols-outlined text-lg">vpn_key</span>
          <span className="text-base font-medium">Agent Key Setup</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Add your AI agent&apos;s public key to authorize automated escrow operations.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            value={agentPubKey}
            onChange={(e) => setAgentPubKey(e.target.value)}
            placeholder="ed25519:..."
            className="w-full bg-muted rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#39FF14]/30 transition-all font-mono"
          />
          <button
            onClick={handleAddAgentKey}
            disabled={!agentPubKey.trim() || isSettingKey}
            className="w-full py-3 rounded-xl bg-[#39FF14] text-[#0a0a0a] text-base font-semibold hover:bg-[#39FF14]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSettingKey ? (
              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-lg">vpn_key</span>
            )}
            {isSettingKey ? 'Setting Key...' : 'Add Agent Key'}
          </button>
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-2xl border border-border/10 bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/10 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-muted-foreground">receipt_long</span>
          <h2 className="font-[var(--font-manrope)] text-base font-bold text-foreground">
            Payment History
          </h2>
          <span className="ml-auto px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">
            {payments.length} transactions
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-muted-foreground/50 mb-2">
              receipt_long
            </span>
            <p className="text-base text-muted-foreground">No payment history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/10">
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
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
      color: 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20',
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
          <p className="text-base text-foreground">{formatDate(payment.timestamp)}</p>
          <p className="text-sm text-muted-foreground">{formatTime(payment.timestamp)}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-medium ${config.color}`}
        >
          <span className="material-symbols-outlined text-base">{config.icon}</span>
          {config.label}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="text-base font-semibold text-foreground">
          {payment.amount.toFixed(2)} NEAR
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Completed
        </span>
      </td>
      <td className="px-6 py-4">
        {payment.txHash ? (
          <span className="text-sm text-muted-foreground font-mono">
            {payment.txHash}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/50">{'\u2014'}</span>
        )}
      </td>
    </tr>
  );
}
