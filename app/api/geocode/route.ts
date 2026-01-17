import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    const address = searchParams.get("address")
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
        return NextResponse.json({ error: "API Key missing" }, { status: 500 })
    }

    let url = ""
    if (lat && lng) {
        url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=pt-PT`
    } else if (address) {
        url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=pt-PT`
    } else {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    try {
        const response = await fetch(url)
        const data = await response.json()

        if (data.status === "OK" && data.results && data.results.length > 0) {
            const result = data.results[0]
            const location = result.geometry.location
            return NextResponse.json({
                address: result.formatted_address,
                lat: location.lat,
                lng: location.lng
            })
        } else {
            console.warn("Geocoding failed:", data)
            return NextResponse.json({ error: "Geocoding failed", details: data.status }, { status: 404 })
        }
    } catch (error) {
        console.error("Geocoding fetch error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
