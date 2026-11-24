type VehicleQuantityRecord = {
  id: string
  vehicle_type: string
  vehicle_subtype: string
  quantity: number
}

type VehicleQuantityDraft = {
  vehicleType: string
  vehicleSubtype: string
  quantity: number
}

export function getVehicleR4BoxQuantityReminder(
  records: readonly VehicleQuantityRecord[],
  editingRecordId: string | null,
  draft?: VehicleQuantityDraft,
) {
  const recordedR4BoxQuantity = records.reduce(
    (total, record) =>
      record.id !== editingRecordId &&
      record.vehicle_type === "R4" &&
      record.vehicle_subtype === "Box / mobil box"
        ? total + record.quantity
        : total,
    0,
  )
  const actualR4BoxQuantity =
    recordedR4BoxQuantity +
    (draft?.vehicleType === "R4" &&
    draft.vehicleSubtype === "Box / mobil box"
      ? draft.quantity
      : 0)

  return {
    actualR4BoxQuantity,
    shortfallUpTo1500: Math.max(0, 1 - actualR4BoxQuantity),
    shortfallOver1500: Math.max(0, 2 - actualR4BoxQuantity),
  }
}
