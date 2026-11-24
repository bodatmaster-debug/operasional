"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Avatar,
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Tab,
  TabList,
  Text,
  Tooltip,
  makeStyles,
} from "@fluentui/react-components"
import {
  EditPerson20Regular,
  EditPerson24Filled,
  EditSettings24Filled,
  EditSettings20Regular,
  EyeOffRegular,
  EyeRegular,
  ImageEdit20Filled,
  ImageEdit20Regular,
  PasswordFilled,
  PasswordRegular,
  PersonEditFilled,
  PersonEditRegular,
} from "@fluentui/react-icons"
import type { LocalUser } from "@/lib/access-types"

type AccountTab = "profile" | "credentials"
type PasswordField = "current" | "new" | "confirm"

const allowedAvatarTypes = ["image/jpeg", "image/png", "image/webp"]
const maxAvatarBytes = 5 * 1024 * 1024

type EmailChangeState = {
  pendingEmail: string | null
  verificationTarget: "current" | "new"
  expiresAt: string
}

type ProfilePayload = {
  user: { username: string }
  profile: {
    email: string | null
    emailVerifiedAt: string | null
    avatarDataUrl: string | null
  }
  emailChange: EmailChangeState | null
}

function isProfilePayload(value: unknown): value is ProfilePayload {
  if (typeof value !== "object" || value === null) return false
  const { user, profile } = value as Record<string, unknown>
  if (
    typeof user !== "object" ||
    user === null ||
    typeof profile !== "object" ||
    profile === null
  ) {
    return false
  }
  const userRecord = user as Record<string, unknown>
  const profileRecord = profile as Record<string, unknown>
  const emailChange = (value as Record<string, unknown>).emailChange
  return (
    typeof userRecord.username === "string" &&
    (typeof profileRecord.email === "string" || profileRecord.email === null) &&
    (typeof profileRecord.emailVerifiedAt === "string" ||
      profileRecord.emailVerifiedAt === null) &&
    (typeof profileRecord.avatarDataUrl === "string" ||
      profileRecord.avatarDataUrl === null) &&
    isEmailChangeState(emailChange)
  )
}

function isEmailChangeState(value: unknown): value is EmailChangeState | null {
  if (value === null) return true
  if (typeof value !== "object") return false
  const change = value as Record<string, unknown>
  return (
    (typeof change.pendingEmail === "string" || change.pendingEmail === null) &&
    (change.verificationTarget === "current" ||
      change.verificationTarget === "new") &&
    typeof change.expiresAt === "string"
  )
}

function isEmailChangeResponse(
  value: unknown,
): value is { emailChange: EmailChangeState | null } {
  return (
    typeof value === "object" &&
    value !== null &&
    "emailChange" in value &&
    isEmailChangeState(value.emailChange)
  )
}

function getErrorMessage(payload: unknown, fallback: string) {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback
}

function ProfileEditButton({
  label,
  iconType,
  appearance = "subtle",
  shape = "rounded",
  className,
  onClick,
}: {
  label: string
  iconType: "person" | "settings" | "image"
  appearance?: "subtle" | "secondary"
  shape?: "rounded" | "circular"
  className?: string
  onClick: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)

  return (
    <Tooltip content={label} relationship="label">
      <Button
        className={className}
        type="button"
        appearance={appearance}
        shape={shape}
        size="small"
        icon={
          iconType === "image" ? (
            hovered || focused ? (
              <ImageEdit20Filled />
            ) : (
              <ImageEdit20Regular />
            )
          ) : iconType === "person" ? (
            hovered || focused ? (
              <EditPerson24Filled />
            ) : (
              <EditPerson20Regular />
            )
          ) : hovered || focused ? (
            <EditSettings24Filled />
          ) : (
            <EditSettings20Regular />
          )
        }
        aria-label={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={onClick}
      />
    </Tooltip>
  )
}

function readAvatarFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Foto profil gagal dibaca."))
    }
    reader.onerror = () => reject(new Error("Foto profil gagal dibaca."))
    reader.readAsDataURL(file)
  })
}

