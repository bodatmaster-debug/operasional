export const VEHICLE_TYPES = [
  { value: "R4", label: "Roda 4 (R4)" },
  { value: "R3", label: "Roda 3 (R3)" },
  { value: "R2", label: "Roda 2 (R2)" },
  { value: "sampan", label: "Sampan" },
  { value: "speedboat", label: "Speedboat" },
  { value: "sepeda", label: "Sepeda" },
] as const

export type VehicleType = (typeof VEHICLE_TYPES)[number]["value"]

export const VEHICLE_SUBTYPES: Record<VehicleType, readonly string[]> = {
  R4: [
    "Pickup",
    "Box / mobil box",
    "Minibus",
    "Blind van",
    "Cab Chassis",
    "Lainnya",
  ],
  R3: ["Motor roda tiga box tertutup", "Motor roda tiga bak terbuka", "Lainnya"],
  R2: ["Motor bebek", "Skuter / matik", "Motor trail / dual-purpose", "Lainnya"],
  sampan: ["Sampan dayung", "Sampan bermesin", "Lainnya"],
  speedboat: ["Speedboat", "Lainnya"],
  sepeda: ["Sepeda nonmotor", "Sepeda listrik", "Lainnya"],
}

type VehicleModelEntry = {
  label: string
  sourceLevel: string
  sourceNote: string
}

type VehicleModelGroup = {
  vehicleType: VehicleType
  subtype: string
  make: string
  models: readonly VehicleModelEntry[]
}

