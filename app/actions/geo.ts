"use server"

export async function geocode(params: { lat?: number; lng?: number; address?: string }) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
        console.error("❌ Google Maps API Key is missing in environment variables")
        return { error: "API Key missing" }
    }

    try {
        let url = ""
        if (params.lat !== undefined && params.lng !== undefined) {
            // Reverse Geocoding
            url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${params.lat},${params.lng}&key=${apiKey}`
            console.log("📍 Reverse geocoding requested for:", params.lat, params.lng)
        } else if (params.address) {
            // Forward Geocoding
            url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(params.address)}&key=${apiKey}`
            console.log("📍 Forward geocoding requested for:", params.address)
        } else {
            console.error("❌ Invalid geocode parameters:", params)
            return { error: "Invalid parameters" }
        }

        const response = await fetch(url)
        const data = await response.json()

        if (data.status === "OK" && data.results && data.results.length > 0) {
            const result = data.results[0]
            return {
                address: result.formatted_address,
                lat: result.geometry.location.lat,
                lng: result.geometry.location.lng,
            }
        } else {
            console.warn("⚠️ Geocoding API returned status:", data.status, data.error_message)
            return { error: data.status, message: data.error_message }
        }
    } catch (error) {
        console.error("❌ Geocoding error:", error)
        return { error: "Fetch failed" }
    }
}
