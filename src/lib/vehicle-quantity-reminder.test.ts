import assert from "node:assert/strict"
import test from "node:test"
import { getVehicleR4BoxQuantityReminder } from "./vehicle-quantity-reminder.ts"

test("counts only R4 box records and includes a matching draft", () => {
  const reminder = getVehicleR4BoxQuantityReminder(
    [
      {
        id: "box",
        vehicle_type: "R4",
        vehicle_subtype: "Box / mobil box",
        quantity: 1,
      },
      {
        id: "pickup",
        vehicle_type: "R4",
        vehicle_subtype: "Pickup",
        quantity: 3,
      },
      {
        id: "boat",
        vehicle_type: "speedboat",
        vehicle_subtype: "Speedboat",
        quantity: 2,
      },
    ],
    null,
    {
      vehicleType: "R4",
      vehicleSubtype: "Box / mobil box",
      quantity: 0,
    },
  )

  assert.deepEqual(reminder, {
    actualR4BoxQuantity: 1,
    shortfallUpTo1500: 0,
    shortfallOver1500: 1,
  })
})

test("replaces an edited R4 record instead of counting it twice", () => {
  const reminder = getVehicleR4BoxQuantityReminder(
    [
      {
        id: "box",
        vehicle_type: "R4",
        vehicle_subtype: "Box / mobil box",
        quantity: 2,
      },
      {
        id: "second-box",
        vehicle_type: "R4",
        vehicle_subtype: "Box / mobil box",
        quantity: 1,
      },
    ],
    "box",
    {
      vehicleType: "R4",
      vehicleSubtype: "Box / mobil box",
      quantity: 0,
    },
  )

  assert.deepEqual(reminder, {
    actualR4BoxQuantity: 1,
    shortfallUpTo1500: 0,
    shortfallOver1500: 1,
  })
})

test("does not count a non-box R4 draft toward the conditional minimum", () => {
  const reminder = getVehicleR4BoxQuantityReminder(
    [
      {
        id: "pickup",
        vehicle_type: "R4",
        vehicle_subtype: "Pickup",
        quantity: 1,
      },
    ],
    null,
    {
      vehicleType: "R4",
      vehicleSubtype: "Pickup",
      quantity: 3,
    },
  )

  assert.deepEqual(reminder, {
    actualR4BoxQuantity: 0,
    shortfallUpTo1500: 1,
    shortfallOver1500: 2,
  })
})
