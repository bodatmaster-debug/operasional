"use client"

import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import { getMaintenanceRecurrenceLabel } from "@/lib/maintenance"
import type {
  MaintenanceOccurrence,
  MaintenanceType,
} from "@/lib/maintenance"

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/inter-latin-400-normal.woff", fontWeight: 400 },
    { src: "/fonts/inter-latin-500-normal.woff", fontWeight: 500 },
    { src: "/fonts/inter-latin-600-normal.woff", fontWeight: 600 },
    { src: "/fonts/inter-latin-700-normal.woff", fontWeight: 700 },
  ],
})

const colors = {
  ink: "#172B3A",
  text: "#334155",
  muted: "#5B6873",
  brand: "#247D78",
  brandDark: "#155E59",
  accent: "#D2A52B",
  border: "#D8E0E5",
  tableHeader: "#EDF3F5",
  alternateRow: "#F7F9FA",
  white: "#FFFFFF",
}

const styles = StyleSheet.create({
  page: {
    position: "relative",
    paddingTop: 132,
    paddingHorizontal: 36,
    paddingBottom: 52,
    fontFamily: "Inter",
    fontSize: 9,
    color: colors.text,
    backgroundColor: colors.white,
  },
  pageHeader: {
    position: "absolute",
    top: 28,
    left: 36,
    right: 36,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 42,
    height: 42,
    objectFit: "contain",
  },
  brandName: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: colors.brandDark,
  },
  brandCaption: {
    marginTop: 4,
    fontSize: 7.5,
    fontWeight: 500,
    color: colors.muted,
  },
  documentHeading: {
    alignItems: "flex-end",
    maxWidth: 430,
  },
  eyebrow: {
    marginBottom: 5,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.1,
    color: colors.brand,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 8.5,
    fontWeight: 500,
    color: colors.muted,
  },
  overview: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 18,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: colors.tableHeader,
    borderRadius: 4,
  },
  periodBlock: {
    flexGrow: 1,
    flexBasis: 0,
  },
  overviewLabel: {
    marginBottom: 4,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  overviewValue: {
    fontSize: 10,
    fontWeight: 600,
    fontFeatureSettings: ["tnum", "lnum"],
    color: colors.ink,
  },
  countBlock: {
    width: 140,
    paddingLeft: 13,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  countValue: {
    fontSize: 14,
    fontWeight: 700,
    fontFeatureSettings: ["tnum", "lnum"],
    color: colors.brandDark,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    backgroundColor: colors.tableHeader,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    paddingRight: 8,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 0.7,
    color: colors.ink,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.6,
    borderBottomColor: colors.border,
  },
  alternateRow: {
    backgroundColor: colors.alternateRow,
  },
  cell: {
    paddingRight: 8,
    fontSize: 8.5,
    lineHeight: 1.4,
    color: colors.text,
  },
  date: {
    width: 78,
    fontFeatureSettings: ["tnum", "lnum"],
  },
  item: {
    width: 185,
  },
  assignees: {
    width: 110,
  },
  needs: {
    width: 155,
  },
  notes: {
    flexGrow: 1,
    flexBasis: 0,
  },
  itemName: {
    marginBottom: 3,
    fontSize: 9.5,
    fontWeight: 600,
    lineHeight: 1.35,
    color: colors.ink,
  },
  itemMeta: {
    marginBottom: 2,
    fontSize: 7.5,
    fontWeight: 500,
    lineHeight: 1.35,
    color: colors.muted,
  },
  needEntry: {
    marginBottom: 7,
  },
  needName: {
    marginBottom: 2,
    fontSize: 8.5,
    fontWeight: 600,
    lineHeight: 1.3,
    color: colors.ink,
  },
  needMeta: {
    fontSize: 7.5,
    fontWeight: 500,
    lineHeight: 1.35,
    color: colors.muted,
  },
  recurrence: {
    marginBottom: 4,
    fontSize: 8,
    fontWeight: 600,
    lineHeight: 1.3,
    color: colors.brandDark,
  },
  emptyRow: {
    paddingVertical: 24,
    paddingHorizontal: 10,
    textAlign: "center",
    fontSize: 9,
    color: colors.muted,
    borderBottomWidth: 0.6,
    borderBottomColor: colors.border,
  },
  disclaimer: {
    marginTop: 14,
    fontSize: 8,
    lineHeight: 1.45,
    fontWeight: 500,
    color: colors.muted,
  },
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 7.5,
    fontWeight: 500,
    color: colors.muted,
  },
  footerPages: {
    fontSize: 7.5,
    fontWeight: 600,
    fontFeatureSettings: ["tnum", "lnum"],
    color: colors.text,
  },
})

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function maintenanceTypeLabel(value: MaintenanceType) {
  return value === "routine" ? "Maintenance rutin" : "Perbaikan"
}

