import "server-only"

export type RegionOption = { kode: string; nama: string }
export type SppgLocation = {
  provinsi: RegionOption
  kabupaten: RegionOption
  kecamatan: RegionOption
  desa: RegionOption
  alamat: string
}

export class RegionDataError extends Error {}
export class RegionInputError extends Error {}

const SOURCE_URL =
  "https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql"
const CODE_PATTERN = /^\d{2}(?:\.\d{2}){0,2}$/
let regionsPromise: Promise<RegionOption[]> | null = null

function parseDataset(sql: string) {
  const regions: RegionOption[] = []
  const rowPattern = /\(\s*'(\d+(?:\.\d+)*)'\s*,\s*'((?:[^']|'')*)'\s*\)/g
  for (const match of sql.matchAll(rowPattern)) {
    regions.push({ kode: match[1], nama: match[2].replace(/''/g, "'") })
  }
  if (regions.length < 500) {
    throw new RegionDataError("Dataset wilayah yang diterima tidak lengkap.")
  }
  return regions
}

async function loadRegions() {
  if (!regionsPromise) {
    regionsPromise = fetch(SOURCE_URL, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(30_000),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new RegionDataError(
            `Sumber data wilayah merespons HTTP ${response.status}.`,
          )
        }
        return parseDataset(await response.text())
      })
      .catch((error: unknown) => {
        regionsPromise = null
        if (error instanceof RegionDataError) throw error
        throw new RegionDataError("Dataset wilayah gagal dimuat.")
      })
  }
  return regionsPromise
}

export async function getRegionOptions(parentCode: string | null) {
  if (parentCode && !CODE_PATTERN.test(parentCode)) {
    throw new RegionInputError("Kode induk wilayah tidak valid.")
  }
  const regions = await loadRegions()
  const depth = parentCode ? parentCode.split(".").length : 0
  return regions
    .filter((region) => {
      if (!parentCode) return !region.kode.includes(".")
      return (
        region.kode.startsWith(`${parentCode}.`) &&
        region.kode.split(".").length === depth + 1
      )
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"))
}

export async function validateSppgLocation(value: unknown): Promise<SppgLocation> {
  if (typeof value !== "object" || value === null) {
    throw new RegionInputError("Lengkapi pilihan wilayah dan alamat SPPG.")
  }
  const candidate = value as Record<string, unknown>
  const regionKeys = ["provinsi", "kabupaten", "kecamatan", "desa"] as const
  const supplied = regionKeys.map((key) => {
    const region = candidate[key]
    if (
      typeof region !== "object" ||
      region === null ||
      !("kode" in region) ||
      !("nama" in region) ||
      typeof region.kode !== "string" ||
      typeof region.nama !== "string"
    ) {
      throw new RegionInputError("Lengkapi pilihan wilayah SPPG.")
    }
    return { kode: region.kode.trim(), nama: region.nama.trim() }
  })
  if (
    typeof candidate.alamat !== "string" ||
    !candidate.alamat.trim() ||
    candidate.alamat.trim().length > 1000
  ) {
    throw new RegionInputError("Alamat SPPG wajib diisi (maksimal 1.000 karakter).")
  }

  const regions = await loadRegions()
  const canonical = supplied.map(({ kode, nama }, index) => {
    const match = regions.find((region) => region.kode === kode)
    const parent = supplied[index - 1]
    const isExpectedDepth = kode.split(".").length === index + 1
    const hasExpectedParent =
      !parent || kode.startsWith(`${parent.kode}.`)
    if (
      !match ||
      match.nama !== nama ||
      !isExpectedDepth ||
      !hasExpectedParent
    ) {
      throw new RegionInputError(
        "Pilihan wilayah SPPG tidak sesuai. Pilih ulang wilayah.",
      )
    }
    return match
  })

  return {
    provinsi: canonical[0],
    kabupaten: canonical[1],
    kecamatan: canonical[2],
    desa: canonical[3],
    alamat: candidate.alamat.trim(),
  }
}
