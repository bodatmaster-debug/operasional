"use client"

import * as React from "react"
import Link from "next/link"
import Script from "next/script"
import {
  Button,
  Carousel,
  CarouselCard,
  CarouselNav,
  CarouselNavButton,
  CarouselNavContainer,
  CarouselSlider,
  CarouselViewport,
  Checkbox,
  Field,
  Input,
  Spinner,
  Text,
  TeachingPopover,
  TeachingPopoverBody,
  TeachingPopoverCarousel,
  TeachingPopoverCarouselCard,
  TeachingPopoverCarouselFooter,
  TeachingPopoverCarouselNav,
  TeachingPopoverCarouselNavButton,
  TeachingPopoverHeader,
  TeachingPopoverSurface,
  TeachingPopoverTitle,
  TeachingPopoverTrigger,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import type { CarouselAnnouncerFunction } from "@fluentui/react-components"
import { Slide, Stagger } from "@fluentui/react-motion-components-preview"
import { useRouter } from "next/navigation"
import { isLocalPagePermissions } from "@/lib/access-types"
import type { LocalUser } from "@/lib/access-types"
import { EULA_ACCEPTANCE_REQUIRED_MESSAGE } from "@/lib/eula"

type GoogleCredentialResponse = { credential?: string }
type GoogleButtonOptions = {
  type: "standard"
  theme: "outline"
  size: "large"
  text: "signin_with" | "signup_with"
  shape: "rectangular"
  logo_alignment: "left"
  width: number
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
            auto_select: boolean
            cancel_on_tap_outside: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: GoogleButtonOptions,
          ) => void
        }
      }
    }
  }
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? ""

