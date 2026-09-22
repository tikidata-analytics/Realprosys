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
  const [newCustomerName, setNewCustomerName] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
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
    if ((!showNewCustomer && !form.customer_id) || !form.product_id || !form.payment_plan_id || !form.booking_date) return;
    if (showNewCustomer && !newCustomerName.trim()) return;
    setPreview(null);

    // Fetch plan directly to ensure fresh data
    const planRes = await fetch(`/api/payment-plans/${form.payment_plan_id}`);
    if (!planRes.ok) { alert("Gagal load rencana bayar"); return; }
    const plan = await planRes.json();
    const stages = plan.stages || [];

    const product = products.find((p) => p.id === form.product_id);
    const customer = showNewCustomer ? { name: newCustomerName } : customers.find((c: any) => c.id === form.customer_id);
    if (!product) return;

    const housePrice = Number(product.price || 0);

    let otherTotal = 0;
    let kprRate = 0;
    let kprTenor = 0;
    const previewStages: any[] = [];
    let currentDate = new Date(form.booking_date);

    // Track the cumulative paid amount (what the customer has paid so far)
    let paidBeforeStage = 0;

    const sorted = [...stages].sort((a: any, b: any) => a.stage_order - b.stage_order);

    for (const stage of sorted) {
      if ((stage.stage_type || "").toUpperCase() === "KPR") {
        kprRate = Number(stage.stage_value || 0);
        kprTenor = Number(stage.interval_months || 0);
        continue;
      }
      let amount = 0;
      if ((stage.amount_type || "").toUpperCase() === "PERCENTAGE") {
        amount = housePrice * Number(stage.stage_value || 0) / 100;
      } else {
        amount = Number(stage.stage_value || 0);
      }
      const reducesDp = !!stage.reduces_dp;
      if (!reducesDp) {
        otherTotal += amount;
      }
      if (Number(stage.interval_months) > 0) {
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + Number(stage.interval_months));
      }
      // sebelum = outstanding amount before this non-KPR stage (total - cumulative paid so far)
      // setelah = outstanding amount after this non-KPR stage (total - cumulative paid including this stage)
      const unpaidBefore = Math.round((housePrice - paidBeforeStage) * 100) / 100;
      paidBeforeStage += amount;
      const unpaidAfter = Math.round((housePrice - paidBeforeStage) * 100) / 100;
      previewStages.push({ ...stage, amount, sebelum_pengurangan: unpaidBefore, setelah_pengurangan: unpaidAfter, due_date: currentDate.toISOString().split("T")[0] });
    }

    const kprAmount = Math.max(0, housePrice - otherTotal);
    let kprMonthly = 0;
    const kprSchedule: any[] = [];
    if (kprAmount > 0 && kprTenor > 0 && kprRate > 0) {
      const mr = kprRate / 100 / 12;
      const np = kprTenor * 12;
      kprMonthly = (kprAmount * (mr * Math.pow(1 + mr, np))) / (Math.pow(1 + mr, np) - 1);
      // KPR starts 1 month after the last non-KPR stage
      const kprStartDate = new Date(currentDate);
      kprStartDate.setMonth(kprStartDate.getMonth() + 1);
      let runningBalance = kprAmount;
      for (let i = 1; i <= np; i++) {
        const dueDate = new Date(kprStartDate);
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        const sebelum = Math.round(runningBalance * 100) / 100;
        const interestPayment = runningBalance * mr;
        const principalPayment = kprMonthly - interestPayment;
        runningBalance -= principalPayment;
        const setelah = Math.max(0, Math.round(runningBalance * 100) / 100);
        kprSchedule.push({
          due_date: dueDate.toISOString().split("T")[0],
          amount: Math.round(kprMonthly * 100) / 100,
          principal: Math.round(principalPayment * 100) / 100,
          interest: Math.round(interestPayment * 100) / 100,
          sebelum_pengurangan: sebelum,
          setelah_pengurangan: setelah,
        });
      }
    } else if (kprAmount > 0 && kprTenor > 0) {
      // No interest rate — simple division
      kprMonthly = kprAmount / (kprTenor * 12);
      const kprStartDate = new Date(currentDate);
      kprStartDate.setMonth(kprStartDate.getMonth() + 1);
      let runningBalance = kprAmount;
      for (let i = 1; i <= kprTenor * 12; i++) {
        const dueDate = new Date(kprStartDate);
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        const sebelum = Math.round(runningBalance * 100) / 100;
        const principalPayment = kprMonthly;
        runningBalance -= principalPayment;
        const setelah = Math.max(0, Math.round(runningBalance * 100) / 100);
        kprSchedule.push({
          due_date: dueDate.toISOString().split("T")[0],
          amount: Math.round(kprMonthly * 100) / 100,
          principal: Math.round(principalPayment * 100) / 100,
          interest: 0,
          sebelum_pengurangan: sebelum,
          setelah_pengurangan: setelah,
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

    if (showNewCustomer && !newCustomerName.trim()) {
      alert("Nama pelanggan wajib diisi untuk pelanggan baru.");
      return;
    }

    if (!form.name || !form.product_id || !form.payment_plan_id || !form.booking_date) return;
    if (!showNewCustomer && !form.customer_id) return;

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

    let customerId = form.customer_id;
    if (showNewCustomer) {
      const cr = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomerName.trim(), email: `adhoc_${Date.now()}@temp.local`, phone: "", gender: "" }),
      });
      if (!cr.ok) { alert("Gagal membuat pelanggan baru"); setLoading(false); return; }
      const cd = await cr.json();
      customerId = cd.id;
      // Refresh customer list
      const crlist = await fetch("/api/customers").then(r => r.json());
      setCustomers(crlist);
    }

    const payload = { ...form, customer_id: customerId };
    const res = await fetch("/api/schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Skema <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Misal: Rumah Pak Budi KPR 20th"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Booking <span className="text-red-500">*</span></label>
              <DatePicker
                value={form.booking_date}
                onChange={(v) => { setForm({ ...form, booking_date: v }); setPreview(null); }}
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Pilih Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pelanggan <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select
                  value={showNewCustomer ? "NEW" : form.customer_id}
                  onChange={(e) => {
                    if (e.target.value === "NEW") {
                      setShowNewCustomer(true);
                      setForm({ ...form, customer_id: "" });
                    } else {
                      setShowNewCustomer(false);
                      setForm({ ...form, customer_id: e.target.value });
                    }
                  }}
                  required
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Pilih...</option>
                  <option value="NEW">+ Tambah Baru</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {showNewCustomer && (
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Nama pelanggan *"
                  required
                  className="mt-2 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Produk <span className="text-red-500">*</span></label>
              <select value={form.product_id} onChange={(e) => { setForm({ ...form, product_id: e.target.value }); setPreview(null); }} required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="">Pilih...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rencana Pembayaran <span className="text-red-500">*</span></label>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Total Tagihan</div>
                <div className="font-bold text-indigo-900">{formatCurrency(preview.housePrice)}</div>
              </div>
              <div className="bg-white rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500">Di Luar KPR</div>
                <div className="font-bold text-green-700">{formatCurrency(preview.otherTotal)}</div>
              </div>
              {preview.kprAmount > 0 ? (
                <>
                  <div className="bg-white rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-500">Pinjaman KPR</div>
                    <div className="font-bold text-blue-700">{formatCurrency(preview.kprAmount)} <span className="text-xs font-normal text-blue-500">({preview.kprPct}%)</span></div>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-500">Tenor</div>
                    <div className="font-bold text-blue-700">{preview.kprTenor} tahun</div>
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
                <div className="col-span-4 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                  <div className="text-xs text-amber-600">Tanpa KPR</div>
                  <div className="font-bold text-amber-800">Cash / Pelunasan bertahap</div>
                </div>
              )}
            </div>

            {/* Non-KPR Schedule */}
            {preview.stages.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                      {preview.stages.map((s: any, idx: number) => {
                        const dpCounter = s.stage_type === "DOWN_PAYMENT" ? preview.dpCounters[s.stage_order] : null;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                s.stage_type === "BOOKING_FEE" ? "bg-amber-100 text-amber-700" :
                                s.stage_type === "DOWN_PAYMENT" ? "bg-green-100 text-green-700" :
                                s.stage_type === "SETTLEMENT" ? "bg-purple-100 text-purple-700" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                {s.stage_type === "BOOKING_FEE" ? (s.reduces_dp ? "Booking Fee include DP" : "Booking Fee") :
                                 s.stage_type === "DOWN_PAYMENT" ? `Uang Muka ${dpCounter || ""}` :
                                 s.stage_type === "SETTLEMENT" ? "Pelunasan" :
                                 s.stage_type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {new Date(s.due_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700 font-medium">
                              {Number(s.sebelum_pengurangan || 0).toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700 font-medium">
                              {Number(s.amount || 0).toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700 font-medium">
                              {Number(s.setelah_pengurangan || 0).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* KPR chart — placed between Non-KPR and KPR tables */}
            {preview.kprAmount > 0 && <KprChart schedule={preview.kprSchedule.map((r: any) => ({ ...r, remaining_balance: r.setelah_pengurangan }))} />}

            {/* KPR Schedule */}
            {preview.kprSchedule.length > 0 && (
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
                      {preview.kprSchedule.map((row: any, idx: number) => (
                        <tr key={`kpr-${idx}`} className="hover:bg-slate-50">
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
                            {Number(row.sebelum_pengurangan || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700 font-medium">
                            {Number(row.amount || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700 font-medium">
                            {Number(row.setelah_pengurangan || 0).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Share hint inside preview */}
            <div className="flex items-center gap-2 pt-1 text-xs text-indigo-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Link share aktif setelah skema disimpan.
            </div>
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