const useStyles = makeStyles({
  panel: {
    display: "grid",
    gap: "24px",
    maxWidth: "680px",
    paddingTop: "20px",
  },
  tabs: {
    width: "fit-content",
    maxWidth: "100%",
  },
  profile: {
    display: "grid",
    gap: "20px",
    paddingInlineStart: "10px",
    paddingTop: "4px",
  },
  profileHeading: {
    display: "grid",
    gap: "4px",
    maxWidth: "56ch",
  },
  profileForm: {
    display: "grid",
    gap: "16px",
    maxWidth: "560px",
  },
  emailChangeSection: {
    display: "grid",
    gap: "12px",
    maxWidth: "560px",
  },
  emailChangeHeading: {
    display: "grid",
    gap: "4px",
  },
  emailChangeForm: {
    display: "grid",
    gap: "12px",
  },
  emailChangeActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  profileIdentityFields: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  avatarField: {
    display: "grid",
    gap: "8px",
  },
  avatarControls: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    "@media (max-width: 420px)": {
      alignItems: "flex-start",
    },
  },
  avatarFrame: {
    position: "relative",
    width: "72px",
    height: "72px",
    flexShrink: 0,
  },
  avatarEditButton: {
    position: "absolute",
    insetInlineEnd: "-6px",
    insetBlockEnd: "-6px",
    zIndex: 1,
    width: "28px",
    minWidth: "28px",
    height: "28px",
    padding: 0,
  },
  avatarActions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
  },
  hiddenFileInput: {
    display: "none",
  },
  profileNote: {
    maxWidth: "56ch",
  },
  loginMethod: {
    display: "grid",
    gap: "4px",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minHeight: "120px",
  },
  passwordPanel: {
    display: "grid",
    gap: "20px",
    maxWidth: "400px",
  },
  credentialsPanel: {
    display: "grid",
    gap: "24px",
    maxWidth: "560px",
    paddingInlineStart: "10px",
    paddingTop: "4px",
  },
  credentialsHeader: {
    display: "grid",
    gap: "4px",
    maxWidth: "56ch",
  },
  profileIdentityValue: {
    display: "grid",
    alignContent: "start",
    gap: "4px",
  },
  profileIdentityValueRow: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "4px",
  },
  profileIdentityValueText: {
    minWidth: 0,
    overflowWrap: "anywhere",
  },
  profileUsernameEditor: {
    display: "grid",
    alignContent: "start",
    gap: "8px",
  },
  passwordHeader: {
    display: "grid",
    gap: "4px",
  },
  form: {
    display: "grid",
    gap: "20px",
  },
  passwordSubmit: {
    justifySelf: "start",
  },
})

