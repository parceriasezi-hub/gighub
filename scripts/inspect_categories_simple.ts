
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectCategories() {
    const { data, error } = await supabase.from("categories").select("*").limit(5)

    if (error) {
        console.error("Error fetching categories:", error)
        return
    }

    console.log("Found " + data.length + " categories")
    if (data.length > 0) {
        console.log("Sample category:", data[0])
        // Check for parent_id or similar fields to determine hierarchy
        const keys = Object.keys(data[0])
        console.log("All columns:", keys)
    }
}

inspectCategories()