const useStyles = makeStyles({
  page: {
    display: "grid",
    gridTemplateColumns: "minmax(380px, 2fr) minmax(0, 3fr)",
    minHeight: "100dvh",
    width: "100%",
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 860px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      alignContent: "start",
    },
  },
  formSection: {
    display: "grid",
    alignContent: "center",
    minWidth: 0,
    padding: "clamp(28px, 5vw, 72px)",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  formContent: {
    width: "100%",
    maxWidth: "336px",
    marginInline: "auto",
  },
  brandHeader: {
    display: "grid",
    justifyItems: "start",
    gap: "8px",
  },
  formLogo: {
    display: "block",
    width: "32px",
    height: "32px",
    backgroundImage: "url('/operasional-logo.png')",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
  },
  title: { margin: 0 },
  description: {
    display: "block",
    marginTop: "8px",
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  form: { display: "grid", gap: "12px", marginTop: "28px" },
  floatingField: {
    position: "relative",
    paddingTop: "18px",
    "& .fui-Field__label": {
      position: "absolute",
      top: "33px",
      left: "8px",
      zIndex: 1,
      margin: 0,
      paddingInline: "4px",
      transform: "translateY(-50%)",
      backgroundColor: tokens.colorNeutralBackground1,
      color: tokens.colorNeutralForeground3,
      opacity: 1,
      pointerEvents: "none",
      transitionProperty: "top, opacity, color, font-size",
      transitionDuration: "120ms",
    },
    "&:focus-within .fui-Field__label, &[data-filled='true'] .fui-Field__label":
      {
        top: "18px",
        color: tokens.colorNeutralForeground3,
        fontSize: tokens.fontSizeBase100,
        lineHeight: tokens.lineHeightBase100,
      },
  },
  socialLogin: { display: "grid", gap: "12px", marginTop: "18px" },
  socialDivider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: tokens.colorNeutralForeground3,
  },
  socialDividerLine: {
    height: "1px",
    flex: 1,
    backgroundColor: tokens.colorNeutralStroke2,
  },
  googleButtonContainer: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
    minHeight: "40px",
  },
  googleFallbackButton: { width: "100%" },
  switchPrompt: {
    display: "block",
    marginTop: "20px",
    color: tokens.colorNeutralForeground2,
  },
  link: {
    color: tokens.colorBrandForegroundLink,
    fontWeight: tokens.fontWeightSemibold,
    textDecorationLine: "underline",
    textUnderlineOffset: "3px",
    ":focus-visible": {
      outlineStyle: "solid",
      outlineWidth: "2px",
      outlineColor: tokens.colorStrokeFocus1,
      outlineOffset: "2px",
    },
  },
  eulaLink: {
    color: tokens.colorBrandForegroundLink,
    fontStyle: "italic",
    fontWeight: tokens.fontWeightRegular,
    textDecorationLine: "underline",
    textUnderlineOffset: "3px",
    ":focus-visible": {
      outlineStyle: "solid",
      outlineWidth: "2px",
      outlineColor: tokens.colorStrokeFocus1,
      outlineOffset: "2px",
    },
  },
  aside: {
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    minWidth: 0,
    minHeight: "100dvh",
    padding: "clamp(24px, 5vw, 72px)",
    backgroundColor: tokens.colorBrandBackground2,
    backgroundImage: `linear-gradient(135deg, ${tokens.colorBrandBackground2} 0%, ${tokens.colorNeutralBackground1} 100%)`,
    "@media (max-width: 860px)": {
      minHeight: "560px",
      padding: "24px",
    },
  },
  asideBrand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  brandLogo: {
    display: "inline-block",
    width: "48px",
    height: "48px",
    flexShrink: 0,
    backgroundImage: "url('/operasional-logo.png')",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
  },
  carousel: {
    display: "grid",
    alignContent: "center",
    minWidth: 0,
  },
  carouselSlider: {
    height: "100%",
  },
  carouselViewport: {
    height: "min(460px, calc(100dvh - 260px))",
    minHeight: "360px",
    overflow: "hidden",
    borderRadius: tokens.borderRadiusXLarge,
    "@media (max-width: 860px)": {
      height: "420px",
      minHeight: "0",
    },
  },
  slideCard: {
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    position: "relative",
    isolation: "isolate",
    width: "100%",
    height: "100%",
    minWidth: 0,
    padding: "clamp(24px, 4vw, 44px)",
    overflow: "hidden",
    backgroundColor: "#102b3a",
    borderRadius: tokens.borderRadiusXLarge,
  },
  slideBackground: {
    position: "absolute",
    inset: "-6px",
    zIndex: 0,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    filter: "blur(2px)",
    transform: "scale(1.02)",
    pointerEvents: "none",
  },
  slideScrim: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    backgroundColor: "rgba(5, 23, 40, 0.28)",
    pointerEvents: "none",
  },
  slideCopy: {
    display: "grid",
    gap: "14px",
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "42ch",
    padding: "24px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  slideTitle: {
    margin: 0,
    lineHeight: tokens.lineHeightHero800,
    color: tokens.colorNeutralForeground1,
  },
  slideDescription: {
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase400,
  },
  carouselNav: {
    backgroundColor: "transparent",
  },
  learnMoreButton: {
    alignSelf: "start",
    justifySelf: "start",
    width: "fit-content",
  },
  asideFooter: {
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    lineHeight: tokens.lineHeightBase300,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    lineHeight: tokens.lineHeightBase200,
  },
  eulaAgreement: {
    alignItems: "flex-start",
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
})

