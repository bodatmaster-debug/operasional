import type { AssetStatus } from "./asset-status"

export type GasInstallationInput = {
  sppgId: string
  safetySystemPresent: boolean
  highPressurePresent: boolean
  highPressureLineCount: number | null
  lowPressurePresent: boolean
  lowPressureLineCount: number | null
}

export type GasInstallationStatusRecord = {
  safety_system_present: number
  high_pressure_present: number
  high_pressure_line_count: number | null
  low_pressure_present: number
  low_pressure_line_count: number | null
}

export class GasInstallationValidationError extends Error {}

export function readGasInstallationInput(
  body: Record<string, unknown>,
): GasInstallationInput {
  const sppgId = typeof body.sppgId === "string" ? body.sppgId.trim() : ""
  if (!sppgId || sppgId.length > 120) {
    throw new GasInstallationValidationError("SPPG wajib dipilih.")
  }

  function readPresence(key: string, label: string) {
    const value = body[key]
    if (typeof value !== "boolean") {
      throw new GasInstallationValidationError(
        `${label} harus dipilih Ada atau Tidak ada.`,
      )
    }
    return value
  }

  function readLineCount(
    key: string,
    label: string,
    isPresent: boolean,
  ): number | null {
    const value = body[key]
    if (!isPresent) {
      if (value !== null && value !== undefined) {
        throw new GasInstallationValidationError(
          `${label} hanya boleh diisi jika jalurnya ada.`,
        )
      }
      return null
    }

    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < 1
    ) {
      throw new GasInstallationValidationError(
        `${label} harus berupa bilangan bulat positif.`,
      )
    }
    return value
  }

  const safetySystemPresent = readPresence(
    "safetySystemPresent",
    "Sistem keamanan gas",
  )
  const highPressurePresent = readPresence(
    "highPressurePresent",
    "Jalur high pressure",
  )
  const lowPressurePresent = readPresence(
    "lowPressurePresent",
    "Jalur low pressure",
  )

  return {
    sppgId,
    safetySystemPresent,
    highPressurePresent,
    highPressureLineCount: readLineCount(
      "highPressureLineCount",
      "Jumlah jalur high pressure",
      highPressurePresent,
    ),
    lowPressurePresent,
    lowPressureLineCount: readLineCount(
      "lowPressureLineCount",
      "Jumlah jalur low pressure",
      lowPressurePresent,
    ),
  }
}

export function getGasInstallationConfigurationStatus(
  record: GasInstallationStatusRecord | null,
): AssetStatus {
  if (!record) return "Belum dicatat"

  const presenceFlags = [
    record.safety_system_present,
    record.high_pressure_present,
    record.low_pressure_present,
  ]
  if (
    presenceFlags.some((flag) => flag !== 0 && flag !== 1) ||
    !hasValidLineCount(
      record.high_pressure_present,
      record.high_pressure_line_count,
    ) ||
    !hasValidLineCount(
      record.low_pressure_present,
      record.low_pressure_line_count,
    )
  ) {
    return "Perlu verifikasi"
  }

  return presenceFlags.every((flag) => flag === 1)
    ? "Terpenuhi"
    : "Belum terpenuhi"
}

function hasValidLineCount(
  isPresent: number,
  lineCount: number | null,
): boolean {
  return isPresent === 1
    ? typeof lineCount === "number" &&
        Number.isSafeInteger(lineCount) &&
        lineCount > 0
    : isPresent === 0 && lineCount === null
}
