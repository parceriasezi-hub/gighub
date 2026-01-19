
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to ensure access

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectCategories() {
    console.log("Fetching categories...")
    const { data, error } = await supabase.from("categories").select("*").limit(20)

    if (error) {
        console.error("Error fetching categories:", error)
        return
    }

    console.log("Categories sample:", JSON.stringify(data, null, 2))

    if (data && data.length > 0) {
        console.log("Keys available:", Object.keys(data[0]))
    }
}

inspectCategories()
