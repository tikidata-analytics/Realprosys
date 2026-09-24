# Excel Export untuk Master Pages

决定：Pelanggan dan Produk master pages mendapat tombol export Excel (.xlsx) yang mengikuti filter aktif dan mengekport semua data (bukan hanya halaman saat ini).

## Decided

- Paket: `xlsx` (SheetJS) di frontend — tidak perlu endpoint backend baru, langsung generate di browser.
- Format: `.xlsx`, satu sheet per export.
- Scope: export mengikuti search query dan sort aktif; fetch semua page lalu generate.
- Kolom: persis sama dengan kolom di tabel UI.
- Nama file: `{resource}_{YYYY-MM-DD}.xlsx` — contoh `pelanggan_2026-09-24.xlsx`.

## Why

Tidak perlu round-trip ke server = tidak kena server-side limit/pagination. User sudah filter data, export adalah hasil kerja mereka. `xlsx` paketnya ringan dan sudah battle-tested di browser.
