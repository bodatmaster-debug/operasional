"use client"

import Link from "next/link"
import { Text, makeStyles, tokens } from "@fluentui/react-components"
import { EULA_VERSION } from "@/lib/eula"

const useStyles = makeStyles({
  page: {
    minHeight: "100dvh",
    padding: "clamp(20px, 5vw, 56px)",
    backgroundColor: tokens.colorNeutralBackground2,
  },
  layout: {
    width: "min(100%, 840px)",
    marginInline: "auto",
  },
  backLink: {
    display: "inline-flex",
    marginBottom: "24px",
    color: tokens.colorNeutralForeground2,
    textDecorationLine: "underline",
    textUnderlineOffset: "3px",
    ":focus-visible": {
      outlineStyle: "solid",
      outlineWidth: "2px",
      outlineColor: tokens.colorStrokeFocus1,
      outlineOffset: "3px",
    },
  },
  document: {
    padding: "clamp(24px, 6vw, 56px)",
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  header: {
    display: "grid",
    gap: "12px",
    paddingBottom: "28px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  logo: {
    width: "40px",
    height: "40px",
    backgroundImage: "url('/operasional-logo.png')",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
  },
  title: {
    margin: 0,
    maxWidth: "22ch",
  },
  metadata: {
    color: tokens.colorNeutralForeground2,
  },
  draftNote: {
    margin: "8px 0 0",
    padding: "12px 16px",
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    lineHeight: tokens.lineHeightBase300,
  },
  content: {
    display: "grid",
    gap: "24px",
    paddingBlock: "28px",
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase400,
    "& h2": {
      margin: "0 0 8px",
      fontSize: tokens.fontSizeBase500,
      lineHeight: tokens.lineHeightBase500,
      fontWeight: tokens.fontWeightSemibold,
    },
    "& p": {
      margin: 0,
      maxWidth: "72ch",
    },
    "& ul": {
      display: "grid",
      gap: "8px",
      margin: "10px 0 0",
      paddingInlineStart: "24px",
      maxWidth: "72ch",
    },
  },
  footer: {
    paddingTop: "24px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  primaryLink: {
    display: "inline-flex",
    padding: "10px 16px",
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: tokens.borderRadiusMedium,
    fontWeight: tokens.fontWeightSemibold,
    textDecorationLine: "none",
    ":hover": {
      backgroundColor: tokens.colorBrandBackgroundHover,
    },
    ":focus-visible": {
      outlineStyle: "solid",
      outlineWidth: "2px",
      outlineColor: tokens.colorStrokeFocus1,
      outlineOffset: "3px",
    },
  },
})

export default function EulaPage() {
  const styles = useStyles()

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <Link className={styles.backLink} href="/signup">
          Kembali ke pendaftaran
        </Link>
        <article className={styles.document}>
          <header className={styles.header}>
            <span
              className={styles.logo}
              role="img"
              aria-label="Logo Operasional"
            />
            <Text as="h1" size={800} weight="semibold" className={styles.title}>
              Perjanjian Lisensi Pengguna Akhir
            </Text>
            <Text className={styles.metadata}>
              Operasional · Versi {EULA_VERSION}
            </Text>
            <p className={styles.draftNote} role="note">
              Dokumen ini adalah draf untuk ditinjau sebelum digunakan sebagai
              perjanjian hukum. Identitas pemberi lisensi, kontak resmi, hukum
              yang berlaku, dan ketentuan tanggung jawab belum ditetapkan.
            </p>
          </header>

          <div className={styles.content}>
            <section>
              <h2>Ruang lingkup</h2>
              <p>
                Ketentuan ini menjelaskan penggunaan aplikasi Operasional pada
                instalasi yang dikelola organisasi Anda. Dengan mendaftar atau
                menggunakan akun, Anda menyatakan telah membaca ketentuan ini
                dan bersedia menggunakannya sesuai akses yang diberikan Admin.
              </p>
            </section>

            <section>
              <h2>Akun dan persetujuan Admin</h2>
              <ul>
                <li>
                  Berikan nama, username, email, dan informasi pendaftaran yang
                  benar serta gunakan akun sendiri.
                </li>
                <li>
                  Pendaftaran belum dapat digunakan sampai disetujui Admin.
                  Aplikasi tidak memverifikasi alamat email atau mengirim
                  notifikasi persetujuan melalui email.
                </li>
                <li>
                  Jaga kerahasiaan password dan segera beri tahu Admin jika
                  akses akun mungkin digunakan pihak lain.
                </li>
              </ul>
            </section>

            <section>
              <h2>Peran dan hak akses</h2>
              <p>
                Admin mengelola akun, persetujuan pendaftaran, peran, dan hak
                akses. Admin memiliki seluruh hak akses aplikasi. Supervisor
                dan User hanya dapat menggunakan fitur yang diizinkan Admin.
                Jangan mencoba mengakses data atau fungsi di luar wewenang akun
                Anda.
              </p>
            </section>

            <section>
              <h2>Penggunaan yang diperbolehkan</h2>
              <p>
                Gunakan aplikasi untuk pencatatan dan pengelolaan operasional
                organisasi yang memberi Anda akses. Anda tidak boleh
                menggunakan aplikasi untuk tujuan melanggar hukum, mengganggu
                layanan, menyalahgunakan data orang lain, atau menghindari
                kontrol akses.
              </p>
            </section>

            <section>
              <h2>Data dan pengelolaan instalasi</h2>
              <p>
                Data aplikasi disimpan dalam basis data SQLite lokal pada
                instalasi ini. Pengelola perangkat atau instalasi bertanggung
                jawab mengatur akses perangkat dan pencadangan data. Jika
                pendaftaran Google tersedia dan Anda memilihnya, autentikasi
                dilakukan melalui Google Identity Services; akun Google tidak
                ditautkan otomatis ke akun lokal yang sudah ada.
              </p>
            </section>

            <section>
              <h2>Ketepatan informasi operasional</h2>
              <p>
                Pengguna bertanggung jawab memeriksa kebenaran data yang
                dimasukkan dan hasil yang digunakan. Aplikasi adalah alat
                pencatatan operasional, bukan pengganti kebijakan, standar
                resmi, atau arahan dari pihak berwenang. Verifikasi informasi
                yang berdampak pada keputusan operasional melalui sumber resmi
                yang berlaku.
              </p>
            </section>

            <section>
              <h2>Perubahan dan ketersediaan</h2>
              <p>
                Fitur dan akses dapat dikelola oleh Admin instalasi. Aplikasi
                berjalan pada lingkungan lokal yang dikelola organisasi;
                ketersediaannya bergantung pada perangkat dan pengelolaan
                instalasi tersebut. Ketentuan ini tidak menjanjikan dukungan
                atau ketersediaan tanpa gangguan.
              </p>
            </section>
          </div>

          <footer className={styles.footer}>
            <Link className={styles.primaryLink} href="/signup">
              Kembali ke formulir pendaftaran
            </Link>
          </footer>
        </article>
      </div>
    </main>
  )
}
