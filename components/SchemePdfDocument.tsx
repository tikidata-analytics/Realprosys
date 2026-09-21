import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font, pdf
} from '@react-pdf/renderer';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5QITp7H20gX8tK5tK5t.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlApc30tX8tK5tK5t.woff2', fontWeight: 700 },
  ],
});

const C = {
  primary: '#312e81',
  accent: '#4f46e5',
  headerBg: '#e0e7ff',
  rowAlt: '#f5f3ff',
  border: '#c7d2fe',
  text: '#1e1b4b',
  muted: '#6b7280',
  blue: '#1d4ed8',
  blueBg: '#dbeafe',
};

const S = StyleSheet.create({
  page: { padding: 28, fontFamily: 'Helvetica', fontSize: 9, color: C.text, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, borderBottomWidth: 2, borderBottomColor: C.accent, paddingBottom: 8 },
  title: { fontSize: 15, fontWeight: 700, color: C.primary, marginBottom: 2 },
  subtitle: { fontSize: 8, color: C.muted },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, gap: 6 },
  infoCard: { width: '23%', backgroundColor: C.headerBg, borderRadius: 4, padding: '6 8', borderLeftWidth: 3, borderLeftColor: C.accent },
  infoLabel: { fontSize: 7, color: C.muted, marginBottom: 1 },
  infoValue: { fontSize: 9, fontWeight: 700, color: C.primary },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, backgroundColor: C.headerBg, borderRadius: 4, padding: '6 8' },
  summaryLabel: { fontSize: 7, color: C.muted },
  summaryValue: { fontSize: 10, fontWeight: 700, color: C.primary, marginTop: 1 },
  summaryPct: { fontSize: 7, color: C.accent },
  sectionLabel: { fontSize: 9, fontWeight: 700, color: C.primary, marginBottom: 4, marginTop: 10, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 3 },
  // Table
  tblH: { flexDirection: 'row', backgroundColor: C.primary, borderRadius: 2, padding: '5 6', marginBottom: 2 },
  tblRow: { flexDirection: 'row', padding: '5 6', borderBottomWidth: 0.5, borderBottomColor: C.border },
  tblRowAlt: { flexDirection: 'row', padding: '5 6', borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: C.rowAlt },
  th: { fontSize: 8, fontWeight: 700, color: '#fff', textAlign: 'center' },
  thL: { fontSize: 8, fontWeight: 700, color: '#fff' },
  td: { fontSize: 8.5, textAlign: 'right', color: C.text },
  tdC: { fontSize: 8.5, textAlign: 'center', color: C.text },
  tdB: { fontSize: 8.5, fontWeight: 700, textAlign: 'right', color: C.primary },
  badge: { backgroundColor: C.headerBg, borderRadius: 2, padding: '1 4' },
  badgeKpr: { backgroundColor: C.blueBg, borderRadius: 2, padding: '1 4' },
  badgeText: { fontSize: 7, fontWeight: 700, color: C.accent },
  badgeKprText: { fontSize: 7, fontWeight: 700, color: C.blue },
  footer: { position: 'absolute', bottom: 20, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 4 },
  footerText: { fontSize: 7, color: C.muted },
});

