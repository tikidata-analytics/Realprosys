"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────

interface PublicTier {
  name: string;
  monthly_price: string | number;
  yearly_price: string | number;
  is_active: boolean;
  permanent: boolean;
  start_date: string | null;
  end_date: string | null;
  limits: Record<string, number>;
}

// ─── Pricing Section ────────────────────────────────────────────

function formatPrice(v: string | number) {
  const n = Number(v);
  if (n === 0) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function PricingSection() {
  const [tiers, setTiers] = useState<PublicTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tiers/public")
      .then((r) => r.json())
      .then((d) => { setTiers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-slate-50" id="pricing">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Pilihan Plan</h2>
          </div>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (!tiers.length) return null;

  const features = [
    { key: "customers", label: "pelanggan" },
    { key: "payment_plans", label: "rencana pembayaran" },
    { key: "schemes", label: "skema KPR" },
    { key: "products", label: "produk" },
    { key: "projects", label: "proyek" },
    { key: "pdf_export", label: "Ekspor PDF" },
    { key: "public_share", label: "Link skema publik" },
  ];

  return (
    <section className="py-20 bg-slate-50" id="pricing">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Pilihan Plan</h2>
          <p className="text-slate-500">Mulai gratis. Upgrade kapan saja.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {tiers.map((tier) => {
            const isFree = tier.name === "free";
            const isDark = !isFree;
            return (
              <div
                key={tier.name}
                className={`rounded-2xl p-8 border-2 shadow-lg relative ${
                  isDark ? "bg-indigo-900 border-indigo-700" : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                {!isFree && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full">
                    POPULER
                  </div>
                )}

                <div className={`text-sm font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-indigo-300" : "text-slate-500"}`}>
                  {tier.name.charAt(0).toUpperCase() + tier.name.slice(1)}
                </div>

                <div className={`text-4xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                  {formatPrice(tier.monthly_price)}
                  <span className={`text-lg font-normal ${isDark ? "text-indigo-300" : "text-slate-400"}`}>/bulan</span>
                </div>

                <div className={`text-sm mb-6 ${isDark ? "text-indigo-300" : "text-slate-400"}`}>
                  {Number(tier.yearly_price) > 0
                    ? `atau ${formatPrice(tier.yearly_price)}/tahun`
                    : "Selamanya gratis"}
                </div>

                <ul className="space-y-3 mb-8">
                  {features.map(({ key, label }) => {
                    const limit = tier.limits[key];
                    const hasFeature = limit !== undefined;
                    return (
                      <li key={key} className={`flex items-center gap-2 text-sm ${isDark ? "text-indigo-100" : "text-slate-600"}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${isDark ? "bg-indigo-700 text-indigo-200" : "bg-green-100 text-green-600"}`}>
                          {hasFeature ? "✓" : "—"}
                        </span>
                        {hasFeature ? `${limit} ${label}` : label}
                      </li>
                    );
                  })}
                </ul>

                <Link
                  href="/register"
                  className={`block text-center px-6 py-3 font-semibold rounded-xl transition ${isDark ? "bg-amber-400 text-amber-900 hover:bg-amber-500" : "border-2 border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                >
                  {isFree ? "Daftar Gratis" : "Daftar & Upgrade"}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Pembayaran premium dilakukan secara manual via transfer. Hubungi{" "}
          <span className="font-medium text-slate-500">inetvmart@gmail.com</span>{" "}
          atau Telegram untuk aktivasi.
        </p>
      </div>
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function LandingPage() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <span className="text-xl font-bold text-indigo-900">Realprosys</span>
            <span className="ml-2 text-sm text-slate-400 hidden sm:inline">KPR Scheme Generator</span>
          </div>
          <nav className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition">
                Masuk
              </Link>
            )}
            {!user && (
              <Link href="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
                Daftar Gratis
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-amber-50 pt-20 pb-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full mb-6">
                <span className="w-2 h-2 bg-indigo-400 rounded-full" />
                Untuk Agen Properti Indonesia
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
                Generate Skema<br />
                <span className="text-indigo-600">KPR/KPA</span> dalam<br />
                Hitungan Menit
              </h1>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                Buat jadwal pembayaran KPR untuk klien Anda secara otomatis.
                Input data pelanggan, produk, dan rencana bayar —
                <strong className="text-slate-700"> sekali klik langsung dapat tabel cicilan lengkap</strong>,
                siap dicetak dan dibagikan.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                  Mulai Gratis →
                </Link>
                <Link href="/login" className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition">
                  Masuk
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-6 mt-8 text-sm text-slate-400">
                {[
                  { label: "Gratis hingga 2 skema" },
                  { label: "Tidak perlu install" },
                  { label: "Ekspor PDF profesional" },
                ].map(({ label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="w-4 h-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* App mockup */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl shadow-indigo-200/50 border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="flex-1 mx-4 h-5 bg-white border border-slate-200 rounded text-xs flex items-center px-3 text-slate-400">
                    realprosys.vercel.app/schemes
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm font-bold text-slate-800">Daftar Skema</div>
                    <div className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg">+ Skema Baru</div>
                  </div>
                  <table className="w-full text-xs mb-3">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100">
                        <th className="text-left pb-2 font-medium">Nama Skema</th>
                        <th className="text-left pb-2 font-medium">Pelanggan</th>
                        <th className="text-left pb-2 font-medium">Produk</th>
                        <th className="text-right pb-2 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "KPR Pak Budi - Cluster A", customer: "Budi Santoso", product: "Rumah Cluster A 36/72" },
                        { name: "KPA Ibu Ani - Apt. Metropolis", customer: "Ani Wijaya", product: "Apartemen Metropolis 2BR" },
                        { name: "Cash Bertahap Pak Chandra", customer: "Chandra Putro", product: "Rumah Town House 45/60" },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0">
                          <td className="py-2.5 font-medium text-slate-700">{row.name}</td>
                          <td className="py-2.5 text-slate-500">{row.customer}</td>
                          <td className="py-2.5 text-slate-500">{row.product}</td>
                          <td className="py-2.5 text-right">
                            <span className="text-indigo-600 font-medium">Detail</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-slate-50 rounded-lg p-3 text-xs">
                    <div className="font-semibold text-slate-600 mb-2">Cicilan KPR — 20 tahun @ 8.5%</div>
                    <div className="grid grid-cols-5 gap-1 text-slate-400 mb-1">
                      <span>Bulan</span><span>Pokok</span><span>Bunga</span><span>Total</span><span>Saldo</span>
                    </div>
                    {[1,2,3].map(i => (
                      <div key={i} className="grid grid-cols-5 gap-1 text-slate-600">
                        <span>{i}</span><span>Rp 3.2jt</span><span>Rp 5.7jt</span><span>Rp 8.9jt</span><span>Rp 791jt</span>
                      </div>
                    ))}
                    <div className="text-slate-400 mt-1">... + 237 bulan lagi</div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                LIVE
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">3 Langkah Mudah</h2>
            <p className="text-slate-500">Tidak perlu Excel. Tidak perlu hitung manual.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Daftar & Input Data",
                desc: "Buat akun gratis. Tambahkan data pelanggan, proyek, produk, dan rencana pembayaran.",
                icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
              },
              {
                step: "02",
                title: "Pilih & Konfigurasi",
                desc: "Pilih pelanggan, produk, dan rencana bayar. Atur tanggal booking dan tenor KPR dalam satu halaman.",
                icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
              },
              {
                step: "03",
                title: "Generate & Bagikan",
                desc: "Skema langsung jadi dengan tabel cicilan per bulan. Ekspor PDF atau bagikan via link publik.",
                icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">{icon}</div>
                  <span className="text-5xl font-bold text-slate-100">{step}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Semua yang Anda Butuhkan</h2>
            <p className="text-slate-500">Didesain khusus untuk workflow agen properti Indonesia.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Kalkulator KPR Otomatis", desc: "Rumus anuitas standar perbankan. Hitungan akurat sesuai standar KPR Indonesia." },
              { title: "Berbagai Tipe Pembayaran", desc: "Booking fee, uang muka (DP), KPR, dan pelunasan. Masing-masing bisa dipecah jadi beberapa tahap." },
              { title: "Ekspor PDF Profesional", desc: "Tabel cicilan format A4 landscape, siap cetak dan berikan ke bank atau klien. Tanpa watermark." },
              { title: "Link Skema Publik", desc: "Bagikan skema ke bank KPR atau kolega dengan satu link. Tidak perlu akun untuk melihat." },
              { title: "Multi-Produk & Multi-Proyek", desc: "Kelola beberapa proyek dan produk dalam satu akun. Tidak terbatas pada satu developer." },
              { title: "Batas Resource per Tier", desc: "Tier gratis: 2 entri per kategori. Upgrade ke premium untuk batas lebih besar." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — dynamic from API */}
      <PricingSection />

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <span className="font-bold text-indigo-900">Realprosys</span>
            <p className="text-sm text-slate-400 mt-1">KPR Scheme Generator untuk Agen Properti Indonesia</p>
          </div>
          <div className="text-sm text-slate-400">
            © {new Date().getFullYear()} Realprosys · inetvmart@gmail.com
          </div>
        </div>
      </footer>

    </div>
  );
}
