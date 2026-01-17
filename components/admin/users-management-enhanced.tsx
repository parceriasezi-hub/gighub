"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Users, Search, Edit, Trash2, Plus, Mail, Phone, MapPin, Calendar, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { deleteAdminUser } from "@/app/actions/admin"

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  phone: string | null
  location: string | null
  plan: string
  responses_used: number
  responses_reset_date: string
  created_at: string
  updated_at: string | null
  bio: string | null
}

export function UsersManagementEnhanced() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      console.log("🔍 Buscando todos os perfis...")

      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Erro ao buscar perfis:", error)
        toast({
          title: "Erro ao carregar utilizadores",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      console.log("✅ Perfis carregados:", data?.length || 0)
      setProfiles(data || [])
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível carregar os utilizadores",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (profileId: string, updates: Partial<Profile>) => {
    try {
      const { error } = await supabase.from("profiles").update(updates).eq("id", profileId)

      if (error) {
        console.error("❌ Erro ao atualizar perfil:", error)
        toast({
          title: "Erro ao atualizar utilizador",
          description: error.message,
          variant: "destructive",
        })
        return false
      }

      toast({
        title: "Utilizador atualizado",
        description: "As alterações foram guardadas com sucesso",
      })

      await fetchProfiles()
      return true
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível atualizar o utilizador",
        variant: "destructive",
      })
      return false
    }
  }

  const deleteProfile = async (profileId: string) => {
    if (!confirm("Tem a certeza que deseja eliminar este utilizador?")) {
      return
    }

    try {
      const { error } = await deleteAdminUser(profileId)

      if (error) {
        console.error("❌ Erro ao eliminar perfil:", error)
        toast({
          title: "Erro ao eliminar utilizador",
          description: error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Utilizador eliminado",
        description: "O utilizador foi removido com sucesso",
      })

      await fetchProfiles()
    } catch (err) {
      console.error("❌ Erro inesperado:", err)
      toast({
        title: "Erro inesperado",
        description: "Não foi possível eliminar o utilizador",
        variant: "destructive",
      })
    }
  }

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === "all" || profile.role === roleFilter
    const matchesPlan = planFilter === "all" || profile.plan === planFilter

    return matchesSearch && matchesRole && matchesPlan
  })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200"
      case "user":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "provider":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "free":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "essential":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "pro":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "unlimited":
        return "bg-gold-100 text-gold-800 border-gold-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-gray-500">Carregando utilizadores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Utilizadores</h1>
          <p className="text-gray-500 mt-2">Gerencie todos os utilizadores da plataforma ({profiles.length} total)</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Utilizador
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Pesquisar</Label>
              <Input
                id="search"
                placeholder="Email, nome ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role-filter">Filtrar por Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="plan-filter">Filtrar por Plano</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os planos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="essential">Essential</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Utilizadores */}
      <div className="grid gap-4">
        {filteredProfiles.map((profile) => (
          <Card key={profile.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{profile.full_name || "Nome não definido"}</h3>
                      <Badge className={getRoleBadgeColor(profile.role)}>{profile.role}</Badge>
                      <Badge className={getPlanBadgeColor(profile.plan)}>{profile.plan}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {profile.email}
                      </div>
                      {profile.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {profile.phone}
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {profile.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(profile.created_at).toLocaleDateString("pt-PT")}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Respostas utilizadas:</span> {profile.responses_used}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProfile(profile)
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteProfile(profile.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProfiles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum utilizador encontrado</h3>
            <p className="text-gray-500">Tente ajustar os filtros ou criar um novo utilizador.</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Utilizador</DialogTitle>
            <DialogDescription>Altere as informações do utilizador selecionado.</DialogDescription>
          </DialogHeader>
          {selectedProfile && (
            <EditProfileForm
              profile={selectedProfile}
              onSave={async (updates) => {
                const success = await updateProfile(selectedProfile.id, updates)
                if (success) {
                  setIsEditDialogOpen(false)
                  setSelectedProfile(null)
                }
              }}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setSelectedProfile(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface EditProfileFormProps {
  profile: Profile
  onSave: (updates: Partial<Profile>) => Promise<void>
  onCancel: () => void
}

function EditProfileForm({ profile, onSave, onCancel }: EditProfileFormProps) {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || "",
    role: profile.role,
    phone: profile.phone || "",
    location: profile.location || "",
    plan: profile.plan,
    bio: profile.bio || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      ...formData,
      updated_at: new Date().toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="full_name">Nome Completo</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="provider">Provider</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="location">Localização</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="plan">Plano</Label>
        <Select value={formData.plan} onValueChange={(value) => setFormData({ ...formData, plan: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="essential">Essential</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="unlimited">Unlimited</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="bio">Biografia</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar Alterações</Button>
      </div>
    </form>
  )
}
