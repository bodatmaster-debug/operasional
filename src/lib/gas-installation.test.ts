import assert from "node:assert/strict"
import test from "node:test"
import {
  GasInstallationValidationError,
  getGasInstallationConfigurationStatus,
  readGasInstallationInput,
} from "./gas-installation.ts"

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    sppgId: "sppg-1",
    safetySystemPresent: true,
    highPressurePresent: true,
    highPressureLineCount: 1,
    lowPressurePresent: true,
    lowPressureLineCount: 2,
    ...overrides,
  }
}

function readStatus(
  overrides: Partial<{
    safety_system_present: number
    high_pressure_present: number
    high_pressure_line_count: number | null
    low_pressure_present: number
    low_pressure_line_count: number | null
  }> = {},
) {
  return getGasInstallationConfigurationStatus({
    safety_system_present: 1,
    high_pressure_present: 1,
    high_pressure_line_count: 1,
    low_pressure_present: 1,
    low_pressure_line_count: 2,
    ...overrides,
  })
}

test("gas route counts are required only when the route is present", () => {
  assert.deepEqual(
    readGasInstallationInput(
      validInput({
        highPressurePresent: false,
        highPressureLineCount: null,
        lowPressurePresent: false,
        lowPressureLineCount: null,
      }),
    ),
    {
      sppgId: "sppg-1",
      safetySystemPresent: true,
      highPressurePresent: false,
      highPressureLineCount: null,
      lowPressurePresent: false,
      lowPressureLineCount: null,
    },
  )
})

test("gas route validation rejects missing, nonpositive, and inconsistent counts", () => {
  for (const invalidCount of [null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () =>
        readGasInstallationInput(
          validInput({ highPressureLineCount: invalidCount }),
        ),
      GasInstallationValidationError,
    )
  }

  assert.throws(
    () =>
      readGasInstallationInput(
        validInput({
          highPressurePresent: false,
          highPressureLineCount: 1,
        }),
      ),
    GasInstallationValidationError,
  )
})

test("gas configuration status is complete only when all three choices are yes", () => {
  assert.equal(getGasInstallationConfigurationStatus(null), "Belum dicatat")
  assert.equal(readStatus(), "Terpenuhi")
  assert.equal(
    readStatus({ safety_system_present: 0 }),
    "Belum terpenuhi",
  )
  assert.equal(
    readStatus({ low_pressure_present: 0, low_pressure_line_count: null }),
    "Belum terpenuhi",
  )
})

test("gas configuration status flags incomplete or inconsistent records for verification", () => {
  assert.equal(
    readStatus({ high_pressure_line_count: null }),
    "Perlu verifikasi",
  )
  assert.equal(
    readStatus({ low_pressure_present: 0, low_pressure_line_count: 1 }),
    "Perlu verifikasi",
  )
  assert.equal(readStatus({ safety_system_present: 2 }), "Perlu verifikasi")
})