export function PersonalAccountManagement({ user }: { user: LocalUser }) {
  const styles = useStyles()
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<AccountTab>("profile")
  const [hoveredTab, setHoveredTab] = React.useState<AccountTab | null>(null)
  const [focusedTab, setFocusedTab] = React.useState<AccountTab | null>(null)
  const [username, setUsername] = React.useState(user.username)
  const [savedUsername, setSavedUsername] = React.useState(user.username)
  const [editingUsername, setEditingUsername] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [emailVerifiedAt, setEmailVerifiedAt] = React.useState<string | null>(null)
  const [emailChange, setEmailChange] = React.useState<EmailChangeState | null>(null)
  const [newEmail, setNewEmail] = React.useState("")
  const [verificationCode, setVerificationCode] = React.useState("")
  const [savingEmail, setSavingEmail] = React.useState(false)
  const [emailError, setEmailError] = React.useState("")
  const [emailSuccess, setEmailSuccess] = React.useState("")
  const [avatarDataUrl, setAvatarDataUrl] = React.useState<string | null>(null)
  const [profileCurrentPassword, setProfileCurrentPassword] = React.useState("")
  const [profileLoading, setProfileLoading] = React.useState(true)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [profileError, setProfileError] = React.useState("")
  const [profileSuccess, setProfileSuccess] = React.useState("")
  const avatarInputRef = React.useRef<HTMLInputElement>(null)
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [currentPasswordVerified, setCurrentPasswordVerified] =
    React.useState(false)
  const [verifyingCurrentPassword, setVerifyingCurrentPassword] =
    React.useState(false)
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const [visiblePasswords, setVisiblePasswords] = React.useState<
    Record<PasswordField, boolean>
  >({
    current: false,
    new: false,
    confirm: false,
  })

  React.useEffect(() => {
    const controller = new AbortController()
    async function loadProfile() {
      try {
        const response = await fetch("/api/accounts/profile", {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Profil akun gagal dimuat."),
          )
        }
        if (!isProfilePayload(payload)) {
          throw new Error("Respons profil akun tidak valid.")
        }
        setUsername(payload.user.username)
        setSavedUsername(payload.user.username)
        setEmail(payload.profile.email ?? "")
        setEmailVerifiedAt(payload.profile.emailVerifiedAt)
        setEmailChange(payload.emailChange)
        setAvatarDataUrl(payload.profile.avatarDataUrl)
      } catch (failure) {
        if (controller.signal.aborted) return
        setProfileError(
          failure instanceof Error
            ? failure.message
            : "Profil akun gagal dimuat.",
        )
      } finally {
        if (!controller.signal.aborted) setProfileLoading(false)
      }
    }
    void loadProfile()
    return () => controller.abort()
  }, [])

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError("")
    setProfileSuccess("")
    const normalizedUsername = username.trim().toLowerCase()
    if (
      normalizedUsername !== savedUsername &&
      profileCurrentPassword.length === 0
    ) {
      setProfileError("Masukkan password saat ini untuk mengganti username.")
      return
    }

    setSavingProfile(true)
    try {
      const response = await fetch("/api/accounts/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          currentPassword: profileCurrentPassword,
          avatarDataUrl,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Profil gagal diperbarui."))
      }
      if (!isProfilePayload(payload)) {
        throw new Error("Respons penyimpanan profil tidak valid.")
      }

      setUsername(payload.user.username)
      setSavedUsername(payload.user.username)
      setEmail(payload.profile.email ?? "")
      setEmailVerifiedAt(payload.profile.emailVerifiedAt)
      setEmailChange(payload.emailChange)
      setAvatarDataUrl(payload.profile.avatarDataUrl)
      setProfileCurrentPassword("")
      setEditingUsername(false)
      setProfileSuccess("Profil berhasil diperbarui.")
      router.refresh()
    } catch (failure) {
      setProfileError(
        failure instanceof Error
          ? failure.message
          : "Profil gagal diperbarui.",
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleEmailChangeRequest(
      event: React.FormEvent<HTMLFormElement>,
    ) {
      event.preventDefault()
      await requestEmailChange(newEmail.trim())
    }

    async function requestEmailChange(emailToChange: string | null) {
      setEmailError("")
      setEmailSuccess("")
      setSavingEmail(true)
      try {
        const response = await fetch("/api/accounts/profile/email-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "request", email: emailToChange }),
        })
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          if (isEmailChangeResponse(payload)) {
            setEmailChange(payload.emailChange)
          }
          throw new Error(
            getErrorMessage(payload, "Kode verifikasi gagal dikirim."),
          )
        }
        if (!isEmailChangeResponse(payload) || !payload.emailChange) {
          throw new Error("Respons verifikasi email tidak valid.")
        }
        setEmailChange(payload.emailChange)
        setVerificationCode("")
        setEmailSuccess("Kode verifikasi sudah dikirim.")
      } catch (failure) {
        setEmailError(
          failure instanceof Error
            ? failure.message
            : "Kode verifikasi gagal dikirim.",
        )
      } finally {
        setSavingEmail(false)
      }
    }

    async function handleEmailChangeVerify(
      event: React.FormEvent<HTMLFormElement>,
    ) {
      event.preventDefault()
      setEmailError("")
      setEmailSuccess("")
      setSavingEmail(true)
      try {
        const response = await fetch("/api/accounts/profile/email-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", code: verificationCode }),
        })
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          if (isEmailChangeResponse(payload)) {
            setEmailChange(payload.emailChange)
          }
          throw new Error(
            getErrorMessage(payload, "Kode verifikasi tidak dapat digunakan."),
          )
        }
        if (!isProfilePayload(payload)) {
          throw new Error("Respons verifikasi email tidak valid.")
        }

        setEmail(payload.profile.email ?? "")
        setEmailVerifiedAt(payload.profile.emailVerifiedAt)
        setEmailChange(payload.emailChange)
        setVerificationCode("")
        setNewEmail("")
        setEmailSuccess(
          payload.profile.email
            ? payload.profile.emailVerifiedAt
              ? "Email berhasil ditambahkan dan diverifikasi."
              : "Email berhasil diubah setelah alamat lama diverifikasi. Email baru belum diverifikasi."
            : "Email berhasil dihapus setelah alamat lama diverifikasi.",
        )
      } catch (failure) {
        setEmailError(
          failure instanceof Error
            ? failure.message
            : "Kode verifikasi tidak dapat digunakan.",
        )
      } finally {
        setSavingEmail(false)
      }
    }

    async function handleResendEmailCode() {
      setEmailError("")
      setEmailSuccess("")
      setSavingEmail(true)
      try {
        const response = await fetch("/api/accounts/profile/email-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resend" }),
        })
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          if (isEmailChangeResponse(payload)) {
            setEmailChange(payload.emailChange)
          }
          throw new Error(
            getErrorMessage(payload, "Kode verifikasi gagal dikirim ulang."),
          )
        }
        if (!isEmailChangeResponse(payload) || !payload.emailChange) {
          throw new Error("Respons pengiriman ulang kode tidak valid.")
        }
        setEmailChange(payload.emailChange)
        setVerificationCode("")
        setEmailSuccess("Kode verifikasi baru sudah dikirim.")
      } catch (failure) {
        setEmailError(
          failure instanceof Error
            ? failure.message
            : "Kode verifikasi gagal dikirim ulang.",
        )
      } finally {
        setSavingEmail(false)
      }
    }

    async function handleCancelEmailChange() {
      setEmailError("")
      setEmailSuccess("")
      setSavingEmail(true)
      try {
        const response = await fetch("/api/accounts/profile/email-change", {
          method: "DELETE",
        })
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok || !isEmailChangeResponse(payload)) {
          throw new Error(
            getErrorMessage(
              payload,
              "Permintaan perubahan email gagal dibatalkan.",
            ),
          )
        }
        setEmailChange(null)
        setVerificationCode("")
        setEmailSuccess("Permintaan perubahan email dibatalkan.")
      } catch (failure) {
        setEmailError(
          failure instanceof Error
            ? failure.message
            : "Permintaan perubahan email gagal dibatalkan.",
        )
      } finally {
        setSavingEmail(false)
      }
    }

  async function handleAvatarSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return
    setProfileError("")
    setProfileSuccess("")
    if (!allowedAvatarTypes.includes(file.type)) {
      setProfileError("Pilih foto berformat JPEG, PNG, atau WebP.")
      return
    }
    if (file.size === 0 || file.size > maxAvatarBytes) {
      setProfileError("Ukuran foto profil harus maksimal 5 MiB.")
      return
    }
    try {
      setAvatarDataUrl(await readAvatarFile(file))
    } catch (failure) {
      setProfileError(
        failure instanceof Error
          ? failure.message
          : "Foto profil gagal dibaca.",
      )
    }
  }

  function togglePasswordVisibility(field: PasswordField) {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }))
  }

  async function verifyCurrentPasswordForChange() {
    setError("")
    setSuccess("")
    if (!currentPassword) {
      setError("Masukkan password saat ini.")
      return
    }

    setVerifyingCurrentPassword(true)
    try {
      const response = await fetch("/api/accounts/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-current",
          currentPassword,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Password saat ini tidak dapat diverifikasi."),
        )
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("ok" in payload) ||
        payload.ok !== true
      ) {
        throw new Error("Respons verifikasi password tidak valid.")
      }
      setCurrentPasswordVerified(true)
    } catch (failure) {
      setCurrentPasswordVerified(false)
      setError(
        failure instanceof Error
          ? failure.message
          : "Password saat ini tidak dapat diverifikasi.",
      )
    } finally {
      setVerifyingCurrentPassword(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!currentPasswordVerified) {
      setError("Verifikasi password saat ini sebelum memasukkan password baru.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/accounts/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Password gagal diperbarui."
        throw new Error(message)
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("ok" in payload) ||
        payload.ok !== true
      ) {
        throw new Error("Respons perubahan password tidak valid.")
      }

      setCurrentPassword("")
      setCurrentPasswordVerified(false)
      setNewPassword("")
      setConfirmPassword("")
      setSuccess("Password berhasil diperbarui. Sesi lain telah dikeluarkan.")
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Password gagal diperbarui.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.panel} aria-label="Akun pribadi">
      <TabList
        className={styles.tabs}
        aria-label="Bagian akun pribadi"
        selectedValue={activeTab}
        onTabSelect={(_, data) => {
          if (data.value === "profile" || data.value === "credentials") {
            setActiveTab(data.value)
          }
        }}
      >
        <Tab
          value="profile"
          icon={
            activeTab === "profile" ||
            hoveredTab === "profile" ||
            focusedTab === "profile" ? (
              <PersonEditFilled aria-hidden="true" />
            ) : (
              <PersonEditRegular aria-hidden="true" />
            )
          }
          onPointerEnter={() => setHoveredTab("profile")}
          onPointerLeave={() => setHoveredTab(null)}
          onFocus={() => setFocusedTab("profile")}
          onBlur={() => setFocusedTab(null)}
        >
          Profil login
        </Tab>
        <Tab
          value="credentials"
          icon={
            activeTab === "credentials" ||
            hoveredTab === "credentials" ||
            focusedTab === "credentials" ? (
              <PasswordFilled aria-hidden="true" />
            ) : (
              <PasswordRegular aria-hidden="true" />
            )
          }
          onPointerEnter={() => setHoveredTab("credentials")}
          onPointerLeave={() => setHoveredTab(null)}
          onFocus={() => setFocusedTab("credentials")}
          onBlur={() => setFocusedTab(null)}
        >
          Kredensial
        </Tab>
      </TabList>

      {activeTab === "profile" ? (
        <section className={styles.profile} aria-labelledby="profile-title">
          <div className={styles.profileHeading}>
            <Text id="profile-title" as="h2" size={400} weight="semibold">
              Profil login
            </Text>
            <Text size={200}>
              Kelola username dan foto profil akun yang sedang digunakan.
            </Text>
          </div>
          {profileLoading ? (
            <div className={styles.loading} role="status">
              <Spinner size="small" />
              <Text>Memuat profil...</Text>
            </div>
          ) : (
            <>
            <form className={styles.profileForm} onSubmit={handleProfileSubmit}>
              <div className={styles.avatarField}>
                <Text weight="semibold">Foto profil</Text>
                <div className={styles.avatarControls}>
                  <div className={styles.avatarFrame}>
                    <Avatar
                      name={username || user.username}
                      image={
                        avatarDataUrl ? { src: avatarDataUrl } : undefined
                      }
                      size={72}
                      color="brand"
                    />
                    <ProfileEditButton
                      iconType="image"
                      label="Ganti foto profil"
                      appearance="secondary"
                      shape="circular"
                      className={styles.avatarEditButton}
                      onClick={() => avatarInputRef.current?.click()}
                    />
                  </div>
                  <div className={styles.avatarActions}>
                    <input
                      ref={avatarInputRef}
                      className={styles.hiddenFileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Pilih foto profil"
                      onChange={handleAvatarSelection}
                    />
                    {avatarDataUrl && (
                      <Button
                        type="button"
                        appearance="subtle"
                        onClick={() => {
                          setAvatarDataUrl(null)
                          setProfileError("")
                          setProfileSuccess("")
                        }}
                        disabled={savingProfile}
                      >
                        Hapus foto
                      </Button>
                    )}
                  </div>
                </div>
                <Text className={styles.profileNote} size={200}>
                  JPEG, PNG, atau WebP; ukuran maksimal 5 MiB.
                </Text>
              </div>
              <div className={styles.profileIdentityFields}>
                {editingUsername ? (
                  <div className={styles.profileUsernameEditor}>
                    <Field label="Username" required>
                      <Input
                        autoComplete="username"
                        minLength={3}
                        maxLength={32}
                        required
                        disabled={savingProfile}
                        value={username}
                        onChange={(_, data) => {
                          setUsername(data.value)
                          if (
                            data.value.trim().toLowerCase() === savedUsername
                          ) {
                            setProfileCurrentPassword("")
                          }
                          setProfileError("")
                          setProfileSuccess("")
                        }}
                      />
                    </Field>
                    <Button
                      type="button"
                      appearance="subtle"
                      size="small"
                      disabled={savingProfile}
                      onClick={() => {
                        setUsername(savedUsername)
                        setProfileCurrentPassword("")
                        setProfileError("")
                        setProfileSuccess("")
                        setEditingUsername(false)
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                ) : (
                  <div className={styles.profileIdentityValue}>
                    <Text size={200} className={styles.profileNote}>
                      Username
                    </Text>
                    <div className={styles.profileIdentityValueRow}>
                      <Text
                        className={styles.profileIdentityValueText}
                        weight="semibold"
                      >
                        {username}
                      </Text>
                      <ProfileEditButton
                        label="Ubah username"
                        iconType="person"
                        onClick={() => {
                          setEditingUsername(true)
                          setProfileError("")
                          setProfileSuccess("")
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className={styles.profileIdentityValue}>
                  <Text size={200} className={styles.profileNote}>
                    Email
                  </Text>
                  <div className={styles.profileIdentityValueRow}>
                    <Text
                      className={styles.profileIdentityValueText}
                      weight="semibold"
                    >
                      {email || "Belum ditambahkan"}
                    </Text>
                    <ProfileEditButton
                      label="Kelola email"
                      iconType="settings"
                      onClick={() => setActiveTab("credentials")}
                    />
                  </div>
                </div>
              </div>
              <Text className={styles.profileNote} size={200}>
                {email
                  ? emailVerifiedAt
                    ? "Email terverifikasi. Alamat ini tidak digunakan untuk login atau pemulihan akun."
                    : "Email belum diverifikasi. Alamat ini tidak digunakan untuk login atau pemulihan akun."
                  : "Belum ada email kontak. Email tidak digunakan untuk login atau pemulihan akun."}
              </Text>
              {username.trim().toLowerCase() !== savedUsername && (
                <Field
                  label="Password saat ini"
                  hint="Diperlukan untuk mengonfirmasi perubahan username."
                  required
                >
                  <Input
                    type="password"
                    autoComplete="current-password"
                    maxLength={128}
                    required
                    disabled={savingProfile}
                    value={profileCurrentPassword}
                    onChange={(_, data) => {
                      setProfileCurrentPassword(data.value)
                      setProfileError("")
                      setProfileSuccess("")
                    }}
                  />
                </Field>
              )}
              <div className={styles.loginMethod}>
                <Text size={200}>Metode masuk</Text>
                <Text weight="semibold">Akun lokal atau Google</Text>
                <Text className={styles.profileNote} size={200}>
                  Akun lokal menggunakan username dan password. Akun yang
                  didaftarkan dengan Google dapat masuk dengan akun Google
                  yang sama.
                </Text>
              </div>
              {profileError && (
                <MessageBar intent="error">
                  <MessageBarBody>{profileError}</MessageBarBody>
                </MessageBar>
              )}
              {profileSuccess && (
                <MessageBar intent="success">
                  <MessageBarBody>{profileSuccess}</MessageBarBody>
                </MessageBar>
              )}
              <Button
                appearance="primary"
                type="submit"
                disabled={savingProfile}
                aria-busy={savingProfile}
              >
                {savingProfile && <Spinner size="tiny" />}
                Simpan profil
              </Button>
            </form>
            </>
          )}
        </section>
      ) : (
        <section
          className={styles.credentialsPanel}
          aria-labelledby="credentials-title"
        >
          <div className={styles.credentialsHeader}>
            <Text id="credentials-title" as="h2" size={400} weight="semibold">
              Kredensial
            </Text>
            <Text size={200}>Kelola email kontak dan password akun ini.</Text>
          </div>
          {profileLoading ? (
            <div className={styles.loading} role="status">
              <Spinner size="small" />
              <Text>Memuat email akun...</Text>
            </div>
          ) : profileError ? (
            <MessageBar intent="error">
              <MessageBarBody>{profileError}</MessageBarBody>
            </MessageBar>
          ) : (
            <section
              className={styles.emailChangeSection}
              aria-labelledby="email-change-title"
            >
              <div className={styles.emailChangeHeading}>
                <Text
                  id="email-change-title"
                  as="h3"
                  size={300}
                  weight="semibold"
                >
                  Kelola email
                </Text>
                <Text size={200}>
                  {email
                    ? `Email saat ini: ${email} · ${
                        emailVerifiedAt ? "Terverifikasi" : "Belum diverifikasi"
                      }`
                    : "Belum ada email kontak."}
                </Text>
                <Text className={styles.profileNote} size={200}>
                  Kode dikirim ke email saat ini untuk menyetujui perubahan.
                  Jika belum ada email, kode dikirim ke alamat baru.
                </Text>
              </div>
              {emailChange ? (
              <form
                className={styles.emailChangeForm}
                onSubmit={handleEmailChangeVerify}
              >
                <Text className={styles.profileNote} size={200}>
                  {emailChange.verificationTarget === "current"
                    ? "Masukkan kode yang dikirim ke email lama untuk menyetujui perubahan."
                    : `Masukkan kode yang dikirim ke ${emailChange.pendingEmail} untuk memverifikasi email pertama.`}
                </Text>
                {emailChange.pendingEmail === null ? (
                  <Text size={200}>Permintaan ini akan menghapus email.</Text>
                ) : (
                  <Text size={200}>Email baru: {emailChange.pendingEmail}</Text>
                )}
                <Field label="Kode verifikasi" required>
                  <Input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    disabled={savingEmail}
                    value={verificationCode}
                    onChange={(_, data) => {
                      setVerificationCode(
                        data.value.replace(/\D/g, "").slice(0, 6),
                      )
                      setEmailError("")
                      setEmailSuccess("")
                    }}
                  />
                </Field>
                <Text className={styles.profileNote} size={200}>
                  Kode berlaku 10 menit dan maksimal lima kali percobaan.
                </Text>
                {emailError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{emailError}</MessageBarBody>
                  </MessageBar>
                )}
                {emailSuccess && (
                  <MessageBar intent="success">
                    <MessageBarBody>{emailSuccess}</MessageBarBody>
                  </MessageBar>
                )}
                <div className={styles.emailChangeActions}>
                  <Button
                    appearance="primary"
                    type="submit"
                    disabled={savingEmail}
                    aria-busy={savingEmail}
                  >
                    {savingEmail && <Spinner size="tiny" />}
                    Konfirmasi kode
                  </Button>
                  <Button
                    type="button"
                    onClick={handleResendEmailCode}
                    disabled={savingEmail}
                  >
                    Kirim ulang kode
                  </Button>
                  <Button
                    appearance="subtle"
                    type="button"
                    onClick={handleCancelEmailChange}
                    disabled={savingEmail}
                  >
                    Batalkan
                  </Button>
                </div>
              </form>
              ) : (
              <form
                className={styles.emailChangeForm}
                onSubmit={handleEmailChangeRequest}
              >
                <Field label="Alamat email baru" required>
                  <Input
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={savingEmail}
                    value={newEmail}
                    onChange={(_, data) => {
                      setNewEmail(data.value)
                      setEmailError("")
                      setEmailSuccess("")
                    }}
                  />
                </Field>
                {emailError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{emailError}</MessageBarBody>
                  </MessageBar>
                )}
                {emailSuccess && (
                  <MessageBar intent="success">
                    <MessageBarBody>{emailSuccess}</MessageBarBody>
                  </MessageBar>
                )}
                <div className={styles.emailChangeActions}>
                  <Button
                    appearance="primary"
                    type="submit"
                    disabled={savingEmail}
                    aria-busy={savingEmail}
                  >
                    {savingEmail && <Spinner size="tiny" />}
                    Kirim kode verifikasi
                  </Button>
                  {email && (
                    <Button
                      appearance="subtle"
                      type="button"
                      onClick={() => requestEmailChange(null)}
                      disabled={savingEmail}
                    >
                      Hapus email
                    </Button>
                  )}
                </div>
              </form>
              )}
            </section>
          )}
          <section
            className={styles.passwordPanel}
            aria-labelledby="password-title"
          >
            <div className={styles.passwordHeader}>
              <Text id="password-title" as="h3" size={300} weight="semibold">
              Ganti password
              </Text>
              <Text size={200}>
              Gunakan 12–128 karakter; 16 karakter atau lebih disarankan.
              </Text>
            </div>
            <MessageBar intent="info">
              <MessageBarBody>
              Setelah password diubah, sesi lain akun ini akan dikeluarkan.
              </MessageBarBody>
            </MessageBar>
          <form className={styles.form} onSubmit={handleSubmit}>
            <Field label="Password saat ini" required>
              <Input
                type={visiblePasswords.current ? "text" : "password"}
                autoComplete="current-password"
                maxLength={128}
                required
                disabled={saving || verifyingCurrentPassword}
                value={currentPassword}
                contentAfter={
                  <Button
                    appearance="transparent"
                    size="small"
                    type="button"
                    aria-pressed={visiblePasswords.current}
                    icon={
                      visiblePasswords.current ? (
                        <EyeOffRegular />
                      ) : (
                        <EyeRegular />
                      )
                    }
                    aria-label={
                      visiblePasswords.current
                        ? "Sembunyikan password saat ini"
                        : "Tampilkan password saat ini"
                    }
                    disabled={saving || verifyingCurrentPassword}
                    onClick={() => togglePasswordVisibility("current")}
                  />
                }
                onChange={(_, data) => {
                  setCurrentPassword(data.value)
                  setCurrentPasswordVerified(false)
                  setNewPassword("")
                  setConfirmPassword("")
                  setError("")
                  setSuccess("")
                }}
              />
            </Field>
            <Button
              type="button"
              appearance={currentPasswordVerified ? "subtle" : "secondary"}
              disabled={
                saving ||
                verifyingCurrentPassword ||
                currentPassword.length === 0 ||
                currentPasswordVerified
              }
              aria-busy={verifyingCurrentPassword}
              onClick={() => void verifyCurrentPasswordForChange()}
            >
              {verifyingCurrentPassword && <Spinner size="tiny" />}
              {currentPasswordVerified
                ? "Password saat ini terverifikasi"
                : verifyingCurrentPassword
                  ? "Memverifikasi…"
                  : "Verifikasi password"}
            </Button>
            {currentPasswordVerified && (
              <>
                <MessageBar intent="success">
                  <MessageBarBody>
                    Password saat ini benar. Masukkan password baru.
                  </MessageBarBody>
                </MessageBar>
                <Field label="Password baru" required>
                  <Input
                    type={visiblePasswords.new ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                    disabled={saving}
                    value={newPassword}
                    contentAfter={
                      <Button
                        appearance="transparent"
                        size="small"
                        type="button"
                        aria-pressed={visiblePasswords.new}
                        icon={
                          visiblePasswords.new ? (
                            <EyeOffRegular />
                          ) : (
                            <EyeRegular />
                          )
                        }
                        aria-label={
                          visiblePasswords.new
                            ? "Sembunyikan password baru"
                            : "Tampilkan password baru"
                        }
                        disabled={saving}
                        onClick={() => togglePasswordVisibility("new")}
                      />
                    }
                    onChange={(_, data) => {
                      setNewPassword(data.value)
                      setError("")
                      setSuccess("")
                    }}
                  />
                </Field>
                <Field label="Konfirmasi password baru" required>
                  <Input
                    type={visiblePasswords.confirm ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                    disabled={saving}
                    value={confirmPassword}
                    contentAfter={
                      <Button
                        appearance="transparent"
                        size="small"
                        type="button"
                        aria-pressed={visiblePasswords.confirm}
                        icon={
                          visiblePasswords.confirm ? (
                            <EyeOffRegular />
                          ) : (
                            <EyeRegular />
                          )
                        }
                        aria-label={
                          visiblePasswords.confirm
                            ? "Sembunyikan konfirmasi password"
                            : "Tampilkan konfirmasi password"
                        }
                        disabled={saving}
                        onClick={() => togglePasswordVisibility("confirm")}
                      />
                    }
                    onChange={(_, data) => {
                      setConfirmPassword(data.value)
                      setError("")
                      setSuccess("")
                    }}
                  />
                </Field>
              </>
            )}
            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
            {success && (
              <MessageBar intent="success">
                <MessageBarBody>{success}</MessageBarBody>
              </MessageBar>
            )}
            {currentPasswordVerified && (
              <Button
                className={styles.passwordSubmit}
                appearance="primary"
                type="submit"
                disabled={saving}
                aria-busy={saving}
              >
                {saving && <Spinner size="tiny" />}
                Simpan password
              </Button>
            )}
          </form>
        </section>
      </section>
      )}
    </section>
  )
}
