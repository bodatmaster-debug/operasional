"use client"

import * as React from "react"
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Option,
  Radio,
  RadioGroup,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import type { LocalUser } from "@/lib/access-types"
import type { SppgDirectoryRecord } from "@/lib/directory-types"

type ElectricalInstallationRecord = {
  sppg_id: string
  pln_capacity_va: number
  generator_present: 0 | 1
  generator_capacity_kva: number | null
  generator_brand: string | null
  created_at: string
  updated_at: string
}

type PresenceChoice = "yes" | "no" | ""

const useStyles = makeStyles({
  page: {
    display: "grid",
    minWidth: 0,
    gap: "16px",
  },
  summaryGrid: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "minmax(0, 1fr)",
    alignItems: "start",
    gap: "16px",
  },
  configurationColumn: {
    display: "grid",
    minWidth: 0,
    alignContent: "start",
    gap: "16px",
  },
  sppgField: {
    width: "100%",
  },
  configuration: {
    display: "grid",
    minWidth: 0,
    gap: "12px",
    padding: "16px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  configurationHeader: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
  headerCopy: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2,
  },
  values: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "12px",
  },
  value: {
    display: "grid",
    minWidth: 0,
    alignContent: "start",
    gap: "4px",
    paddingTop: "12px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  valueLabel: {
    color: tokens.colorNeutralForeground2,
  },
  reference: {
    display: "grid",
    minWidth: 0,
    alignContent: "start",
    gap: "12px",
    padding: "16px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  referenceHeader: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  dialogContent: {
    display: "grid",
    minWidth: 0,
    gap: "16px",
    paddingBlock: "4px",
  },
  radioGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
  },
  emptyState: {
    display: "grid",
    minWidth: 0,
    justifyItems: "start",
    gap: "8px",
    paddingBlock: "8px",
  },
})

function errorFromPayload(payload: unknown, fallback: string) {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback
}

function isPresenceFlag(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1
}

function isElectricalInstallationRecord(
  value: unknown,
): value is ElectricalInstallationRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    !("sppg_id" in value) ||
    typeof value.sppg_id !== "string" ||
    !("pln_capacity_va" in value) ||
    typeof value.pln_capacity_va !== "number" ||
    !Number.isSafeInteger(value.pln_capacity_va) ||
    value.pln_capacity_va < 1 ||
    !("generator_present" in value) ||
    !isPresenceFlag(value.generator_present) ||
    !("generator_capacity_kva" in value) ||
    !("generator_brand" in value) ||
    !("created_at" in value) ||
    typeof value.created_at !== "string" ||
    !("updated_at" in value) ||
    typeof value.updated_at !== "string"
  ) {
    return false
  }

  if (value.generator_present === 0) {
    return value.generator_capacity_kva === null && value.generator_brand === null
  }

  return (
    typeof value.generator_capacity_kva === "number" &&
    Number.isFinite(value.generator_capacity_kva) &&
    value.generator_capacity_kva > 0 &&
    typeof value.generator_brand === "string" &&
    value.generator_brand.trim().length > 0 &&
    value.generator_brand.length <= 100
  )
}

function isPresenceChoice(value: string): value is Exclude<PresenceChoice, ""> {
  return value === "yes" || value === "no"
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(value)
}

