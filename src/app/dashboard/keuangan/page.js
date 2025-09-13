'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, RefreshCw } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { formatShort } from '@/lib/numberFormat';

export default function KeuanganPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const allowed = useMemo(() => ['superadmin', 'keuangan'], []);

  // Mock finance metrics
  const [finance, setFinance] = useState({
    pemasukan: 125_450_000,
    pengeluaran: 78_300_000,
    kas: 47_150_000,
  });
  const [sources, setSources] = useState([
    { key: 'iklan', label: 'Iklan', amount: 32_500_000 },
    { key: 'premium', label: 'Premium', amount: 12_800_000 },
  ]);
  const [transactions, setTransactions] = useState([
    { id: 1, ts: Date.now() - 3600_000 * 5, type: 'in', desc: 'Pendapatan subscription Agustus', amount: 24_500_000 },
    { id: 2, ts: Date.now() - 3600_000 * 20, type: 'out', desc: 'Biaya server', amount: 8_200_000 },
    { id: 3, ts: Date.now() - 3600_000 * 36, type: 'out', desc: 'Gaji tim konten', amount: 15_000_000 },
    { id: 4, ts: Date.now() - 3600_000 * 50, type: 'in', desc: 'Iklan Mingguan', amount: 6_750_000 },
  ]);

  // Early returns must come after all hooks to keep hook order stable
  if (loading || !user) return null;
  if (!allowed.includes(user.role)) {
    return (
      <div className="text-sm font-semibold">
        Halaman ini untuk role <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">superadmin</span> atau <span className="px-2 py-1 border-2 border-black rounded bg-[#F2F2F2]">keuangan</span>.
      </div>
    );
  }

  const [refreshing, setRefreshing] = useState(false);
  const refreshAll = () => {
    setRefreshing(true);
    const deltaIn = Math.floor(Math.random() * 5_000_000);
    const deltaOut = Math.floor(Math.random() * 4_000_000);
    const newIn = finance.pemasukan + deltaIn;
    const newOut = finance.pengeluaran + deltaOut;
    setFinance({ pemasukan: newIn, pengeluaran: newOut, kas: newIn - newOut });

    setSources((prev) => prev.map((s) => ({ ...s, amount: s.amount + Math.floor(Math.random() * 3_000_000) })));

    const add = {
      id: Date.now(),
      ts: Date.now(),
      type: Math.random() > 0.5 ? 'in' : 'out',
      desc: Math.random() > 0.5 ? 'Transaksi acak pemasukan' : 'Transaksi acak pengeluaran',
      amount: Math.floor(500_000 + Math.random() * 4_500_000),
    };
    setTransactions((t) => [add, ...t].slice(0, 20));

    toast.success('Data keuangan diperbarui');
    setTimeout(() => setRefreshing(false), 300); // simulate brief processing time
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">Keuangan</h2>
        <button onClick={refreshAll} disabled={refreshing} className="px-3 py-2 border-4 border-black rounded-lg bg-[#FFD803] font-extrabold disabled:opacity-60" style={{ boxShadow: '4px 4px 0 #000' }}>
          {refreshing ? 'Menyegarkan...' : (<><RefreshCw className="inline size-4" /> Refresh</>)}
        </button>
      </div>

      {/* Metrics */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-4 border-4 border-black rounded-lg bg-[#C6F6D5]" style={{ boxShadow: '4px 4px 0 #000' }}>
          <div className="flex items-center gap-2 text-xs font-bold mb-1"><TrendingUp className="size-4" /> Uang Masuk</div>
          <div className="text-2xl font-extrabold">{formatShort(finance.pemasukan)}</div>
        </div>
        <div className="p-4 border-4 border-black rounded-lg bg-[#FED7D7]" style={{ boxShadow: '4px 4px 0 #000' }}>
          <div className="flex items-center gap-2 text-xs font-bold mb-1"><TrendingDown className="size-4" /> Uang Keluar</div>
          <div className="text-2xl font-extrabold">{formatShort(finance.pengeluaran)}</div>
        </div>
        <div className="p-4 border-4 border-black rounded-lg bg-[#FFE4A1]" style={{ boxShadow: '4px 4px 0 #000' }}>
          <div className="flex items-center gap-2 text-xs font-bold mb-1"><PiggyBank className="size-4" /> Kas</div>
          <div className="text-2xl font-extrabold">{formatShort(finance.kas)}</div>
        </div>
      </div>

      {/* Penghasilan Aplikasi (sumber) */}
      <div>
        <h3 className="text-lg font-extrabold mb-3 flex items-center gap-2"><Wallet className="size-4" /> Penghasilan Aplikasi</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {sources.map((s) => (
            <div key={s.key} className="p-4 border-4 border-black rounded-lg bg-white" style={{ boxShadow: '4px 4px 0 #000' }}>
              <div className="text-xs font-bold opacity-70 mb-1">{s.label}</div>
              <div className="text-xl font-extrabold">{formatShort(s.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaksi terakhir */}
      <div>
        <h3 className="text-lg font-extrabold mb-3">Transaksi Terakhir</h3>
        <div className="overflow-auto">
          <table className="min-w-full border-4 border-black rounded-lg overflow-hidden" style={{ boxShadow: '6px 6px 0 #000' }}>
            <thead className="bg-[#E2E8F0]">
              <tr>
                <th className="text-left px-3 py-2 border-b-4 border-black">Waktu</th>
                <th className="text-left px-3 py-2 border-b-4 border-black">Tipe</th>
                <th className="text-left px-3 py-2 border-b-4 border-black">Deskripsi</th>
                <th className="text-left px-3 py-2 border-b-4 border-black">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tr) => (
                <tr key={tr.id} className="odd:bg-white even:bg-[#F7F7F0]">
                  <td className="px-3 py-2 border-b-4 border-black text-sm opacity-80">{new Date(tr.ts).toLocaleString('id-ID')}</td>
                  <td className="px-3 py-2 border-b-4 border-black">
                    <span className={`px-2 py-1 border-2 border-black rounded text-xs font-extrabold ${tr.type==='in' ? 'bg-[#C6F6D5]' : 'bg-[#FED7D7]'}`}>
                      {tr.type === 'in' ? 'MASUK' : 'KELUAR'}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b-4 border-black">{tr.desc}</td>
                  <td className="px-3 py-2 border-b-4 border-black font-extrabold">{formatShort(tr.amount)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm opacity-70">Belum ada transaksi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs opacity-70">Data keuangan ini masih mock. Nanti bisa dihubungkan ke API/DB.</div>
    </div>
  );
}
