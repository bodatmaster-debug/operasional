"use client"

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

export type WarehouseHandoverDocumentData = {
  itemName: string
  quantity: number
  unit: string
  sppgName: string
  transactionDate: string
  note: string
  recordedByUsername: string
}

const colors = {
  ink: "#172B3A",
  text: "#334155",
  muted: "#5B6873",
  brand: "#155E59",
  border: "#D8E0E5",
  header: "#EDF3F5",
  white: "#FFFFFF",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingHorizontal: 48,
    paddingBottom: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
    color: colors.text,
    backgroundColor: colors.white,
  },
  heading: {
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1.2,
    borderBottomColor: colors.brand,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.ink,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 5,
    fontSize: 9,
    color: colors.muted,
    textAlign: "center",
  },
  introduction: {
    marginTop: 22,
    marginBottom: 14,
  },
  detailHeading: {
    marginBottom: 8,
    fontSize: 10,
    fontWeight: 700,
    color: colors.ink,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 0.6,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    width: "34%",
    fontWeight: 700,
    color: colors.ink,
  },
  detailValue: {
    flex: 1,
  },
  detailHeader: {
    backgroundColor: colors.header,
    borderTopWidth: 0.6,
    borderTopColor: colors.border,
  },
  note: {
    marginTop: 18,
    padding: 10,
    borderWidth: 0.6,
    borderColor: colors.border,
  },
  noteLabel: {
    marginBottom: 4,
    fontSize: 8,
    fontWeight: 700,
    color: colors.muted,
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 44,
  },
  signatureBlock: {
    width: "42%",
    alignItems: "center",
  },
  signatureTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.ink,
    textAlign: "center",
  },
  signatureSpace: {
    height: 72,
  },
  signatureLine: {
    width: "100%",
    paddingTop: 5,
    borderTopWidth: 0.7,
    borderTopColor: colors.muted,
    fontSize: 9,
    textAlign: "center",
  },
  footer: {
    marginTop: 32,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    fontSize: 8,
    color: colors.muted,
    textAlign: "center",
  },
})

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
})

function formatTransactionDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}

export function WarehouseHandoverDocument({
  receipt,
}: {
  receipt: WarehouseHandoverDocumentData
}) {
  return (
    <Document
      title={`Serah terima ${receipt.itemName} - ${receipt.sppgName}`}
      author="Operasional"
      subject="Form serah terima alokasi aset"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.heading}>
          <Text style={styles.title}>BERITA ACARA SERAH TERIMA BARANG</Text>
          <Text style={styles.subtitle}>Alokasi aset gudang</Text>
        </View>

        <Text style={styles.introduction}>
          Pada tanggal {formatTransactionDate(receipt.transactionDate)}, telah
          dilakukan serah terima barang dengan rincian sebagai berikut:
        </Text>

        <Text style={styles.detailHeading}>Rincian serah terima</Text>
        <View style={[styles.detailRow, styles.detailHeader]}>
          <Text style={styles.detailLabel}>Informasi</Text>
          <Text style={styles.detailValue}>Keterangan</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Nama aset</Text>
          <Text style={styles.detailValue}>{receipt.itemName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Jumlah</Text>
          <Text style={styles.detailValue}>
            {receipt.quantity.toLocaleString("id-ID")} {receipt.unit}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>SPPG tujuan</Text>
          <Text style={styles.detailValue}>{receipt.sppgName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Tanggal transaksi</Text>
          <Text style={styles.detailValue}>
            {formatTransactionDate(receipt.transactionDate)}
          </Text>
        </View>

        {receipt.note && (
          <View style={styles.note}>
            <Text style={styles.noteLabel}>CATATAN</Text>
            <Text>{receipt.note}</Text>
          </View>
        )}

        <View style={styles.signatures} wrap={false}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>Yang menyerahkan</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.signatureLine}>(Nama jelas)</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>Yang menerima</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.signatureLine}>(Nama jelas)</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Dicatat oleh {receipt.recordedByUsername}
        </Text>
      </Page>
    </Document>
  )
}