const vehicleModelGroups: readonly VehicleModelGroup[] = [
  {
    vehicleType: "R4",
    subtype: "Pickup",
    make: "Daihatsu",
    models: [
      {
        label: "Gran Max · Pick Up 1.3",
        sourceLevel: "Pabrikan / laporan penggunaan",
        sourceNote:
          "Draft katalog tetangga mencatat satu contoh SPPG; bukan bukti penggunaan universal atau kapasitas baku.",
      },
      {
        label: "Gran Max · Pick Up 1.5",
        sourceLevel: "Pabrikan",
        sourceNote:
          "Varian tercantum di draft katalog; bukti penggunaan MBG tidak dipisahkan dari varian 1.3.",
      },
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Box / mobil box",
    make: "Daihatsu",
    models: [
      {
        label: "Gran Max · Box (karoseri MBG)",
        sourceLevel: "Vendor karoseri",
        sourceNote:
          "Contoh penawaran karoseri MBG/BGN; bukan daftar kendaraan yang disetujui BGN.",
      },
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Minibus",
    make: "Daihatsu",
    models: [
      {
        label: "Gran Max · Minibus 1.3 D FH E4",
        sourceLevel: "Media otomotif",
        sourceNote:
          "Artikel menyebut penggunaan sebagai armada SPPG; bukan persyaratan BGN.",
      },
      {
        label: "Gran Max · Minibus 1.3 D FF FH E4",
        sourceLevel: "Media otomotif",
        sourceNote:
          "Artikel menyebut penggunaan sebagai armada SPPG; bukan persyaratan BGN.",
      },
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Blind van",
    make: "Daihatsu",
    models: [
      {
        label: "Gran Max · Blind Van",
        sourceLevel: "Perlu verifikasi",
        sourceNote:
          "Varian pasar dicantumkan sebagai pembanding; penggunaan MBG dan spesifikasi perlu diverifikasi.",
      },
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Pickup",
    make: "Suzuki",
    models: [
      ...[
        "Pick Up Flat Deck STD",
        "Pick Up Wide Deck STD",
        "Pick Up Flat Deck AC-PS",
        "Pick Up Wide Deck AC-PS",
      ].map((variant) => ({
        label: `New Carry · ${variant}`,
        sourceLevel: "Media otomotif",
        sourceNote:
          "New Carry diberitakan mendukung pengadaan SPPG; varian ini tetap pilihan pencatatan, bukan ketentuan BGN.",
      })),
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Box / mobil box",
    make: "Suzuki",
    models: [
      {
        label: "New Carry · Box MBG BGN (Std)",
        sourceLevel: "Dealer",
        sourceNote:
          "Contoh penawaran dealer, bukan spesifikasi atau persetujuan BGN.",
      },
      {
        label: "New Carry · Box MBG BGN (ACPS)",
        sourceLevel: "Dealer",
        sourceNote:
          "Contoh penawaran dealer, bukan spesifikasi atau persetujuan BGN.",
      },
    ],
  },
  {
    vehicleType: "R3",
    subtype: "Motor roda tiga box tertutup",
    make: "Viar",
    models: [
      {
        label: "Karya MBG (basis New Karya 200 Ln)",
        sourceLevel: "Materi promosi produsen",
        sourceNote:
          "Contoh produk komersial; bukan bukti penggunaan universal atau standar BGN.",
      },
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Pickup",
    make: "Toyota",
    models: [
      ...[
        "Pick Up 2.0 Standard MT",
        "Pick Up 2.0 Standard MT 3Way",
        "Pick Up 2.0 High MT",
        "Pick Up 2.4 DSL Standard MT",
        "Pick Up 2.4 DSL Standard MT 3Way",
        "Pick Up 2.4 DSL High MT",
        "Pick Up 2.4 DSL High AT",
      ].map((variant) => ({
        label: `Hilux Rangga · ${variant}`,
        sourceLevel: "Media otomotif",
        sourceNote:
          "Draft katalog merujuk pemberitaan Hilux Rangga MBG; bukan standar atau rekomendasi BGN.",
      })),
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Cab Chassis",
    make: "Toyota",
    models: [
      ...[
        "Cab Chassis 2.0 Standard MT",
        "Cab Chassis 2.4 DSL Standard MT",
        "Cab Chassis 2.4 DSL High AT",
      ].map((variant) => ({
        label: `Hilux Rangga · ${variant}`,
        sourceLevel: "Media otomotif",
        sourceNote:
          "Draft katalog merujuk pemberitaan Hilux Rangga MBG; bukan standar atau rekomendasi BGN.",
      })),
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Pickup",
    make: "Mitsubishi",
    models: [
      {
        label: "Colt L300 · Pick Up Flat Deck 2.5 Diesel",
        sourceLevel: "Media otomotif / vendor karoseri",
        sourceNote:
          "Draft katalog menyebut penawaran box untuk MBG/BGN; penggunaan aktual perlu diverifikasi.",
      },
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Box / mobil box",
    make: "Mitsubishi",
    models: [
      {
        label: "Colt L300 · Box (karoseri MBG)",
        sourceLevel: "Vendor karoseri",
        sourceNote:
          "Contoh penawaran karoseri; bukan daftar kendaraan yang disetujui BGN.",
      },
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Cab Chassis",
    make: "Mitsubishi",
    models: [
      {
        label: "Colt L300 · Cab Chassis 2.5 Diesel",
        sourceLevel: "Media otomotif",
        sourceNote:
          "Varian dicantumkan di draft katalog; bukti penggunaan MBG tidak dirinci.",
      },
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Pickup",
    make: "Isuzu",
    models: [
      {
        label: "Traga · Pick Up FD (Flat Deck)",
        sourceLevel: "Media otomotif / vendor karoseri",
        sourceNote:
          "Draft katalog menyebut penawaran box untuk MBG/BGN; penggunaan aktual perlu diverifikasi.",
      },
      {
        label: "Traga · Pick Up AC",
        sourceLevel: "Media otomotif / vendor karoseri",
        sourceNote:
          "Draft katalog menyebut penawaran box untuk MBG/BGN; penggunaan aktual perlu diverifikasi.",
      },
    ],
  },
  {
    vehicleType: "R4",
    subtype: "Box / mobil box",
    make: "Isuzu",
    models: [
      {
        label: "Traga · Box",
        sourceLevel: "Vendor karoseri",
        sourceNote:
          "Contoh penawaran karoseri; bukan daftar kendaraan yang disetujui BGN.",
      },
    ],
  },
]

const vehicleTypeLabels: Record<VehicleType, string> = {
  R4: "Roda 4 (R4)",
  R3: "Roda 3 (R3)",
  R2: "Roda 2 (R2)",
  sampan: "Sampan",
  speedboat: "Speedboat",
  sepeda: "Sepeda",
}

export function isVehicleType(value: unknown): value is VehicleType {
  return (
    typeof value === "string" &&
    VEHICLE_TYPES.some((vehicleType) => vehicleType.value === value)
  )
}

export function getVehicleTypeLabel(value: VehicleType) {
  return vehicleTypeLabels[value]
}

export function getVehicleSubtypes(vehicleType: VehicleType) {
  return ["Belum dicatat", ...VEHICLE_SUBTYPES[vehicleType]]
}

export function getVehicleMakes(vehicleType: VehicleType, subtype: string) {
  const makes = vehicleModelGroups
    .filter(
      (option) =>
        option.vehicleType === vehicleType && option.subtype === subtype,
    )
    .map((option) => option.make)
  return [...new Set(["Belum dicatat", ...makes, "Lainnya"])]
}

export function getVehicleModels(
  vehicleType: VehicleType,
  subtype: string,
  make: string,
) {
  const option = vehicleModelGroups.find(
    (candidate) =>
      candidate.vehicleType === vehicleType &&
      candidate.subtype === subtype &&
      candidate.make === make,
  )
  return [
    "Belum dicatat",
    ...(option?.models.map((model) => model.label) ?? []),
    "Lainnya",
  ]
}

export function getVehicleModelSource(
  vehicleType: VehicleType,
  subtype: string,
  make: string,
  model: string,
) {
  return (
    vehicleModelGroups
      .find(
        (candidate) =>
          candidate.vehicleType === vehicleType &&
          candidate.subtype === subtype &&
          candidate.make === make,
      )
      ?.models.find((candidate) => candidate.label === model) ?? null
  )
}
