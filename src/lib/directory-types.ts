export type DirectoryKind = "sppg" | "yayasan"

export type SppgDirectoryRecord = {
  id: string
  nama: string
  yayasan_id: string
  yayasan: string
  lokasi: string
  kepala_sppg: string
  pic: string
  jumlah_penerima_manfaat: number | null
  alamat: string
  provinsi_kode: string
  provinsi_nama: string
  kabupaten_kode: string
  kabupaten_nama: string
  kecamatan_kode: string
  kecamatan_nama: string
  desa_kode: string
  desa_nama: string
}

export type YayasanDirectoryRecord = {
  id: string
  nama: string
  alamat_yayasan: string
  nomor_telepon_yayasan: string
  ketua_yayasan: string
  alamat_ketua_yayasan: string
  nomor_telepon_ketua_yayasan: string
  sppg_count: number
}

export type DirectoryEditTarget =
  | { kind: "sppg"; record: SppgDirectoryRecord }
  | { kind: "yayasan"; record: YayasanDirectoryRecord }
