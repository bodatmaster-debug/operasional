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
import {
  terbilangRupiah,
  type RABItemInput,
  type RABRecord,
} from "@/lib/rab"
import { parseRABNotes } from "@/lib/rab-notes"

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
  brand: "#155E59",
  border: "#D8E0E5",
  header: "#EDF3F5",
  alternate: "#F7F9FA",
  white: "#FFFFFF",
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    color: colors.text,
    backgroundColor: colors.white,
  },
  portraitPage: { paddingTop: 34, paddingHorizontal: 36, paddingBottom: 34 },
  landscapePage: { paddingTop: 26, paddingHorizontal: 30, paddingBottom: 26 },
  letterhead: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1.2,
    borderBottomColor: colors.brand,
  },
  logo: { width: 150, height: 42, objectFit: "contain" },
  letterheadText: {
    flex: 1,
    alignItems: "flex-start",
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.ink,
    textAlign: "left",
  },
  sppgName: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 700,
    color: colors.brand,
    textAlign: "left",
  },
  documentMetaPortrait: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 14,
  },
  documentMetaLandscape: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 14,
  },
  metaItemPortrait: {
    width: "48%",
    paddingRight: 10,
    minHeight: 34,
    marginBottom: 10,
  },
  metaItemLandscape: {
    width: "24%",
    paddingRight: 8,
    minHeight: 34,
  },
  metaItemRight: {
    alignItems: "flex-end",
  },
  metaTextRight: {
    textAlign: "right",
  },
  metaLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: colors.muted,
  },
  metaValue: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 1.25,
    fontWeight: 700,
    color: colors.ink,
  },
  overview: {
    flexDirection: "row",
    marginBottom: 14,
    padding: 10,
    backgroundColor: colors.header,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 5,
    backgroundColor: colors.header,
  },
  tableHeaderText: { fontSize: 7.5, fontWeight: 700, color: colors.ink },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 5,
    borderBottomWidth: 0.6,
    borderBottomColor: colors.border,
  },
  alternateRow: { backgroundColor: colors.alternate },
  itemNamePortrait: { width: "34%" },
  quantityPortrait: {
    width: "11%",
    textAlign: "right",
    paddingRight: 4,
    boxSizing: "border-box",
  },
  unitPortrait: {
    width: "12%",
    paddingLeft: 5,
    boxSizing: "border-box",
  },
  unitCostPortrait: { width: "22%", textAlign: "right" },
  subtotalPortrait: { width: "21%", textAlign: "right" },
  itemNameLandscape: { width: "42%" },
  quantityLandscape: {
    width: "10%",
    textAlign: "right",
    paddingRight: 4,
    boxSizing: "border-box",
  },
  unitLandscape: {
    width: "12%",
    paddingLeft: 5,
    boxSizing: "border-box",
  },
  unitCostLandscape: { width: "18%", textAlign: "right" },
  subtotalLandscape: { width: "18%", textAlign: "right" },
  grandTotal: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "flex-end",
  },
  grandTotalLabel: { fontSize: 8, color: colors.muted },
  grandTotalValue: { marginTop: 3, fontSize: 13, fontWeight: 700, color: colors.brand },
  grandTotalWords: {
    alignSelf: "stretch",
    marginTop: 3,
    fontSize: 8,
    color: colors.muted,
    textAlign: "right",
  },
  notesSection: {
    marginTop: 14,
    marginBottom: 2,
  },
  notesLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: colors.muted,
  },
  notesText: {
    fontSize: 8,
    lineHeight: 1.35,
    color: colors.text,
  },
  notesLine: {
    flexDirection: "row",
    marginTop: 3,
  },
  notesMarker: {
    width: 18,
    flexShrink: 0,
    fontSize: 8,
    lineHeight: 1.35,
    color: colors.text,
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  signatureBlock: {
    width: "31%",
    alignItems: "center",
  },
  signatureTitle: { fontSize: 9, fontWeight: 400, color: colors.ink },
  signatureSpace: { height: 58 },
  signatureName: {
    width: "100%",
    paddingTop: 5,
    lineHeight: 1.25,
    borderTopWidth: 0.8,
    borderTopColor: colors.ink,
    fontSize: 9,
    fontWeight: 700,
    color: colors.ink,
    textAlign: "center",
  },
})

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function RABExportDocument({
  record,
  approvedBy,
  knownBy,
  orientation,
}: {
  record: RABRecord
  approvedBy: string
  knownBy: string
  orientation: "portrait" | "landscape"
}) {
  return (
    <Document
      title={`RAB ${record.sppg_name}`}
      author="Operasional"
      subject="Rencana Anggaran Biaya"
    >
      <Page
        size="A4"
        orientation={orientation}
        style={[
          styles.page,
          orientation === "portrait"
            ? styles.portraitPage
            : styles.landscapePage,
        ]}
        wrap
      >
        <View style={styles.letterhead}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/bisukma-logo.png" style={styles.logo} />
          <View style={styles.letterheadText}>
            <Text style={styles.documentTitle}>
              Rencana Anggaran Biaya (RAB) Pengadaan
            </Text>
            <Text style={styles.sppgName}>{record.sppg_name}</Text>
          </View>
        </View>

        <View
          style={
            orientation === "portrait"
              ? styles.documentMetaPortrait
              : styles.documentMetaLandscape
          }
        >
          <View
            style={
              orientation === "portrait"
                ? styles.metaItemPortrait
                : styles.metaItemLandscape
            }
          >
            <Text style={styles.metaLabel}>TANGGAL</Text>
            <Text style={styles.metaValue}>{formatDate(record.rab_date)}</Text>
          </View>
          <View
            style={
              orientation === "portrait"
                ? [styles.metaItemPortrait, styles.metaItemRight]
                : [styles.metaItemLandscape, styles.metaItemRight]
            }
          >
            <Text style={[styles.metaLabel, styles.metaTextRight]}>
              PETUGAS / TEKNISI
            </Text>
            <Text style={[styles.metaValue, styles.metaTextRight]}>
              {record.assignee_name}
            </Text>
          </View>
          <View
            style={
              orientation === "portrait"
                ? styles.metaItemPortrait
                : styles.metaItemLandscape
            }
          >
            <Text style={styles.metaLabel}>DIKETAHUI OLEH</Text>
            <Text style={styles.metaValue}>{knownBy || "-"}</Text>
          </View>
          <View
            style={
              orientation === "portrait"
                ? [styles.metaItemPortrait, styles.metaItemRight]
                : [styles.metaItemLandscape, styles.metaItemRight]
            }
          >
            <Text style={[styles.metaLabel, styles.metaTextRight]}>
              DISETUJUI OLEH
            </Text>
            <Text style={[styles.metaValue, styles.metaTextRight]}>
              {approvedBy || "-"}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          {orientation === "portrait" ? (
            <>
              <Text style={[styles.tableHeaderText, styles.itemNamePortrait]}>Nama item</Text>
              <Text style={[styles.tableHeaderText, styles.quantityPortrait]}>Kuantitas</Text>
              <Text style={[styles.tableHeaderText, styles.unitPortrait]}>Satuan</Text>
              <Text style={[styles.tableHeaderText, styles.unitCostPortrait]}>Biaya satuan</Text>
              <Text style={[styles.tableHeaderText, styles.subtotalPortrait]}>Subtotal</Text>
            </>
          ) : (
            <>
              <Text style={[styles.tableHeaderText, styles.itemNameLandscape]}>Nama item</Text>
              <Text style={[styles.tableHeaderText, styles.quantityLandscape]}>Kuantitas</Text>
              <Text style={[styles.tableHeaderText, styles.unitLandscape]}>Satuan</Text>
              <Text style={[styles.tableHeaderText, styles.unitCostLandscape]}>Biaya satuan</Text>
              <Text style={[styles.tableHeaderText, styles.subtotalLandscape]}>Subtotal</Text>
            </>
          )}
        </View>
        {record.items.map((item: RABItemInput, index) => (
          <View
            style={[styles.row, ...(index % 2 === 1 ? [styles.alternateRow] : [])]}
            key={`${item.name}-${index}`}
            wrap={false}
          >
            {orientation === "portrait" ? (
              <>
                <Text style={[styles.itemNamePortrait, { fontSize: 8 }]}>{item.name}</Text>
                <Text style={[styles.quantityPortrait, { fontSize: 8 }]}>{item.quantity}</Text>
                <Text style={[styles.unitPortrait, { fontSize: 8 }]}>{item.unit || "-"}</Text>
                <Text style={[styles.unitCostPortrait, { fontSize: 8 }]}>
                  {formatCurrency(item.estimatedUnitCost)}
                </Text>
                <Text style={[styles.subtotalPortrait, { fontSize: 8 }]}>
                  {formatCurrency(item.quantity * item.estimatedUnitCost)}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.itemNameLandscape, { fontSize: 8 }]}>{item.name}</Text>
                <Text style={[styles.quantityLandscape, { fontSize: 8 }]}>{item.quantity}</Text>
                <Text style={[styles.unitLandscape, { fontSize: 8 }]}>{item.unit || "-"}</Text>
                <Text style={[styles.unitCostLandscape, { fontSize: 8 }]}>
                  {formatCurrency(item.estimatedUnitCost)}
                </Text>
                <Text style={[styles.subtotalLandscape, { fontSize: 8 }]}>
                  {formatCurrency(item.quantity * item.estimatedUnitCost)}
                </Text>
              </>
            )}
          </View>
        ))}
        <View style={styles.grandTotal} wrap={false}>
          <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
          <Text style={styles.grandTotalValue}>
            {formatCurrency(record.grand_total)}
          </Text>
          <Text style={styles.grandTotalWords}>
            Terbilang: {terbilangRupiah(record.grand_total)}
          </Text>
        </View>
        {record.notes && (
          <View style={styles.notesSection} wrap>
            <Text style={styles.notesLabel} minPresenceAhead={18}>
              KETERANGAN / CATATAN
            </Text>
            {parseRABNotes(record.notes).map((line, index) => (
              <View
                key={index}
                style={[
                  styles.notesLine,
                  line.indent > 0 ? { marginLeft: line.indent * 12 } : {},
                ]}
              >
                <Text style={styles.notesMarker}>
                  {line.marker ? `${line.marker} ` : ""}
                </Text>
                <Text
                  style={styles.notesText}
                  orphans={2}
                  widows={2}
                  hyphenationCallback={(word) =>
                    word.length > 40
                      ? word.match(/.{1,40}/gu) ?? [word]
                      : [word]
                  }
                >
                  {line.runs.map((run, runIndex) => (
                    <Text
                      key={runIndex}
                      style={{
                        ...(run.bold ? { fontWeight: 700 } : {}),
                        ...(run.italic ? { fontStyle: "italic" } : {}),
                        ...(run.underline
                          ? { textDecoration: "underline" }
                          : {}),
                      }}
                    >
                      {run.text}
                    </Text>
                  ))}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.signatures} wrap={false}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>Yang mengajukan</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.signatureName}>{record.assignee_name}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>Diketahui oleh</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.signatureName}>{knownBy || "-"}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>Disetujui oleh</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.signatureName}>{approvedBy || "-"}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