const sellingPoints = [
  {
    id: "directory",
    backgroundImage: "/auth-selling-point-directory.svg",
    title: "Direktori SPPG dan Yayasan",
    description:
      "Kelola informasi SPPG dan Yayasan dalam satu ruang kerja yang teratur.",
    details: [
      {
        title: "Informasi terpusat",
        description:
          "Kelola data SPPG dan Yayasan melalui direktori aplikasi.",
      },
      {
        title: "Konteks organisasi",
        description:
          "Tinjau informasi organisasi yang relevan untuk kegiatan operasional.",
      },
      {
        title: "Data yang terkelola",
        description:
          "Perbarui informasi direktori sesuai kebutuhan pengelolaan aplikasi.",
      },
    ],
  },
  {
    id: "assets",
    backgroundImage: "/auth-selling-point-assets.svg",
    title: "Pantau kelengkapan aset aktual",
    description:
      "Catat kondisi dan jumlah aktual, lalu tinjau kelengkapan aset per SPPG.",
    details: [
      {
        title: "Catat aset aktual",
        description:
          "Rekam jumlah aktual aset untuk melihat kelengkapan tiap SPPG.",
      },
      {
        title: "Tinjau kondisi",
        description:
          "Periksa status kondisi aset untuk memahami kebutuhan yang perlu ditinjau.",
      },
      {
        title: "Ekspor kelengkapan",
        description:
          "Siapkan unduhan dengan memilih kategori, kondisi, dan format Excel atau PDF.",
      },
    ],
  },
  {
    id: "maintenance",
    backgroundImage: "/auth-selling-point-maintenance.svg",
    title: "Catatan pemeliharaan terpusat",
    description:
      "Simpan catatan pemeliharaan agar informasi tindak lanjut lebih mudah ditemukan.",
    details: [
      {
        title: "Simpan catatan",
        description:
          "Catat kegiatan pemeliharaan sebagai bagian dari pengelolaan aset.",
      },
      {
        title: "Tinjau tindak lanjut",
        description:
          "Temukan informasi pemeliharaan yang perlu ditinjau kembali.",
      },
      {
        title: "Rujukan saat mengelola aset",
        description:
          "Gunakan catatan pemeliharaan sebagai konteks dalam pengelolaan aset.",
      },
    ],
  },
  {
    id: "access",
    backgroundImage: "/auth-selling-point-access.svg",
    title: "Akses sesuai peran",
    description:
      "Admin mengelola akun dan izin agar akses aplikasi selaras dengan tanggung jawab.",
    details: [
      {
        title: "Tinjau pendaftaran",
        description:
          "Admin meninjau pendaftaran sebelum akun baru dapat digunakan.",
      },
      {
        title: "Tetapkan peran",
        description:
          "Pilih peran Admin, Supervisor, atau User saat menyetujui pendaftaran.",
      },
      {
        title: "Atur izin akses",
        description:
          "Admin mengelola izin Supervisor dan User, sementara hak Admin tetap penuh.",
      },
    ],
  },
] as const

const announceSellingPoint: CarouselAnnouncerFunction = (index, totalSlides) =>
  `Poin ${index + 1} dari ${totalSlides}`

function isLocalUser(value: unknown): value is LocalUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "username" in value &&
    typeof value.username === "string" &&
    "role" in value &&
    (value.role === "admin" ||
      value.role === "supervisor" ||
      value.role === "user") &&
    "pagePermissions" in value &&
    isLocalPagePermissions(value.pagePermissions)
  )
}

async function postAuth(
  body: Record<string, string | boolean>,
): Promise<LocalUser | "pending" | "registered"> {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "pending" in payload &&
      payload.pending === true
    ) {
      return "pending"
    }
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Permintaan autentikasi gagal."
    throw new Error(message)
  }
  if (
    typeof payload === "object" &&
    payload !== null &&
    "registration" in payload
  ) {
    return "registered"
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("user" in payload) ||
    !isLocalUser(payload.user)
  ) {
    throw new Error("Respons autentikasi tidak valid.")
  }
  return payload.user
}

