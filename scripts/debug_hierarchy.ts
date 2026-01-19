
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function debugHierarchy() {
    console.log("--- Debugging Hierarchy ---")

    // 1. Get all categories
    const { data: categories } = await supabase.from("categories").select("id, name")
    if (!categories) return

    // 2. Get all subcategories
    const { data: subcategories } = await supabase.from("subcategories").select("id, name, category_id")
    if (!subcategories) return

    console.log(`Total Categories: ${categories.length}`)
    console.log(`Total Subcategories: ${subcategories.length}`)

    // 3. Check which categories have subcategories
    const parentIds = new Set(subcategories.map(s => s.category_id))

    const parents = categories.filter(c => parentIds.has(c.id))
    const orphans = categories.filter(c => !parentIds.has(c.id))

    console.log(`\n--- Main Categories (Should appear in Col 1) [Count: ${parents.length}] ---`)
    parents.forEach(p => {
        const subs = subcategories.filter(s => s.category_id === p.id)
        console.log(`[${p.name}] has ${subs.length} subcategories:`)
        subs.forEach(s => console.log(`  - ${s.name}`))
    })

    console.log(`\n--- Orphan Categories (Should be HIDDEN) [Count: ${orphans.length}] ---`)
    // Show first 10 orphans
    orphans.slice(0, 10).forEach(o => console.log(`[${o.name}]`))
    if (orphans.length > 10) console.log(`... and ${orphans.length - 10} more.`)

}

debugHierarchy()
