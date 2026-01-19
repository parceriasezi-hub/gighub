
"use client"

import { useState, useEffect } from "react"
import { Check, ChevronRight, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"

interface ServiceSelectorProps {
    userId: string
    selectedServices: string[] // IDs of selected services
    onServicesChange: (services: string[]) => void
}

interface Category {
    id: string
    name: string
}

interface Subcategory {
    id: string
    category_id: string
    name: string
    slug: string
}

interface Service {
    id: string
    subcategory_id: string
    name: string
    description?: string
}

export function ServiceSelector({ userId, selectedServices, onServicesChange }: ServiceSelectorProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [subcategories, setSubcategories] = useState<Subcategory[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)

    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch all hierarchy data
            const { data: catData } = await supabase.from("categories").select("id, name").order("name")
            const { data: subData } = await supabase.from("subcategories").select("*").order("name")
            const { data: servData } = await supabase.from("services").select("*").order("name")

            if (catData) setCategories(catData)
            if (subData) setSubcategories(subData)
            if (servData) setServices(servData)
        } catch (error) {
            console.error("Error fetching service data:", error)
        } finally {
            setLoading(false)
        }
    }

    // Filter based on hierarchy and search
    const filteredSubcategories = activeCategory
        ? subcategories.filter((s) => s.category_id === activeCategory)
        : []

    const filteredServices = activeSubcategory
        ? services.filter((s) => s.subcategory_id === activeSubcategory)
        : []

    // Global search (if query exists, override hierarchy view for results)
    const searchResults = searchQuery
        ? services.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : []

    const toggleService = (serviceId: string) => {
        if (selectedServices.includes(serviceId)) {
            onServicesChange(selectedServices.filter((id) => id !== serviceId))
        } else {
            onServicesChange([...selectedServices, serviceId])
        }
    }

    const getServiceName = (id: string) => services.find((s) => s.id === id)?.name || id

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[600px] border rounded-lg overflow-hidden md:flex-row">
            {/* Sidebar: Main Categories */}
            <div className="w-full md:w-1/4 border-r bg-muted/30 flex flex-col">
                <div className="p-4 font-semibold border-b">Categorias</div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {categories.map((cat) => (
                            <Button
                                key={cat.id}
                                variant={activeCategory === cat.id ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-between text-sm font-normal",
                                    activeCategory === cat.id && "bg-white shadow-sm font-medium"
                                )}
                                onClick={() => {
                                    setActiveCategory(cat.id)
                                    setActiveSubcategory(null)
                                    setSearchQuery("")
                                }}
                            >
                                <span className="truncate">{cat.name}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Middle: Subcategories */}
            <div className="w-full md:w-1/4 border-r bg-background flex flex-col">
                <div className="p-4 font-semibold border-b text-muted-foreground">Subcategorias</div>
                <ScrollArea className="flex-1">
                    {activeCategory ? (
                        <div className="p-2 space-y-1">
                            {filteredSubcategories.length > 0 ? (
                                filteredSubcategories.map((sub) => (
                                    <Button
                                        key={sub.id}
                                        variant={activeSubcategory === sub.id ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-between text-sm font-normal",
                                            activeSubcategory === sub.id && "bg-muted font-medium"
                                        )}
                                        onClick={() => {
                                            setActiveSubcategory(sub.id)
                                            setSearchQuery("")
                                        }}
                                    >
                                        <span className="truncate">{sub.name}</span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />
                                    </Button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Sem subcategorias disponíveis.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                            Selecione uma categoria
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Right: Services */}
            <div className="w-full md:w-2/4 flex flex-col bg-background">
                <div className="p-4 border-b flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar serviços..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-none shadow-none focus-visible:ring-0 h-8"
                    />
                </div>

                <ScrollArea className="flex-1 p-4">
                    {searchQuery ? (
                        <div className="grid grid-cols-1 gap-2">
                            <h3 className="text-sm font-medium mb-2">Resultados da pesquisa</h3>
                            {searchResults.length > 0 ? (
                                searchResults.map((service) => (
                                    <ServiceItem
                                        key={service.id}
                                        service={service}
                                        isSelected={selectedServices.includes(service.id)}
                                        onToggle={() => toggleService(service.id)}
                                    />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum serviço encontrado.</p>
                            )}
                        </div>
                    ) : activeSubcategory ? (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium mb-2">
                                {subcategories.find(s => s.id === activeSubcategory)?.name}
                            </h3>
                            {filteredServices.length > 0 ? (
                                filteredServices.map((service) => (
                                    <ServiceItem
                                        key={service.id}
                                        service={service}
                                        isSelected={selectedServices.includes(service.id)}
                                        onToggle={() => toggleService(service.id)}
                                    />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum serviço disponível nesta subcategoria.</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            Selecione uma subcategoria ou pesquise acima.
                        </div>
                    )}
                </ScrollArea>

                {/* Footer: Selection Summary */}
                <div className="p-3 border-t bg-muted/20 min-h-[60px]">
                    <div className="flex flex-wrap gap-2">
                        {selectedServices.length === 0 && (
                            <span className="text-sm text-muted-foreground flex items-center h-8">
                                Nenhum serviço selecionado.
                            </span>
                        )}
                        {selectedServices.map(id => (
                            <Badge key={id} variant="secondary" className="pr-1">
                                {getServiceName(id)}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 ml-1 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground rounded-full"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleService(id)
                                    }}
                                >
                                    &times;
                                </Button>
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ServiceItem({ service, isSelected, onToggle }: { service: Service; isSelected: boolean; onToggle: () => void }) {
    return (
        <div
            onClick={onToggle}
            className={cn(
                "flex items-start p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
            )}
        >
            <div className={cn(
                "h-5 w-5 rounded border border-primary mr-3 flex items-center justify-center flex-shrink-0 mt-0.5",
                isSelected ? "bg-primary text-primary-foreground" : "bg-transparent"
            )}>
                {isSelected && <Check className="h-3 w-3" />}
            </div>
            <div>
                <p className="text-sm font-medium leading-none">{service.name}</p>
                {service.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                )}
            </div>
        </div>
    )
}
