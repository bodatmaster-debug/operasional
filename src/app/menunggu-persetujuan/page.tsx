"use client"

import Link from "next/link"
import {
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components"

const useStyles = makeStyles({
  page: {
    display: "grid",
    minHeight: "100dvh",
    placeItems: "center",
    padding: "24px",
    backgroundColor: tokens.colorNeutralBackground2,
  },
  panel: {
    display: "grid",
    gap: "16px",
    width: "min(100%, 440px)",
    padding: "32px",
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  logo: {
    width: "48px",
    height: "48px",
    backgroundImage: "url('/operasional-logo.png')",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
  },
  title: { margin: 0 },
  description: {
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  link: {
    display: "inline-flex",
    justifySelf: "start",
    color: tokens.colorBrandForeground1,
    textDecorationLine: "underline",
    textUnderlineOffset: "3px",
    ":focus-visible": {
      outlineStyle: "solid",
      outlineWidth: "2px",
      outlineColor: tokens.colorStrokeFocus1,
      outlineOffset: "2px",
    },
  },
})

export default function WaitingForApprovalPage() {
  const styles = useStyles()

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="waiting-title">
        <span
          className={styles.logo}
          role="img"
          aria-label="Logo Operasional"
        />
        <Text
          as="h1"
          size={700}
          weight="semibold"
          className={styles.title}
          id="waiting-title"
        >
          Menunggu persetujuan
        </Text>
        <Text className={styles.description}>
          Pendaftaran Anda sedang ditinjau Admin. Akun belum dapat digunakan
          sampai disetujui. Setelah disetujui, masuk dengan username dan
          password yang sama.
        </Text>
        <Link href="/" className={styles.link}>
          Kembali ke halaman masuk
        </Link>
      </section>
    </main>
  )
}
