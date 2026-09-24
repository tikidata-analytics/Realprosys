"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";

interface Tier {
  name: string;
  monthly_price: string | number;
  yearly_price: string | number;
  is_active: boolean;
  featured: boolean;
  limits: Record<string, number>;
}

const ADMIN_WA_FALLBACK = "628155XXXXXXX"; // Replace with actual; loaded from /api/public/admin-wa

export default function UpgradePage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [duration, setDuration] = useState<"monthly" | "yearly">("monthly");
  const [userEmail, setUserEmail] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [nominal, setNominal] = useState("");
  const [name, setName] = useState("");
  const [adminWa, setAdminWa] = useState(ADMIN_WA_FALLBACK);

  useEffect(() => {
    // Check if already logged in and get user info
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) { router.push("/login"); return; }
        setUserEmail(d.user.email || "");
        setName(d.user.name || d.user.username || "");
        // Redirect if not free tier
        if (d.user.tier !== "free") {
          router.push("/dashboard");
          return;
        }
      })
      .catch(() => router.push("/login"));

    fetch("/api/tiers/public")
      .then((r) => r.json())
      .then((d: Tier[]) => {
        setTiers(d.filter((t) => t.name !== "free" && t.is_active));
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/public/admin-wa")
      .then((r) => r.json())
      .then((d) => { if (d.admin_wa) setAdminWa(d.admin_wa); })
      .catch(() => {});
  }, [router]);

  const selectedTierData = tiers.find((t) => t.name === selectedTier);
  const price = selectedTierData
    ? duration === "monthly"
      ? Number(selectedTierData.monthly_price)
      : Number(selectedTierData.yearly_price)
    : 0;

  const durationLabel = duration === "monthly" ? "1 Bulan" : "1 Tahun";
  const priceFormatted = price === 0 ? "Gratis" : formatCurrency(price);

  const waMessage = selectedTierData && nominal && transferDate
    ? `Halo Admin Realprosys,%0A%0ASaya ingin upgrade akun:%0A- Email: ${userEmail}%0A- Nama: ${name}%0A- Tier: ${selectedTierData.name} (${durationLabel})%0A- Harga: ${priceFormatted}%0A- Tanggal Transfer: ${transferDate}%0A- Nominal: ${nominal}%0A%0AMohon bantu aktivasi membership. Terima kasih!`
    : "";

  const waUrl = `https://wa.me/${adminWa}?text=${waMessage}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">← Kembali ke Dashboard</Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Upgrade Akun</h1>
        <p className="text-slate-500 mb-6">Pilih paket yang diinginkan dan hubungi admin via WhatsApp.</p>

        {tiers.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Tidak ada tier upgrade tersedia saat ini.</div>
        ) : (
          <>
            {/* Tier selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Paket</label>
              <div className="grid grid-cols-2 gap-3">
                {tiers.map((tier) => (
                  <button
                    key={tier.name}
                    onClick={() => setSelectedTier(tier.name)}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      selectedTier === tier.name
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-slate-800 capitalize">{tier.name}</div>
                    <div className="text-sm text-slate-500">{formatCurrency(Number(tier.monthly_price))}/bulan</div>
                    {tier.featured && (
                      <span className="inline-block mt-1 text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Featured</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            {selectedTier && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Durasi</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ value: "monthly", label: "Bulanan" }, { value: "yearly", label: "Tahunan" }].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setDuration(value as "monthly" | "yearly")}
                      className={`p-3 rounded-xl border-2 transition ${
                        duration === value ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="font-medium text-slate-800">{label}</div>
                      <div className="text-sm text-slate-500">
                        {formatCurrency(duration === "monthly" ? Number(selectedTierData?.monthly_price) : Number(selectedTierData?.yearly_price))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Transfer info */}
            {selectedTier && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-amber-800 mb-2">Transfer ke Rekening</h3>
                <div className="text-sm text-amber-700 space-y-1">
                  <p><strong>Bank:</strong> BCA</p>
                  <p><strong>Atas Nama:</strong> PITCHSTAR CHERNENKO</p>
                  <p><strong>Total:</strong> {priceFormatted}</p>
                </div>
              </div>
            )}

            {/* Transfer details form */}
            {selectedTier && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pengirim</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Nama di rekening transfer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Transfer</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Transfer (Rp)</label>
                  <input
                    type="number"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Contoh: 150000"
                  />
                </div>
              </div>
            )}

            {/* WhatsApp button */}
            {selectedTier && nominal && transferDate && name && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Kirim via WhatsApp
              </a>
            )}

            {!selectedTier && (
              <p className="text-center text-slate-400 text-sm">Pilih paket terlebih dahulu</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
