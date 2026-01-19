"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import { AlertCircle, CheckCircle, Loader2, User, Briefcase, FileText, Star, Plus, X, Upload, Trash2, Check } from "lucide-react"
import type { Database } from "@/lib/supabase/database.types"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"

// Use any for complex Supabase types to avoid deep nesting issues during rapid dev
type Category = any // Database["public"]["Tables"]["categories"]["Row"]

interface FormData {
  bio: string
  website: string
  phone: string
  experienceYears: number
  hourlyRate: number
  availability: string
  location: string
}

interface Specialty {
  name: string
  level: "beginner" | "intermediate" | "advanced" | "expert"
  years: number
}

interface PortfolioItem {
  title: string
  description: string
  imageUrl: string
  projectUrl: string
  technologies: string[]
  completionDate: string
  clientName: string
}

export function EnhancedProviderOnboarding() {
  const { user, profile, updateProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    bio: "",
    website: "",
    phone: "",
    experienceYears: 0,
    hourlyRate: 0,
    availability: "available",
    location: "",
  })
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [documents, setDocuments] = useState<{
    id: File | null
    address: File | null
    others: File[]
  }>({
    id: null,
    address: null,
    others: [],
  })

  const totalSteps = 6
  const progress = (currentStep / totalSteps) * 100

  useEffect(() => {
    loadInitialData()
  }, [user?.id])

  const loadInitialData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Carregar categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .order("name")

      if (categoriesError) {
        console.error("Erro ao carregar categorias:", categoriesError)
      } else {
        setCategories(categoriesData || [])
      }

      // Carregar dados existentes se já for prestador
      if (profile?.is_provider) {
        setFormData({
          bio: profile.provider_bio || "",
          website: profile.provider_website || "",
          phone: profile.provider_phone || "",
          experienceYears: profile.provider_experience_years || 0,
          hourlyRate: profile.provider_hourly_rate || 0,
          availability: profile.provider_availability || "available",
          location: profile.location || "",
        })

        // Carregar especialidades existentes
        const { data: specialtiesData } = await supabase
          .from("provider_specialties")
          .select("*")
          .eq("provider_id", user.id)

        if (specialtiesData) {
          setSpecialties(
            specialtiesData.map((s) => ({
              name: s.specialty_name,
              level: s.experience_level as any,
              years: s.years_experience,
            })),
          )
        }

        // Carregar portfolio existente
        const { data: portfolioData } = await supabase.from("portfolio_items").select("*").eq("provider_id", user.id)

        if (portfolioData) {
          setPortfolio(
            portfolioData.map((p) => ({
              title: p.title,
              description: p.description || "",
              imageUrl: p.image_url || "",
              projectUrl: p.project_url || "",
              technologies: p.technologies || [],
              completionDate: p.completion_date || "",
              clientName: p.client_name || "",
            })),
          )
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addSpecialty = () => {
    setSpecialties([...specialties, { name: "", level: "intermediate", years: 0 }])
  }

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index))
  }

  const updateSpecialty = (index: number, field: keyof Specialty, value: any) => {
    const updated = [...specialties]
    updated[index] = { ...updated[index], [field]: value }
    setSpecialties(updated)
  }

  const addPortfolioItem = () => {
    setPortfolio([
      ...portfolio,
      {
        title: "",
        description: "",
        imageUrl: "",
        projectUrl: "",
        technologies: [],
        completionDate: "",
        clientName: "",
      },
    ])
  }

  const removePortfolioItem = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index))
  }

  const updatePortfolioItem = (index: number, field: keyof PortfolioItem, value: any) => {
    const updated = [...portfolio]
    updated[index] = { ...updated[index], [field]: value }
    setPortfolio(updated)
  }

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    })
    if (error) throw error
    return data.path
  }

  const handleSubmit = async () => {
    if (!user?.id) return

    try {
      setSubmitting(true)

      // 1. Atualizar perfil
      const profileUpdate = {
        is_provider: true,
        provider_status: "pending",
        provider_bio: formData.bio,
        provider_website: formData.website,
        provider_phone: formData.phone,
        provider_experience_years: formData.experienceYears,
        provider_hourly_rate: formData.hourlyRate,
        provider_availability: formData.availability,
        provider_application_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        bio: formData.bio,
        website: formData.website,
        phone: formData.phone,
        location: formData.location,
        hourly_rate: formData.hourlyRate,
      }

      await updateProfile(profileUpdate)

      // 2. Salvar categorias
      await supabase.from("provider_categories").delete().eq("provider_id", user.id)

      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map((categoryId) => ({
          provider_id: user.id,
          category_id: categoryId,
        }))
        await supabase.from("provider_categories").insert(categoryInserts)
      }

      // 3. Salvar especialidades
      await supabase.from("provider_specialties").delete().eq("provider_id", user.id)

      if (specialties.length > 0) {
        const specialtyInserts = specialties.map((specialty) => ({
          provider_id: user.id,
          specialty_name: specialty.name,
          experience_level: specialty.level,
          years_experience: specialty.years,
        }))
        await supabase.from("provider_specialties").insert(specialtyInserts as any)
      }

      // 4. Salvar portfolio
      await supabase.from("portfolio_items").delete().eq("provider_id", user.id)

      if (portfolio.length > 0) {
        const portfolioInserts = portfolio.map((item) => ({
          provider_id: user.id,
          title: item.title,
          description: item.description,
          image_url: item.imageUrl,
          project_url: item.projectUrl,
          technologies: item.technologies,
          completion_date: item.completionDate || null,
          client_name: item.clientName,
        }))
        await supabase.from("portfolio_items").insert(portfolioInserts as any)
      }

      // 5. Salvar documentos
      const docInserts: any[] = []

      if (documents.id) {
        const path = `providers/${user.id}/id_${Date.now()}_${documents.id.name}`
        const url = await uploadFile(documents.id, "documents", path)
        docInserts.push({
          provider_id: user.id,
          document_type: "id",
          document_name: documents.id.name,
          document_url: url,
          status: "pending"
        })
      }

      if (documents.address) {
        const path = `providers/${user.id}/address_${Date.now()}_${documents.address.name}`
        const url = await uploadFile(documents.address, "documents", path)
        docInserts.push({
          provider_id: user.id,
          document_type: "address",
          document_name: documents.address.name,
          document_url: url,
          status: "pending"
        })
      }

      for (const file of documents.others) {
        const path = `providers/${user.id}/other_${Date.now()}_${file.name}`
        const url = await uploadFile(file, "documents", path)
        docInserts.push({
          provider_id: user.id,
          document_type: "other",
          document_name: file.name,
          document_url: url,
          status: "pending"
        })
      }

      if (docInserts.length > 0) {
        await supabase.from("provider_documents").delete().eq("provider_id", user.id)
        await supabase.from("provider_documents").insert(docInserts as any)
      }

      // 6. Inicializar stats
      // @ts-ignore - RPC arguments might be inferred incorrectly
      await supabase.rpc("initialize_provider_stats", { provider_uuid: user.id })

      toast({
        title: "Candidatura enviada!",
        description: "Sua candidatura foi enviada para análise. Receberá uma notificação quando for aprovada.",
        variant: "default",
      })

      router.push("/dashboard/provider")
    } catch (error: any) {
      console.error("Erro ao enviar candidatura:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a candidatura",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  // Check for status
  const providerStatus = profile?.provider_status

  if (!loading && providerStatus === 'pending') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="text-center">
            <div className="mx-auto bg-yellow-100 p-3 rounded-full mb-4 w-fit">
              <Loader2 className="h-8 w-8 text-yellow-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl">Candidatura em Análise</CardTitle>
            <CardDescription className="text-lg">
              A sua candidatura para ser prestador está a ser analisada pela nossa equipa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Este processo geralmente demora 24-48 horas. Receberá uma notificação assim que a sua conta for aprovada.
            </p>
            <div className="bg-muted p-4 rounded-lg text-sm text-left">
              <h4 className="font-semibold mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                O que acontece agora?
              </h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>A nossa equipa verifica os seus documentos de identidade</li>
                <li>Analisamos o seu perfil e experiência</li>
                <li>Confirmamos a validade dos seus dados de contacto</li>
              </ul>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Voltar ao Painel de Cliente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">Torne-se um Prestador GigHub</h1>
        {providerStatus === 'rejected' && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 max-w-2xl mx-auto flex items-start text-left">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Candidatura Anterior Recusada</p>
              <p className="text-sm mt-1">{profile?.provider_rejection_reason || "Revise suas informações e tente novamente."}</p>
            </div>
          </div>
        )}
        <p className="text-gray-600 mt-2">Complete o seu perfil para começar a receber gigs</p>
        <div className="mt-4">
          <Progress value={progress} className="w-full max-w-md mx-auto" />
          <p className="text-sm text-gray-500 mt-2">
            Passo {currentStep} de {totalSteps}
          </p>
        </div>
      </div>

      {/* Step 1: Informações Básicas */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Informações Básicas
            </CardTitle>
            <CardDescription>Conte-nos sobre você e sua experiência profissional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Biografia Profissional *</Label>
              <Textarea
                id="bio"
                placeholder="Descreva sua experiência, habilidades e serviços oferecidos..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={5}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+351 912 345 678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização *</Label>
                <AddressAutocomplete
                  id="location"
                  placeholder="Sua cidade/região (ex: Lisboa, Porto)"
                  value={formData.location}
                  onChange={(value) => setFormData({ ...formData, location: value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website (opcional)</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://seusite.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleNext} disabled={!formData.bio || !formData.phone}>
              Próximo
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Categorias */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5" />
              Categorias de Serviço
            </CardTitle>
            <CardDescription>Selecione as categorias em que oferece serviços</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCategories([...selectedCategories, category.id])
                      } else {
                        setSelectedCategories(selectedCategories.filter((id) => id !== category.id))
                      }
                    }}
                  />
                  <Label htmlFor={`category-${category.id}`} className="text-sm">
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
            {selectedCategories.length === 0 && (
              <p className="text-amber-600 text-sm mt-4 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                Selecione pelo menos uma categoria
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious}>
              Anterior
            </Button>
            <Button onClick={handleNext} disabled={selectedCategories.length === 0}>
              Próximo
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Especialidades */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="mr-2 h-5 w-5" />
              Especialidades
            </CardTitle>
            <CardDescription>Detalhe suas especialidades e nível de experiência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {specialties.map((specialty, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Especialidade {index + 1}</h4>
                  <Button variant="ghost" size="sm" onClick={() => removeSpecialty(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Nome da Especialidade</Label>
                    <Input
                      placeholder="Ex: Desenvolvimento Web"
                      value={specialty.name}
                      onChange={(e) => updateSpecialty(index, "name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nível de Experiência</Label>
                    <Select value={specialty.level} onValueChange={(value) => updateSpecialty(index, "level", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Iniciante</SelectItem>
                        <SelectItem value="intermediate">Intermediário</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                        <SelectItem value="expert">Especialista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Anos de Experiência</Label>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={specialty.years}
                      onChange={(e) => updateSpecialty(index, "years", Number.parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addSpecialty} className="w-full bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Especialidade
            </Button>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious}>
              Anterior
            </Button>
            <Button onClick={handleNext}>Próximo</Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Portfolio */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Portfolio (Opcional)
            </CardTitle>
            <CardDescription>Mostre exemplos do seu trabalho para atrair mais clientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {portfolio.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Projeto {index + 1}</h4>
                  <Button variant="ghost" size="sm" onClick={() => removePortfolioItem(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título do Projeto</Label>
                    <Input
                      placeholder="Nome do projeto"
                      value={item.title}
                      onChange={(e) => updatePortfolioItem(index, "title", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Input
                      placeholder="Nome do cliente (opcional)"
                      value={item.clientName}
                      onChange={(e) => updatePortfolioItem(index, "clientName", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descreva o projeto e seu papel..."
                    value={item.description}
                    onChange={(e) => updatePortfolioItem(index, "description", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>URL da Imagem</Label>
                    <Input
                      type="url"
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={item.imageUrl}
                      onChange={(e) => updatePortfolioItem(index, "imageUrl", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>URL do Projeto</Label>
                    <Input
                      type="url"
                      placeholder="https://projeto.com"
                      value={item.projectUrl}
                      onChange={(e) => updatePortfolioItem(index, "projectUrl", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tecnologias (separadas por vírgula)</Label>
                    <Input
                      placeholder="React, Node.js, PostgreSQL"
                      value={item.technologies.join(", ")}
                      onChange={(e) =>
                        updatePortfolioItem(
                          index,
                          "technologies",
                          e.target.value.split(",").map((t) => t.trim()),
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Conclusão</Label>
                    <Input
                      type="date"
                      value={item.completionDate}
                      onChange={(e) => updatePortfolioItem(index, "completionDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addPortfolioItem} className="w-full bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Projeto ao Portfolio
            </Button>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious}>
              Anterior
            </Button>
            <Button onClick={handleNext}>Próximo</Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 5: Documentos */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Documentos
            </CardTitle>
            <CardDescription>Envie os documentos necessários para verificação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Documentação Obrigatória</h3>
              <p className="text-sm text-muted-foreground">
                Para validar a sua conta como prestador, necessitamos de alguns documentos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={!documents.id ? "border-dashed" : "border-primary"}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Documento de Identidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed rounded-lg">
                    {documents.id ? (
                      <div className="text-center">
                        <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">{documents.id.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-destructive"
                          onClick={() => setDocuments({ ...documents, id: null })}
                        >
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground text-center">
                          Clique para enviar CC ou Passaporte
                        </p>
                        <input
                          type="file"
                          className="hidden"
                          id="id-upload"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) setDocuments({ ...documents, id: file })
                          }}
                        />
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <label htmlFor="id-upload">Selecionar Ficheiro</label>
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={!documents.address ? "border-dashed" : "border-primary"}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Comprovativo de Morada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed rounded-lg">
                    {documents.address ? (
                      <div className="text-center">
                        <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">{documents.address.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-destructive"
                          onClick={() => setDocuments({ ...documents, address: null })}
                        >
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground text-center">
                          Fatura ou documento oficial recente
                        </p>
                        <input
                          type="file"
                          className="hidden"
                          id="address-upload"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) setDocuments({ ...documents, address: file })
                          }}
                        />
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <label htmlFor="address-upload">Selecionar Ficheiro</label>
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Outros Documentos (Certificados, Seguros, etc.)</h4>
              <div className="space-y-3">
                {documents.others.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newOthers = [...documents.others]
                        newOthers.splice(index, 1)
                        setDocuments({ ...documents, others: newOthers })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-center p-4 border-2 border-dashed rounded-lg">
                  <input
                    type="file"
                    className="hidden"
                    id="other-upload"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setDocuments({ ...documents, others: [...documents.others, ...files] })
                    }}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <label htmlFor="other-upload">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Documento
                    </label>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious}>
              Anterior
            </Button>
            <Button onClick={handleNext}>Próximo</Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 6: Revisão e Submissão */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5" />
              Revisão e Submissão
            </CardTitle>
            <CardDescription>Revise suas informações antes de enviar a candidatura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumo das informações */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Informações Básicas</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                  <p>
                    <strong>Biografia:</strong> {formData.bio.substring(0, 100)}...
                  </p>
                  <p>
                    <strong>Telefone:</strong> {formData.phone}
                  </p>
                  <p>
                    <strong>Experiência:</strong> {formData.experienceYears} anos
                  </p>
                  <p>
                    <strong>Taxa Horária:</strong> {formData.hourlyRate}€/hora
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Categorias Selecionadas</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((categoryId) => {
                    const category = categories.find((c) => c.id === categoryId)
                    return (
                      <Badge key={categoryId} variant="outline">
                        {category?.name}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Especialidades ({specialties.length})</h4>
                <div className="space-y-2">
                  {specialties.map((specialty, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded">
                      <span className="font-medium">{specialty.name}</span> -
                      <span className="text-sm text-gray-600 ml-1">
                        {specialty.level} ({specialty.years} anos)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Portfolio ({portfolio.length} projetos)</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {portfolio.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.description.substring(0, 80)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Próximos Passos</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Após enviar sua candidatura, nossa equipe irá analisá-la em até 48 horas. Você receberá uma
                    notificação por email quando sua conta for aprovada.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious}>
              Anterior
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="min-w-[120px]">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Candidatura"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
