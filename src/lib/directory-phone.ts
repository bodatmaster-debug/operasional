import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max"

export const DEFAULT_DIRECTORY_PHONE_COUNTRY: CountryCode = "ID"
export const MAX_DIRECTORY_PHONE_DIGITS = 15

export function maxDirectoryNationalPhoneDigits(dialCode: string) {
  const dialCodeDigits = dialCode.replace(/\D/g, "").length
  return Math.max(0, MAX_DIRECTORY_PHONE_DIGITS - dialCodeDigits)
}

export function normalizeDirectoryPhone(value: string) {
  const phoneNumber = parsePhoneNumberFromString(
    value.trim(),
    DEFAULT_DIRECTORY_PHONE_COUNTRY,
  )
  return phoneNumber?.isValid() ? phoneNumber.number : null
}
