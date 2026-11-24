"use client"

import * as React from "react"
import Image from "next/image"
import { Blur } from "@fluentui/react-motion-components-preview"
import {
  AsYouType,
  getCountries,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max"
import { countries as countryDirectory } from "country-codes-flags-phone-codes"
import {
  BuildingColor,
  BuildingPeopleColor,
  WarningFilled,
  WarningRegular,
  bundleIcon,
} from "@fluentui/react-icons"
import {
  Button,
  Carousel,
  CarouselCard,
  CarouselNav,
  CarouselNavButton,
  CarouselNavContainer,
  CarouselSlider,
  CarouselViewport,
  Combobox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  Option,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
  SkeletonItem,
  Text,
  Textarea,
  makeStyles,
  tokens,
  useId,
} from "@fluentui/react-components"
import type { CarouselAnnouncerFunction } from "@fluentui/react-components"
import type {
  DirectoryEditTarget,
  DirectoryKind,
  SppgDirectoryRecord,
} from "@/lib/directory-types"
import {
  DEFAULT_DIRECTORY_PHONE_COUNTRY,
  maxDirectoryNationalPhoneDigits,
  normalizeDirectoryPhone,
} from "@/lib/directory-phone"

type RegionOption = { kode: string; nama: string }
type FoundationLogoLoadStatus = "idle" | "loading" | "loaded" | "error"
type Location = {
  provinsi: RegionOption | null
  kabupaten: RegionOption | null
  kecamatan: RegionOption | null
  desa: RegionOption | null
  alamat: string
}
type FoundationOption = { id: string; nama: string }

const PhoneAlertIcon = bundleIcon(WarningFilled, WarningRegular)

const emptyLocation: Location = {
  provinsi: null,
  kabupaten: null,
  kecamatan: null,
  desa: null,
  alamat: "",
}

function locationFromRecord(record: SppgDirectoryRecord | null): Location {
  if (!record) return emptyLocation
  return {
    alamat: record.alamat,
    provinsi: { kode: record.provinsi_kode, nama: record.provinsi_nama },
    kabupaten: { kode: record.kabupaten_kode, nama: record.kabupaten_nama },
    kecamatan: { kode: record.kecamatan_kode, nama: record.kecamatan_nama },
    desa: { kode: record.desa_kode, nama: record.desa_nama },
  }
}

const useStyles = makeStyles({
  surface: {
    width: "min(760px, calc(100vw - 32px))",
    maxWidth: "760px",
    maxHeight: "calc(100dvh - 32px)",
  },
  dialogTitleContent: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dialogTitleIcon: {
    flexShrink: 0,
    width: "24px",
    height: "24px",
  },
  body: { minHeight: 0 },
  content: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    maxHeight: "min(68dvh, 640px)",
    overflowY: "auto",
    scrollPaddingBlockStart: "52px",
    paddingBlock: "4px",
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      maxHeight: "calc(100dvh - 210px)",
    },
  },
  yayasanContent: {
    height: "min(528px, calc(100dvh - 180px))",
    "@media (max-width: 560px)": {
      height: "calc(100dvh - 210px)",
    },
  },
  span: { gridColumn: "1 / -1" },
  hint: {
    gridColumn: "1 / -1",
    color: tokens.colorNeutralForeground2,
  },
  regionField: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  regionLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  regionError: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  imageUploadField: {
    display: "grid",
    justifyItems: "start",
    gap: "8px",
  },
  phoneInputGroup: {
    display: "flex",
    columnGap: "4px",
    minWidth: 0,
  },
  phoneCountryPickerWrapper: {
    position: "relative",
    flex: "0 0 auto",
    width: "fit-content",
  },
  phoneCountryFlag: {
    position: "absolute",
    zIndex: 1,
    left: "8px",
    top: "50%",
    width: "24px",
    height: "18px",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  countryOption: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  countryOptionFlag: {
    flex: "0 0 auto",
    fontSize: "16px",
  },
  phoneCountryPicker: {
    width: "max-content",
    minWidth: "max-content",
    paddingInlineEnd: 0,
    "& input": {
      fieldSizing: "content",
      width: "auto",
      minWidth: 0,
      maxWidth: "112px",
      paddingInlineStart: "40px",
      paddingInlineEnd: "5.2px",
      textAlign: "start",
      lineHeight: "30px",
    },
  },
  phoneNumberInput: {
    flex: "1 1 auto",
    minWidth: 0,
  },
  phoneDigitLimitError: {
    color: tokens.colorPaletteRedForeground1,
  },
  phoneDigitAlertButton: {
    minWidth: "28px",
    paddingInline: "4px",
    color: tokens.colorPaletteRedForeground1,
  },
  yayasanStepIndicator: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    marginBlockEnd: "4px",
    padding: 0,
    listStyle: "none",
    position: "sticky",
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    "&::after": {
      content: '""',
      position: "absolute",
      insetInlineStart: 0,
      bottom: 0,
      width: "calc((100% - 16px) / 2)",
      height: "2px",
      backgroundColor: tokens.colorBrandStroke1,
      pointerEvents: "none",
      transitionProperty: "transform",
      transitionDuration: "220ms",
      transitionTimingFunction: "ease",
    },
    "@media (prefers-reduced-motion: reduce)": {
      "&::after": {
        transitionDuration: "0ms",
      },
    },
  },
  yayasanStepIndicatorSecond: {
    "&::after": {
      transform: "translateX(calc(100% + 16px))",
    },
  },
  yayasanStep: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
    paddingBlock: "8px",
    borderBottom: `2px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground2,
    transitionProperty: "color",
    transitionDuration: "160ms",
    transitionTimingFunction: "ease",
    "@media (prefers-reduced-motion: reduce)": {
      transitionDuration: "0ms",
    },
  },
  yayasanStepActive: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  yayasanStepNumber: {
    display: "grid",
    placeItems: "center",
    flex: "0 0 24px",
    width: "24px",
    height: "24px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    transitionProperty: "background-color, color",
    transitionDuration: "160ms",
    transitionTimingFunction: "ease",
    "@media (prefers-reduced-motion: reduce)": {
      transitionDuration: "0ms",
    },
  },
  yayasanStepNumberActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  yayasanStage: {
    display: "grid",
    minHeight: "396px",
    gridTemplateColumns: "repeat(2, minmax(0, 300px))",
    justifyContent: "center",
    alignItems: "start",
    alignContent: "start",
    columnGap: "24px",
    rowGap: "16px",
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      rowGap: "8px",
    },
  },
  yayasanLogoField: {
    width: "100%",
    "& .fui-Field__label": {
      display: "flex",
      alignItems: "center",
      minHeight: "32px",
    },
  },
  benefitLogoRow: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "minmax(0, 1fr) minmax(180px, 220px)",
    alignItems: "start",
    gap: "16px",
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: "8px",
    },
  },
  benefitField: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  foundationLogoPreview: {
    display: "grid",
    gridTemplateColumns: "92px minmax(0, 1fr)",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
    minHeight: "76px",
    padding: "8px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  foundationLogoFrame: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    width: "92px",
    height: "52px",
    aspectRatio: "16 / 9",
    overflow: "hidden",
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  foundationLogoSkeleton: {
    width: "92px",
    height: "52px",
    aspectRatio: "16 / 9",
  },
  foundationLogoImage: {
    objectFit: "contain",
    padding: "4px",
  },
  foundationLogoInfo: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  foundationLogoName: {
    overflowWrap: "anywhere",
  },
  foundationLogoRetry: {
    justifySelf: "start",
  },
  logoGuidePanel: {
    width: "100%",
    minWidth: 0,
    margin: 0,
    overflow: "visible",
  },
  logoGuideViewport: {
    width: "100%",
    minWidth: 0,
    overflow: "hidden",
    borderRadius: tokens.borderRadiusMedium,
  },
  logoGuideSlider: {
    columnGap: "0",
  },
  logoGuideNavContainer: {
    margin: "0 0 4px",
  },
  logoGuideCard: {
    display: "grid",
    alignContent: "center",
    gap: "8px",
    width: "100%",
    aspectRatio: "16 / 9",
    padding: "12px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  logoGuideCardContent: {
    display: "grid",
    alignContent: "center",
    gap: "6px",
    minWidth: 0,
  },
  logoGuideList: {
    display: "grid",
    gap: "4px",
    margin: 0,
    padding: 0,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    listStyle: "none",
    "& li": {
      display: "grid",
      gridTemplateColumns: "10px minmax(0, 1fr)",
      columnGap: "6px",
      alignItems: "start",
    },
    "& li::before": {
      content: '"›"',
      color: tokens.colorBrandForeground1,
      fontWeight: tokens.fontWeightSemibold,
    },
  },
  logoGuideMeta: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  logoExample: {
    display: "block",
    minWidth: 0,
    padding: "8px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  logoExampleImage: {
    display: "block",
    width: "100%",
    height: "auto",
  },
  yayasanFields: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  yayasanFieldWide: {
    gridColumn: "1 / -1",
  },
  ketuaStage: {
    display: "grid",
    minHeight: "396px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    alignItems: "start",
    gap: "24px",
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  ketuaPhotoColumn: {
    width: "100%",
    maxWidth: "300px",
    justifySelf: "center",
    "& .fui-Field__label": {
      width: "240px",
      justifySelf: "center",
    },
  },
  ketuaPhotoFrame: {
    width: "100%",
    maxWidth: "240px",
    justifySelf: "center",
    aspectRatio: "3 / 4",
  },
  ketuaPhotoHint: {
    width: "100%",
    maxWidth: "240px",
    justifySelf: "center",
  },
  ketuaFields: {
    display: "grid",
    width: "100%",
    gap: "16px",
    minWidth: 0,
    maxWidth: "300px",
    justifySelf: "center",
  },
  imageAssetRetry: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  portraitFrame: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    width: "100%",
    aspectRatio: "3 / 4",
    overflow: "hidden",
    border: `1px dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  logoFrame: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    width: "100%",
    aspectRatio: "16 / 9",
    overflow: "hidden",
    border: `1px dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  imageDropActive: {
    outline: `2px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  portraitImage: { objectFit: "cover" },
  logoImage: { objectFit: "contain", padding: "16px" },
  portraitAction: {
    zIndex: 1,
  },
  hiddenFileInput: {
    display: "none",
  },
  portraitHint: {
    color: tokens.colorNeutralForeground2,
    textAlign: "center",
  },
})

