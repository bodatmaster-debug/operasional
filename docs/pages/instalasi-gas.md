# Pencatatan instalasi gas

## Tujuan dan cakupan

Mencatat konfigurasi aktual instalasi gas per SPPG dan menampilkan indikator kesiapan untuk instalasi gas, peralatan high pressure, dan peralatan low pressure.

## Sumber data dan pemetaan

- Konfigurasi aktual disimpan pada SQLite lokal di `sppg_gas_installation`: sensor/alarm kebocoran, jalur high pressure, dan jalur low pressure.
- Inventaris peralatan tetap disimpan terpisah pada `asset_inventory`.
- Instalasi gas dikaitkan dengan konfigurasi SPPG; kuali ring 2 tungku dikaitkan dengan jalur high pressure; stock pot dikaitkan dengan jalur low pressure.
- Jumlah peralatan tidak dibuat atau diubah otomatis oleh konfigurasi instalasi.

## Arti indikator

- Status kesiapan Instalasi gas mengikuti jumlah aktual paket Instalasi gas yang dicatat, bukan sekadar tersimpannya konfigurasi jalur.
- Status kesiapan high pressure mengikuti jumlah aktual kuali ring 2 tungku yang dicatat.
- Status kesiapan low pressure mengikuti jumlah aktual stock pot yang dicatat.
- Acuan jumlah alat hanya dibandingkan jika konteks SPPG tepat 3.000 penerima manfaat; konteks lain tetap perlu verifikasi.
- Status jumlah aktual peralatan tetap mengikuti catatan inventaris dan dibandingkan dengan acuan hanya dalam konteks yang berlaku.

## Konteks dan batas interpretasi

Indikator kesiapan di atas merupakan aturan operasional aplikasi berdasarkan arahan pengguna dan jumlah aktual yang dibandingkan dengan acuan bersyarat. Indikator bukan sertifikasi keselamatan, inspeksi teknis, atau kesimpulan kepatuhan terhadap BGN. Workbook tidak menetapkan rasio jumlah jalur terhadap jumlah alat; jalur hanya ditampilkan sebagai catatan konfigurasi dan tidak menggantikan jumlah alat.

## Rujukan

- Workbook `Standar_Operasional_BGN.xlsx`: sheet Peralatan Dapur, Lampiran 7 no. 76, 82, dan 83; serta Ringkasan Persyaratan Ps. 4.9.4b.
- Ringkasan konteks dan batas interpretasi workbook: `docs/standar-operasional-bgn.md` pada proyek `dashboard`.
