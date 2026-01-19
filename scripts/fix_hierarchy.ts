
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

// User-defined Main Categories
const MAIN_CATEGORIES = ["AULAS", "CASA", "BEM-ESTAR", "EMPRESAS", "EVENTOS", "OUTROS"]

// Data Mapping (Old Logic mapped to New Categories)
const hierarchyData: Record<string, Record<string, string[]>> = {
    "CASA": {
        "Construção": ["Alvenaria", "Pintura", "Carpintaria", "Telhados", "Isolamento"],
        "Instalações Técnicas": ["Eletricidade", "Canalização", "Climatização (AVAC)", "Energia Solar"],
        "Limpeza": ["Limpeza Doméstica", "Limpeza Pós-Obra", "Limpeza de Estofos", "Vidros"],
        "Jardim e Exterior": ["Jardinagem", "Piscinas", "Vedações", "Pavimentos Exteriores"],
        "Decoração": ["Design de Interiores", "Home Staging", "Montagem de Móveis"]
    },
    "BEM-ESTAR": {
        "Fitness": ["Personal Trainer", "Yoga", "Pilates", "Artes Marciais"],
        "Saúde": ["Fisioterapia", "Nutrição", "Psicologia", "Enfermagem Domiciliária"],
        "Estética": ["Cabeleireiro", "Manicure/Pedicure", "Maquilhagem", "Depilação"]
    },
    "EVENTOS": {
        "Organização": ["Wedding Planner", "Gestão de Eventos", "Catering", "Decoração"],
        "Animação": ["DJ", "Música ao Vivo", "Fotografia", "Vídeo", "Animadores Infantis"]
    },
    "AULAS": {
        "Escolar": ["Matemática", "Português", "Inglês", "Física e Química"],
        "Artes": ["Música (Instrumentos)", "Pintura", "Dança", "Teatro"],
        "Técnicas": ["Informática", "Culinária", "Costura"]
    },
    "EMPRESAS": {
        "Marketing": ["Gestão de Redes Sociais", "SEO", "Publicidade Online", "Design Gráfico"],
        "Tecnologia": ["Desenvolvimento Web", "Suporte TI", "Cibersegurança", "Automação"],
        "Consultoria": ["Contabilidade", "Jurídico", "Recursos Humanos", "Tradução"]
    },
    "OUTROS": {
        "Animais": ["Dog Walking", "Pet Sitting", "Treino Animal"],
        "Transportes": ["Mudanças", "Entregas", "Transporte de Passageiros"],
        "Diversos": ["Outros Serviços"]
    }
}

async function fixHierarchy() {
    console.log("Starting Hierarchy Fix...")

    for (const catName of MAIN_CATEGORIES) {
        console.log(`Processing Main Category: ${catName}`)

        // 1. Check or Create Main Category
        // Try to find by exact name or slug
        const slug = catName.toLowerCase()

        let { data: category } = await supabase
            .from("categories")
            .select("id")
            .ilike("name", catName) // Case insensitive match
            .single()

        if (!category) {
            console.log(`  - Creating category "${catName}"...`)
            const { data: newCat, error } = await supabase
                .from("categories")
                .insert({ name: catName, slug: slug })
                .select("id")
                .single()

            if (error) {
                console.error(`  Error creating category ${catName}:`, error.message)
                continue
            }
            category = newCat
        } else {
            console.log(`  - Found existing category.`)
        }

        if (!category) continue // Should not happen

        // 2. Process Subcategories
        const subcats = hierarchyData[catName]
        if (!subcats) {
            console.log(`  No subcategories defined for ${catName}`)
            continue
        }

        for (const [subName, services] of Object.entries(subcats)) {
            const subSlug = subName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

            // Upsert Subcategory
            let { data: subcategory } = await supabase
                .from("subcategories")
                .select("id")
                .eq("category_id", category.id)
                .eq("slug", subSlug)
                .single()

            if (!subcategory) {
                const { data: newSub, error } = await supabase
                    .from("subcategories")
                    .insert({
                        category_id: category.id,
                        name: subName,
                        slug: subSlug
                    })
                    .select("id")
                    .single()

                if (error) {
                    console.error(`    Error creating subcategory ${subName}:`, error.message)
                    continue
                }
                subcategory = newSub
                console.log(`    + Created Subcategory: ${subName}`)
            }

            if (!subcategory) continue

            // 3. Process Services
            for (const servName of services) {
                // Simple check to avoid duplicates for now (expensive loop but safe)
                const { data: existing } = await supabase
                    .from("services")
                    .select("id")
                    .eq("subcategory_id", subcategory.id)
                    .eq("name", servName)
                    .single()

                if (!existing) {
                    await supabase.from("services").insert({
                        subcategory_id: subcategory.id,
                        name: servName,
                        description: `${servName} - ${subName}`
                    })
                    //   console.log(`      + Added Service: ${servName}`)
                }
            }
            console.log(`    > Processed ${services.length} services for ${subName}`)
        }
    }

    console.log("Hierarchy Fix Completed!")
}

fixHierarchy()
