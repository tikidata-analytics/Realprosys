"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalCustomers: number;
  totalProducts: number;
  totalPaymentPlans: number;
  totalSchemes: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(console.error);
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">Selamat datang di Realprosys</p>
        </div>
        <a href="/profile" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          Edit Profil
        </a>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Pelanggan" value={stats.totalCustomers} href="/customers" />
          <StatCard label="Produk" value={stats.totalProducts} href="/products" />
          <StatCard label="Rencana Bayar" value={stats.totalPaymentPlans} href="/payment-plans" />
          <StatCard label="Skema" value={stats.totalSchemes} href="/schemes" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-400">
          Memuat...
        </div>
      )}

      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/schemes/new" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Skema Baru
          </Link>
          <Link href="/customers" className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
            + Pelanggan Baru
          </Link>
          <Link href="/products" className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
            + Produk Baru
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}
      className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
      <div className="text-3xl font-bold text-indigo-600">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </Link>
  );
}
