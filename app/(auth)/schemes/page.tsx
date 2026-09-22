"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, parseSort, toggleSort } from "@/lib/formatters";

interface Scheme {
  id: string;
  name: string;
  customer_name: string;
  product_name: string;
  payment_plan_name: string;
  booking_date: string;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function SchemesPage() {
  const router = useRouter();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [sort, setSort] = useState("created_at:desc");
  const [page, setPage] = useState(1);
  const [atLimit, setAtLimit] = useState(false);
  const [limit, setLimit] = useState(0);

  useEffect(() => {
    fetch("/api/schemes").then((r) => r.json()).then(async (data) => {
      setSchemes(data);

      const me = await fetch("/api/auth/me").then(r => r.json()).catch(() => null);
      if (me?.user?.id) {
        const limits = await fetch("/api/config/limits").then(r => r.json()).catch(() => []);
        const userTier = me.user.tier || "free";
        const userRole = me.user.role || "user";
        if (userRole === "webmaster") {
          setAtLimit(false);
          setLimit(Infinity);
        } else {
          const myLimit = limits.find((l: any) => l.tier === userTier && l.resource === "schemes");
          const limitVal = myLimit?.limit_val ?? 0;
          setLimit(limitVal);
          setAtLimit(data.length >= limitVal && limitVal > 0);
        }
      }
    }).catch(console.error);
  }, []);

  const sorted = [...schemes].sort((a, b) => {
    const { orderBy, orderDir } = parseSort(sort);
    const va = (a as any)[orderBy] ?? "";
    const vb = (b as any)[orderBy] ?? "";
    const cmp = String(va).localeCompare(String(vb), "id");
    return orderDir === "asc" ? cmp : -cmp;
  });
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE) || 1;
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus skema ini?")) return;
    await fetch(`/api/schemes/${id}`, { method: "DELETE" });
    setSchemes(schemes.filter((s) => s.id !== id));
  };

  const sortIcon = (field: string) => {
    const { orderBy, orderDir } = parseSort(sort);
    if (orderBy !== field) return <span className="text-xs text-slate-300">↕</span>;
    return <span className="text-xs text-indigo-600">{orderDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Daftar Skema</h2>
        <button
          onClick={() => { if (!atLimit) router.push("/schemes/new"); }}
          disabled={atLimit}
          title={atLimit ? `Limit ${limit} tercapai. Upgrade ke Premium untuk menambah.` : ""}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
          + Skema Baru
        </button>
      </div>

      {atLimit && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Anda已达到 limit <strong>{schemes.length}/{limit}</strong> skema. Upgrade ke Premium untuk menambah.
        </div>
      )}

      {schemes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-400">
          Belum ada skema. <Link href="/schemes/new" className="text-indigo-600 hover:underline">Buat skema baru</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => { setSort(toggleSort(sort, "name")); setPage(1); }}>
                    <span className="flex items-center gap-1">Nama Skema {sortIcon("name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => { setSort(toggleSort(sort, "customer_name")); setPage(1); }}>
                    <span className="flex items-center gap-1">Pelanggan {sortIcon("customer_name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => { setSort(toggleSort(sort, "product_name")); setPage(1); }}>
                    <span className="flex items-center gap-1">Produk {sortIcon("product_name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => { setSort(toggleSort(sort, "payment_plan_name")); setPage(1); }}>
                    <span className="flex items-center gap-1">Rencana {sortIcon("payment_plan_name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => { setSort(toggleSort(sort, "booking_date")); setPage(1); }}>
                    <span className="flex items-center gap-1">Tgl Booking {sortIcon("booking_date")}</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/schemes/${s.id}`} className="hover:text-indigo-600">{s.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.customer_name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.product_name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.payment_plan_name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(s.booking_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(s.id)} className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm text-slate-500">
            <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, schemes.length)} dari {schemes.length}</span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(1)} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30">«</button>
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30">‹</button>
              <span className="px-3 py-1">{page}/{totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30">›</button>
              <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30">»</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
