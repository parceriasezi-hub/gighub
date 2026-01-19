
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables') // Usually requires a custom function, but let's try querying information_schema if possible? 
    // RLS might block information_schema.

    // Let's try to guess common names
    const candidates = ["subcategories", "sub_categories", "services", "service_categories", "gig_categories"]

    for (const table of candidates) {
        const { count, error } = await supabase.from(table).select("*", { count: 'exact', head: true })
        if (!error) {
            console.log(`Found table: ${table} (count: ${count})`)
            // Inspect columns for this table
            const { data } = await supabase.from(table).select("*").limit(1)
            if (data && data.length > 0) console.log(`  Columns for ${table}:`, Object.keys(data[0]).join(", "))
        } else {
            // console.log(`Table ${table} not found or error: ${error.message}`)
        }
    }
}

listTables()
