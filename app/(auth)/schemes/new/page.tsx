"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function NewSchemePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
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
    const product = products.find((p) => p.id === form.product_id);
    const plan = paymentPlans.find((p) => p.id === form.payment_plan_id);
    if (!product || !plan) return;

    const housePrice = Number(product.price);
    const stages: any[] = plan.stages || [];

    // Calculate preview (same logic as API)
    let otherTotal = 0;
    let kprRate = 0;
    let kprTenor = 0;
    const previewStages: any[] = [];
    let currentDate = new Date(form.booking_date);

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
      previewStages.push({ ...stage, amount, due_date: currentDate.toISOString().split("T")[0] });
    }

    const kprAmount = Math.max(0, housePrice - otherTotal);
    let kprMonthly = 0;
    if (kprAmount > 0 && kprTenor > 0 && kprRate > 0) {
      const mr = kprRate / 100 / 12;
      const np = kprTenor * 12;
      kprMonthly = (kprAmount * (mr * Math.pow(1 + mr, np))) / (Math.pow(1 + mr, np) - 1);
    } else if (kprAmount > 0 && kprTenor > 0) {
      kprMonthly = kprAmount / (kprTenor * 12);
    }

    setPreview({ housePrice, stages: previewStages, kprAmount, kprMonthly, kprTenor, kprRate, otherTotal });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.customer_id || !form.product_id || !form.payment_plan_id || !form.booking_date) return;
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
      alert("Gagal membuat skema");
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
              <input type="date" value={form.booking_date} onChange={(e) => { setForm({ ...form, booking_date: e.target.value }); setPreview(null); }} required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
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
          <div className="bg-indigo-50 rounded-xl p-6 space-y-3">
            <h3 className="font-semibold text-indigo-900">Preview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-indigo-600 text-xs">Harga Rumah</span>
                <div className="font-bold text-indigo-900">{formatCurrency(preview.housePrice)}</div>
              </div>
              {preview.kprAmount > 0 ? (
                <>
                  <div>
                    <span className="text-indigo-600 text-xs">Pinjaman KPR</span>
                    <div className="font-bold text-indigo-900">{formatCurrency(preview.kprAmount)}</div>
                  </div>
                  {preview.kprRate > 0 && (
                    <div>
                      <span className="text-indigo-600 text-xs">Bunga</span>
                      <div className="font-bold text-indigo-900">{preview.kprRate}%/thn</div>
                    </div>
                  )}
                  <div>
                    <span className="text-indigo-600 text-xs">Tenor KPR</span>
                    <div className="font-bold text-indigo-900">{preview.kprTenor} tahun</div>
                  </div>
                  <div>
                    <span className="text-indigo-600 text-xs">Cicilan/Bulan</span>
                    <div className="font-bold text-indigo-900">{formatCurrency(preview.kprMonthly)}</div>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <span className="text-amber-600 text-xs">Tanpa KPR</span>
                  <div className="font-bold text-amber-900">Cash / Pelunasan bertahap</div>
                </div>
              )}
            </div>

            {/* Stage breakdown */}
            <div className="mt-3 pt-3 border-t border-indigo-200">
              <div className="text-xs text-indigo-600 font-medium mb-2">Tahapan:</div>
              <div className="space-y-1">
                {preview.stages.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-indigo-800">
                      {s.stage_type === "BOOKING_FEE" ? "Booking Fee" :
                       s.stage_type === "DOWN_PAYMENT" ? `Uang Muka` :
                       s.stage_type === "SETTLEMENT" ? "Pelunasan" : s.stage_type}
                    </span>
                    <span className="font-medium text-indigo-900">{formatCurrency(s.amount)}</span>
                  </div>
                ))}
              </div>
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