export function ElectricalInstallationManagement({
  user,
  sppgs,
  selectedSppgId,
  directoryLoading,
  directoryError,
  onSelectSppg,
}: {
  user: LocalUser
  sppgs: SppgDirectoryRecord[]
  selectedSppgId: string
  directoryLoading: boolean
  directoryError: string
  onSelectSppg: (sppgId: string) => void
}) {
  const styles = useStyles()
  const [record, setRecord] =
    React.useState<ElectricalInstallationRecord | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [refreshCount, setRefreshCount] = React.useState(0)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [plnCapacityVa, setPlnCapacityVa] = React.useState("")
  const [generatorPresent, setGeneratorPresent] =
    React.useState<PresenceChoice>("")
  const [generatorCapacityKva, setGeneratorCapacityKva] = React.useState("")
  const [generatorBrand, setGeneratorBrand] = React.useState("")
  const [formError, setFormError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [notice, setNotice] = React.useState("")
  const selectedSppg = sppgs.find((sppg) => sppg.id === selectedSppgId)
  const currentRecord =
    record?.sppg_id === selectedSppgId ? record : null
  const canManage =
    user.role === "admin" ||
    user.permissions?.assets === true
  const isLoading =
    Boolean(selectedSppgId) && loading && !directoryLoading && !directoryError

  React.useEffect(() => {
    if (!selectedSppgId || directoryLoading || directoryError) return

    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      setLoadError("")
      try {
        const response = await fetch(
          `/api/electrical-installation?sppgId=${encodeURIComponent(selectedSppgId)}`,
          { cache: "no-store", signal: controller.signal },
        )
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            errorFromPayload(payload, "Konfigurasi instalasi listrik gagal dimuat."),
          )
        }
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("record" in payload) ||
          (payload.record !== null &&
            !isElectricalInstallationRecord(payload.record))
        ) {
          throw new Error("Respons konfigurasi instalasi listrik tidak valid.")
        }
        if (!controller.signal.aborted) setRecord(payload.record)
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Konfigurasi instalasi listrik gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [selectedSppgId, directoryError, directoryLoading, refreshCount])

  function openForm() {
    setPlnCapacityVa(
      currentRecord ? String(currentRecord.pln_capacity_va) : "",
    )
    setGeneratorPresent(
      currentRecord
        ? currentRecord.generator_present === 1
          ? "yes"
          : "no"
        : "",
    )
    setGeneratorCapacityKva(
      currentRecord?.generator_capacity_kva === null ||
        !currentRecord?.generator_capacity_kva
        ? ""
        : String(currentRecord.generator_capacity_kva),
    )
    setGeneratorBrand(currentRecord?.generator_brand ?? "")
    setFormError("")
    setNotice("")
    setDialogOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSppgId) return

    const parsedPlnCapacityVa = Number(plnCapacityVa)
    if (
      !plnCapacityVa.trim() ||
      !Number.isSafeInteger(parsedPlnCapacityVa) ||
      parsedPlnCapacityVa < 1
    ) {
      setFormError("Daya PLN harus berupa bilangan bulat VA yang positif.")
      return
    }
    if (!isPresenceChoice(generatorPresent)) {
      setFormError("Pilih Ya atau Tidak untuk genset cadangan.")
      return
    }

    let parsedGeneratorCapacityKva: number | null = null
    let parsedGeneratorBrand: string | null = null
    if (generatorPresent === "yes") {
      parsedGeneratorCapacityKva = Number(generatorCapacityKva)
      parsedGeneratorBrand = generatorBrand.trim()
      if (
        !generatorCapacityKva.trim() ||
        !Number.isFinite(parsedGeneratorCapacityKva) ||
        parsedGeneratorCapacityKva <= 0
      ) {
        setFormError("Kapasitas genset harus berupa angka kVA yang positif.")
        return
      }
      if (!parsedGeneratorBrand || parsedGeneratorBrand.length > 100) {
        setFormError("Merek genset wajib diisi dan maksimal 100 karakter.")
        return
      }
    }

    setSaving(true)
    setFormError("")
    setNotice("")
    try {
      const response = await fetch("/api/electrical-installation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sppgId: selectedSppgId,
          plnCapacityVa: parsedPlnCapacityVa,
          generatorPresent: generatorPresent === "yes",
          generatorCapacityKva: parsedGeneratorCapacityKva,
          generatorBrand: parsedGeneratorBrand,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Konfigurasi instalasi listrik gagal disimpan."),
        )
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("record" in payload) ||
        !isElectricalInstallationRecord(payload.record) ||
        payload.record.sppg_id !== selectedSppgId
      ) {
        throw new Error("Respons konfigurasi instalasi listrik tidak valid.")
      }

      setRecord(payload.record)
      setDialogOpen(false)
      setNotice("Catatan instalasi listrik berhasil disimpan.")
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Konfigurasi instalasi listrik gagal disimpan.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.summaryGrid}>
        <div className={styles.configurationColumn}>
          <Field label="SPPG" className={styles.sppgField}>
            <Dropdown
              aria-label="SPPG untuk pencatatan instalasi listrik"
              placeholder={
                directoryLoading
                  ? "Memuat daftar SPPG…"
                  : sppgs.length === 0
                    ? "Belum ada SPPG"
                    : "Pilih SPPG"
              }
              value={selectedSppg?.nama ?? ""}
              selectedOptions={selectedSppgId ? [selectedSppgId] : []}
              disabled={directoryLoading || sppgs.length === 0}
              onOptionSelect={(_, data) => {
                onSelectSppg(data.optionValue ?? "")
                setNotice("")
                setLoadError("")
              }}
            >
              {sppgs.map((sppg) => (
                <Option key={sppg.id} value={sppg.id} text={sppg.nama}>
                  {sppg.nama}
                </Option>
              ))}
            </Dropdown>
          </Field>

          {directoryError && (
            <MessageBar intent="error">
              <MessageBarBody>{directoryError}</MessageBarBody>
            </MessageBar>
          )}
          {!directoryLoading && sppgs.length === 0 && !directoryError && (
            <MessageBar intent="warning">
              <MessageBarBody>
                Tambahkan SPPG terlebih dahulu untuk mencatat konfigurasi listrik.
              </MessageBarBody>
            </MessageBar>
          )}

          <section
            className={styles.configuration}
            aria-labelledby="electrical-configuration-title"
          >
            <div className={styles.configurationHeader}>
              <div className={styles.headerCopy}>
                <Text
                  id="electrical-configuration-title"
                  size={400}
                  weight="semibold"
                >
                  Konfigurasi aktual
                </Text>
                <Text size={200} className={styles.secondaryText}>
                  {selectedSppg?.nama ?? "SPPG terpilih"} · Catatan kondisi,
                  bukan status kepatuhan.
                </Text>
              </div>
              {canManage && selectedSppgId && (
                <Button
                  appearance="primary"
                  size="small"
                  disabled={
                    isLoading ||
                    Boolean(loadError) ||
                    Boolean(directoryError) ||
                    saving
                  }
                  onClick={openForm}
                >
                  {currentRecord ? "Ubah catatan" : "Catat kondisi"}
                </Button>
              )}
            </div>

            {notice && (
              <MessageBar intent="success">
                <MessageBarBody>{notice}</MessageBarBody>
              </MessageBar>
            )}
            {isLoading ? (
              <div role="status" className={styles.emptyState}>
                <Spinner size="small" label="Memuat konfigurasi instalasi listrik" />
              </div>
            ) : loadError ? (
              <MessageBar intent="error">
                <MessageBarBody>{loadError}</MessageBarBody>
                <MessageBarActions>
                  <Button
                    appearance="subtle"
                    onClick={() => setRefreshCount((count) => count + 1)}
                  >
                    Coba lagi
                  </Button>
                </MessageBarActions>
              </MessageBar>
            ) : (
              <div className={styles.values}>
                <div className={styles.value}>
                  <Text size={200} className={styles.valueLabel}>
                    Daya terpasang PLN
                  </Text>
                  <Text weight="semibold">
                    {!selectedSppgId
                      ? "Pilih SPPG"
                      : currentRecord
                        ? `${formatNumber(currentRecord.pln_capacity_va)} VA`
                        : "Belum dicatat"}
                  </Text>
                </div>
                <div className={styles.value}>
                  <Text size={200} className={styles.valueLabel}>
                    Genset cadangan
                  </Text>
                  <Text weight="semibold">
                    {!selectedSppgId
                      ? "Pilih SPPG"
                      : currentRecord
                        ? currentRecord.generator_present === 1
                          ? "Ada"
                          : "Tidak ada"
                        : "Belum dicatat"}
                  </Text>
                </div>
                <div className={styles.value}>
                  <Text size={200} className={styles.valueLabel}>
                    Kapasitas genset
                  </Text>
                  <Text weight="semibold">
                    {!selectedSppgId
                      ? "Pilih SPPG"
                      : currentRecord?.generator_present === 1 &&
                          currentRecord.generator_capacity_kva !== null
                        ? `${formatNumber(currentRecord.generator_capacity_kva, 10)} kVA`
                        : currentRecord
                          ? "Tidak berlaku"
                          : "Belum dicatat"}
                  </Text>
                </div>
                <div className={styles.value}>
                  <Text size={200} className={styles.valueLabel}>
                    Merek genset
                  </Text>
                  <Text weight="semibold">
                    {!selectedSppgId
                      ? "Pilih SPPG"
                      : currentRecord?.generator_present === 1
                        ? currentRecord.generator_brand
                        : currentRecord
                          ? "Tidak berlaku"
                          : "Belum dicatat"}
                  </Text>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className={styles.reference} aria-labelledby="electrical-reference-title">
          <div className={styles.referenceHeader}>
            <Text id="electrical-reference-title" size={400} weight="semibold">
              Rujukan workbook
            </Text>
            <Text size={200} className={styles.secondaryText}>
              Ringkasan Persyaratan · Ps. 4.9.4b
            </Text>
          </div>
          <Text>
            PLN dan genset cadangan; instalasi standar aman.
          </Text>
          <Text size={200} className={styles.secondaryText}>
            Workbook tidak menetapkan daya PLN, kapasitas atau merek genset.
            Halaman ini tidak memeriksa keamanan instalasi dan tidak
            menyimpulkan kepatuhan.
          </Text>
        </section>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(_, data) => {
          if (!data.open && !saving) {
            setDialogOpen(false)
            setFormError("")
          }
        }}
      >
        <DialogSurface>
          <form noValidate onSubmit={(event) => void handleSubmit(event)}>
            <DialogBody>
              <DialogTitle>
                {currentRecord
                  ? "Ubah catatan instalasi listrik"
                  : "Catat instalasi listrik"}
              </DialogTitle>
              <DialogContent className={styles.dialogContent}>
                <Text size={200} className={styles.secondaryText}>
                  {selectedSppg?.nama}. Catat nilai aktual yang diketahui;
                  formulir ini tidak memberikan rekomendasi kapasitas.
                </Text>
                <Field label="Daya terpasang PLN (VA)" required>
                  <Input
                    autoFocus
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={plnCapacityVa}
                    onChange={(_, data) => {
                      setPlnCapacityVa(data.value)
                      setFormError("")
                    }}
                  />
                </Field>
                <Field label="Genset cadangan" required>
                  <RadioGroup
                    layout="horizontal"
                    className={styles.radioGroup}
                    value={generatorPresent}
                    onChange={(_, data) => {
                      if (isPresenceChoice(data.value)) {
                        setGeneratorPresent(data.value)
                        if (data.value === "no") {
                          setGeneratorCapacityKva("")
                          setGeneratorBrand("")
                        }
                        setFormError("")
                      }
                    }}
                  >
                    <Radio value="yes" label="Ada" />
                    <Radio value="no" label="Tidak ada" />
                  </RadioGroup>
                </Field>
                {generatorPresent === "yes" && (
                  <>
                    <Field label="Kapasitas genset (kVA)" required>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        required
                        value={generatorCapacityKva}
                        onChange={(_, data) => {
                          setGeneratorCapacityKva(data.value)
                          setFormError("")
                        }}
                      />
                    </Field>
                    <Field label="Merek genset" required>
                      <Input
                        maxLength={100}
                        required
                        value={generatorBrand}
                        onChange={(_, data) => {
                          setGeneratorBrand(data.value)
                          setFormError("")
                        }}
                        placeholder="Masukkan merek sesuai nameplate"
                      />
                    </Field>
                  </>
                )}
                <MessageBar
                  intent={generatorPresent === "no" ? "warning" : "info"}
                >
                  <MessageBarBody>
                    Acuan workbook (Ringkasan Persyaratan · Ps. 4.9.4b): PLN +
                    genset cadangan; instalasi standar aman. Aktual: daya PLN{" "}
                    {plnCapacityVa.trim()
                      ? `${formatNumber(Number(plnCapacityVa))} VA`
                      : "belum diisi"}
                    ; genset{" "}
                    {generatorPresent === "yes"
                      ? `ada${generatorCapacityKva.trim() ? `, kapasitas ${generatorCapacityKva} kVA` : ", kapasitas belum diisi"}`
                      : generatorPresent === "no"
                        ? "tidak ada"
                        : "belum dipilih"}
                    . Workbook tidak menetapkan daya PLN, jumlah atau kapasitas
                    genset, maupun merek; selisih kuantitatif tidak dihitung.
                    {generatorPresent === "no" &&
                      " Pengingat: acuan menyebut genset cadangan; tinjau catatan ini sesuai konteks SPPG."}
                  </MessageBarBody>
                </MessageBar>
                {formError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{formError}</MessageBarBody>
                  </MessageBar>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  appearance="secondary"
                  disabled={saving}
                  onClick={() => {
                    setDialogOpen(false)
                    setFormError("")
                  }}
                >
                  Batal
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  disabled={saving}
                  aria-busy={saving}
                >
                  {saving && <Spinner size="tiny" />}
                  Simpan
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
