import type { AssetCatalogItem } from "./asset-catalog.ts"

export type AssetStatus =
  | "Terpenuhi"
  | "Belum terpenuhi"
  | "Belum dicatat"
  | "Perlu verifikasi"

export type AssetQuantityFeedback = {
  tone: "warning" | "success" | "neutral"
  message: string
}

export function assetQuantityNeedsVerification(item: AssetCatalogItem) {
  return (
    item.quantityUncertain ||
    item.name.toLocaleLowerCase("id-ID").includes("opsional")
  )
}

export function assetReferenceNeedsVerification(item: AssetCatalogItem) {
  return (
    item.category !== "Peralatan kantor" ||
    assetQuantityNeedsVerification(item)
  )
}

export function usesThreeThousandCapacityReference(item: AssetCatalogItem) {
  return (
    item.category === "Peralatan dapur" ||
    item.category === "Instalasi gas" ||
    (item.category === "Peralatan operasional" &&
      item.catalogId.startsWith("dapur:"))
  )
}

export function getAssetQuantityFeedback(
  actualQuantity: number | null,
  referenceQuantity: number | null,
  unit: string,
  referenceNeedsVerification: boolean,
  contextMatchesReference = true,
  contextDescription = "",
  itemIsOptional = false,
): AssetQuantityFeedback {
  const referenceNote = [
    referenceNeedsVerification
      ? "Angka acuan perlu verifikasi; perbandingan ini bukan penilaian kepatuhan."
      : "",
    itemIsOptional ? "Item ini opsional; angka acuan bukan kewajiban." : "",
  ]
    .filter(Boolean)
    .join(" ")
  const referenceNoteSuffix = referenceNote ? ` ${referenceNote}` : ""
  const contextNote = contextDescription ? ` ${contextDescription}` : ""

  if (actualQuantity === null) {
    if (referenceQuantity === null) {
      return {
        tone: "neutral",
        message:
          "Acuan jumlah tidak tersedia; isi jumlah aktual untuk pencatatan saja.",
      }
    }

    return {
      tone: "warning",
      message: `Isi jumlah aktual untuk membandingkannya dengan angka acuan tercatat ${new Intl.NumberFormat("id-ID").format(referenceQuantity)} ${unit}.${referenceNoteSuffix}${contextNote}`,
    }
  }

  if (referenceQuantity === null) {
    return {
      tone: "neutral",
      message:
        "Acuan jumlah tidak tersedia; jumlah ini dicatat tanpa perbandingan.",
    }
  }

  if (!contextMatchesReference) {
    return {
      tone: "warning",
      message: `Jumlah aktual ${new Intl.NumberFormat("id-ID").format(actualQuantity)} ${unit} tercatat. Acuan ${new Intl.NumberFormat("id-ID").format(referenceQuantity)} ${unit} hanya berlaku untuk konteks tertentu; perlu verifikasi sebelum dibandingkan.${referenceNoteSuffix}${contextNote}`,
    }
  }

  const shortfall = referenceQuantity - actualQuantity
  if (shortfall > 0) {
    return {
      tone: "warning",
      message: `Jumlah aktual ${new Intl.NumberFormat("id-ID").format(actualQuantity)} ${unit} masih di bawah angka acuan tercatat ${new Intl.NumberFormat("id-ID").format(referenceQuantity)} ${unit} (selisih ${new Intl.NumberFormat("id-ID").format(shortfall)} ${unit}).${referenceNoteSuffix}${contextNote}`,
    }
  }

  return {
    tone: "success",
    message: `Jumlah aktual ${new Intl.NumberFormat("id-ID").format(actualQuantity)} ${unit} telah mencapai angka acuan tercatat ${new Intl.NumberFormat("id-ID").format(referenceQuantity)} ${unit}.${referenceNoteSuffix}${contextNote}`,
  }
}

export function getAssetStatus(
  actualQuantity: number | null,
  referenceQuantity: number | null,
  referenceNeedsVerification: boolean,
  contextMatchesReference = true,
): AssetStatus {
  if (actualQuantity === null) return "Belum dicatat"
  if (
    referenceQuantity === null ||
    referenceNeedsVerification ||
    !contextMatchesReference
  ) {
    return "Perlu verifikasi"
  }
  return actualQuantity >= referenceQuantity ? "Terpenuhi" : "Belum terpenuhi"
}

export function getAssetQuantityShortfall(
  actualQuantity: number | null,
  referenceQuantity: number | null,
  referenceNeedsVerification: boolean,
  contextMatchesReference = true,
): number | null {
  if (
    getAssetStatus(
      actualQuantity,
      referenceQuantity,
      referenceNeedsVerification,
      contextMatchesReference,
    ) !== "Belum terpenuhi" ||
    actualQuantity === null ||
    referenceQuantity === null
  ) {
    return null
  }

  return referenceQuantity - actualQuantity
}
