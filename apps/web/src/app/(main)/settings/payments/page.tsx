'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { SettingsSection, SettingsRow } from '../components';
import { createClient } from '@/lib/supabase/client';
import { 
    CreditCard, 
    Wallet, 
    Receipt, 
    DollarSign, 
    Plus, 
    TrendingUp, 
    ArrowUpRight, 
    Download, 
    ShieldCheck, 
    RefreshCw, 
    Check 
} from 'lucide-react';
import clsx from 'clsx';

interface Transaction {
    id: string;
    item: string;
    amount: string;
    status: 'completed' | 'pending' | 'failed';
    date: string;
    receiptNo: string;
}

interface SavedCard {
    id: string;
    brand: string;
    last4: string;
    expiry: string;
    isDefault: boolean;
}

const DEFAULT_TXS: Transaction[] = [
    { id: '1', item: 'Verlyn Plus subscription — 1 Month', amount: '-$9.99', status: 'completed', date: 'May 10, 2026', receiptNo: 'TXN-9843210' },
    { id: '2', item: 'Ad revenue payout', amount: '+$55.00', status: 'completed', date: 'May 02, 2026', receiptNo: 'TXN-8742109' },
    { id: '3', item: 'Super supporter boost', amount: '-$5.00', status: 'completed', date: 'April 28, 2026', receiptNo: 'TXN-7643212' }
];

