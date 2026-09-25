"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import KprChart from "@/components/KprChart";
import { downloadPdf, SchemePdfDocument } from "@/components/SchemePdfDocument";
import { pdf } from "@react-pdf/renderer";

function formatCurrency(val: number) {
  return Number(val || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
}

export default function SchemeDetailPage() {
  const { id } = useParams();
  const [scheme, setScheme] = useState<any>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingPlan, setEditingPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const startEditingName = () => {
    setNameInput(s.name);
    setEditingName(true);
  };

  const saveName = async () => {
    const newName = nameInput.trim();
    if (!newName || newName === s.name) { setEditingName(false); return; }
    const res = await fetch(`/api/schemes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setScheme((prev: any) => ({ ...prev, name: newName }));
    }
    setEditingName(false);
  };

  useEffect(() => {
    if (!editingPlan) return;
    fetch("/api/payment-plans?page=1&limit=100")
      .then((r) => r.json())
      .then((data) => {
        setPaymentPlans(data.rows || []);
        if (scheme) setSelectedPlanId(scheme.payment_plan_id || "");
      })
      .catch(console.error);
  }, [editingPlan, scheme]);

  const savePlan = async () => {
    if (!selectedPlanId || selectedPlanId === scheme.payment_plan_id) {
      setEditingPlan(false);
      return;
    }
    setUpdatingPlan(true);
    const res = await fetch(`/api/schemes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_plan_id: selectedPlanId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setScheme(updated);
      setEditingPlan(false);
    } else {
      const err = await res.json();
      alert("Gagal update rencana bayar: " + (err.error || "Unknown error"));
    }
    setUpdatingPlan(false);
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/schemes/${id}`)
      .then((r) => r.json())
      .then(async (data) => {
        setScheme(data);
        if (!data.share_token) {
          // Auto-enable sharing
          const res = await fetch(`/api/schemes/${id}/share`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: true }),
          });
          const d = await res.json();
          setShareToken(d.share_token || null);
        } else {
          setShareToken(data.share_token);
        }
      })
      .catch(console.error);
  }, [id]);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${scheme?.username}/${id}`;
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleExportPdf = async () => {
    if (!scheme || !sched) return;
    setPdfLoading(true);
    await downloadPdf({
      scheme: { name: scheme.name, username: scheme.username },
      customer: { name: s.customer_name },
      product: { name: s.product_name, price: s.product_price },
      project: { name: s.project_name },
      nonKprStages,
      kprSchedule,
      kprPct,
      totalKprPrincipal,
      totalKprInterest,
      kprMonthlyPayment: sched.kprMonthlyPayment || 0,
      kprTenor: sched.kprTenor || 0,
    }, `skema-${scheme.name || id}.pdf`);
    setPdfLoading(false);
  };

  if (!scheme) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const s = scheme;
  const sched = s.schedule || {};
  const stages: any[] = sched.stages || [];
  const housePrice = sched.housePrice || 0;

  // ── Unified running balance across ALL stages sorted by date ──
  const allRows: any[] = stages.map((r) => ({ ...r }));
  allRows.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  let running = housePrice;
  for (const row of allRows) {
    row._runningBalance = running;
    const principal = row.is_kpr ? Number(row.principal) || 0 : Number(row.amount) || 0;
    running = Math.max(0, running - principal);
    row._newBalance = running;
  }

  const nonKprStages = allRows.filter((r: any) => !r.is_kpr);
  const kprStages = allRows.filter((r: any) => r.is_kpr);

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
        {editingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
            className="text-xl font-bold text-slate-900 border border-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <h2 className="text-xl font-bold text-slate-900 cursor-pointer hover:text-indigo-600" onClick={startEditingName} title="Klik untuk edit nama">✏️ {s.name}</h2>
        )}
      </div>

      {/* Summary */}
      <div className="bg-indigo-50 rounded-xl p-6 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-indigo-900">{s.name}</h3>
        </div>

        {/* Info header */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Tanggal Booking</div>
            <div className="font-semibold text-slate-800 text-sm">{new Date(s.booking_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</div>
          </div>
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
            <div className="font-medium text-slate-800 text-sm">{formatCurrency(sched.housePrice)}</div>
          </div>
          <div className="bg-white rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">Rencana Bayar</div>
            {editingPlan ? (
              <div className="flex items-center gap-1">
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="px-1.5 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih --</option>
                  {paymentPlans.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={savePlan}
                  disabled={updatingPlan}
                  className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updatingPlan ? "..." : "✓"}
                </button>
                <button onClick={() => setEditingPlan(false)} className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs">✕</button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1 cursor-pointer group"
                onClick={() => { setSelectedPlanId(s.payment_plan_id || ""); setEditingPlan(true); }}
                title="Klik untuk ganti rencana bayar"
              >
                <div className="font-medium text-slate-800 text-sm truncate">{s.payment_plan_name || "-"}</div>
                <span className="text-slate-400 group-hover:text-indigo-500 text-xs">✏️</span>
              </div>
            )}
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

        {/* Share buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs rounded-lg hover:bg-slate-200 font-medium disabled:opacity-50"
          >
            {pdfLoading ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-4-9h8a1 1 0 011 1v8a1 1 0 001 1h1" /></svg>
            )}
            {pdfLoading ? "Membuat PDF..." : "Export PDF"}
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-medium"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Tersalin!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy Link
              </>
            )}
          </button>
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
                        {row.stage_type === "BOOKING_FEE" ? (row.reduces_dp ? "Booking Fee include DP" : "Booking Fee") :
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
    </div>
  );
}