const phoneCountryOptions = [...countryDirectory]
  .map((country) => ({
    ...country,
    flag:
      country.flag ||
      [...country.code]
        .map((letter) =>
          String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65),
        )
        .join(""),
  }))
  .map((country) => ({
    ...country,
    label: `${country.code} (${country.dialCode})`,
    searchText: `${country.name} ${country.code} ${country.dialCode}`.toLocaleLowerCase(
      "en",
    ),
  }))
  .sort((left, right) => left.name.localeCompare(right.name, "en"))
const phoneCountriesByDialCode = [...phoneCountryOptions].sort(
  (left, right) => right.dialCode.length - left.dialCode.length,
)
const supportedPhoneCountryCodes = getCountries()

function phoneCountryByCode(country: string) {
  return phoneCountryOptions.find((option) => option.code === country)
}

function phoneCountryFromPrefix(value: string) {
  return phoneCountriesByDialCode.find((option) =>
    value.trimStart().startsWith(option.dialCode),
  )?.code
}

function supportedPhoneCountry(country: string): CountryCode | undefined {
  return supportedPhoneCountryCodes.find((option) => option === country)
}

function phoneCountryPickerValue(country: string) {
  const option = phoneCountryByCode(country)
  return option ? `(${option.dialCode})` : country
}

function phoneCountryFlagClass(country: string) {
  return country === "AN" ? undefined : `fi fi-${country.toLowerCase()}`
}

const logoGuideCards = [
  { label: "Penggunaan", title: "Penggunaan logo" },
  { label: "Format", title: "Format logo" },
  { label: "Contoh", title: "Logo Bisukma Group" },
]

const announceLogoGuideSlide: CarouselAnnouncerFunction = (
  index,
  totalSlides,
) =>
  `Panduan logo: ${logoGuideCards[index]?.title ?? "slide"}, ${index + 1} dari ${totalSlides}`

function LogoGuidancePanel() {
  const styles = useStyles()
  const [activeIndex, setActiveIndex] = React.useState(0)
  return (
    <Carousel
      className={styles.logoGuidePanel}
      aria-label="Panduan logo Yayasan"
      appearance="flat"
      groupSize={1}
      circular
      activeIndex={activeIndex}
      onActiveIndexChange={(_, data) => setActiveIndex(data.index)}
      announcement={announceLogoGuideSlide}
    >
      <CarouselNavContainer
        className={styles.logoGuideNavContainer}
        layout="inline"
        nextTooltip={{ content: "Kartu berikutnya", relationship: "label" }}
        prevTooltip={{ content: "Kartu sebelumnya", relationship: "label" }}
      >
        <CarouselNav>
          {(index) => (
            <CarouselNavButton
              key={index}
              aria-label={`Tampilkan ${logoGuideCards[index]?.title ?? "panduan logo"}`}
            />
          )}
        </CarouselNav>
      </CarouselNavContainer>
      <CarouselViewport className={styles.logoGuideViewport}>
        <CarouselSlider className={styles.logoGuideSlider}>
          <CarouselCard
            className={styles.logoGuideCard}
            aria-label="1 dari 3: Penggunaan logo"
          >
            <Blur visible={activeIndex === 0}>
              <div className={styles.logoGuideCardContent}>
                <Text weight="semibold">Logo direncanakan tampil pada</Text>
                <ul className={styles.logoGuideList}>
                  <li>Surat jalan</li>
                  <li>Form serah terima aset</li>
                  <li>Dokumen RAB</li>
                </ul>
                <Text className={styles.logoGuideMeta}>
                  Gunakan logo yang tetap terbaca pada ukuran cetak kecil.
                </Text>
              </div>
            </Blur>
          </CarouselCard>
          <CarouselCard
            className={styles.logoGuideCard}
            aria-label="2 dari 3: Format logo"
          >
            <Blur visible={activeIndex === 1}>
              <div className={styles.logoGuideCardContent}>
                <Text weight="semibold">Rekomendasi untuk dokumen</Text>
                <Text size={200}>
                  PNG transparan, 1200 × 400 px (rasio 3:1), ruang warna sRGB,
                  maksimal 5 MiB.
                </Text>
                <Text className={styles.logoGuideMeta}>
                  WebP atau AVIF cocok untuk file lebih ringan. JPEG tidak
                  mendukung transparansi. Unggahan menerima PNG, WebP, JPEG,
                  dan AVIF.
                </Text>
              </div>
            </Blur>
          </CarouselCard>
          <CarouselCard
            className={styles.logoGuideCard}
            aria-label="3 dari 3: Logo Bisukma Group"
          >
            <Blur visible={activeIndex === 2}>
              <div className={styles.logoGuideCardContent}>
                <Text weight="semibold">Logo Bisukma Group</Text>
                <div className={styles.logoExample}>
                  <Image
                    src="/bisukma-logo.png"
                    alt="Logo Bisukma Group"
                    width={2000}
                    height={667}
                    sizes="(max-width: 560px) 75vw, 260px"
                    className={styles.logoExampleImage}
                  />
                </div>
              </div>
            </Blur>
          </CarouselCard>
        </CarouselSlider>
      </CarouselViewport>
    </Carousel>
  )
}

