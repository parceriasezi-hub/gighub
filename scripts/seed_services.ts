
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

// Sample data structure: Category Name -> Subcategory -> Services
const seedData: Record<string, Record<string, string[]>> = {
    "Construção e Remodelação": {
        "Alvenaria e Estruturas": ["Construção de Muros", "Fundação", "Reboco", "Pequenas Obras"],
        "Pintura": ["Pintura Interior", "Pintura Exterior", "Lacagem", "Tratamento de Humidade"],
        "Eletricidade": ["Instalação Elétrica", "Reparação de Quadros", "Instalação de Tomadas", "Certificação Energética"],
        "Canalização": ["Reparação de Fugas", "Desentupimentos", "Instalação de Louças", "Rede de Águas"],
        "Carpintaria": ["Móveis por Medida", "Montagem de Portas", "Reparação de Soalhos", "Restauro"],
    },
    "Serviços Domésticos": {
        "Limpeza": ["Limpeza Doméstica", "Limpeza Profunda", "Limpeza Pós-Obra", "Limpeza de Estofos"],
        "Têxtil e Roupa": ["Engomadoria", "Costura e Arranjos", "Lavandaria"],
        "Jardinagem": ["Manutenção de Jardins", "Poda", "Sistemas de Rega", "Controlo de Pragas"],
        "Manutenção": ["Pequenos Arranjos", "Montagem de Móveis IKEA", "Instalação de Cortinados"],
    },
    "Eventos e Entretenimento": {
        "Organização": ["Wedding Planning", "Decoração de Festas", "Catering", "Aluguer de Equipamento"],
        "Música e Animação": ["DJ", "Banda ao Vivo", "Animadores Infantis", "Fotografia de Eventos"],
        "Beleza para Eventos": ["Maquilhagem", "Penteados", "Styling"],
    },
    "Saúde e Bem-estar": {
        "Treino Físico": ["Personal Training", "Yoga", "Pilates", "Nutrição"],
        "Massagem e Terapia": ["Fisioterapia", "Massagem de Relaxamento", "Osteopatia"],
        "Cuidados Sénior": ["Apoio Domiciliário", "Companhia", "Auxílio na Higiene"],
    },
    "Tecnologia e Design": {
        "Desenvolvimento": ["Sites e Landing Pages", "Lojas Online", "Apps Mobile", "Manutenção Web"],
        "Design Gráfico": ["Logótipos", "Branding", "Design para Redes Sociais", "Edição de Vídeo"],
        "Suporte Técnico": ["Reparação de Computadores", "Configuração de Redes", "Recuperação de Dados"],
    },
    "Aulas e Formação": {
        "Apoio Escolar": ["Explicações Matemática", "Explicações Português", "Preparação Exames"],
        "Idiomas": ["Inglês", "Espanhol", "Francês", "Alemão"],
        "Arte e Música": ["Aulas de Guitarra", "Aulas de Piano", "Aulas de Pintura"],
    }
}

async function seed() {
    console.log("Starting seed...")

    // 1. Fetch existing categories to resolve IDs
    const { data: categories, error: catError } = await supabase.from("categories").select("id, name")

    if (catError) {
        console.error("Error fetching categories:", catError)
        return
    }

    console.log(`Found ${categories.length} existing categories.`)

    for (const catName of Object.keys(seedData)) {
        // Find matching category (case insensitive-ish)
        const category = categories.find(c => c.name.toLowerCase().includes(catName.toLowerCase()) || catName.toLowerCase().includes(c.name.toLowerCase()))

        if (!category) {
            console.log(`Skipping "${catName}" - No matching Main Category found in database.`)
            continue
        }

        console.log(`Processing "${catName}" (ID: ${category.id})...`)
        const subcats = seedData[catName]

        for (const subcatName of Object.keys(subcats)) {
            // 2. Insert Subcategory
            const slug = subcatName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

            // Check if exists first to avoid duplicate errors if constraints are loose or script re-run
            const { data: existingSub } = await supabase.from("subcategories")
                .select("id")
                .eq("category_id", category.id)
                .eq("slug", slug)
                .single()

            let subcatId = existingSub?.id

            if (!subcatId) {
                const { data: newSub, error: subError } = await supabase.from("subcategories").insert({
                    category_id: category.id,
                    name: subcatName,
                    slug: slug
                }).select("id").single()

                if (subError) {
                    console.error(`  Error creating subcategory "${subcatName}":`, subError.message)
                    continue
                }
                subcatId = newSub.id
                console.log(`  + Created Subcategory: ${subcatName}`)
            } else {
                console.log(`  . Subcategory "${subcatName}" already exists.`)
            }

            // 3. Insert Services
            const serviceNames = subcats[subcatName]
            const servicesToInsert = serviceNames.map(name => ({
                subcategory_id: subcatId,
                name: name,
                description: `Serviço de ${name}`
            }))

            // We use upsert if possible, but basic insert is safer for now without unique constraint on name
            // Let's check existing services for this subcat to avoid dupes
            const { data: existingServices } = await supabase.from("services").select("name").eq("subcategory_id", subcatId)
            const existingNames = new Set(existingServices?.map(s => s.name))

            const newServices = servicesToInsert.filter(s => !existingNames.has(s.name))

            if (newServices.length > 0) {
                const { error: servError } = await supabase.from("services").insert(newServices)
                if (servError) {
                    console.error(`    Error inserting services for "${subcatName}":`, servError.message)
                } else {
                    console.log(`    + Added ${newServices.length} services.`)
                }
            }
        }
    }

    console.log("Seed completed!")
}

seed()
