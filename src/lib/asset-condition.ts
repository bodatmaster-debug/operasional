export const ASSET_CONDITION_OPTIONS = [
  { value: "good", label: "Baik" },
  { value: "service_required", label: "Butuh diservis" },
  { value: "broken", label: "Rusak" },
] as const

export type AssetCondition = (typeof ASSET_CONDITION_OPTIONS)[number]["value"]
export type AssetConditionValue = AssetCondition | null

export function isAssetCondition(
  value: unknown,
): value is AssetConditionValue {
  return (
    value === null ||
    ASSET_CONDITION_OPTIONS.some((option) => option.value === value)
  )
}

export function getAssetConditionLabel(
  value: AssetConditionValue,
): string {
  return (
    ASSET_CONDITION_OPTIONS.find((option) => option.value === value)?.label ??
    "Belum dinilai"
  )
}