function getPhoneFieldInitialValue(value: string) {
  const parsed = parsePhoneNumberFromString(
    value,
    DEFAULT_DIRECTORY_PHONE_COUNTRY,
  )
  return {
    country:
      parsed?.country ??
      phoneCountryFromPrefix(value) ??
      DEFAULT_DIRECTORY_PHONE_COUNTRY,
    phone: parsed?.formatNational() ?? value,
  }
}

function formatPhoneFieldValue(value: string, country: string) {
  if (!value.trim()) return { country, phone: "", normalized: "" }
  const countryOption = phoneCountryByCode(country)
  const formatterCountry = supportedPhoneCountry(country)
  const digits = value.replace(/\D/g, "")
  const inputValue =
    !formatterCountry && countryOption && !value.trimStart().startsWith("+")
      ? `${countryOption.dialCode}${digits}`
      : value
  const formatter = new AsYouType(formatterCountry)
  const formatted = formatter.input(inputValue)
  const parsed = formatter.getNumber()
  const detectedCountry =
    value.trimStart().startsWith("+")
      ? parsed?.country ?? phoneCountryFromPrefix(value)
      : undefined
  const formattedNational =
    detectedCountry ? parsed?.formatNational() : undefined

  return {
    country: detectedCountry ?? country,
    phone:
      formattedNational ??
      (formatterCountry ? formatted : value),
    normalized:
      parsed?.number ??
      (!formatterCountry && countryOption && !value.trimStart().startsWith("+")
        ? `${countryOption.dialCode}${digits}`
        : formatted),
  }
}

function PhoneNumberInput({
  value,
  onChange,
  label,
  validationRequested,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  validationRequested: boolean
}) {
  const styles = useStyles()
  const [initialValue] = React.useState(() => getPhoneFieldInitialValue(value))
  const [country, setCountry] = React.useState<string>(initialValue.country)
  const [phone, setPhone] = React.useState(initialValue.phone)
  const [countryOpen, setCountryOpen] = React.useState(false)
  const [countryQuery, setCountryQuery] = React.useState(() =>
    phoneCountryPickerValue(initialValue.country),
  )
  const phoneInputRef = React.useRef<HTMLInputElement>(null)
  const digitCountId = useId("phone-digit-count")
  const phoneDigitCount = phone.replace(/\D/g, "").length
  const maxPhoneDigitCount = maxDirectoryNationalPhoneDigits(
    phoneCountryByCode(country)?.dialCode ?? "",
  )
  const exceedsPhoneDigitLimit = phoneDigitCount > maxPhoneDigitCount
  const phoneNumberIsInvalid =
    validationRequested &&
    phoneDigitCount > 0 &&
    !normalizeDirectoryPhone(formatPhoneFieldValue(phone, country).normalized)
  const phoneValidationMessage = exceedsPhoneDigitLimit
    ? `Maksimal ${maxPhoneDigitCount} angka untuk nomor ini, di luar kode negara.`
    : phoneNumberIsInvalid
      ? `${label} belum valid. Periksa jumlah digit dan kode negaranya.`
      : ""
  const matchingCountries = phoneCountryOptions.filter((option) =>
    option.searchText.includes(countryQuery.trim().toLocaleLowerCase("en")),
  )
  const selectedCountryValue = phoneCountryPickerValue(country)

  React.useEffect(() => {
    phoneInputRef.current?.setCustomValidity(phoneValidationMessage)
  }, [phoneValidationMessage])

  React.useEffect(() => {
    if (validationRequested && phoneValidationMessage) {
      phoneInputRef.current?.focus()
    }
  }, [phoneValidationMessage, validationRequested])

  function selectCountry(nextCountry: string) {
    const option = phoneCountryByCode(nextCountry)
    if (!option) return
    const digits = phone.replace(/\D/g, "")
    const formatterCountry = supportedPhoneCountry(nextCountry)
    const inputValue =
      !formatterCountry && digits
        ? `${option.dialCode}${digits}`
        : digits
    const formatter = new AsYouType(formatterCountry)
    const formatted = formatter.input(inputValue)
    const parsed = formatter.getNumber()
    const normalized =
      parsed?.number ??
      (!formatterCountry && digits
        ? `${option.dialCode}${digits}`
        : formatted)
    setCountry(nextCountry)
    setCountryQuery(phoneCountryPickerValue(nextCountry))
    setPhone(
      !digits
        ? ""
        : !formatterCountry
          ? parsed?.formatNational() ?? phone
          : formatted,
    )
    onChange(normalized)
  }

  function formatPhoneOnBlur() {
    const result = formatPhoneFieldValue(phone, country)
    setCountry(result.country)
    setCountryQuery(phoneCountryPickerValue(result.country))
    setPhone(result.phone)
    onChange(result.normalized)
  }

  return (
    <div className={styles.phoneInputGroup}>
      <div className={styles.phoneCountryPickerWrapper}>
        <span
          aria-hidden="true"
          className={`${styles.phoneCountryFlag} ${phoneCountryFlagClass(country) ?? ""}`}
        >
          {phoneCountryFlagClass(country) ? null : phoneCountryByCode(country)?.flag}
        </span>
        <Combobox
          aria-label={`${phoneCountryByCode(country)?.name ?? "Kode negara"} ${phoneCountryByCode(country)?.dialCode ?? ""} ${label}`}
          className={styles.phoneCountryPicker}
          placeholder="Cari"
          expandIcon={{ style: { display: "none" } }}
          open={countryOpen}
          onOpenChange={(_, data) => {
            setCountryOpen(data.open)
            if (data.open) setCountryQuery("")
          }}
          positioning={{
            position: "below",
            align: "start",
            matchTargetSize: "width",
            pinned: true,
            autoSize: "height",
          }}
          value={countryOpen ? countryQuery : selectedCountryValue}
          selectedOptions={[country]}
          freeform={false}
          onChange={(event) => setCountryQuery(event.target.value)}
          onOptionSelect={(_, data) => {
            const option = phoneCountryOptions.find(
              (item) => item.code === data.optionValue,
            )
            if (option) selectCountry(option.code)
          }}
        >
          {matchingCountries.length > 0 ? (
            matchingCountries.map((option) => (
              <Option
                key={option.code}
                value={option.code}
                text={option.label}
              >
                <span className={styles.countryOption}>
                  <span
                    aria-hidden="true"
                    className={`${styles.countryOptionFlag} ${phoneCountryFlagClass(option.code) ?? ""}`}
                  >
                    {phoneCountryFlagClass(option.code) ? null : option.flag}
                  </span>
                  {option.label}
                </span>
              </Option>
            ))
          ) : (
            <Option value="__no_country_match__" disabled>
              Tidak ada negara yang cocok
            </Option>
          )}
        </Combobox>
      </div>
      <Input
        ref={phoneInputRef}
        className={styles.phoneNumberInput}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={32}
        required
        aria-describedby={phoneValidationMessage ? digitCountId : undefined}
        aria-invalid={Boolean(phoneValidationMessage) || undefined}
        value={phone}
        placeholder={
          country === DEFAULT_DIRECTORY_PHONE_COUNTRY
            ? "0812 3456 7890"
            : "Nomor telepon"
        }
        contentAfter={
          phoneValidationMessage ? (
            <Popover>
              <PopoverTrigger disableButtonEnhancement>
                <Button
                  type="button"
                  appearance="transparent"
                  size="small"
                  className={styles.phoneDigitAlertButton}
                  icon={<PhoneAlertIcon aria-hidden="true" />}
                  aria-label="Lihat batas jumlah digit nomor telepon"
                />
              </PopoverTrigger>
              <PopoverSurface
                id={digitCountId}
                aria-label="Batas jumlah digit nomor telepon"
              >
                <Text size={200} className={styles.phoneDigitLimitError}>
                  {phoneValidationMessage}
                </Text>
              </PopoverSurface>
            </Popover>
          ) : undefined
        }
        onChange={(_, data) => {
          const digits = data.value.replace(/\D/g, "")
          setPhone(digits)
          onChange(digits)
        }}
        onBlur={formatPhoneOnBlur}
      />
    </div>
  )
}

