"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Scheme {
  id: string;
  name: string;
  customer_name: string;
  product_name: string;
  payment_plan_name: string;
  booking_date: string;
  created_at: string;
}

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  useEffect(() => {
    fetch("/api/schemes")
      .then((r) => r.json())
      .then((data) => setSchemes(data))
      .catch(console.error);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus skema ini?")) return;
    await fetch(`/api/schemes/${id}`, { method: "DELETE" });
    setSchemes(schemes.filter((s) => s.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Skema KPR</h2>
        <Link href="/schemes/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
          + Skema Baru
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {schemes.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            Belum ada skema. <Link href="/schemes/new" className="text-indigo-600 hover:underline">Buat skema baru</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nama Skema</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Pelanggan</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Produk</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Rencana</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Booking Date</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schemes.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.customer_name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.product_name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.payment_plan_name}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(s.booking_date).toLocaleDateString("id-ID")}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/schemes/${s.id}`}
                      className="px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg mr-2">Lihat</Link>
                    <button onClick={() => handleDelete(s.id)}
                      className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
