"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

    const { calculateAmortization } = await import("@/lib/amortization");
    const result = calculateAmortization(
      Number(product.price),
      Number(plan.down_payment_pct),
      Number(plan.loan_tenor_years),
      Number(plan.interest_rate),
      new Date(form.booking_date)
    );
    setPreview(result);
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
              <input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
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
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="">Pilih...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} - {Number(p.price).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rencana Pembayaran</label>
              <select value={form.payment_plan_id} onChange={(e) => setForm({ ...form, payment_plan_id: e.target.value })} required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="">Pilih...</option>
                {paymentPlans.map((pp) => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
              </select>
            </div>
          </div>

          {(selectedProduct || selectedPlan) && (
            <button type="button" onClick={handlePreview}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            Lihat Preview Cicilan
          </button>
          )}
        </div>

        {preview && (
          <div className="bg-indigo-50 rounded-xl p-6 space-y-2">
            <h3 className="font-semibold text-indigo-900 mb-3">Preview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-indigo-600">DP ({preview.downPaymentPct || selectedPlan?.down_payment_pct}%)</span>
                <div className="font-bold text-indigo-900">{preview.downPayment.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}</div>
              </div>
              <div>
                <span className="text-indigo-600">Pinjaman</span>
                <div className="font-bold text-indigo-900">{preview.loanAmount.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}</div>
              </div>
              <div>
                <span className="text-indigo-600">Cicilan/Bulan</span>
                <div className="font-bold text-indigo-900">{preview.monthlyPayment.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}</div>
              </div>
              <div>
                <span className="text-indigo-600">Total Bunga</span>
                <div className="font-bold text-indigo-900">{preview.totalInterest.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}</div>
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