const maxImageBytes = 5 * 1024 * 1024
const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Gambar gagal dibaca. Coba pilih file lain."))
    }
    reader.onerror = () =>
      reject(new Error("Gambar gagal dibaca. Coba pilih file lain."))
    reader.readAsDataURL(file)
  })
}

async function readResponse(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Permintaan gagal diproses."
    throw new Error(message)
  }
  return payload
}

function isYayasanImagePayload(
  value: unknown,
): value is {
  record: {
    logo_data_url: string | null
    foto_ketua_data_url: string | null
  }
} {
  if (typeof value !== "object" || value === null || !("record" in value)) {
    return false
  }
  const record = value.record
  return (
    typeof record === "object" &&
    record !== null &&
    "logo_data_url" in record &&
    (typeof record.logo_data_url === "string" ||
      record.logo_data_url === null) &&
    "foto_ketua_data_url" in record &&
    (typeof record.foto_ketua_data_url === "string" ||
      record.foto_ketua_data_url === null)
  )
}

function normalizeRegionName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function rankRegionOptions(options: RegionOption[], searchText: string) {
  const query = normalizeRegionName(searchText)
  if (!query) return options

  return options
    .map((option, index) => {
      const name = normalizeRegionName(option.nama)
      const wordStartsWithQuery = name
        .split(/\s+/)
        .some((word) => word.startsWith(query))
      const rank =
        name === query
          ? 0
          : name.startsWith(query)
            ? 1
            : wordStartsWithQuery
              ? 2
              : 3
      return { option, index, name, rank }
    })
    .filter(({ name }) => name.includes(query))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ option }) => option)
}

