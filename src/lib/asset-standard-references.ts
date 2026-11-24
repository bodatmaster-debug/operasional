export type AssetStandardReference = {
  id: string
  aspect: string
  requirement: string
  nature: string
  source: string
}

export const vehicleStandardReferences: AssetStandardReference[] = [
  {
    id: "vehicle-agglomeration-up-to-1500",
    aspect: "Aglomerasi · ≤1.500 penerima manfaat",
    requirement: "1 kendaraan roda 4 dengan box tertutup.",
    nature: "Minimal",
    source: "Ps. 4.7k",
  },
  {
    id: "vehicle-agglomeration-over-1500",
    aspect: "Aglomerasi · >1.500 penerima manfaat",
    requirement: "2 kendaraan roda 4 dengan box tertutup.",
    nature: "Minimal",
    source: "Ps. 4.7k",
  },
  {
    id: "vehicle-general-maximum",
    aspect: "Batas maksimum umum",
    requirement: "2 R4 dan/atau 1 R3 dan/atau 2 R2.",
    nature: "Maksimum",
    source: "Ps. 4.7j",
  },
  {
    id: "vehicle-limited-access",
    aspect: "Wilayah sulit akses",
    requirement:
      "R3, R2, sampan, speedboat, atau sepeda; jumlah sesuai analisis kebutuhan wajar.",
    nature: "Negosiasi harga riil",
    source: "Ps. 4.7l",
  },
  {
    id: "vehicle-drivers",
    aspect: "Pengemudi",
    requirement:
      "1 sopir utama dan 1 sopir cadangan per tim distribusi; SIM A/C.",
    nature: "Wajib",
    source: "Ps. 4.9.2c.12d, 4.9.2d",
  },
  {
    id: "vehicle-rental",
    aspect: "Kendaraan sewa",
    requirement:
      "Dari badan hukum (CV/PT) atau perorangan; layak jalan, bersih, dan wajib berasuransi.",
    nature: "Wajib",
    source: "Ps. 4.7m",
  },
  {
    id: "vehicle-rental-price",
    aspect: "Acuan harga sewa",
    requirement:
      "PMK 32/2025 SBM untuk pick up berusia ≤5 tahun; kendaraan berusia >5 tahun menggunakan formula BPK; pajak ditanggung pemilik.",
    nature: "Acuan",
    source: "Ps. 4.7i",
  },
  {
    id: "vehicle-box-example",
    aspect: "Spesifikasi box · contoh/opsional",
    requirement:
      "Box aluminium; lantai SPHC 1,5 mm; atap galvanil minimal 0,9 mm; engsel dan kunci stainless; rak makanan rangka besi; lampu LED interior; 2 jackstand portabel.",
    nature: "Contoh/opsional",
    source: "Lampiran 10",
  },
  {
    id: "vehicle-pre-trip-check",
    aspect: "Pemeriksaan sebelum jalan",
    requirement:
      "Periksa kelayakan dan keselamatan kendaraan serta kesehatan petugas; kendaraan dikunci saat ditinggal.",
    nature: "Wajib",
    source: "Ps. 4.9.4e",
  },
]

export const electricalStandardReferences: AssetStandardReference[] = [
  {
    id: "electrical-main-reference",
    aspect: "Listrik",
    requirement: "PLN dan genset cadangan; instalasi standar aman.",
    nature: "Fasilitas wajib",
    source: "Ringkasan Persyaratan · Ps. 4.9.4b",
  },
]
