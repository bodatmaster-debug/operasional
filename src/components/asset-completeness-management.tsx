"use client"

import * as React from "react"
import {
  Badge,
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import {
  DataVizPalette,
  DonutChart,
  getColorFromToken,
} from "@fluentui/react-charts"
import {
  ArrowSyncCircleFilled,
  ArrowSyncCircleRegular,
  bundleIcon,
} from "@fluentui/react-icons"
import type { TableColumnDefinition } from "@fluentui/react-components"
import type { ChartProps } from "@fluentui/react-charts"
import { AssetCompletenessExportDialog } from "@/components/asset-completeness-export-dialog"
import {
  getAssetConditionLabel,
  isAssetCondition,
  type AssetConditionValue,
} from "@/lib/asset-condition"
import type { AssetCompletenessRecord } from "@/lib/asset-completeness"

const numberFormatter = new Intl.NumberFormat("id-ID")
const percentFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
})
const RefreshIcon = bundleIcon(
  ArrowSyncCircleFilled,
  ArrowSyncCircleRegular,
)

type AssetCompletenessAssetDetail = {
  id: string
  source: "Juknis" | "Kendaraan" | "Non-Juknis" | "Surat Edaran"
  category: string
  name: string
  type: string
  brand: string
  quantity: number
  unit: string | null
  condition: AssetConditionValue
  reference?: string
}

const useStyles = makeStyles({
  view: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    minWidth: 0,
    gap: "16px",
    marginTop: "24px",
  },
  explanation: {
    width: "100%",
    minWidth: 0,
    maxWidth: "900px",
    lineHeight: tokens.lineHeightBase300,
  },
  chartArea: {
    display: "grid",
    alignContent: "start",
    justifyItems: "start",
    gap: tokens.spacingVerticalS,
    width: "100%",
    maxWidth: "none",
    minWidth: 0,
  },
  chartTitleTrigger: {
    justifySelf: "center",
    color: tokens.colorBrandForegroundLink,
    cursor: "help",
    textDecorationLine: "underline",
    textDecorationStyle: "solid",
    textUnderlineOffset: "3px",
    ":hover": {
      color: tokens.colorBrandForegroundLinkHover,
    },
    ":focus-visible": {
      outline: `2px solid ${tokens.colorBrandStroke1}`,
      outlineOffset: "2px",
      borderRadius: tokens.borderRadiusSmall,
    },
  },
  donutChart: {
    width: "100%",
    maxWidth: "442px",
    minWidth: 0,
    justifySelf: "center",
    "& svg": {
      maxWidth: "100%",
      height: "auto",
    },
  },
  toolbar: {
    display: "flex",
    minWidth: 0,
    justifyContent: "flex-end",
    gap: "10px",
  },
  refreshButton: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled": {
      display: "inline",
      color: tokens.colorBrandForeground1,
    },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular": {
      display: "none",
    },
  },
  tableContainer: {
    minWidth: 0,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  tableShell: {
    minWidth: 0,
    overflow: "auto",
  },
  dataGrid: {
    width: "100%",
    minWidth: "890px",
    "& [role='columnheader']:nth-of-type(1), & [role='gridcell']:nth-of-type(1)": {
      flex: "2 1 300px",
      minWidth: "220px",
    },
    "& [role='columnheader']:nth-of-type(2), & [role='gridcell']:nth-of-type(2)": {
      flex: "1 1 120px",
      minWidth: "110px",
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(2) > div": {
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(3), & [role='gridcell']:nth-of-type(3)": {
      flex: "1 1 150px",
      minWidth: "130px",
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(3) > div": {
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(4), & [role='gridcell']:nth-of-type(4)": {
      flex: "1 1 160px",
      minWidth: "140px",
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(4) > div": {
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(5), & [role='gridcell']:nth-of-type(5)": {
      flex: "1 1 160px",
      minWidth: "140px",
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(5) > div": {
      justifyContent: "flex-end",
    },
  },
  detailHeading: {
    display: "grid",
    gap: "4px",
    minWidth: 0,
  },
  detailGrid: {
    width: "100%",
    minWidth: "1270px",
    "& [role='columnheader']:nth-of-type(1), & [role='gridcell']:nth-of-type(1)": {
      flex: "0 0 130px",
    },
    "& [role='columnheader']:nth-of-type(2), & [role='gridcell']:nth-of-type(2)": {
      flex: "0 0 180px",
    },
    "& [role='columnheader']:nth-of-type(3), & [role='gridcell']:nth-of-type(3)": {
      flex: "1 1 260px",
      minWidth: "220px",
    },
    "& [role='columnheader']:nth-of-type(4), & [role='gridcell']:nth-of-type(4)": {
      flex: "0 0 180px",
    },
    "& [role='columnheader']:nth-of-type(5), & [role='gridcell']:nth-of-type(5)": {
      flex: "0 0 120px",
    },
    "& [role='columnheader']:nth-of-type(6), & [role='gridcell']:nth-of-type(6)": {
      flex: "0 0 140px",
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(6) > div": {
      justifyContent: "flex-start",
    },
    "& [role='columnheader']:nth-of-type(7), & [role='gridcell']:nth-of-type(7)": {
      flex: "0 0 150px",
    },
    "& [role='columnheader']:nth-of-type(8), & [role='gridcell']:nth-of-type(8)": {
      flex: "0 0 150px",
    },
  },
  selectableRow: {
    cursor: "pointer",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  tableHeader: {
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  headerCell: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  countCell: {
    width: "100%",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },
  missingReference: {
    color: tokens.colorNeutralForeground3,
  },
  completionCell: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  percentageTrigger: {
    cursor: "help",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: "3px",
  },
  status: {
    display: "flex",
    minHeight: "180px",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "12px",
    padding: "24px",
    textAlign: "center",
  },
})

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
}