function useRegionOptions(
  parentCode: string | null,
  enabled: boolean,
  retry: number,
) {
  const [options, setOptions] = React.useState<RegionOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const controller = new AbortController()
    if (!enabled) return () => controller.abort()
    const query = parentCode
      ? `parentCode=${encodeURIComponent(parentCode)}`
      : "level=provinsi"
    void (async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setLoading(true)
      setError("")
      try {
        const response = await fetch(`/api/regions?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await readResponse(response)
        if (
          !Array.isArray(payload) ||
          !payload.every(
            (option) =>
              typeof option === "object" &&
              option !== null &&
              "kode" in option &&
              typeof option.kode === "string" &&
              "nama" in option &&
              typeof option.nama === "string",
          )
        ) {
          throw new Error("Format daftar wilayah tidak valid.")
        }
        if (!controller.signal.aborted) setOptions(payload)
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Daftar wilayah gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [enabled, parentCode, retry])

  return { options, loading, error }
}

export function DirectoryCreateDialog({
  kind,
  open,
  foundations,
  editTarget,
  onOpenChange,
  onSaved,
}: {
  kind: DirectoryKind
  open: boolean
  foundations: FoundationOption[]
  editTarget: DirectoryEditTarget | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const styles = useStyles()
  const initialSppg =
    editTarget?.kind === "sppg" ? editTarget.record : null
  const initialYayasan =
    editTarget?.kind === "yayasan" ? editTarget.record : null
  const initialYayasanId = initialYayasan?.id
  const [nama, setNama] = React.useState(
    initialSppg?.nama ?? initialYayasan?.nama ?? "",
  )
  const [alamatYayasan, setAlamatYayasan] = React.useState(
    initialYayasan?.alamat_yayasan ?? "",
  )
  const [nomorTeleponYayasan, setNomorTeleponYayasan] = React.useState(
    initialYayasan?.nomor_telepon_yayasan ?? "",
  )
  const [yayasanPhoneValidationRequested, setYayasanPhoneValidationRequested] =
    React.useState(false)
  const [ketua, setKetua] = React.useState(
    initialYayasan?.ketua_yayasan ?? "",
  )
  const [alamatKetuaYayasan, setAlamatKetuaYayasan] = React.useState(
    initialYayasan?.alamat_ketua_yayasan ?? "",
  )
  const [nomorTeleponKetuaYayasan, setNomorTeleponKetuaYayasan] =
    React.useState(initialYayasan?.nomor_telepon_ketua_yayasan ?? "")
  const [ketuaPhoneValidationRequested, setKetuaPhoneValidationRequested] =
    React.useState(false)
  const [yayasanStep, setYayasanStep] = React.useState<0 | 1>(0)
  const [yayasanId, setYayasanId] = React.useState(
    initialSppg?.yayasan_id ?? "",
  )
  const [selectedFoundationLogo, setSelectedFoundationLogo] =
    React.useState<string | null>(null)
  const [foundationLogoLoadStatus, setFoundationLogoLoadStatus] =
    React.useState<FoundationLogoLoadStatus>("idle")
  const [foundationLogoError, setFoundationLogoError] = React.useState("")
  const [foundationLogoRetry, setFoundationLogoRetry] = React.useState(0)
  const [kepala, setKepala] = React.useState(
    initialSppg?.kepala_sppg ?? "",
  )
  const [pic, setPic] = React.useState(initialSppg?.pic ?? "")
  const [jumlahPenerimaManfaat, setJumlahPenerimaManfaat] =
    React.useState(
      initialSppg?.jumlah_penerima_manfaat == null
        ? ""
        : String(initialSppg.jumlah_penerima_manfaat),
    )
  const [location, setLocation] = React.useState<Location>(() =>
    locationFromRecord(initialSppg),
  )
  const [regionSearch, setRegionSearch] = React.useState({
    provinsi: initialSppg?.provinsi_nama ?? "",
    kabupaten: initialSppg?.kabupaten_nama ?? "",
    kecamatan: initialSppg?.kecamatan_nama ?? "",
    desa: initialSppg?.desa_nama ?? "",
  })
  const [retryRegions, setRetryRegions] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [portraitDataUrl, setPortraitDataUrl] = React.useState<string | null>(
    null,
  )
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(null)
  const [draggedImage, setDraggedImage] = React.useState<
    "portrait" | "logo" | null
  >(null)
  const [imageAssetsLoaded, setImageAssetsLoaded] = React.useState(
    initialYayasan === null,
  )
  const [imageAssetsLoading, setImageAssetsLoading] = React.useState(false)
  const [imageAssetsLoadFailed, setImageAssetsLoadFailed] =
    React.useState(false)
  const [imageAssetsRetry, setImageAssetsRetry] = React.useState(0)
  const portraitInputRef = React.useRef<HTMLInputElement>(null)
  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const regionLabelIds = {
    provinsi: useId("region-province"),
    kabupaten: useId("region-regency"),
    kecamatan: useId("region-district"),
    desa: useId("region-village"),
  }

  const isSppg = kind === "sppg"
  const isYayasanNameLocked =
    initialYayasan !== null && initialYayasan.sppg_count > 0
  const selectedFoundation = foundations.find((item) => item.id === yayasanId)
  const provinceResult = useRegionOptions(null, open && isSppg, retryRegions)
  const regencyResult = useRegionOptions(
    location.provinsi?.kode ?? null,
    open && isSppg && Boolean(location.provinsi),
    retryRegions,
  )
  const districtResult = useRegionOptions(
    location.kabupaten?.kode ?? null,
    open && isSppg && Boolean(location.kabupaten),
    retryRegions,
  )
  const villageResult = useRegionOptions(
    location.kecamatan?.kode ?? null,
    open && isSppg && Boolean(location.kecamatan),
    retryRegions,
  )
  const regionError =
    provinceResult.error ||
    regencyResult.error ||
    districtResult.error ||
    villageResult.error
  const regionLoading =
    provinceResult.loading ||
    regencyResult.loading ||
    districtResult.loading ||
    villageResult.loading

  React.useEffect(() => {
    if (!open || !isSppg || !yayasanId) return
    const controller = new AbortController()
    void (async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setFoundationLogoLoadStatus("loading")
      setFoundationLogoError("")
      try {
        const params = new URLSearchParams({ kind: "yayasan", id: yayasanId })
        const response = await fetch(`/api/directory?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await readResponse(response)
        if (!isYayasanImagePayload(payload)) {
          throw new Error("Format logo Yayasan tidak valid.")
        }
        if (controller.signal.aborted) return
        setSelectedFoundationLogo(payload.record.logo_data_url)
        setFoundationLogoLoadStatus("loaded")
      } catch (failure) {
        if (!controller.signal.aborted) {
          setFoundationLogoLoadStatus("error")
          setFoundationLogoError(
            failure instanceof Error ? failure.message : "Logo Yayasan gagal dimuat.",
          )
        }
      }
    })()
    return () => controller.abort()
  }, [open, isSppg, yayasanId, foundationLogoRetry])

  React.useEffect(() => {
    if (!open || !initialYayasanId) return
    const controller = new AbortController()
    void (async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setImageAssetsLoading(true)
      setImageAssetsLoadFailed(false)
      setImageAssetsLoaded(false)
      setError("")
      try {
        const params = new URLSearchParams({
          kind: "yayasan",
          id: initialYayasanId,
        })
        const response = await fetch(`/api/directory?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await readResponse(response)
        if (!isYayasanImagePayload(payload)) {
          throw new Error("Format gambar Yayasan tidak valid.")
        }
        if (controller.signal.aborted) return
        setLogoDataUrl(payload.record.logo_data_url)
        setPortraitDataUrl(payload.record.foto_ketua_data_url)
        setImageAssetsLoaded(true)
      } catch (failure) {
        if (!controller.signal.aborted) {
          setImageAssetsLoadFailed(true)
          setError(
            failure instanceof Error
              ? failure.message
              : "Foto dan logo Yayasan gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setImageAssetsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [open, initialYayasanId, imageAssetsRetry])

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPortraitDataUrl(null)
      setLogoDataUrl(null)
      setDraggedImage(null)
      setYayasanStep(0)
      setYayasanPhoneValidationRequested(false)
      setKetuaPhoneValidationRequested(false)
      setError("")
      setSelectedFoundationLogo(null)
      setFoundationLogoLoadStatus("idle")
      setFoundationLogoError("")
    }
    onOpenChange(nextOpen)
  }

  async function loadImageFile(
    file: File,
    setImage: React.Dispatch<React.SetStateAction<string | null>>,
  ) {
    if (
      !allowedImageTypes.includes(file.type) ||
      file.size > maxImageBytes
    ) {
      setError("Pilih PNG, WebP, JPEG, atau AVIF dengan ukuran maksimal 5 MiB.")
      return
    }
    try {
      setImage(await readImageFile(file))
      setError("")
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Gambar gagal dibaca. Coba pilih file lain.",
      )
    }
  }

  function handleImageSelection(
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<string | null>>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) void loadImageFile(file, setImage)
  }

  function handleImageDrop(
    event: React.DragEvent<HTMLDivElement>,
    setImage: React.Dispatch<React.SetStateAction<string | null>>,
  ) {
    event.preventDefault()
    setDraggedImage(null)
    if (submitting) return
    const file = event.dataTransfer.files[0]
    if (file) void loadImageFile(file, setImage)
  }

  function handleImageDragOver(
    event: React.DragEvent<HTMLDivElement>,
    target: "portrait" | "logo",
  ) {
    if (
      submitting ||
      !Array.from(event.dataTransfer.types).includes("Files")
    ) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
    setDraggedImage(target)
  }

  function handleImageDragLeave(event: React.DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }
    setDraggedImage(null)
  }

  function selectRegion(
    field: "provinsi" | "kabupaten" | "kecamatan" | "desa",
    option: RegionOption | null,
  ) {
    setRegionSearch((current) => {
      if (field === "provinsi") {
        return {
          ...current,
          provinsi: option?.nama ?? "",
          kabupaten: "",
          kecamatan: "",
          desa: "",
        }
      }
      if (field === "kabupaten") {
        return {
          ...current,
          kabupaten: option?.nama ?? "",
          kecamatan: "",
          desa: "",
        }
      }
      if (field === "kecamatan") {
        return { ...current, kecamatan: option?.nama ?? "", desa: "" }
      }
      return { ...current, desa: option?.nama ?? "" }
    })
    setLocation((current) => {
      if (field === "provinsi") {
        return {
          ...current,
          provinsi: option,
          kabupaten: null,
          kecamatan: null,
          desa: null,
        }
      }
      if (field === "kabupaten") {
        return { ...current, kabupaten: option, kecamatan: null, desa: null }
      }
      if (field === "kecamatan") {
        return { ...current, kecamatan: option, desa: null }
      }
      return { ...current, desa: option }
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isSppg && yayasanStep === 0) {
      setError("")
      if (!normalizeDirectoryPhone(nomorTeleponYayasan)) {
        setYayasanPhoneValidationRequested(true)
        return
      }
      setYayasanPhoneValidationRequested(false)
      setYayasanStep(1)
      return
    }
    if (
      !isSppg &&
      yayasanStep === 1 &&
      !normalizeDirectoryPhone(nomorTeleponKetuaYayasan)
    ) {
      setError("")
      setKetuaPhoneValidationRequested(true)
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const body = isSppg
        ? {
            nama,
            yayasan_id: yayasanId,
            kepala_sppg: kepala,
            pic,
            jumlah_penerima_manfaat: jumlahPenerimaManfaat.trim()
              ? Number(jumlahPenerimaManfaat)
              : null,
            location,
          }
        : {
            nama,
            alamat_yayasan: alamatYayasan,
            nomor_telepon_yayasan: nomorTeleponYayasan,
            ketua_yayasan: ketua,
            alamat_ketua_yayasan: alamatKetuaYayasan,
            nomor_telepon_ketua_yayasan: nomorTeleponKetuaYayasan,
            logo_data_url: logoDataUrl,
            foto_ketua_data_url: portraitDataUrl,
          }
      const params = new URLSearchParams({ kind })
      if (editTarget) params.set("id", editTarget.record.id)
      const response = await fetch(`/api/directory?${params}`, {
        method: editTarget ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      await readResponse(response)
      handleDialogOpenChange(false)
      onSaved()
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Data direktori gagal disimpan.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  function renderRegionField(
    label: string,
    field: "provinsi" | "kabupaten" | "kecamatan" | "desa",
    options: RegionOption[],
    disabled: boolean,
    loading: boolean,
    labelId: string,
  ) {
    const selected = location[field]
    const typedSearch = regionSearch[field]
    const searchQuery =
      selected &&
      normalizeRegionName(typedSearch) === normalizeRegionName(selected.nama)
        ? ""
        : typedSearch
    const matchingOptions = rankRegionOptions(options, searchQuery)
    return (
      <div className={styles.regionField} key={field}>
        <label id={labelId} className={styles.regionLabel}>
          {label}
          {loading && <Spinner size="tiny" aria-hidden="true" />}
        </label>
        <Combobox
          aria-labelledby={labelId}
          placeholder={`Pilih ${label.toLowerCase()}`}
          positioning={{
            position: "below",
            align: "start",
            matchTargetSize: "width",
            pinned: true,
            autoSize: "height",
          }}
          value={regionSearch[field] || selected?.nama || ""}
          selectedOptions={selected ? [selected.kode] : []}
          aria-busy={loading}
          disabled={disabled || loading}
          freeform={false}
          onChange={(event) => {
            const value = event.target.value
            const exactMatch =
              options.find(
                (item) =>
                  normalizeRegionName(item.nama) === normalizeRegionName(value),
              ) ?? null
            selectRegion(field, exactMatch)
            setRegionSearch((current) => ({
              ...current,
              [field]: value,
            }))
          }}
          onOptionSelect={(_, data) => {
            const option =
              options.find((item) => item.kode === data.optionValue) ?? null
            selectRegion(field, option)
          }}
        >
          {matchingOptions.length > 0
            ? matchingOptions.map((option) => (
                <Option
                  key={option.kode}
                  value={option.kode}
                  text={option.nama}
                >
                  {option.nama}
                </Option>
              ))
            : searchQuery.trim() && (
                <Option
                  key="no-region-results"
                  value="__no_region_results__"
                  text="Tidak ada wilayah yang cocok"
                  disabled
                >
                  Tidak ada wilayah yang cocok
                </Option>
              )}
        </Combobox>
      </div>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => handleDialogOpenChange(data.open)}
    >
      <DialogSurface className={styles.surface}>
        <form onSubmit={handleSubmit}>
          <DialogBody className={styles.body}>
            <DialogTitle>
              <span className={styles.dialogTitleContent}>
                {isSppg ? (
                  <BuildingColor
                    className={styles.dialogTitleIcon}
                    aria-hidden="true"
                  />
                ) : (
                  <BuildingPeopleColor
                    className={styles.dialogTitleIcon}
                    aria-hidden="true"
                  />
                )}
                <span>
                  {editTarget ? "Edit" : "Tambah"}{" "}
                  {isSppg ? "SPPG" : "Yayasan"}
                </span>
              </span>
            </DialogTitle>
            <DialogContent
              className={mergeClasses(
                styles.content,
                !isSppg && styles.yayasanContent,
              )}
            >
              {!isSppg && (
                <ol
                  className={`${styles.span} ${styles.yayasanStepIndicator} ${
                    yayasanStep === 1
                      ? styles.yayasanStepIndicatorSecond
                      : ""
                  }`}
                  aria-label="Tahapan form Yayasan"
                >
                  <li
                    className={`${styles.yayasanStep} ${
                      yayasanStep === 0 ? styles.yayasanStepActive : ""
                    }`}
                    aria-current={yayasanStep === 0 ? "step" : undefined}
                  >
                    <span
                      className={`${styles.yayasanStepNumber} ${
                        yayasanStep === 0 ? styles.yayasanStepNumberActive : ""
                      }`}
                    >
                      1
                    </span>
                    <Text>Detail Yayasan</Text>
                  </li>
                  <li
                    className={`${styles.yayasanStep} ${
                      yayasanStep === 1 ? styles.yayasanStepActive : ""
                    }`}
                    aria-current={yayasanStep === 1 ? "step" : undefined}
                  >
                    <span
                      className={`${styles.yayasanStepNumber} ${
                        yayasanStep === 1 ? styles.yayasanStepNumberActive : ""
                      }`}
                    >
                      2
                    </span>
                    <Text>Detail Ketua Yayasan</Text>
                  </li>
                </ol>
              )}
              {isSppg && (
                <Field label="Nama SPPG" required>
                <Input
                  autoFocus
                  autoComplete="organization"
                  maxLength={200}
                  required
                  value={nama}
                  onChange={(_, data) => setNama(data.value)}
                />
                </Field>
              )}
              {isSppg ? (
                <>
                  <Field label="Yayasan" required>
                    <Dropdown
                      aria-label="Yayasan"
                      placeholder="Pilih Yayasan"
                      positioning={{
                        position: "below",
                        align: "start",
                        matchTargetSize: "width",
                        pinned: true,
                        autoSize: "height",
                      }}
                      value={
                        foundations.find((item) => item.id === yayasanId)?.nama ??
                        ""
                      }
                      selectedOptions={yayasanId ? [yayasanId] : []}
                      disabled={foundations.length === 0}
                      onOptionSelect={(_, data) => {
                        const nextYayasanId = data.optionValue ?? ""
                        setSelectedFoundationLogo(null)
                        setFoundationLogoLoadStatus(
                          nextYayasanId ? "loading" : "idle",
                        )
                        setFoundationLogoError("")
                        setYayasanId(nextYayasanId)
                      }}
                    >
                      {foundations.map((foundation) => (
                        <Option
                          key={foundation.id}
                          value={foundation.id}
                          text={foundation.nama}
                        >
                          {foundation.nama}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                  <div className={styles.benefitLogoRow}>
                    <div className={styles.benefitField}>
                      <Field label="Jumlah penerima manfaat (orang)">
                        <Input
                          type="number"
                          min={1}
                          max={1_000_000}
                          step={1}
                          value={jumlahPenerimaManfaat}
                          placeholder="Belum dicatat"
                          onChange={(_, data) =>
                            setJumlahPenerimaManfaat(data.value)
                          }
                        />
                      </Field>
                      <Text size={200} className={styles.hint}>
                        Opsional; menjadi konteks acuan tertentu dan tidak otomatis
                        menyatakan kepatuhan.
                      </Text>
                    </div>
                    <div
                      className={styles.foundationLogoPreview}
                      role="group"
                      aria-label="Pratinjau logo Yayasan terpilih"
                      aria-live="polite"
                    >
                      <div
                        className={styles.foundationLogoFrame}
                        aria-busy={foundationLogoLoadStatus === "loading"}
                      >
                        {foundationLogoLoadStatus === "loading" ? (
                          <SkeletonItem
                            className={styles.foundationLogoSkeleton}
                            shape="rectangle"
                            aria-hidden="true"
                          />
                        ) : selectedFoundationLogo ? (
                          <Image
                            className={styles.foundationLogoImage}
                            fill
                            unoptimized
                            sizes="92px"
                            src={selectedFoundationLogo}
                            alt={`Logo ${selectedFoundation?.nama ?? "Yayasan"}`}
                            onError={() => {
                              setSelectedFoundationLogo(null)
                              setFoundationLogoLoadStatus("error")
                              setFoundationLogoError(
                                "Gambar logo Yayasan tidak dapat ditampilkan.",
                              )
                            }}
                          />
                        ) : (
                          <Text size={100}>
                            {selectedFoundation ? "Tanpa logo" : "Logo"}
                          </Text>
                        )}
                      </div>
                      <div className={styles.foundationLogoInfo}>
                        <Text size={200} weight="semibold">
                          Logo Yayasan
                        </Text>
                        {foundationLogoLoadStatus === "error" ? (
                          <>
                            <Text size={100} role="alert">
                              {foundationLogoError}
                            </Text>
                            <Button
                              className={styles.foundationLogoRetry}
                              type="button"
                              size="small"
                              appearance="subtle"
                              onClick={() => {
                                setFoundationLogoLoadStatus("loading")
                                setFoundationLogoRetry((count) => count + 1)
                              }}
                            >
                              Coba lagi
                            </Button>
                          </>
                        ) : foundationLogoLoadStatus === "loading" ? (
                          <Text size={100} role="status">
                            Memuat logo…
                          </Text>
                        ) : (
                          <Text
                            size={100}
                            className={styles.foundationLogoName}
                          >
                            {selectedFoundation
                              ? selectedFoundation.nama
                              : "Pilih Yayasan"}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                  <Field label="Kepala SPPG" required>
                    <Input
                      autoComplete="name"
                      maxLength={200}
                      required
                      value={kepala}
                      onChange={(_, data) => setKepala(data.value)}
                    />
                  </Field>
                  <Field label="Nama PIC" required>
                    <Input
                      autoComplete="name"
                      maxLength={200}
                      required
                      value={pic}
                      onChange={(_, data) => setPic(data.value)}
                    />
                  </Field>
                  <Text className={styles.hint}>
                    Pilih wilayah berurutan. Data ini hanya mengisi lokasi
                    direktori, bukan menilai standar operasional.
                  </Text>
                  {renderRegionField(
                    "Provinsi",
                    "provinsi",
                    provinceResult.options,
                    false,
                    provinceResult.loading,
                    regionLabelIds.provinsi,
                  )}
                  {renderRegionField(
                    "Kabupaten/Kota",
                    "kabupaten",
                    regencyResult.options,
                    !location.provinsi,
                    regencyResult.loading,
                    regionLabelIds.kabupaten,
                  )}
                  {renderRegionField(
                    "Kecamatan",
                    "kecamatan",
                    districtResult.options,
                    !location.kabupaten,
                    districtResult.loading,
                    regionLabelIds.kecamatan,
                  )}
                  {renderRegionField(
                    "Desa/Kelurahan",
                    "desa",
                    villageResult.options,
                    !location.kecamatan,
                    villageResult.loading,
                    regionLabelIds.desa,
                  )}
                  <Field label="Alamat lengkap" required className={styles.span}>
                    <Textarea
                      maxLength={1000}
                      required
                      rows={3}
                      value={location.alamat}
                      onChange={(_, data) =>
                        setLocation((current) => ({
                          ...current,
                          alamat: data.value,
                        }))
                      }
                      placeholder="Nama jalan, nomor, RT/RW, atau patokan"
                    />
                  </Field>
                  {foundations.length === 0 && (
                    <Text role="status" className={styles.span}>
                      Tambahkan Yayasan terlebih dahulu sebelum membuat SPPG.
                    </Text>
                  )}
                  {regionError && (
                    <div className={`${styles.regionError} ${styles.span}`}>
                      <Text role="alert">{regionError}</Text>
                      <Button
                        type="button"
                        appearance="secondary"
                        onClick={() => setRetryRegions((count) => count + 1)}
                      >
                        Coba lagi
                      </Button>
                    </div>
                  )}
                </>
              ) : yayasanStep === 0 ? (
                <div className={`${styles.span} ${styles.yayasanStage}`}>
                  <Field
                    label="Logo Yayasan"
                    className={styles.yayasanLogoField}
                  >
                    <div
                      className={`${styles.logoFrame} ${
                        draggedImage === "logo" ? styles.imageDropActive : ""
                      }`}
                      onDragOver={(event) =>
                        handleImageDragOver(event, "logo")
                      }
                      onDragLeave={handleImageDragLeave}
                      onDrop={(event) => handleImageDrop(event, setLogoDataUrl)}
                    >
                      {imageAssetsLoading ? (
                        <Spinner size="small" />
                      ) : logoDataUrl ? (
                        <Image
                          className={styles.logoImage}
                          fill
                          unoptimized
                          sizes="240px"
                          src={logoDataUrl}
                          alt="Pratinjau logo Yayasan"
                        />
                      ) : (
                        <Text size={200} className={styles.portraitHint}>
                          Logo landscape
                        </Text>
                      )}
                      <input
                        ref={logoInputRef}
                        className={styles.hiddenFileInput}
                        type="file"
                        accept="image/png,image/webp,image/jpeg,image/avif"
                        aria-label="Pilih logo Yayasan"
                        onChange={(event) =>
                          handleImageSelection(event, setLogoDataUrl)
                        }
                      />
                      <Button
                        className={styles.portraitAction}
                        type="button"
                        appearance={logoDataUrl ? "primary" : "secondary"}
                        disabled={submitting || imageAssetsLoading}
                        onClick={() => {
                          if (logoDataUrl) {
                            setLogoDataUrl(null)
                            setError("")
                          } else {
                            logoInputRef.current?.click()
                          }
                        }}
                      >
                        {logoDataUrl ? "Hapus logo" : "Unggah logo"}
                      </Button>
                    </div>
                  </Field>
                  <LogoGuidancePanel />
                  <div className={styles.yayasanFields}>
                    <Field label="Nama Yayasan" required>
                      <Input
                        autoFocus={!isYayasanNameLocked}
                        autoComplete="organization"
                        maxLength={200}
                        required
                        disabled={isYayasanNameLocked}
                        value={nama}
                        onChange={(_, data) => setNama(data.value)}
                      />
                    </Field>
                    <Field label="Nomor telepon Yayasan" required>
                      <PhoneNumberInput
                        label="Nomor telepon Yayasan"
                        value={nomorTeleponYayasan}
                        onChange={setNomorTeleponYayasan}
                        validationRequested={yayasanPhoneValidationRequested}
                      />
                    </Field>
                    <Field
                      label="Alamat Yayasan"
                      required
                      className={styles.yayasanFieldWide}
                    >
                      <Textarea
                        maxLength={1000}
                        required
                        rows={3}
                        value={alamatYayasan}
                        onChange={(_, data) => setAlamatYayasan(data.value)}
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className={`${styles.span} ${styles.ketuaStage}`}>
                  <div className={styles.ketuaPhotoColumn}>
                    <Field
                      label="Foto Ketua Yayasan"
                      className={styles.imageUploadField}
                    >
                      <div
                        className={`${styles.portraitFrame} ${styles.ketuaPhotoFrame} ${
                          draggedImage === "portrait"
                            ? styles.imageDropActive
                            : ""
                        }`}
                        onDragOver={(event) =>
                          handleImageDragOver(event, "portrait")
                        }
                        onDragLeave={handleImageDragLeave}
                        onDrop={(event) =>
                          handleImageDrop(event, setPortraitDataUrl)
                        }
                      >
                        {imageAssetsLoading ? (
                          <Spinner size="small" />
                        ) : portraitDataUrl ? (
                          <Image
                            className={styles.portraitImage}
                            fill
                            unoptimized
                            sizes="300px"
                            src={portraitDataUrl}
                            alt="Pratinjau foto Ketua Yayasan"
                          />
                        ) : (
                          <Text size={200} className={styles.portraitHint}>
                            Foto portrait
                          </Text>
                        )}
                        <input
                          ref={portraitInputRef}
                          className={styles.hiddenFileInput}
                          type="file"
                          accept="image/png,image/webp,image/jpeg,image/avif"
                          aria-label="Pilih foto Ketua Yayasan"
                          onChange={(event) =>
                            handleImageSelection(event, setPortraitDataUrl)
                          }
                        />
                        <Button
                          className={styles.portraitAction}
                          type="button"
                          appearance={portraitDataUrl ? "primary" : "secondary"}
                          disabled={submitting || imageAssetsLoading}
                          onClick={() => {
                            if (portraitDataUrl) {
                              setPortraitDataUrl(null)
                              setError("")
                            } else {
                              portraitInputRef.current?.click()
                            }
                          }}
                        >
                          {portraitDataUrl ? "Hapus foto" : "Unggah foto"}
                        </Button>
                      </div>
                      <div className={styles.ketuaPhotoHint}>
                        <Text size={200} className={styles.portraitHint}>
                          PNG, WebP, JPEG, AVIF · maksimal 5 MiB
                        </Text>
                      </div>
                    </Field>
                  </div>
                  <div className={styles.ketuaFields}>
                    <Field label="Nama Ketua Yayasan" required>
                      <Input
                        autoFocus
                        autoComplete="name"
                        maxLength={200}
                        required
                        value={ketua}
                        onChange={(_, data) => setKetua(data.value)}
                      />
                    </Field>
                    <Field label="Alamat Ketua Yayasan" required>
                      <Textarea
                        maxLength={1000}
                        required
                        rows={3}
                        value={alamatKetuaYayasan}
                        onChange={(_, data) =>
                          setAlamatKetuaYayasan(data.value)
                        }
                      />
                    </Field>
                    <Field label="Nomor telepon Ketua Yayasan" required>
                      <PhoneNumberInput
                        label="Nomor telepon Ketua Yayasan"
                        value={nomorTeleponKetuaYayasan}
                        onChange={setNomorTeleponKetuaYayasan}
                        validationRequested={ketuaPhoneValidationRequested}
                      />
                    </Field>
                  </div>
                </div>
              )}
              {imageAssetsLoadFailed && (
                <div className={`${styles.span} ${styles.imageAssetRetry}`}>
                  <Text role="alert">{error}</Text>
                  <Button
                    type="button"
                    appearance="secondary"
                    disabled={imageAssetsLoading}
                    onClick={() =>
                      setImageAssetsRetry((count) => count + 1)
                    }
                  >
                    {imageAssetsLoading ? "Memuat..." : "Coba lagi"}
                  </Button>
                </div>
              )}
              {error && !imageAssetsLoadFailed && (
                <MessageBar intent="error" className={styles.span}>
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                type="button"
                appearance="secondary"
                onClick={() => handleDialogOpenChange(false)}
              >
                Batal
              </Button>
              {!isSppg && yayasanStep === 1 && (
                <Button
                  type="button"
                  appearance="secondary"
                  disabled={submitting}
                  onClick={() => {
                    setError("")
                    setKetuaPhoneValidationRequested(false)
                    setYayasanStep(0)
                  }}
                >
                  Kembali
                </Button>
              )}
              <Button
                appearance="primary"
                type="submit"
                disabled={
                  submitting ||
                  (!isSppg && !imageAssetsLoaded) ||
                  (isSppg &&
                    (foundations.length === 0 ||
                      !location.provinsi ||
                      !location.kabupaten ||
                      !location.kecamatan ||
                      !location.desa ||
                      !location.alamat.trim() ||
                      regionLoading ||
                      Boolean(regionError)))
                }
                aria-busy={submitting || imageAssetsLoading}
              >
                {(submitting || imageAssetsLoading) && <Spinner size="tiny" />}
                {!isSppg && yayasanStep === 0
                  ? "Selanjutnya"
                  : editTarget
                    ? "Simpan perubahan"
                    : isSppg
                      ? "Simpan"
                      : "Simpan"}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
