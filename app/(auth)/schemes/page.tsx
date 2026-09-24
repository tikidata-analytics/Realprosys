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

export default function SchemesPage() {
  const router = useRouter();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState("created_at:desc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [atLimit, setAtLimit] = useState(false);
  const [limit, setLimit] = useState(0);

  const fetchSchemes = () => {
    fetch(`/api/schemes?q=${encodeURIComponent(search)}&page=${page}&sort=${sort}`)
      .then((r) => r.json())
      .then((d) => {
        setSchemes(d.rows || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      })
      .catch(console.error);
  };

  useEffect(() => {
    const timer = setTimeout(fetchSchemes, 300);
    return () => clearTimeout(timer);
  }, [search, page, sort]);

  useEffect(() => {
    fetch("/api/schemes?q=&page=1&sort=created_at:desc").then((r) => r.json()).then(async (data) => {
      setSchemes(data.rows || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

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
          setAtLimit((data.total || 0) >= limitVal && limitVal > 0);
        }
      }
    }).catch(console.error);
  }, []);

  const handleSort = (field: string) => {
    setSort(toggleSort(sort, field));
    setPage(1);
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
          Anda已达到 limit <strong>{total}/{limit}</strong> skema. Upgrade ke Premium untuk menambah.
        </div>
      )}

      {schemes.length === 0 && !search ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-400">
          Belum ada skema. <Link href="/schemes/new" className="text-indigo-600 hover:underline">Buat skema baru</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Search */}
          <div className="px-4 py-3 border-b border-slate-200">
            <input
              type="text"
              placeholder="Cari nama skema..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full sm:w-72 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("name")}>
                    <span className="flex items-center gap-1">Nama Skema {sortIcon("name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("customer_name")}>
                    <span className="flex items-center gap-1">Pelanggan {sortIcon("customer_name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("product_name")}>
                    <span className="flex items-center gap-1">Produk {sortIcon("product_name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("payment_plan_name")}>
                    <span className="flex items-center gap-1">Rencana {sortIcon("payment_plan_name")}</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("booking_date")}>
                    <span className="flex items-center gap-1">Tgl Booking {sortIcon("booking_date")}</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schemes.map((s) => (
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

          {total === 0 && search && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">Tidak ada skema bernama "{search}"</div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm text-slate-500">
            <span>{total === 0 ? "0" : (page - 1) * 10 + 1}–{Math.min(page * 10, total)} dari {total}</span>
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

async function handleDelete(id: string) {
  if (!confirm("Hapus skema ini?")) return;
  await fetch(`/api/schemes/${id}`, { method: "DELETE" });
  window.location.reload();
}