function isCompletenessRecord(
  value: unknown,
): value is AssetCompletenessRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "nama" in value &&
    typeof value.nama === "string" &&
    "juknisRecordCount" in value &&
    isCount(value.juknisRecordCount) &&
    "juknisItemsAtReference" in value &&
    isCount(value.juknisItemsAtReference) &&
    "juknisComparableItemCount" in value &&
    isCount(value.juknisComparableItemCount) &&
    value.juknisItemsAtReference <= value.juknisComparableItemCount &&
    "juknisItemsNeedingVerification" in value &&
    isCount(value.juknisItemsNeedingVerification) &&
    "nonJuknisRecordCount" in value &&
    isCount(value.nonJuknisRecordCount) &&
    "suratEdaranRecordCount" in value &&
    isCount(value.suratEdaranRecordCount) &&
    "itemsAtReference" in value &&
    isCount(value.itemsAtReference) &&
    "comparableItemCount" in value &&
    isCount(value.comparableItemCount) &&
    value.itemsAtReference <= value.comparableItemCount &&
    "itemsNeedingVerification" in value &&
    isCount(value.itemsNeedingVerification) &&
    "percentage" in value &&
    (value.percentage === null ||
      (typeof value.percentage === "number" &&
        Number.isFinite(value.percentage) &&
        value.percentage >= 0 &&
        value.percentage <= 100))
  )
}

function isAssetCompletenessAssetDetail(
  value: unknown,
): value is AssetCompletenessAssetDetail {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "source" in value &&
    (value.source === "Juknis" ||
      value.source === "Kendaraan" ||
      value.source === "Non-Juknis" ||
      value.source === "Surat Edaran") &&
    "category" in value &&
    typeof value.category === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "type" in value &&
    typeof value.type === "string" &&
    "brand" in value &&
    typeof value.brand === "string" &&
    "quantity" in value &&
    isCount(value.quantity) &&
    "unit" in value &&
    (typeof value.unit === "string" || value.unit === null) &&
    "condition" in value &&
    isAssetCondition(value.condition) &&
    (!("reference" in value) ||
      typeof value.reference === "string")
  )
}

async function errorFromResponse(
  response: Response,
  fallback = "Ringkasan kelengkapan aset gagal dimuat.",
) {
  const payload: unknown = await response.json().catch(() => null)
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error
  }
  return fallback
}

