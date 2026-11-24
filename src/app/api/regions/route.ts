import { NextResponse, type NextRequest } from "next/server"
import {
  getRegionOptions,
  RegionDataError,
  RegionInputError,
} from "@/lib/regions"
import { isResponse, requireLocalUser } from "@/lib/local-request"

export async function GET(request: NextRequest) {
  const user = requireLocalUser(request)
  if (isResponse(user)) return user

  const parentCode = request.nextUrl.searchParams.get("parentCode")
  const isProvinceRequest =
    request.nextUrl.searchParams.get("level") === "provinsi" && !parentCode
  if (
    !isProvinceRequest &&
    (!parentCode || request.nextUrl.searchParams.has("level"))
  ) {
    return NextResponse.json({ error: "Tingkat atau kode wilayah tidak valid." }, {
      status: 400,
    })
  }

  try {
    const options = await getRegionOptions(isProvinceRequest ? null : parentCode)
    if (options.length === 0) {
      return NextResponse.json(
        { error: "Data wilayah untuk pilihan ini tidak tersedia." },
        { status: 404 },
      )
    }
    return NextResponse.json(options, {
      headers: { "Cache-Control": "private, max-age=3600" },
    })
  } catch (error) {
    console.error("Indonesian region data failed to load.", error)
    const status =
      error instanceof RegionInputError
        ? 400
        : error instanceof RegionDataError
          ? 502
          : 500
    return NextResponse.json(
      { error: "Daftar wilayah gagal dimuat atau diverifikasi. Coba lagi." },
      { status },
    )
  }
}
