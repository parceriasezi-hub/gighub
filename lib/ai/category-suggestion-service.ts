import { GoogleGenerativeAI } from "@google/generative-ai"

export interface CategorySuggestion {
    id: string
    name: string
    path: string // e.g., "AULAS → Idiomas → Inglês"
    confidence: number // 0-1
}

export interface CategoryNode {
    id: string
    name: string
    parent_id: string | null
}

export class CategorySuggestionService {
    private static genAI: GoogleGenerativeAI | null = null

    /**
     * Initialize the Gemini AI client
     */
    private static getAI(): GoogleGenerativeAI {
        if (!this.genAI) {
            const apiKey = process.env.GEMINI_API_KEY
            if (!apiKey) {
                throw new Error("GEMINI_API_KEY is not configured")
            }
            this.genAI = new GoogleGenerativeAI(apiKey)
        }
        return this.genAI
    }

    /**
     * Build category paths from flat list
     */
    private static buildCategoryPaths(categories: CategoryNode[]): Map<string, string> {
        const pathMap = new Map<string, string>()
        const categoryMap = new Map<string, CategoryNode>()

        // Create lookup map
        categories.forEach((cat) => categoryMap.set(cat.id, cat))

        // Build paths
        const getPath = (catId: string): string => {
            const cat = categoryMap.get(catId)
            if (!cat) return ""

            if (!cat.parent_id) {
                return cat.name
            }

            const parentPath = getPath(cat.parent_id)
            return parentPath ? `${parentPath} → ${cat.name}` : cat.name
        }

        categories.forEach((cat) => {
            pathMap.set(cat.id, getPath(cat.id))
        })

        return pathMap
    }

    /**
     * Get leaf node categories (services that providers can offer)
     */
    private static getLeafCategories(
        categories: CategoryNode[]
    ): { id: string; name: string; path: string }[] {
        const categoryMap = new Map<string, CategoryNode>()
        const childrenMap = new Map<string, Set<string>>()

        // Build maps
        categories.forEach((cat) => {
            categoryMap.set(cat.id, cat)
            if (cat.parent_id) {
                if (!childrenMap.has(cat.parent_id)) {
                    childrenMap.set(cat.parent_id, new Set())
                }
                childrenMap.get(cat.parent_id)!.add(cat.id)
            }
        })

        // Find leaf nodes (categories with no children)
        const leafCategories: CategoryNode[] = []
        categories.forEach((cat) => {
            if (!childrenMap.has(cat.id)) {
                leafCategories.push(cat)
            }
        })

        // Build paths
        const pathMap = this.buildCategoryPaths(categories)

        return leafCategories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            path: pathMap.get(cat.id) || cat.name,
        }))
    }

    /**
     * Suggest categories based on title and description using AI
     */
    static async suggestCategories(
        title: string,
        description: string,
        allCategories: CategoryNode[]
    ): Promise<CategorySuggestion[]> {
        try {
            // Get leaf categories only
            const leafCategories = this.getLeafCategories(allCategories)

            if (leafCategories.length === 0) {
                return []
            }

            // Prepare category list for AI
            const categoryList = leafCategories
                .map((cat, idx) => `${idx + 1}. ${cat.path} (ID: ${cat.id})`)
                .join("\n")

            // Create prompt for AI
            const prompt = `You are a service categorization expert for a platform called Gighub. 
Based on the following service request, suggest the top 3-5 most relevant categories from the list below.

IMPORTANT: The service request may be in Portuguese or English. You must match it to the most appropriate category regardless of the input language.

The platform uses a 3-level hierarchy:
1. Categoria Principal (Main Category)
2. Subgrupo (Subgroup)
3. Lista Integral de Serviços (Specific Service)

Service Title: "${title}"
Service Description: "${description}"

Available Categories (formatted as "Main > Subgroup > Service"):
${categoryList}

Please analyze the service request and return ONLY a JSON array of suggestions in this exact format:
[
  {
    "id": "category-uuid",
    "confidence": 0.95
  }
]

Rules:
- Return 3-5 suggestions maximum
- Confidence should be between 0 and 1
- Order by confidence (highest first)
- Only include category IDs that exist in the list above
- If a service fits into a sub-sub-category, prioritize that UUID.
- Return ONLY the JSON array, no other text`

            const genAI = this.getAI()
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' })

            const result = await model.generateContent(prompt)
            const response = await result.response
            const text = response.text()

            // Parse AI response
            let suggestions: { id: string; confidence: number }[] = []

            try {
                // Extract JSON from response (in case AI adds extra text)
                const jsonMatch = text.match(/\[[\s\S]*\]/)
                if (jsonMatch) {
                    suggestions = JSON.parse(jsonMatch[0])
                } else {
                    suggestions = JSON.parse(text)
                }
            } catch (parseError) {
                console.error("Failed to parse AI response:", text)
                return []
            }

            // Validate and enrich suggestions
            const validSuggestions: CategorySuggestion[] = []

            for (const suggestion of suggestions) {
                const category = leafCategories.find((cat) => cat.id === suggestion.id)
                if (category && suggestion.confidence >= 0 && suggestion.confidence <= 1) {
                    validSuggestions.push({
                        id: category.id,
                        name: category.name,
                        path: category.path,
                        confidence: suggestion.confidence,
                    })
                }
            }

            return validSuggestions.slice(0, 5) // Max 5 suggestions
        } catch (error) {
            console.error("Error generating category suggestions:", error)
            // Return empty array on error - don't break the user flow
            return []
        }
    }

    /**
     * Fallback: Simple keyword matching if AI fails
     */
    static async suggestCategoriesKeywordFallback(
        title: string,
        description: string,
        allCategories: CategoryNode[]
    ): Promise<CategorySuggestion[]> {
        const leafCategories = this.getLeafCategories(allCategories)
        const searchText = `${title} ${description}`.toLowerCase()

        const matches = leafCategories
            .map((cat) => {
                const catText = cat.path.toLowerCase()
                let score = 0

                // Simple keyword matching
                const words = searchText.split(/\s+/)
                words.forEach((word) => {
                    if (word.length > 3 && catText.includes(word)) {
                        score += 1
                    }
                })

                return {
                    ...cat,
                    confidence: Math.min(score / 10, 0.8), // Cap at 0.8 for keyword matching
                }
            })
            .filter((cat) => cat.confidence > 0)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5)

        return matches.map((match) => ({
            id: match.id,
            name: match.name,
            path: match.path,
            confidence: match.confidence,
        }))
    }
}
