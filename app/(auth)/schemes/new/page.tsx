"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import DatePicker from "@/components/DatePicker";
import KprChart from "@/components/KprChart";

export default function NewSchemePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showAllKpr, setShowAllKpr] = useState(false);
  const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", customer_id: "", product_id: "", payment_plan_id: "", booking_date: "" });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/payment-plans").then((r) => r.json()),
    ]).then(([c, p, pp]) => {
      setCustomers(c);
      setProducts(p);
      setPaymentPlans(pp);
    });
  }, []);

  const handlePreview = async () => {
    if (!form.customer_id || !form.product_id || !form.payment_plan_id || !form.booking_date) return;
    setPreview(null);

    // Fetch plan directly to ensure fresh data
    const planRes = await fetch(`/api/payment-plans/${form.payment_plan_id}`);
    if (!planRes.ok) { alert("Gagal load rencana bayar"); return; }
    const plan = await planRes.json();
    const stages = plan.stages || [];

    const product = products.find((p) => p.id === form.product_id);
    const customer = customers.find((c: any) => c.id === form.customer_id);
    if (!product) return;

    const housePrice = Number(product.price || 0);

    let otherTotal = 0;
    let kprRate = 0;
    let kprTenor = 0;
    const previewStages: any[] = [];
    let currentDate = new Date(form.booking_date);
    let accumulated = 0;

    const sorted = [...stages].sort((a: any, b: any) => a.stage_order - b.stage_order);

    for (const stage of sorted) {
      if (stage.stage_type === "KPR") {
        kprRate = Number(stage.stage_value || 0);
        kprTenor = Number(stage.interval_months || 0);
        continue;
      }
      let amount = 0;
      if (stage.amount_type === "PERCENTAGE") {
        amount = housePrice * Number(stage.stage_value || 0) / 100;
      } else {
        amount = Number(stage.stage_value || 0);
      }
      otherTotal += amount;
      if (Number(stage.interval_months) > 0) {
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + Number(stage.interval_months));
      }
      accumulated += amount;
      previewStages.push({ ...stage, amount, accumulated, due_date: currentDate.toISOString().split("T")[0] });
    }

    const kprAmount = Math.max(0, housePrice - otherTotal);
    let kprMonthly = 0;
    const kprSchedule: any[] = [];
    if (kprAmount > 0 && kprTenor > 0 && kprRate > 0) {
      const mr = kprRate / 100 / 12;
      const np = kprTenor * 12;
      kprMonthly = (kprAmount * (mr * Math.pow(1 + mr, np))) / (Math.pow(1 + mr, np) - 1);
      const kprStartDate = new Date(form.booking_date);
      let runningBalance = kprAmount;
      for (let i = 1; i <= np; i++) {
        const dueDate = new Date(kprStartDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        const interestPayment = runningBalance * mr;
        const principalPayment = kprMonthly - interestPayment;
        runningBalance -= principalPayment;
        kprSchedule.push({
          due_date: dueDate.toISOString().split("T")[0],
          amount: Math.round(kprMonthly * 100) / 100,
          principal: Math.round(principalPayment * 100) / 100,
          interest: Math.round(interestPayment * 100) / 100,
          remaining_balance: Math.max(0, Math.round(runningBalance * 100) / 100),
        });
      }
    } else if (kprAmount > 0 && kprTenor > 0) {
      // No interest rate — force annuity with minimal rate to use correct formula
      const fakeRate = 0.01;
      const mr = fakeRate / 100 / 12;
      const np = kprTenor * 12;
      kprMonthly = (kprAmount * (mr * Math.pow(1 + mr, np))) / (Math.pow(1 + mr, np) - 1);
      const kprStartDate = new Date(form.booking_date);
      let runningBalance = kprAmount;
      for (let i = 1; i <= np; i++) {
        const dueDate = new Date(kprStartDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        const interestPayment = runningBalance * mr;
        const principalPayment = kprMonthly - interestPayment;
        runningBalance -= principalPayment;
        kprSchedule.push({
          due_date: dueDate.toISOString().split("T")[0],
          amount: Math.round(kprMonthly * 100) / 100,
          principal: Math.round(principalPayment * 100) / 100,
          interest: Math.round(interestPayment * 100) / 100,
          remaining_balance: Math.max(0, Math.round(runningBalance * 100) / 100),
        });
      }
    }

    const totalKprPrincipal = kprSchedule.reduce((sum, r) => sum + r.principal, 0);
    const totalKprInterest = kprSchedule.reduce((sum, r) => sum + r.interest, 0);

    // Build dp counters for labeling
    const dpCounters: Record<number, string> = {};
    let dpSeq = 0;
    for (const stage of sorted) {
      if (stage.stage_type === "DOWN_PAYMENT") {
        dpSeq++;
        dpCounters[stage.stage_order] = String(dpSeq);
      }
    }

    setPreview({
      housePrice,
      customerName: customer?.name || "-",
      productName: product?.name || "-",
      projectName: product?.project_name || "-",
      stages: previewStages,
      kprAmount,
      kprPct: housePrice > 0 ? Math.round(kprAmount / housePrice * 100 * 100) / 100 : 0,
      kprMonthly,
      kprTenor,
      kprRate,
      kprSchedule,
      otherTotal,
      totalKprPrincipal,
      totalKprInterest,
      dpCounters,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.customer_id || !form.product_id || !form.payment_plan_id || !form.booking_date) return;

    // Validate: warn on zero-value non-KPR stages
    const plan = paymentPlans.find((p) => p.id === form.payment_plan_id);
    if (plan?.stages) {
      const zeroStages = (plan.stages as any[])
        .filter(s => s.stage_type !== "KPR" && (s.stage_value == null || Number(s.stage_value) <= 0));
      if (zeroStages.length > 0) {
        alert("Tahapan dengan nilai 0 (nol) harus dihapus sebelum disimpan.\n\nHapus baris tersebut di menu Rencana Pembayaran.");
        return;
      }
    }

    setLoading(true);
    const res = await fetch("/api/schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/schemes/${data.id}`);
    } else {
      const err = await res.json().catch(() => ({}));
      alert("Gagal membuat skema: " + (err.error || res.statusText));
    }
    setLoading(false);
  };

  const selectedProduct = products.find((p) => p.id === form.product_id);
  const selectedPlan = paymentPlans.find((p) => p.id === form.payment_plan_id);

  return (
    <div>
      <div className="mb-6">
        <a href="/schemes" className="text-slate-400 hover:text-slate-600 text-sm">← Kembali</a>
        <h2 className="text-xl font-bold text-slate-900 mt-2">Skema Baru</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Informasi Skema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Skema</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Misal: Rumah Pak Budi KPR 20th"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Booking</label>
              <DatePicker
                value={form.booking_date}
                onChange={(v) => { setForm({ ...form, booking_date: v }); setPreview(null); }}
                required
              />
              {form.booking_date && (
                <p className="text-xs text-indigo-600 mt-1">{formatDate(form.booking_date)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Pilih Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pelanggan</label>
              <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="">Pilih...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Produk</label>
              <select value={form.product_id} onChange={(e) => { setForm({ ...form, product_id: e.target.value }); setPreview(null); }} required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="">Pilih...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rencana Pembayaran</label>
              <select value={form.payment_plan_id} onChange={(e) => { setForm({ ...form, payment_plan_id: e.target.value }); setPreview(null); }} required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="">Pilih...</option>
                {paymentPlans.map((pp) => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
              </select>
            </div>
          </div>

          {(selectedProduct || selectedPlan) && (
            <button type="button" onClick={handlePreview}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
              Lihat Preview
            </button>
          )}
        </div>

        {preview && (
          <div className="bg-indigo-50 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-indigo-900">Preview</h3>
            </div>

            {/* Info header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { label: "Pelanggan", value: preview.customerName || "-" },
                { label: "Proyek", value: preview.projectName || "-" },
                { label: "Produk", value: preview.productName || "-" },
                { label: "Harga Rumah", value: formatCurrency(preview.housePrice) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="font-medium text-slate-800 text-sm truncate">{value}</div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Total Tagihan</div>
                <div className="font-bold text-indigo-900">{formatCurrency(preview.housePrice)}</div>
              </div>
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Sudah Dibayar</div>
                <div className="font-bold text-green-700">{formatCurrency(preview.otherTotal)}</div>
              </div>
              {preview.kprAmount > 0 ? (
                <>
                  <div className="bg-white rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-500">Pinjaman KPR</div>
                    <div className="font-bold text-blue-700">{formatCurrency(preview.kprAmount)} <span className="text-xs font-normal text-blue-500">({preview.kprPct}%)</span></div>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-500">Total Pokok KPR</div>
                    <div className="font-bold text-blue-700">{formatCurrency(preview.totalKprPrincipal)}</div>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500">Total Bunga KPR</div>
                  <div className="font-bold text-blue-700">{formatCurrency(preview.totalKprInterest)} <span className="text-xs font-normal text-blue-500">({preview.housePrice > 0 ? Math.round(preview.totalKprInterest / preview.housePrice * 100 * 100) / 100 : 0}%)</span></div>
                  </div>
                </>
              ) : (
                <div className="col-span-3 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                  <div className="text-xs text-amber-600">Tanpa KPR</div>
                  <div className="font-bold text-amber-800">Cash / Pelunasan bertahap</div>
                </div>
              )}
            </div>

            {/* Stage table */}
            {preview.stages.length > 0 && (
              <div className="border border-indigo-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-indigo-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-indigo-700">Tahap</th>
                      <th className="text-left px-3 py-2 font-medium text-indigo-700">Tanggal</th>
                      <th className="text-right px-3 py-2 font-medium text-indigo-700">Sisa Sebelum</th>
                      <th className="text-right px-3 py-2 font-medium text-indigo-700">Tagihan</th>
                      <th className="text-right px-3 py-2 font-medium text-indigo-700">Sisa Sesudah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100">
                    {preview.stages.map((s: any, i: number) => {
                      const dpCounter = s.stage_type === "DOWN_PAYMENT" ? preview.dpCounters[s.stage_order] : null;
                      const sisaSesudah = Math.max(0, preview.housePrice - (s.accumulated || 0));
                      return (
                        <tr key={i} className="bg-white">
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              s.stage_type === "BOOKING_FEE" ? "bg-amber-100 text-amber-700" :
                              s.stage_type === "DOWN_PAYMENT" ? "bg-green-100 text-green-700" :
                              s.stage_type === "SETTLEMENT" ? "bg-purple-100 text-purple-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {s.stage_type === "BOOKING_FEE" ? "Booking Fee" :
                               s.stage_type === "DOWN_PAYMENT" ? `Uang Muka ${dpCounter || ""}` :
                               s.stage_type === "SETTLEMENT" ? "Pelunasan" :
                               s.stage_type === "KPR" ? "KPR" : s.stage_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{formatDate(s.due_date)}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{formatCurrency(sisaSesudah + s.amount)}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">{formatCurrency(s.amount)}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">{formatCurrency(sisaSesudah)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* KPR schedule summary */}
            {preview.kprAmount > 0 && (
              <div>
                <KprChart schedule={preview.kprSchedule} />
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
                  <span className="text-xs font-medium text-blue-700">Jadwal KPR — {preview.kprTenor} tahun × {formatCurrency(preview.kprMonthly)}/bulan</span>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="text-left px-3 py-1 font-medium text-blue-700">#</th>
                      <th className="text-left px-3 py-1 font-medium text-blue-700">Tanggal</th>
                      <th className="text-right px-3 py-1 font-medium text-blue-700">Cicilan</th>
                      <th className="text-right px-3 py-1 font-medium text-blue-700">Pokok</th>
                      <th className="text-right px-3 py-1 font-medium text-blue-700">Bunga</th>
                      <th className="text-right px-3 py-1 font-medium text-blue-700">Sisa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {(preview.kprSchedule || []).slice(0, showAllKpr ? undefined : 6).map((row: any, i: number) => (
                      <tr key={i} className="bg-white">
                        <td className="px-3 py-1 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-1 text-slate-600">{formatDate(row.due_date)}</td>
                        <td className="px-3 py-1 text-right text-slate-700">{formatCurrency(row.amount)}</td>
                        <td className="px-3 py-1 text-right text-slate-600">{formatCurrency(row.principal)}</td>
                        <td className="px-3 py-1 text-right text-slate-600">{formatCurrency(row.interest)}</td>
                        <td className="px-3 py-1 text-right text-slate-700">{formatCurrency(row.remaining_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {(preview.kprSchedule || []).length > 6 && (
                    <tfoot>
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-3 py-2 text-center">
                          <button onClick={() => setShowAllKpr(!showAllKpr)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                            {showAllKpr ? "▲ Sembunyikan" : `▼ Lihat semua ${preview.kprSchedule.length} bulan`}
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                </div>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50">
          {loading ? "Menyimpan..." : "Simpan Skema"}
        </button>
      </form>
    </div>
  );
}
