"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import KprChart from "@/components/KprChart";

function formatCurrency(val: number) {
  return Number(val || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
}

export default function SharePage() {
  const { username, schemeId } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username || !schemeId) return;
    fetch(`/api/share/${username}/${schemeId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); }
        else { setData(d); }
        setLoading(false);
      })
      .catch(() => { setError("Skema tidak ditemukan"); setLoading(false); });
  }, [username, schemeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Skema Tidak Ditemukan</h1>
        <p className="text-slate-500 mb-6">Skema ini tidak tersedia atau link sudah dinonaktifkan.</p>
        <Link href="/login" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
          Buat Skema Saya
        </Link>
      </div>
    );
  }

  const s = data;
  const sched = s.schedule || {};
  const stages: any[] = sched.stages || [];
  const housePrice = sched.housePrice || 0;
  const kprAmount = sched.kprAmount || 0;
  const kprMonthly = sched.kprMonthlyPayment || 0;
  const kprRate = sched.kprRate || 0;
  const hasKpr = kprAmount > 0;

  // Unified running balance
  const allRows: any[] = stages.map((r) => ({ ...r }));
  allRows.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  let running = housePrice;
  for (const row of allRows) {
    row._runningBalance = running;
    const principal = row.is_kpr ? Number(row.principal) || 0 : Number(row.amount) || 0;
    running = Math.max(0, running - principal);
    row._newBalance = running;
  }

  const nonKprStages = allRows.filter((r) => !r.is_kpr);
  const kprStages = allRows.filter((r) => r.is_kpr);

  // KPR schedule for chart
  let kprSchedule: any[] = [];
  if (hasKpr && kprStages.length > 0) {
    let rb = kprAmount;
    const monthlyRate = kprRate > 0 ? kprRate / 100 / 12 : 0;
    for (const row of kprStages) {
      const interest = Number(row.interest) || 0;
      const principal = Number(row.principal) || 0;
      rb -= principal;
      kprSchedule.push({
        due_date: row.due_date,
        amount: Number(row.amount) || 0,
        principal,
        interest,
        remaining_balance: Math.max(0, rb),
      });
    }
  }

  const kprPct = housePrice > 0 ? Math.round(kprAmount / housePrice * 10000) / 100 : 0;
  const totalKprInterest = kprSchedule.reduce((sum: number, r: any) => sum + r.interest, 0);
  const totalKprPrincipal = kprSchedule.reduce((sum: number, r: any) => sum + r.principal, 0);
  const bungaPct = housePrice > 0 ? Math.round(totalKprInterest / housePrice * 10000) / 100 : 0;

  return (
    <div>
      {/* Header bar */}
      <div className="bg-indigo-700 text-white py-3 px-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-70">Skema oleh</span>
          <span className="font-semibold">@{s.username}</span>
        </div>
        <Link href="/register" className="px-4 py-1.5 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 transition">
          Buat Skema Saya →
        </Link>
      </div>

      {/* Summary */}
      <div className="bg-indigo-50 rounded-xl p-6 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-indigo-900">{s.name}</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Pelanggan</div>
            <div className="font-medium text-slate-800 text-sm truncate">{s.customer_name || "-"}</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Proyek</div>
            <div className="font-medium text-slate-800 text-sm truncate">{s.project_name || "-"}</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Produk</div>
            <div className="font-medium text-slate-800 text-sm truncate">{s.product_name || "-"}</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Harga Rumah</div>
            <div className="font-medium text-slate-800 text-sm">{formatCurrency(housePrice)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Total Tagihan</div>
            <div className="font-bold text-indigo-900">{formatCurrency(housePrice)}</div>
          </div>
          {hasKpr ? (
            <>
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Pinjaman KPR</div>
                <div className="font-bold text-blue-700">
                  {formatCurrency(kprAmount)}
                  <span className="text-xs font-normal text-blue-500"> ({kprPct}%)</span>
                </div>
              </div>
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Cicilan/Bulan</div>
                <div className="font-bold text-blue-700">{formatCurrency(kprMonthly)}</div>
              </div>
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Total Pokok KPR</div>
                <div className="font-bold text-blue-700">{formatCurrency(totalKprPrincipal)}</div>
              </div>
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Total Bunga KPR</div>
                <div className="font-bold text-blue-700">
                  {formatCurrency(totalKprInterest)}
                  <span className="text-xs font-normal text-blue-500"> ({bungaPct}%)</span>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-3 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              <div className="text-xs text-amber-600">Tanpa KPR</div>
              <div className="font-bold text-amber-800">Cash / Pelunasan bertahap</div>
            </div>
          )}
        </div>
      </div>

      {/* Non-KPR Table */}
      {nonKprStages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Jadwal Pembayaran Non-KPR</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Tahap</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Tanggal</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sebelum</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Pembayaran</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sesudah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nonKprStages.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        row.stage_type === "BOOKING_FEE" ? "bg-amber-100 text-amber-700" :
                        row.stage_type === "DOWN_PAYMENT" ? "bg-green-100 text-green-700" :
                        row.stage_type === "SETTLEMENT" ? "bg-purple-100 text-purple-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {row.stage_type === "BOOKING_FEE" ? "Booking Fee" :
                         row.stage_type === "DOWN_PAYMENT" ? "Uang Muka" :
                         row.stage_type === "SETTLEMENT" ? "Pelunasan" :
                         row.stage_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {new Date(row.due_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {Number(row._runningBalance || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {Number(row.amount || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {Number(row._newBalance || 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPR Chart */}
      {hasKpr && kprSchedule.length > 0 && (
        <KprChart schedule={kprSchedule} />
      )}

      {/* KPR Table */}
      {kprStages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Jadwal Pembayaran KPR</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Angsuran</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Tanggal</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Pokok</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Bunga</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sebelum</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Pembayaran</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sesudah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kprStages.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        KPR #{idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {new Date(row.due_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {Number(row.principal || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {Number(row.interest || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {Number(row._runningBalance || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {Number(row.amount || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {Number(row._newBalance || 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CTA footer */}
      <div className="mt-8 text-center bg-slate-50 rounded-xl p-6">
        <p className="text-slate-600 mb-3">Ingin buat skema seperti ini untuk bisnis Anda?</p>
        <Link href="/register" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">
          Buat Skema Saya →
        </Link>
      </div>
    </div>
  );
}