export function MaintenanceReportDocument({
  occurrences,
  periodLabel,
  startDate,
  endDate,
  generatedAt = new Date(),
}: {
  occurrences: readonly MaintenanceOccurrence[]
  periodLabel: string
  startDate: string
  endDate: string
  generatedAt?: Date
}) {
  const generatedAtLabel = formatGeneratedAt(generatedAt)

  return (
    <Document
      title="Laporan Rencana Pemeliharaan"
      author="Operasional"
      subject={`Jadwal pemeliharaan ${periodLabel.toLowerCase()}`}
    >
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <View style={styles.pageHeader} fixed>
          <View style={styles.brand}>
            {/* The adjacent brand name provides the logo's meaning in this PDF. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="/operasional-logo.png" style={styles.logo} />
            <View>
              <Text style={styles.brandName}>OPERASIONAL</Text>
              <Text style={styles.brandCaption}>Sistem manajemen operasional</Text>
            </View>
          </View>
          <View style={styles.documentHeading}>
            <Text style={styles.eyebrow}>LAPORAN JADWAL</Text>
            <Text style={styles.title}>Rencana Pemeliharaan</Text>
            <Text style={styles.subtitle}>Periode {periodLabel}</Text>
          </View>
        </View>

        <View style={styles.overview}>
          <View style={styles.periodBlock}>
            <Text style={styles.overviewLabel}>RENTANG LAPORAN</Text>
            <Text style={styles.overviewValue}>
              {formatDate(startDate)} - {formatDate(endDate)}
            </Text>
          </View>
          <View style={styles.countBlock}>
            <Text style={styles.overviewLabel}>TOTAL AGENDA</Text>
            <Text style={styles.countValue}>{occurrences.length}</Text>
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          <Text style={[styles.tableHeaderText, styles.date]}>Tanggal</Text>
          <Text style={[styles.tableHeaderText, styles.item]}>
            Item pemeliharaan
          </Text>
          <Text style={[styles.tableHeaderText, styles.assignees]}>Petugas</Text>
          <Text style={[styles.tableHeaderText, styles.needs]}>Kebutuhan</Text>
          <Text style={[styles.tableHeaderText, styles.notes]}>Keterangan</Text>
        </View>

        {occurrences.length === 0 ? (
          <Text style={styles.emptyRow}>
            Tidak ada agenda pemeliharaan pada periode ini.
          </Text>
        ) : (
          occurrences.map(({ date, schedule }, index) => {
            const isRecurring = schedule.recurrence !== "none"

            return (
              <View
                key={`${schedule.id}-${date}`}
                style={[
                  styles.row,
                  ...(index % 2 === 1 ? [styles.alternateRow] : []),
                ]}
                wrap={false}
              >
                <Text style={[styles.cell, styles.date]}>{formatDate(date)}</Text>
                <View style={[styles.cell, styles.item]}>
                  <Text style={styles.itemName}>
                    {schedule.asset_name || "Item tidak tercatat"}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {maintenanceTypeLabel(schedule.maintenance_type)}
                    {schedule.asset_category
                      ? ` - ${schedule.asset_category}`
                      : ""}
                  </Text>
                  {schedule.sppg_name && (
                    <Text style={styles.itemMeta}>
                      SPPG: {schedule.sppg_name}
                    </Text>
                  )}
                  {schedule.asset_details && (
                    <Text style={styles.itemMeta}>{schedule.asset_details}</Text>
                  )}
                </View>
                <Text style={[styles.cell, styles.assignees]}>
                  {schedule.assignees || "Belum ditentukan"}
                </Text>
                <View style={[styles.cell, styles.needs]}>
                  {schedule.needs.length === 0 ? (
                    <Text style={styles.itemMeta}>Tidak dicatat</Text>
                  ) : (
                    schedule.needs.map((need, needIndex) => (
                      <View
                        key={`${need.name}-${needIndex}`}
                        style={styles.needEntry}
                      >
                        <Text style={styles.needName}>{need.name}</Text>
                        <Text style={styles.needMeta}>
                          {need.quantity} {need.unit}
                        </Text>
                        {need.notes && (
                          <Text style={styles.needMeta}>{need.notes}</Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
                <View style={[styles.cell, styles.notes]}>
                  {isRecurring && (
                    <Text style={styles.recurrence}>
                      Berkala -{" "}
                      {getMaintenanceRecurrenceLabel(
                        schedule.recurrence,
                        schedule.recurrence_days,
                      )}
                    </Text>
                  )}
                  <Text>
                    {schedule.notes.trim() ||
                      (isRecurring ? "Tidak ada catatan tambahan." : "Tidak ada keterangan.")}
                  </Text>
                </View>
              </View>
            )
          })
        )}

        <Text style={styles.disclaimer}>
          Dokumen ini memuat rencana pemeliharaan yang tercatat dan bukan bukti
          bahwa pekerjaan telah dilaksanakan. Daftar kebutuhan juga merupakan
          rencana, bukan catatan barang yang telah dibeli atau digunakan.
        </Text>

        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerText}>
            Dibuat {generatedAtLabel} - Data jadwal lokal
          </Text>
          <Text
            style={styles.footerPages}
            render={({ pageNumber, totalPages }) =>
              `Halaman ${pageNumber} dari ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
