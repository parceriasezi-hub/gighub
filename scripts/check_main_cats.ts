
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function checkMainCategories() {
    const targetNames = ["AULAS", "CASA", "BEM-ESTAR", "EMPRESAS", "EVENTOS", "OUTROS"]
    // Also check title case or lowercase variants just in case
    const variants = targetNames.flatMap(n => [n, n.toLowerCase(), n.charAt(0) + n.slice(1).toLowerCase()])

    console.log("Checking for categories:", targetNames)

    const { data: categories, error } = await supabase
        .from("categories")
        .select("id, name, slug")

    if (error) {
        console.error("Error fetching categories:", error)
        return
    }

    const found = categories.filter(c =>
        targetNames.includes(c.name.toUpperCase()) ||
        targetNames.some(t => c.name.toUpperCase().includes(t))
    )

    console.log(`\nFound ${found.length} matching categories:`)
    found.forEach(c => console.log(`- [${c.id}] ${c.name} (${c.slug})`))

    console.log("\nComplete Category List for Reference:")
    categories.forEach(c => console.log(`- ${c.name}`))
}

checkMainCategories()
