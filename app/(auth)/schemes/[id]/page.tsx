"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import KprChart from "@/components/KprChart";

function formatCurrency(val: number) {
  return Number(val || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
}

export default function SchemeDetailPage() {
  const { id } = useParams();
  const [scheme, setScheme] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/schemes/${id}`)
      .then((r) => r.json())
      .then((data) => setScheme(data))
      .catch(console.error);
  }, [id]);

  if (!scheme) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const s = scheme;
  const sched = s.schedule || {};
  const stages = sched.stages || [];

  const nonKprStages = stages.filter((r: any) => !r.is_kpr);
  const kprStages = stages.filter((r: any) => r.is_kpr);

  const hasKpr = sched.kprAmount > 0;

  // Reconstruct kprSchedule + computed fields from stored kprStages
  let kprSchedule: any[] = [];
  if (hasKpr && kprStages.length > 0) {
    let runningBalance = sched.kprAmount;
    for (const row of kprStages) {
      const principal = Number(row.principal || 0);
      const interest = Number(row.interest || 0);
      runningBalance -= principal;
      kprSchedule.push({
        due_date: row.due_date,
        amount: row.amount,
        principal,
        interest,
        remaining_balance: Math.max(0, runningBalance),
      });
    }
  }
  const kprPct = sched.housePrice > 0 ? Math.round(sched.kprAmount / sched.housePrice * 10000) / 100 : 0;
  const totalKprInterest = kprSchedule.reduce((s, r) => s + r.interest, 0);
  const totalKprPrincipal = kprSchedule.reduce((s, r) => s + r.principal, 0);
  const bungaPct = sched.housePrice > 0 ? Math.round(totalKprInterest / sched.housePrice * 10000) / 100 : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/schemes" className="text-slate-400 hover:text-slate-600">← Skema</a>
        <h2 className="text-xl font-bold text-slate-900">{s.name}</h2>
      </div>

      {/* Summary — matches create preview */}
      <div className="bg-indigo-50 rounded-xl p-6 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-indigo-900">{s.name}</h3>
        </div>

        {/* Info header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Pelanggan</div>
            <div className="font-medium text-slate-800 text-sm truncate">{s.customer_name || "-"}</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Proyek</div>
            <div className="font-medium text-slate-800 text-sm truncate">{s.product_name || "-"}</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Produk</div>
            <div className="font-medium text-slate-800 text-sm truncate">{s.product_name || "-"}</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Harga Rumah</div>
            <div className="font-medium text-slate-800 text-sm">{formatCurrency(sched.housePrice)}</div>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Total Tagihan</div>
            <div className="font-bold text-indigo-900">{formatCurrency(sched.housePrice)}</div>
            </div>
            {hasKpr ? (
            <>
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Pinjaman KPR</div>
                <div className="font-bold text-blue-700">
                  {formatCurrency(sched.kprAmount)}
                  <span className="text-xs font-normal text-blue-500"> ({kprPct}%)</span>
                </div>
              </div>
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Cicilan/Bulan</div>
                <div className="font-bold text-blue-700">{formatCurrency(sched.kprMonthlyPayment || 0)}</div>
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
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Pembayaran</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sebelum</th>
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
                      {Number(row.amount || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {Number(row.sebelum_pengurangan || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {Number(row.setelah_pengurangan || 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPR Chart — between tables */}
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
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Pembayaran</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Pokok</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Bunga</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Sebelum</th>
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
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {Number(row.amount || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {Number(row.principal || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {Number(row.interest || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {Number(row.sebelum_pengurangan || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {Number(row.setelah_pengurangan || 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
