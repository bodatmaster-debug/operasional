"use client"

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import { getAssetConditionLabel, type AssetConditionValue } from "@/lib/asset-condition"

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/inter-latin-400-normal.woff", fontWeight: 400 },
    { src: "/fonts/inter-latin-500-normal.woff", fontWeight: 500 },
    { src: "/fonts/inter-latin-600-normal.woff", fontWeight: 600 },
    { src: "/fonts/inter-latin-700-normal.woff", fontWeight: 700 },
  ],
})

export type ExportAssetDetail = {
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

const colors = {
  ink: "#172B3A",
  text: "#334155",
  muted: "#5B6873",
  brand: "#155E59",
  border: "#D8E0E5",
  header: "#EDF3F5",
  alternate: "#F7F9FA",
  white: "#FFFFFF",
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Inter",
    fontSize: 8.5,
    color: colors.text,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 5,
    marginBottom: 14,
    fontSize: 8.5,
    color: colors.muted,
  },
  overview: {
    flexDirection: "row",
    marginBottom: 14,
    padding: 10,
    backgroundColor: colors.header,
  },
  overviewItem: { width: "25%" },
  overviewLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: colors.muted,
  },
  overviewValue: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: 700,
    color: colors.brand,
  },
  header: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 5,
    backgroundColor: colors.header,
  },
  headerText: { fontSize: 7, fontWeight: 700, color: colors.ink },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 5,
    borderBottomWidth: 0.6,
    borderBottomColor: colors.border,
  },
  alternateRow: { backgroundColor: colors.alternate },
  cell: { fontSize: 7.5, lineHeight: 1.35 },
  source: { width: 65 },
  category: { width: 86 },
  name: { width: 165 },
  type: { width: 125 },
  brand: { width: 72 },
  quantity: { width: 60 },
  condition: { width: 86 },
  reference: { width: 100 },
})

export function AssetCompletenessExportDocument({
  sppgName,
  overview,
  assets,
}: {
  sppgName: string
  overview: {
    percentage: number | null
    comparableItemCount: number
    itemsAtReference: number
    itemsNeedingVerification: number
  }
  assets: readonly ExportAssetDetail[]
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Rincian aset aktual — {sppgName}</Text>
        <Text style={styles.subtitle}>
          Ekspor kelengkapan aset aktual dari aplikasi Operasional
        </Text>
        <View style={styles.overview}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Kelengkapan</Text>
            <Text style={styles.overviewValue}>
              {overview.percentage === null ? "—" : `${overview.percentage}%`}
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Mencapai acuan</Text>
            <Text style={styles.overviewValue}>{overview.itemsAtReference}</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Dapat dibandingkan</Text>
            <Text style={styles.overviewValue}>{overview.comparableItemCount}</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Perlu verifikasi</Text>
            <Text style={styles.overviewValue}>{overview.itemsNeedingVerification}</Text>
          </View>
        </View>
        <View style={styles.header}>
          <Text style={[styles.headerText, styles.source]}>Sumber</Text>
          <Text style={[styles.headerText, styles.category]}>Kategori</Text>
          <Text style={[styles.headerText, styles.name]}>Nama aset</Text>
          <Text style={[styles.headerText, styles.type]}>Tipe/model</Text>
          <Text style={[styles.headerText, styles.brand]}>Merek</Text>
          <Text style={[styles.headerText, styles.quantity]}>Jumlah</Text>
          <Text style={[styles.headerText, styles.condition]}>Kondisi</Text>
          <Text style={[styles.headerText, styles.reference]}>Rujukan</Text>
        </View>
        {assets.map((asset, index) => (
          <View
            key={asset.id}
            style={[styles.row, index % 2 === 1 ? styles.alternateRow : undefined]}
          >
            <Text style={[styles.cell, styles.source]}>{asset.source}</Text>
            <Text style={[styles.cell, styles.category]}>{asset.category}</Text>
            <Text style={[styles.cell, styles.name]}>{asset.name}</Text>
            <Text style={[styles.cell, styles.type]}>{asset.type || "Belum dicatat"}</Text>
            <Text style={[styles.cell, styles.brand]}>{asset.brand || "Belum dicatat"}</Text>
            <Text style={[styles.cell, styles.quantity]}>
              {asset.quantity}{asset.unit ? ` ${asset.unit}` : ""}
            </Text>
            <Text style={[styles.cell, styles.condition]}>
              {getAssetConditionLabel(asset.condition)}
            </Text>
            <Text style={[styles.cell, styles.reference]}>{asset.reference ?? "—"}</Text>
          </View>
        ))}
      </Page>
    </Document>
  )
}