export function LocalAuthScreen({
  setupRequired,
  onAuthenticated,
  mode = "login",
}: {
  setupRequired: boolean
  onAuthenticated: (user: LocalUser) => void
  mode?: "login" | "register"
}) {
  const styles = useStyles()
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [eulaAccepted, setEulaAccepted] = React.useState(false)
  const router = useRouter()
  const isRegistering = !setupRequired && mode === "register"
  const [activeSellingPoint, setActiveSellingPoint] = React.useState(0)
  const [error, setError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [googleScriptReady, setGoogleScriptReady] = React.useState(false)
  const googleButtonRef = React.useRef<HTMLDivElement>(null)
  const googleRequestInFlight = React.useRef(false)
  const authStateRef = React.useRef({
    onAuthenticated,
    router,
    isRegistering,
    eulaAccepted,
  })
  React.useEffect(() => {
    authStateRef.current = {
      onAuthenticated,
      router,
      isRegistering,
      eulaAccepted,
    }
  }, [eulaAccepted, isRegistering, onAuthenticated, router])

  const handleGoogleCredential = React.useCallback(
    (response: GoogleCredentialResponse) => {
      if (googleRequestInFlight.current) return
      if (!response.credential) {
        setError("Google tidak mengirim kredensial yang valid.")
        return
      }
      const current = authStateRef.current
      if (current.isRegistering && !current.eulaAccepted) {
        setError(EULA_ACCEPTANCE_REQUIRED_MESSAGE)
        return
      }
      googleRequestInFlight.current = true
      setError("")
      setSubmitting(true)
      void postAuth({
        action: "google",
        intent: current.isRegistering ? "register" : "login",
        credential: response.credential,
        ...(current.isRegistering
          ? { eulaAccepted: current.eulaAccepted }
          : {}),
      })
        .then((result) => {
          if (result === "pending" || result === "registered") {
            current.router.replace("/menunggu-persetujuan")
          } else {
            current.onAuthenticated(result)
          }
        })
        .catch((failure: unknown) => {
          setError(
            failure instanceof Error
              ? failure.message
              : "Permintaan autentikasi Google gagal.",
          )
        })
        .finally(() => {
          googleRequestInFlight.current = false
          setSubmitting(false)
        })
    },
    [],
  )

  React.useEffect(() => {
    const container = googleButtonRef.current
    if (
      !googleClientId ||
      !googleScriptReady ||
      setupRequired ||
      !container ||
      !window.google
    ) {
      return
    }

    container.replaceChildren()
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    window.google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: isRegistering ? "signup_with" : "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: Math.max(120, Math.min(400, container.clientWidth)),
    })

    return () => container.replaceChildren()
  }, [
    googleScriptReady,
    handleGoogleCredential,
    isRegistering,
    setupRequired,
  ])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isRegistering && !eulaAccepted) {
      setError(EULA_ACCEPTANCE_REQUIRED_MESSAGE)
      return
    }
    setError("")
    setSubmitting(true)
    try {
      let body: Record<string, string | boolean>
      if (setupRequired) {
        body = {
            action: "setup",
            username,
            password,
            confirmPassword,
          }
      } else if (isRegistering) {
        body = {
          action: "register",
          fullName,
          username,
          email,
          password,
          eulaAccepted,
        }
      } else {
        body = { action: "login", username, password }
      }
      const result = await postAuth(body)
      if (result === "pending" || result === "registered") {
        router.replace("/menunggu-persetujuan")
      } else {
        onAuthenticated(result)
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Permintaan autentikasi gagal.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.formSection} aria-labelledby="auth-title">
        <div className={styles.formContent}>
          <div className={styles.brandHeader}>
            <span
              className={styles.formLogo}
              role="img"
              aria-label="Logo Operasional"
            />
            <Text
              as="h1"
              size={700}
              weight="semibold"
              className={styles.title}
              id="auth-title"
            >
              {setupRequired
                ? "Siapkan Admin pertama"
                : isRegistering
                  ? "Daftar akun"
                  : "Masuk ke Operasional"}
            </Text>
          </div>
          <Text
            className={styles.description}
          >
            {setupRequired
              ? "Buat akun Admin untuk mengamankan data lokal dan mengelola akses."
              : isRegistering
                ? "Daftarkan akun lokal atau Google untuk ditinjau oleh Admin."
                : "Masuk dengan akun lokal atau Google untuk membuka direktori operasional."}
          </Text>

          <form className={styles.form} onSubmit={handleSubmit}>
            {isRegistering && (
              <Field
                className={styles.floatingField}
                data-filled={fullName.length > 0}
                label="Nama lengkap"
              >
                <Input
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={fullName}
                  onChange={(_, data) => setFullName(data.value)}
                />
              </Field>
            )}
            <Field
              className={styles.floatingField}
              data-filled={username.length > 0}
              label="Username"
            >
              <Input
                autoComplete="username"
                maxLength={32}
                minLength={3}
                required
                value={username}
                onChange={(_, data) => setUsername(data.value)}
              />
            </Field>
            {isRegistering && (
              <Field
                className={styles.floatingField}
                data-filled={email.length > 0}
                label="Email"
              >
                <Input
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(_, data) => setEmail(data.value)}
                />
              </Field>
            )}
            <Field
              className={styles.floatingField}
              data-filled={password.length > 0}
              label="Password"
            >
              <Input
                type="password"
                autoComplete={
                  setupRequired || isRegistering
                    ? "new-password"
                    : "current-password"
                }
                maxLength={128}
                minLength={setupRequired ? 12 : undefined}
                required
                value={password}
                onChange={(_, data) => setPassword(data.value)}
              />
            </Field>
            {setupRequired && (
              <Field
                className={styles.floatingField}
                data-filled={confirmPassword.length > 0}
                label="Konfirmasi password"
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  maxLength={128}
                  minLength={12}
                  required
                  value={confirmPassword}
                  onChange={(_, data) => setConfirmPassword(data.value)}
                />
              </Field>
            )}
            {setupRequired && (
              <Text size={200} className={styles.hint}>
                Username 3–32 karakter. Password 12–128 karakter.
              </Text>
            )}
            {isRegistering && (
              <Checkbox
                className={styles.eulaAgreement}
                checked={eulaAccepted}
                onChange={(_, data) =>
                  setEulaAccepted(data.checked === true)
                }
                required
                label={
                  <>
                    Saya menyetujui{" "}
                    <Link
                      className={styles.eulaLink}
                      href="/eula"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Syarat dan ketentuan (EULA), buka di tab baru"
                    >
                      Syarat dan ketentuan (EULA)
                    </Link>
                    .
                  </>
                }
              />
            )}
            {error && (
              <Text role="alert" className={styles.error}>
                {error}
              </Text>
            )}
            <Button
              appearance="primary"
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting && <Spinner size="tiny" />}
              {setupRequired
                ? "Buat akun Admin"
                : isRegistering
                  ? "Kirim pendaftaran"
                  : "Masuk"}
            </Button>
          </form>
          {!setupRequired && (
            <>
              <div className={styles.socialLogin}>
                <div className={styles.socialDivider} aria-hidden="true">
                  <span className={styles.socialDividerLine} />
                  <Text size={200}>atau</Text>
                  <span className={styles.socialDividerLine} />
                </div>
                {googleClientId ? (
                  <>
                    <div
                      ref={googleButtonRef}
                      className={styles.googleButtonContainer}
                      aria-label={
                        isRegistering ? "Daftar dengan Google" : "Masuk dengan Google"
                      }
                    />
                    <Script
                      id="google-identity-services"
                      src="https://accounts.google.com/gsi/client"
                      strategy="afterInteractive"
                      onReady={() => setGoogleScriptReady(true)}
                      onError={() =>
                        setError("Layanan Google Sign-In gagal dimuat.")
                      }
                    />
                  </>
                ) : (
                  <>
                    <Button
                      className={styles.googleFallbackButton}
                      appearance="secondary"
                      disabled
                    >
                      {isRegistering ? "Daftar dengan Google" : "Masuk dengan Google"}
                    </Button>
                    <Text size={200} className={styles.hint}>
                      Google Sign-In belum dikonfigurasi untuk alamat lokal ini.
                    </Text>
                  </>
                )}
              </div>
              <Text size={200} className={styles.switchPrompt}>
                {isRegistering ? "Sudah punya akun? " : "Belum punya akun? "}
                <Link
                  href={isRegistering ? "/" : "/signup"}
                  className={styles.link}
                >
                  {isRegistering ? "Masuk" : "Daftar akun"}
                </Link>
              </Text>
            </>
          )}
        </div>
      </section>
      <aside className={styles.aside} aria-label="Tentang Operasional">
        <div className={styles.asideBrand}>
          <span
            className={styles.brandLogo}
            role="img"
            aria-label="Logo Operasional"
          />
          <Text weight="semibold">Operasional</Text>
        </div>
        <Carousel
          className={styles.carousel}
          groupSize={1}
          circular
          activeIndex={activeSellingPoint}
          onActiveIndexChange={(_, data) =>
            setActiveSellingPoint(data.index)
          }
          announcement={announceSellingPoint}
          aria-label="Keunggulan Operasional"
        >
          <CarouselViewport className={styles.carouselViewport}>
            <CarouselSlider className={styles.carouselSlider}>
              {sellingPoints.map((point, index) => {
                return (
                  <CarouselCard
                    key={point.id}
                    id={`auth-selling-point-${point.id}`}
                    className={styles.slideCard}
                    aria-label={`${index + 1} dari ${sellingPoints.length}`}
                  >
                    <div
                      aria-hidden="true"
                      className={styles.slideBackground}
                      style={{
                        backgroundImage: `url("${point.backgroundImage}")`,
                      }}
                    />
                    <div aria-hidden="true" className={styles.slideScrim} />
                    <div className={styles.slideCopy}>
                      <Stagger
                        visible={activeSellingPoint === index}
                        itemDelay={80}
                      >
                        <Slide outY="16px" duration={300} exitDuration={120}>
                          <div>
                            <Text
                              as="h2"
                              size={800}
                              weight="semibold"
                              className={styles.slideTitle}
                            >
                              {point.title}
                            </Text>
                          </div>
                        </Slide>
                        <Slide outY="16px" duration={300} exitDuration={120}>
                          <div>
                            <Text className={styles.slideDescription}>
                              {point.description}
                            </Text>
                          </div>
                        </Slide>
                        <Slide outY="16px" duration={300} exitDuration={120}>
                          <div>
                            <TeachingPopover appearance="brand">
                              <TeachingPopoverTrigger>
                                <Button
                                  appearance="primary"
                                  size="small"
                                  className={styles.learnMoreButton}
                                >
                                  Pelajari lebih lanjut
                                </Button>
                              </TeachingPopoverTrigger>
                              <TeachingPopoverSurface>
                                <TeachingPopoverHeader>
                                  {point.title}
                                </TeachingPopoverHeader>
                                <TeachingPopoverCarousel defaultValue="1">
                                  {point.details.map((detail, detailIndex) => (
                                    <TeachingPopoverCarouselCard
                                      key={`${point.id}-${detailIndex}`}
                                      value={`${detailIndex + 1}`}
                                    >
                                      <TeachingPopoverBody>
                                        <TeachingPopoverTitle>
                                          {detail.title}
                                        </TeachingPopoverTitle>
                                        <div>{detail.description}</div>
                                      </TeachingPopoverBody>
                                    </TeachingPopoverCarouselCard>
                                  ))}
                                  <TeachingPopoverCarouselFooter
                                    next="Lanjut"
                                    previous="Kembali"
                                    initialStepText="Tutup"
                                    finalStepText="Selesai"
                                  >
                                    <TeachingPopoverCarouselNav>
                                      {(detailIndex) => (
                                        <TeachingPopoverCarouselNavButton
                                          aria-label={`Lihat langkah ${detailIndex}`}
                                        />
                                      )}
                                    </TeachingPopoverCarouselNav>
                                  </TeachingPopoverCarouselFooter>
                                </TeachingPopoverCarousel>
                              </TeachingPopoverSurface>
                            </TeachingPopover>
                          </div>
                        </Slide>
                      </Stagger>
                    </div>
                  </CarouselCard>
                )
              })}
            </CarouselSlider>
          </CarouselViewport>
          <CarouselNavContainer
            layout="inline"
            autoplayTooltip={{
              content: "Putar otomatis",
              relationship: "label",
            }}
            nextTooltip={{
              content: "Poin berikutnya",
              relationship: "label",
            }}
            prevTooltip={{
              content: "Poin sebelumnya",
              relationship: "label",
            }}
          >
            <CarouselNav
              className={styles.carouselNav}
              totalSlides={sellingPoints.length}
              appearance="brand"
            >
              {(index) => (
                <CarouselNavButton
                  aria-label={`Tampilkan poin ${index + 1}`}
                />
              )}
            </CarouselNav>
          </CarouselNavContainer>
        </Carousel>
        <Text size={200} className={styles.asideFooter}>
          Aplikasi menggunakan data lokal.
        </Text>
      </aside>
    </main>
  )
}
