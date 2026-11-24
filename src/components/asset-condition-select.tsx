"use client"

import * as React from "react"
import {
  Badge,
  Dropdown,
  Option,
  Text,
} from "@fluentui/react-components"
import {
  ASSET_CONDITION_OPTIONS,
  getAssetConditionLabel,
  type AssetConditionValue,
} from "@/lib/asset-condition"

type AssetSource = "juknis" | "vehicle" | "non-juknis" | "surat-edaran"

type Props = {
  source: AssetSource
  recordId: string
  sppgId: string
  assetName: string
  value: AssetConditionValue
  canManage: boolean
  onSaved: (value: AssetConditionValue) => void
}

const conditionColors = {
  good: "success",
  service_required: "warning",
  broken: "danger",
} as const

export function AssetConditionSelect({
  source,
  recordId,
  sppgId,
  assetName,
  value,
  canManage,
  onSaved,
}: Props) {
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  async function saveCondition(nextValue: AssetConditionValue) {
    if (saving || nextValue === value) return
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/asset-condition", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          recordId,
          sppgId,
          assetCondition: nextValue,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Kondisi aset gagal disimpan."
        throw new Error(message)
      }
      onSaved(nextValue)
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Kondisi aset gagal disimpan.",
      )
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) {
    return (
      <Badge
        appearance="tint"
        color={value ? conditionColors[value] : "informative"}
      >
        {getAssetConditionLabel(value)}
      </Badge>
    )
  }

  return (
    <div>
      <Dropdown
        value={getAssetConditionLabel(value)}
        selectedOptions={value ? [value] : [""]}
        aria-label={`Kondisi ${assetName}`}
        disabled={saving}
        onOptionSelect={(_, data) => {
          const nextValue =
            ASSET_CONDITION_OPTIONS.find(
              (option) => option.value === data.optionValue,
            )?.value ?? null
          void saveCondition(nextValue)
        }}
      >
        <Option value="">Belum dinilai</Option>
        {ASSET_CONDITION_OPTIONS.map((option) => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Dropdown>
      {error && (
        <Text size={100} role="alert">
          {error}
        </Text>
      )}
    </div>
  )
}
