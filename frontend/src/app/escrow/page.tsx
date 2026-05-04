'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useUnifiedWallet } from '@/lib/wallet-adapter';
import { getEscrowBalance, getEscrowPayments, getAgentPublicKey } from '@/lib/api';
import { getEscrowBalanceOnChain, hasAgentKeyOnChain } from '@/lib/near';
import { EscrowAccount, EscrowPayment } from '@/lib/types';
import { AINudge } from '@/components/ui/AINudge';
import { actionCreators } from '@near-js/transactions';

const NEAR_EXPLORER_BASE = 'https://testnet.nearblocks.io';

/** Convert a NEAR amount string (e.g. "1.5") to yoctoNEAR string */
function parseNearAmount(amount: string): string {
  const [whole, fraction = ''] = amount.split('.');
  const padded = fraction.padEnd(24, '0').slice(0, 24);
  return `${whole}${padded}`.replace(/^0+/, '') || '0';
}

const ESCROW_CONTRACT_ID =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || 'escrow.testnet';

export default function EscrowPage() {
  const { user } = useAuth();
  const { signAndSendTransaction } = useUnifiedWallet();


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

    Promise.all([
      getEscrowBalance(user.nearAccountId).catch(() => null),
      getEscrowPayments().catch(() => []),
      getAgentPublicKey().catch(() => ''),
    ])
      .then(([balance, history, agentKey]) => {
        if (balance) setEscrow(balance);
        setPayments(history);
        setAgentPubKey(agentKey);
        // Check on-chain if agent key is already registered (non-blocking)
        if (agentKey && user.nearAccountId) {
          hasAgentKeyOnChain(user.nearAccountId, agentKey).then(keyExists => {
            if (keyExists) {
              setEscrow(prev => prev ? { ...prev, agentKeySet: true } : prev);
            }
          }).catch(() => {});
        }
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';

  const refreshBalance = async (retries = 3, delayMs = 2000) => {
    if (!user) return;
    const prevBalance = escrow?.balance ?? 0;
    for (let i = 0; i < retries; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, delayMs));
      try {
        const balance = await getEscrowBalance(user.nearAccountId);
        if (balance.balance !== prevBalance) {
          setEscrow(balance);
          return;
        }
      } catch {
        try {
          const rpcBalance = await getEscrowBalanceOnChain(user.nearAccountId);
          const newBalance = Number(BigInt(rpcBalance)) / 1e24;
          if (newBalance !== prevBalance) {
            setEscrow(prev => prev ? { ...prev, balance: newBalance } : prev);
            return;
          }
        } catch { /* ignore */ }
      }
    }
    // After retries, set whatever we got last
    try {
      const balance = await getEscrowBalance(user.nearAccountId);
      setEscrow(balance);
    } catch { /* ignore */ }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsDepositing(true);
    setTxStatus(null);

    try {
      if (USE_DUMMY) {
        setEscrow(prev => prev ? { ...prev, balance: prev.balance + amount } : prev);
        setTxStatus(`Deposit of ${amount} NEAR initiated (mock).`);
      } else {
        const yoctoAmount = parseNearAmount(depositAmount);

        await signAndSendTransaction({
          receiverId: ESCROW_CONTRACT_ID,
          actions: [
            actionCreators.functionCall(
              'deposit',
              {},
              BigInt('30000000000000'),
              BigInt(yoctoAmount),
            ),
          ],
        });

        setTxStatus(`Successfully deposited ${amount} NEAR.`);
        setEscrow(prev => prev ? { ...prev, balance: prev.balance + amount } : prev);
        refreshBalance();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (!msg.includes('User rejected') && !msg.includes('cancelled')) {
        setTxStatus(`Deposit failed: ${msg}`);
      }
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
        const allowance = parseNearAmount('5');

        await signAndSendTransaction({
          receiverId: user.nearAccountId,
          actions: [
            actionCreators.addKey(
              agentPubKey.trim() as unknown as Parameters<typeof actionCreators.addKey>[0],
              actionCreators.functionCallAccessKey(
                ESCROW_CONTRACT_ID,
                ['pay_for_profile'],
                BigInt(allowance),
              ),
            ),
          ],
        });

        setTxStatus('Agent key added successfully.');
        setEscrow(prev => prev ? { ...prev, agentKeySet: true } : prev);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (!msg.includes('User rejected') && !msg.includes('cancelled')) {
        setTxStatus(`Failed to add agent key: ${msg}`);
      }
    } finally {
      setIsSettingKey(false);
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
        <div className="rounded-[1.75rem] border border-border bg-white/75 p-12 flex items-center justify-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
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
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#65a30d]">On-chain funding</p>
        <h1 className="font-[var(--font-manrope)] text-3xl font-black text-foreground tracking-[-0.055em] mt-1">
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
        <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 space-y-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
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
                className="text-[#65a30d]"
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
        <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 space-y-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
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
                className="w-full bg-white/70 border border-border rounded-2xl px-4 py-3 pr-16 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#65a30d]/25 transition-all shadow-sm"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                NEAR
              </span>
            </div>
            <button
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositing}
              className="w-full py-3 rounded-2xl bg-[#65a30d] text-white text-base font-bold hover:bg-[#65a30d]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
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
            ? 'bg-red-50 border-red-200'
            : 'bg-[#65a30d]/10 border-[#65a30d]/20'
        }`}>
          <span className={`material-symbols-outlined text-lg shrink-0 ${
            txStatus.includes('failed') || txStatus.includes('Failed') || txStatus.includes('No NEAR')
              ? 'text-red-700' : 'text-[#3f6212]'
          }`}>
            {txStatus.includes('failed') || txStatus.includes('Failed') || txStatus.includes('No NEAR') ? 'error' : 'check_circle'}
          </span>
          <p className={`text-base ${
            txStatus.includes('failed') || txStatus.includes('Failed') || txStatus.includes('No NEAR')
              ? 'text-red-700' : 'text-[#3f6212]'
          }`}>{txStatus}</p>
        </div>
      )}

      {/* Agent Key Setup */}
      <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 space-y-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="material-symbols-outlined text-lg">vpn_key</span>
          <span className="text-base font-medium">Agent Key Setup</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Register the AI agent&apos;s key to authorize automated profile payments from your escrow.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            value={agentPubKey}
            readOnly
            className="w-full bg-white/70 border border-border rounded-2xl px-4 py-3 text-sm text-foreground/70 outline-none font-mono truncate shadow-sm"
          />
          <button
            onClick={handleAddAgentKey}
            disabled={!agentPubKey.trim() || isSettingKey || (escrow?.agentKeySet ?? false)}
            className="w-full py-3 rounded-2xl bg-[#65a30d] text-white text-base font-bold hover:bg-[#65a30d]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
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
      <div className="rounded-[1.75rem] border border-border bg-white/75 overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
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
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: 'arrow_downward',
    },
    HOLD: {
      label: 'Hold',
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      icon: 'lock',
    },
    RELEASE: {
      label: 'Release',
      color: 'bg-[#65a30d]/10 text-[#3f6212] border-[#65a30d]/20',
      icon: 'arrow_upward',
    },
    REFUND: {
      label: 'Refund',
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: 'undo',
    },
  };

  const config = typeConfig['RELEASE'];

  return (
    <tr className="border-b border-border/70 hover:bg-white/60 transition-colors">
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
          Completed
        </span>
      </td>
      <td className="px-6 py-4">
        {payment.txHash ? (
          <a
            href={`${NEAR_EXPLORER_BASE}/txns/${payment.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#3f6212] hover:text-[#65a30d] font-mono transition-colors"
            title={payment.txHash}
          >
            {payment.txHash.slice(0, 8)}...{payment.txHash.slice(-6)}
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </a>
        ) : (
          <span className="text-sm text-muted-foreground/50">{'\u2014'}</span>
        )}
      </td>
    </tr>
  );
}