const fmt = (n: number) => n >= 1000 ? n.toLocaleString('id-ID') : String(n);
const fmtDate = (d: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface Props {
  scheme: any;
  customer: any;
  product: any;
  project: any;
  nonKprStages: any[];
  kprSchedule: any[];
  kprPct: number;
  totalKprPrincipal: number;
  totalKprInterest: number;
  kprMonthlyPayment: number;
  kprTenor: number;
}

export function SchemePdfDocument({ scheme, customer, product, project, nonKprStages, kprSchedule, kprPct, totalKprPrincipal, totalKprInterest, kprMonthlyPayment, kprTenor }: Props) {
  const housePrice = product?.price || 0;
  const kprAmount = housePrice;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>

        {/* Header */}
        <View style={S.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={S.title}>JADWAL ANGSURAN KPR</Text>
            <Text style={S.subtitle}>{scheme?.name || 'Skema Pembayaran'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.subtitle}>{scheme?.username ? `@${scheme.username}` : 'Realprosys'}</Text>
            <Text style={S.subtitle}>{fmtDate(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Info Cards */}
        <View style={S.infoGrid}>
          {[
            { label: 'Pelanggan', value: customer?.name || '-' },
            { label: 'Proyek', value: project?.name || '-' },
            { label: 'Produk', value: product?.name || '-' },
            { label: 'Harga Rumah', value: `Rp ${fmt(housePrice)}` },
          ].map(({ label, value }) => (
            <View key={label} style={S.infoCard}>
              <Text style={S.infoLabel}>{label}</Text>
              <Text style={S.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={S.summaryRow}>
          <View style={S.summaryCard}>
            <Text style={S.summaryLabel}>Total Tagihan</Text>
            <Text style={S.summaryValue}>Rp {fmt(housePrice)}</Text>
          </View>
          {kprAmount > 0 && <>
            <View style={S.summaryCard}>
              <Text style={S.summaryLabel}>Pinjaman KPR</Text>
              <Text style={S.summaryValue}>Rp {fmt(kprAmount)} <Text style={S.summaryPct}>({kprPct}%)</Text></Text>
            </View>
            <View style={S.summaryCard}>
              <Text style={S.summaryLabel}>Cicilan/Bulan</Text>
              <Text style={S.summaryValue}>Rp {fmt(Math.round(kprMonthlyPayment))} <Text style={S.summaryPct}>({kprTenor} thn)</Text></Text>
            </View>
            <View style={S.summaryCard}>
              <Text style={S.summaryLabel}>Total Pokok KPR</Text>
              <Text style={S.summaryValue}>Rp {fmt(totalKprPrincipal)}</Text>
            </View>
            <View style={S.summaryCard}>
              <Text style={S.summaryLabel}>Total Bunga KPR</Text>
              <Text style={S.summaryValue}>Rp {fmt(totalKprInterest)}</Text>
            </View>
          </>}
        </View>

        {/* Non-KPR Table */}
        {nonKprStages.length > 0 && (
          <>
            <Text style={S.sectionLabel}>JADWAL PEMBAYARAN NON-KPR</Text>
            <View style={S.tblH}>
              <Text style={{ ...S.thL, flex: 1.5 }}>Tahap</Text>
              <Text style={{ ...S.th, flex: 1.2 }}>Tanggal</Text>
              <Text style={{ ...S.th, flex: 1.2 }}>Sebelum</Text>
              <Text style={{ ...S.th, flex: 1.2 }}>Pembayaran</Text>
              <Text style={{ ...S.th, flex: 1.2 }}>Sesudah</Text>
            </View>
            {nonKprStages.map((s: any, i: number) => (
              <View key={i} style={i % 2 === 0 ? S.tblRow : S.tblRowAlt}>
                <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={S.badge}><Text style={S.badgeText}>
                    {s.stage_type === 'BOOKING_FEE' ? (s.reduces_dp ? 'Booking Fee include DP' : 'Booking Fee') :
                     s.stage_type === 'DOWN_PAYMENT' ? `Uang Muka ${i + 1}` :
                     s.stage_type === 'SETTLEMENT' ? 'Pelunasan' : s.stage_type}
                  </Text></View>
                </View>
                <Text style={{ ...S.tdC, flex: 1.2 }}>{fmtDate(s.due_date)}</Text>
                <Text style={{ ...S.td, flex: 1.2 }}>{fmt(s.sebelum_pengurangan || 0)}</Text>
                <Text style={{ ...S.tdB, flex: 1.2 }}>{fmt(s.amount || 0)}</Text>
                <Text style={{ ...S.td, flex: 1.2 }}>{fmt(s.setelah_pengurangan || 0)}</Text>
              </View>
            ))}
          </>
        )}

        {/* KPR Table */}
        {kprSchedule.length > 0 && (
          <>
            <Text style={S.sectionLabel}>JADWAL PEMBAYARAN KPR</Text>
            <View style={S.tblH}>
              <Text style={{ ...S.thL, flex: 0.6 }}>Angs.</Text>
              <Text style={{ ...S.th, flex: 1.1 }}>Tanggal</Text>
              <Text style={{ ...S.th, flex: 1 }}>Pokok</Text>
              <Text style={{ ...S.th, flex: 1 }}>Bunga</Text>
              <Text style={{ ...S.th, flex: 1.1 }}>Sebelum</Text>
              <Text style={{ ...S.th, flex: 1.1 }}>Pembayaran</Text>
              <Text style={{ ...S.th, flex: 1.1 }}>Sesudah</Text>
            </View>
            {kprSchedule.map((r: any, i: number) => (
              <View key={i} style={i % 2 === 0 ? S.tblRow : S.tblRowAlt}>
                <View style={{ flex: 0.6, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={S.badgeKpr}><Text style={S.badgeKprText}>#{i + 1}</Text></View>
                </View>
                <Text style={{ ...S.tdC, flex: 1.1 }}>{fmtDate(r.due_date)}</Text>
                <Text style={{ ...S.td, flex: 1 }}>{fmt(r.principal || 0)}</Text>
                <Text style={{ ...S.td, flex: 1 }}>{fmt(r.interest || 0)}</Text>
                <Text style={{ ...S.td, flex: 1.1 }}>{fmt(r.sebelum_pengurangan || 0)}</Text>
                <Text style={{ ...S.tdB, flex: 1.1 }}>{fmt(r.amount || 0)}</Text>
                <Text style={{ ...S.td, flex: 1.1 }}>{fmt(r.setelah_pengurangan || 0)}</Text>
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Generated by Realprosys — {scheme?.username ? `@${scheme.username}` : 'realprosys.vercel.app'}</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export const downloadPdf = async (props: Props, filename: string) => {
  const blob = await pdf(<SchemePdfDocument {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