export default function PaymentsSettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const [balance, setBalance] = useState('0.00');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [topUpLoading, setTopUpLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser?.id) return;

        const metadata = currentUser.metadata || {};

        // Load balance
        const metaBal = metadata.wallet_balance;
        if (metaBal !== undefined && metaBal !== null) {
            setBalance(String(metaBal));
        } else {
            const savedBal = localStorage.getItem(`verlyn_balance_${currentUser.id}`);
            if (savedBal) {
                setBalance(savedBal);
            } else {
                const initialBal = '45.00';
                setBalance(initialBal);
                localStorage.setItem(`verlyn_balance_${currentUser.id}`, initialBal);
                
                // Sync to metadata
                const supabase = createClient();
                supabase.auth.updateUser({
                    data: { wallet_balance: parseFloat(initialBal) }
                });
            }
        }

        // Load transaction logs
        const metaTx = metadata.transactions;
        if (metaTx && Array.isArray(metaTx)) {
            setTransactions(metaTx);
        } else {
            const savedTx = localStorage.getItem(`verlyn_txs_${currentUser.id}`);
            if (savedTx) {
                try {
                    const parsed = JSON.parse(savedTx);
                    setTransactions(parsed);
                    // Sync to metadata
                    const supabase = createClient();
                    supabase.auth.updateUser({
                        data: { transactions: parsed }
                    });
                } catch (e) {
                    setTransactions(DEFAULT_TXS);
                }
            } else {
                setTransactions(DEFAULT_TXS);
                localStorage.setItem(`verlyn_txs_${currentUser.id}`, JSON.stringify(DEFAULT_TXS));
                // Sync to metadata
                const supabase = createClient();
                supabase.auth.updateUser({
                    data: { transactions: DEFAULT_TXS }
                });
            }
        }

        // Load cards
        setSavedCards([
            { id: '1', brand: 'Visa', last4: '4242', expiry: '12/28', isDefault: true },
            { id: '2', brand: 'Mastercard', last4: '8810', expiry: '06/29', isDefault: false }
        ]);
    }, [currentUser]);

    const handleTopUp = async () => {
        if (!currentUser?.id) return;
        setTopUpLoading(true);
        
        const currentNum = parseFloat(balance);
        const newBalFloat = currentNum + 25.00;
        const newBal = newBalFloat.toFixed(2);
        
        const newTx: Transaction = {
            id: String(Date.now()),
            item: 'Wallet top-up (Visa *4242)',
            amount: '+$25.00',
            status: 'completed',
            date: 'Today',
            receiptNo: `TXN-${Math.floor(Math.random() * 9000000) + 1000000}`
        };

        const updatedTxs = [newTx, ...transactions];

        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.updateUser({
            data: {
                wallet_balance: newBalFloat,
                transactions: updatedTxs
            }
        });

        if (!error && user) {
            setTransactions(updatedTxs);
            setBalance(newBal);
            localStorage.setItem(`verlyn_balance_${currentUser.id}`, newBal);
            localStorage.setItem(`verlyn_txs_${currentUser.id}`, JSON.stringify(updatedTxs));
            setUser({
                ...currentUser,
                metadata: user.user_metadata || {}
            });
            setToast('Successfully topped up $25.00 to Verlyn Wallet');
        } else {
            setToast(error?.message || 'Failed to top up wallet');
        }
        
        setTopUpLoading(false);
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="w-full pb-12 animate-fade-in space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Orders & Payments</h2>
                <p className="text-[12.5px] text-neutral-500 font-medium">Verify your payment credentials, credit logs, and transaction receipt logs.</p>
            </div>

            {/* Wallet Balance widget */}
            <div className="p-6 bg-gradient-to-tr from-neutral-950 to-neutral-900 border border-white/5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-1">
                    <span className="text-[11px] font-extrabold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 leading-none">
                        <Wallet size={11} /> Verlyn Digital Wallet
                    </span>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-sm font-black text-neutral-400">$</span>
                        <span className="text-3xl font-black text-white">{balance}</span>
                        <span className="text-[11.5px] font-bold text-neutral-500 ml-1.5 uppercase">USD</span>
                    </div>
                    <p className="text-[11.5px] text-neutral-500 leading-none mt-1">Wallet tokens used for subscriptions and tipping creators.</p>
                </div>
                <button
                    type="button"
                    onClick={handleTopUp}
                    disabled={topUpLoading}
                    className="px-4 py-2.5 bg-blue-600 hover:opacity-90 active:scale-95 text-white text-[12px] font-extrabold rounded-xl transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                    {topUpLoading ? (
                        <RefreshCw size={13} className="animate-spin" />
                    ) : (
                        <Plus size={13} />
                    )}
                    Top up $25.00
                </button>
            </div>

            {/* Active Subscriptions */}
            <SettingsSection title="Active Premium Subscriptions">
                <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <h5 className="text-[13.5px] font-bold text-white flex items-center gap-2">
                                Verlyn Plus Premium
                                <span className="text-[9px] uppercase font-extrabold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Active</span>
                            </h5>
                            <p className="text-[11.5px] text-neutral-500 mt-0.5">Renews automatically on June 10, 2026. Billing $9.99/mo.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="text-[12px] font-bold text-neutral-400 hover:text-white"
                        onClick={() => setToast('Subscription cancellation is locked in current session')}
                    >
                        Manage
                    </button>
                </div>
            </SettingsSection>

            {/* Saved Cards */}
            <SettingsSection title="Saved Billing Methods">
                {savedCards.map((card) => (
                    <div key={card.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 shrink-0">
                                <CreditCard size={16} />
                            </div>
                            <div>
                                <h5 className="text-[13.5px] font-bold text-white flex items-center gap-2">
                                    {card.brand} ending in •••• {card.last4}
                                    {card.isDefault && (
                                        <span className="text-[9px] uppercase font-extrabold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Default</span>
                                    )}
                                </h5>
                                <p className="text-[11.5px] text-neutral-500 mt-0.5">Expires {card.expiry}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="text-[11.5px] font-bold text-red-400 hover:text-red-300"
                            onClick={() => setToast('Billing methods must keep at least 1 primary card')}
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </SettingsSection>

            {/* Receipt Transactions */}
            <SettingsSection title="Billing History & Receipts">
                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-[12.5px] text-neutral-600 italic">No previous payments registered.</div>
                ) : (
                    transactions.map((tx) => (
                        <div key={tx.id} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 shrink-0 mt-0.5">
                                    <Receipt size={16} />
                                </div>
                                <div>
                                    <h5 className="text-[13px] font-bold text-white">{tx.item}</h5>
                                    <p className="text-[11.5px] text-neutral-500 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                                        <span>ID: {tx.receiptNo}</span>
                                        <span>•</span>
                                        <span>{tx.date}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 select-none shrink-0">
                                <span className={clsx(
                                    "text-[13px] font-black",
                                    tx.amount.startsWith('+') ? "text-green-400" : "text-neutral-200"
                                )}>{tx.amount}</span>
                                <span className="text-[9px] uppercase font-extrabold text-neutral-500 bg-neutral-950 border border-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <ArrowUpRight size={10} /> {tx.status}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </SettingsSection>

            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900 border border-white/10 px-4 py-2.5 rounded-xl shadow-xl z-50 text-[12px] text-blue-400 font-bold flex items-center gap-2">
                    <Check size={14} /> {toast}
                </div>
            )}
        </div>
    );
}