export function AssetCompletenessManagement() {
  const styles = useStyles()
  const [records, setRecords] = React.useState<AssetCompletenessRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [detailResult, setDetailResult] = React.useState<{
    sppgId: string
    assets: AssetCompletenessAssetDetail[]
  } | null>(null)
  const [detailLoadingId, setDetailLoadingId] = React.useState<string | null>(
    null,
  )
  const [detailErrorResult, setDetailErrorResult] = React.useState<{
    sppgId: string
    message: string
  } | null>(null)
  const [refreshCount, setRefreshCount] = React.useState(0)
  const [selectedRecordId, setSelectedRecordId] = React.useState<string | null>(
    null,
  )
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [chartContainer, setChartContainer] =
    React.useState<HTMLDivElement | null>(null)

  const selectedRecord = records.find(
    (record) => record.id === selectedRecordId,
  )
  const detailAssets =
    detailResult?.sppgId === selectedRecordId
      ? detailResult.assets
      : []
  const detailLoading =
    selectedRecordId !== null &&
    detailLoadingId === selectedRecordId
  const detailError =
    detailErrorResult?.sppgId === selectedRecordId
      ? detailErrorResult.message
      : ""
  const juknisItemsNotAtReference = selectedRecord
    ? selectedRecord.juknisComparableItemCount -
      selectedRecord.juknisItemsAtReference
    : 0
  const chartData: ChartProps | null = selectedRecord
    ? {
        chartData: [
          {
            legend: "Memenuhi acuan",
            data: selectedRecord.juknisItemsAtReference,
            color: getColorFromToken(DataVizPalette.color1),
          },
          {
            legend: "Belum memenuhi atau belum dicatat",
            data: juknisItemsNotAtReference,
            color: getColorFromToken(DataVizPalette.color2),
          },
        ],
      }
    : null

  React.useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      setLoadError("")
      try {
        const response = await fetch("/api/asset-completeness", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(await errorFromResponse(response))

        const payload: unknown = await response.json().catch(() => null)
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("records" in payload) ||
          !Array.isArray(payload.records) ||
          !payload.records.every(isCompletenessRecord)
        ) {
          throw new Error("Respons ringkasan kelengkapan aset tidak valid.")
        }
        if (!controller.signal.aborted) setRecords(payload.records)
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Ringkasan kelengkapan aset gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [refreshCount])

  React.useEffect(() => {
    if (!selectedRecordId) return

    const controller = new AbortController()
    void (async () => {
      setDetailLoadingId(selectedRecordId)
      setDetailErrorResult(null)
      try {
        const response = await fetch(
          `/api/asset-completeness?sppgId=${encodeURIComponent(selectedRecordId)}`,
          { cache: "no-store", signal: controller.signal },
        )
        if (!response.ok) {
          throw new Error(
            await errorFromResponse(
              response,
              "Rincian aset aktual gagal dimuat.",
            ),
          )
        }
        const payload: unknown = await response.json().catch(() => null)
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("assets" in payload) ||
          !Array.isArray(payload.assets) ||
          !payload.assets.every(isAssetCompletenessAssetDetail)
        ) {
          throw new Error("Respons rincian aset aktual tidak valid.")
        }
        if (!controller.signal.aborted) {
          setDetailResult({ sppgId: selectedRecordId, assets: payload.assets })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setDetailErrorResult({
            sppgId: selectedRecordId,
            message:
              error instanceof Error
                ? error.message
                : "Rincian aset aktual gagal dimuat.",
          })
        }
      } finally {
        if (!controller.signal.aborted) setDetailLoadingId(null)
      }
    })()
    return () => controller.abort()
  }, [refreshCount, selectedRecordId])

  const columns = React.useMemo<TableColumnDefinition<AssetCompletenessRecord>[]>(
    () => [
      createTableColumn<AssetCompletenessRecord>({
        columnId: "sppg",
        compare: (a, b) => a.nama.localeCompare(b.nama, "id"),
        renderHeaderCell: () => "SPPG",
        renderCell: (record) => <Text weight="semibold">{record.nama}</Text>,
      }),
      createTableColumn<AssetCompletenessRecord>({
        columnId: "juknis",
        compare: (a, b) => a.juknisRecordCount - b.juknisRecordCount,
        renderHeaderCell: () => "Juknis",
        renderCell: (record) => (
          <Text className={styles.countCell}>
            {numberFormatter.format(record.juknisRecordCount)} item
          </Text>
        ),
      }),
      createTableColumn<AssetCompletenessRecord>({
        columnId: "nonJuknis",
        compare: (a, b) => a.nonJuknisRecordCount - b.nonJuknisRecordCount,
        renderHeaderCell: () => "Non-Juknis",
        renderCell: (record) => (
          <Text className={styles.countCell}>
            {numberFormatter.format(record.nonJuknisRecordCount)} item
          </Text>
        ),
      }),
      createTableColumn<AssetCompletenessRecord>({
        columnId: "suratEdaran",
        compare: (a, b) => a.suratEdaranRecordCount - b.suratEdaranRecordCount,
        renderHeaderCell: () => "Surat Edaran",
        renderCell: (record) => (
          <Text className={styles.countCell}>
            {numberFormatter.format(record.suratEdaranRecordCount)} item
          </Text>
        ),
      }),
      createTableColumn<AssetCompletenessRecord>({
        columnId: "percentage",
        compare: (a, b) => (a.percentage ?? -1) - (b.percentage ?? -1),
        renderHeaderCell: () => "Kelengkapan",
        renderCell: (record) => (
          <div className={styles.completionCell}>
            <Tooltip
              content={[
                record.comparableItemCount === 0
                  ? "Tidak ada item yang dapat dibandingkan."
                  : `${numberFormatter.format(record.itemsAtReference)} dari ${numberFormatter.format(record.comparableItemCount)} item mencapai acuan.`,
                record.itemsNeedingVerification > 0
                  ? `${numberFormatter.format(record.itemsNeedingVerification)} item perlu verifikasi.`
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              relationship="description"
            >
              <Text
                as="span"
                className={styles.percentageTrigger}
                tabIndex={0}
                weight="semibold"
              >
                {record.percentage === null
                  ? "—"
                  : `${percentFormatter.format(record.percentage)}%`}
              </Text>
            </Tooltip>
          </div>
        ),
      }),
    ],
    [styles],
  )

  const detailColumns = React.useMemo<
    TableColumnDefinition<AssetCompletenessAssetDetail>[]
  >(
    () => [
      createTableColumn<AssetCompletenessAssetDetail>({
        columnId: "source",
        compare: (a, b) => a.source.localeCompare(b.source, "id"),
        renderHeaderCell: () => "Sumber",
        renderCell: (asset) => <Text>{asset.source}</Text>,
      }),
      createTableColumn<AssetCompletenessAssetDetail>({
        columnId: "category",
        compare: (a, b) => a.category.localeCompare(b.category, "id"),
        renderHeaderCell: () => "Kategori",
        renderCell: (asset) => <Text>{asset.category}</Text>,
      }),
      createTableColumn<AssetCompletenessAssetDetail>({
        columnId: "name",
        compare: (a, b) => a.name.localeCompare(b.name, "id"),
        renderHeaderCell: () => "Nama aset",
        renderCell: (asset) => <Text weight="semibold">{asset.name}</Text>,
      }),
      createTableColumn<AssetCompletenessAssetDetail>({
        columnId: "type",
        compare: (a, b) => a.type.localeCompare(b.type, "id"),
        renderHeaderCell: () => "Tipe / model",
        renderCell: (asset) => <Text>{asset.type || "Belum dicatat"}</Text>,
      }),
      createTableColumn<AssetCompletenessAssetDetail>({
        columnId: "brand",
        compare: (a, b) => a.brand.localeCompare(b.brand, "id"),
        renderHeaderCell: () => "Merek",
        renderCell: (asset) => <Text>{asset.brand || "Belum dicatat"}</Text>,
      }),
      createTableColumn<AssetCompletenessAssetDetail>({
        columnId: "quantity",
        compare: (a, b) => a.quantity - b.quantity,
        renderHeaderCell: () => "Jumlah aktual",
        renderCell: (asset) => (
          <Text className={styles.countCell}>
            {numberFormatter.format(asset.quantity)}
            {asset.unit ? ` ${asset.unit}` : ""}
          </Text>
        ),
      }),
      createTableColumn<AssetCompletenessAssetDetail>({
        columnId: "condition",
        compare: (a, b) =>
          getAssetConditionLabel(a.condition).localeCompare(
            getAssetConditionLabel(b.condition),
            "id",
          ),
        renderHeaderCell: () => "Kondisi",
        renderCell: (asset) => (
          <Badge
            appearance="tint"
            color={
              asset.condition === "good"
                ? "success"
                : asset.condition === "service_required"
                  ? "warning"
                  : asset.condition === "broken"
                    ? "danger"
                    : "informative"
            }
          >
            {getAssetConditionLabel(asset.condition)}
          </Badge>
        ),
      }),
      createTableColumn<AssetCompletenessAssetDetail>({
        columnId: "reference",
        compare: (a, b) =>
          (a.reference ?? "").localeCompare(b.reference ?? "", "id"),
        renderHeaderCell: () => "Rujukan",
        renderCell: (asset) => {
          const reference = asset.reference?.trim()
          return reference ? (
            <Text>{reference}</Text>
          ) : (
            <Text className={styles.missingReference}>Tidak dicantumkan</Text>
          )
        },
      }),
    ],
    [styles],
  )

  return (
    <section className={styles.view} aria-label="Kelengkapan aset per SPPG">
      {selectedRecord ? (
        <div
          className={styles.chartArea}
          ref={setChartContainer}
          aria-label={`Pemenuhan acuan item Juknis per SPPG ${selectedRecord.nama}`}
        >
          <Text as="h2" size={400} weight="semibold">
            {selectedRecord.nama}
          </Text>
          <Tooltip
            content="Realisasi diambil dari jumlah aktual yang tercatat per item. Grafik membandingkannya dengan acuan kuantitas katalog Juknis yang sesuai dengan konteks SPPG. Item tanpa catatan dihitung belum mencapai acuan; acuan yang kosong, ambigu, opsional, atau tidak sesuai konteks perlu verifikasi dan dikecualikan."
            relationship="description"
          >
            <Text
              as="span"
              className={styles.chartTitleTrigger}
              size={300}
              tabIndex={0}
            >
              Pemenuhan acuan item Juknis
            </Text>
          </Tooltip>
          {selectedRecord.juknisComparableItemCount > 0 && chartData ? (
            <DonutChart
              culture={
                typeof window !== "undefined"
                  ? window.navigator.language
                  : "id-ID"
              }
              data={chartData}
              parentRef={chartContainer}
              innerRadius={47}
              hideLegend={false}
              hideTooltip
              legendsOverflowText="Item lainnya"
              height={187}
              width={442}
              className={styles.donutChart}
              valueInsideDonut={`${numberFormatter.format(selectedRecord.juknisItemsAtReference)}/${numberFormatter.format(selectedRecord.juknisComparableItemCount)}`}
            />
          ) : (
            <Text size={300}>
              Belum ada item Juknis yang dapat dibandingkan dengan yakin.
              {selectedRecord.juknisItemsNeedingVerification > 0
                ? ` ${numberFormatter.format(selectedRecord.juknisItemsNeedingVerification)} item perlu verifikasi.`
                : ""}
            </Text>
          )}
          {selectedRecord.juknisComparableItemCount > 0 && (
            <Text size={200}>
              Realisasi tercatat untuk{" "}
              {numberFormatter.format(selectedRecord.juknisRecordCount)} item
              Juknis;{" "}
              {numberFormatter.format(selectedRecord.juknisItemsAtReference)}{" "}
              mencapai acuan dan{" "}
              {numberFormatter.format(juknisItemsNotAtReference)} belum
              memenuhi atau belum dicatat, dari{" "}
              {numberFormatter.format(
                selectedRecord.juknisComparableItemCount,
              )}{" "}
              item yang dapat dibandingkan.
            </Text>
          )}
          {selectedRecord.juknisComparableItemCount > 0 &&
            selectedRecord.juknisItemsNeedingVerification > 0 && (
              <Text size={200}>
                {numberFormatter.format(
                  selectedRecord.juknisItemsNeedingVerification,
                )}{" "}
                item Juknis perlu verifikasi dan dikecualikan dari grafik.
              </Text>
            )}
        </div>
      ) : (
        <Text size={300} className={styles.explanation}>
          Jumlah menunjukkan banyaknya item yang dicatat, bukan total
          kuantitas. Persentase membandingkan jumlah aktual dengan acuan per
          item yang satuannya dan konteksnya dapat dibandingkan; ini bukan
          penilaian kepatuhan.
        </Text>
      )}
      <MessageBar intent="info">
        <MessageBarBody>
          Item yang memerlukan verifikasi tidak dihitung dalam persentase dan
          ditampilkan terpisah. Item yang dapat dibandingkan tetapi belum
          dicatat tetap masuk penyebut.
        </MessageBarBody>
      </MessageBar>
      <div className={styles.toolbar}>
        <Button
          appearance="primary"
          disabled={
            loading ||
            !selectedRecord ||
            detailLoading ||
            Boolean(detailError)
          }
          onClick={() => setExportDialogOpen(true)}
        >
          Ekspor aset
        </Button>
        <Button
          className={styles.refreshButton}
          appearance="secondary"
          disabled={loading}
          icon={<RefreshIcon aria-hidden="true" />}
          onClick={() => setRefreshCount((count) => count + 1)}
        >
          Muat ulang
        </Button>
      </div>
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.status} role="status">
            <Spinner label="Memuat ringkasan aset…" />
          </div>
        ) : loadError ? (
          <div className={styles.status} role="alert">
            <Text>{loadError}</Text>
            <Button
              appearance="secondary"
              onClick={() => setRefreshCount((count) => count + 1)}
            >
              Coba lagi
            </Button>
          </div>
        ) : records.length === 0 ? (
          <div className={styles.status} role="status">
            <Text>Belum ada data SPPG untuk diringkas.</Text>
          </div>
        ) : (
          <div className={styles.tableShell}>
            <DataGrid
              items={records}
              columns={columns}
              getRowId={(record) => record.id}
              aria-label="Jumlah aset dan kelengkapan per SPPG"
              className={styles.dataGrid}
            >
              <DataGridHeader className={styles.tableHeader}>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell className={styles.headerCell}>
                      {renderHeaderCell()}
                    </DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<AssetCompletenessRecord>>
                {({ item }) => (
                  <DataGridRow
                    key={item.id}
                    className={styles.selectableRow}
                    appearance={
                      selectedRecordId === item.id ? "brand" : "none"
                    }
                    aria-selected={selectedRecordId === item.id}
                    onClick={() => setSelectedRecordId(item.id)}
                    onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedRecordId(item.id)
                      }
                    }}
                  >
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </div>
        )}
      </div>
      {selectedRecord && (
        <section
          className={styles.view}
          aria-label={`Rincian aset aktual ${selectedRecord.nama}`}
        >
          <div className={styles.detailHeading}>
            <Text as="h2" size={400} weight="semibold">
              Rincian aset aktual · {selectedRecord.nama}
            </Text>
            <Text size={200}>
              {`${numberFormatter.format(detailAssets.length)} catatan inventaris. Satu baris mewakili satu catatan; jumlah mengikuti nilai aktual pada catatan.`}
            </Text>
          </div>
          {detailLoading ? (
            <div className={styles.status} role="status">
              <Spinner label="Memuat rincian aset aktual…" />
            </div>
          ) : detailError ? (
            <div className={styles.status} role="alert">
              <Text>{detailError}</Text>
              <Button
                appearance="secondary"
                onClick={() => setRefreshCount((count) => count + 1)}
              >
                Coba lagi
              </Button>
            </div>
          ) : detailAssets.length === 0 ? (
            <div className={styles.status} role="status">
              <Text>Belum ada catatan aset aktual untuk SPPG ini.</Text>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <div className={styles.tableShell}>
                <DataGrid
                  items={detailAssets}
                  columns={detailColumns}
                  getRowId={(asset) => asset.id}
                  aria-label={`Rincian catatan aset aktual ${selectedRecord.nama}`}
                  className={styles.detailGrid}
                >
                  <DataGridHeader className={styles.tableHeader}>
                    <DataGridRow>
                      {({ renderHeaderCell }) => (
                        <DataGridHeaderCell className={styles.headerCell}>
                          {renderHeaderCell()}
                        </DataGridHeaderCell>
                      )}
                    </DataGridRow>
                  </DataGridHeader>
                  <DataGridBody<AssetCompletenessAssetDetail>>
                    {({ item }) => (
                      <DataGridRow key={item.id}>
                        {({ renderCell }) => (
                          <DataGridCell>{renderCell(item)}</DataGridCell>
                        )}
                      </DataGridRow>
                    )}
                  </DataGridBody>
                </DataGrid>
              </div>
            </div>
          )}
        </section>
      )}
      {selectedRecord && (
        <AssetCompletenessExportDialog
          open={exportDialogOpen}
          record={selectedRecord}
          assets={detailAssets}
          loading={detailLoading}
          onOpenChange={setExportDialogOpen}
        />
      )}
    </section>
  )
}
