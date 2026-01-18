"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Edit, Trash2, Search, Users, Shield, User, Eye, Plus, Loader2 } from "lucide-react"
import type { Database } from "@/lib/supabase/database.types"
import { useRouter } from "next/navigation"
import { createAdminUser, updateAdminUser, deleteAdminUser } from "@/app/actions/admin"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export function UsersManagement() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "",
    plan: "",
    permissions: [] as string[],
  })
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [addForm, setAddForm] = useState({
    full_name: "",
    email: "",
    password: "",
    permissions: [] as string[],
  })
  const [isSaving, setIsSaving] = useState(false)

  const { user: currentUser, hasPermission } = useAuth()
  const canManageAdmins = hasPermission("manage_admins") || hasPermission("super_admin")

  const AVAILABLE_PERMISSIONS = [
    { id: "super_admin", label: "Super Admin (Acesso Total)", description: "Permissão total do sistema" },
    { id: "manage_admins", label: "Gerir Administradores", description: "Pode criar e editar outros administradores" },
    { id: "manage_settings", label: "Gerir Definições", description: "Pode alterar definições da plataforma" },
    { id: "manage_integrations", label: "Gerir Integrações", description: "Configuração Firebase, API e chaves externas" },
    { id: "manage_users", label: "Gerir Utilizadores", description: "Pode suspender ou editar perfis de utilizadores" },
    { id: "manage_payments", label: "Gerir Pagamentos", description: "Ver transações e gerir faturas/planos" },
    { id: "manage_content", label: "Gerir Conteúdo", description: "Moderador de gigs e respostas" },
    { id: "manage_cms", label: "Gerir CMS", description: "Editar páginas, menus e secções institucionais" },
    { id: "manage_reports", label: "Gerir Denúncias", description: "Resolver alertas de moderação e abusos" },
    { id: "manage_support", label: "Gerir Suporte", description: "Responder a feedback e pedidos de ajuda" },
    { id: "view_analytics", label: "Ver Estatísticas", description: "Acesso a relatórios e análise de performance" },
  ]
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      console.log("🔍 Admin: Fetching ALL users...")
      setLoading(true)

      // CRITICAL FIX: Query to fetch ALL users
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Admin: Error fetching users:", error)

        // Detailed error log for debugging
        console.error("❌ Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })

        toast({
          title: "Erro ao carregar utilizadores",
          description: `Erro: ${error.message}. Verifique se tem permissões de administrador.`,
          variant: "destructive",
        })
        return
      }

      console.log(`✅ Admin: ${data?.length || 0} users loaded`)

      setUsers(data || [])

      // Additional check for debugging
      if (!data || data.length === 0) {
        console.warn("⚠️ Admin: No users found. Possible RLS issue.")
        toast({
          title: "Aviso",
          description: "Nenhum utilizador encontrado. Verifique as políticas de segurança.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("❌ Admin: Unexpected error:", err)
      toast({
        title: "Erro inesperado",
        description: "Erro inesperado ao carregar utilizadores. Verifique a consola para detalhes.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: Profile) => {
    console.log("✏️ Admin: Editing user:", user.email)
    setEditingUser(user)
    setEditForm({
      full_name: user.full_name || "",
      role: user.role || "user",
      plan: user.plan || "free",
      permissions: (user.permissions as string[]) || [],
    })
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      console.log("💾 Admin: Saving user changes:", editingUser.email)
      setIsSaving(true)

      const result = await updateAdminUser(editingUser.id, {
        full_name: editForm.full_name,
        role: editForm.role as any,
        plan: editForm.plan as any,
        permissions: editForm.permissions,
        executorId: currentUser?.id, // Pass admin ID
        emailForLog: editingUser.email // Pass email for logging context
      })

      if (result.error) {
        console.error("❌ Admin: Error updating user:", result.error)
        toast({
          title: "Erro",
          description: `Não foi possível atualizar o utilizador: ${result.error}`,
          variant: "destructive",
        })
        return
      }

      console.log("✅ Admin: User updated successfully")
      // Server logs automatically now

      toast({
        title: "Sucesso",
        description: "Utilizador atualizado com sucesso.",
      })

      setEditingUser(null)
      fetchUsers() // Reload list
    } catch (err) {
      console.error("❌ Admin: Unexpected error:", err)
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar utilizador.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddUser = async () => {
    if (!addForm.email || !addForm.full_name) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor preencha o nome completo e email.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const result = await createAdminUser({
        ...addForm,
        executorId: currentUser?.id // Pass current admin ID for logging
      })

      if (result.error) {
        toast({
          title: "Erro ao criar utilizador",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Sucesso",
        description: "Utilizador criado com sucesso!",
      })
      // Server logs automatically now

      setIsAddingUser(false)
      setAddForm({
        full_name: "",
        email: "",
        password: "",
        permissions: [],
      })
      fetchUsers()
    } catch (err) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao criar o utilizador.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    try {
      console.log("🗑️ Admin: Deleting user:", userEmail)

      // Pass executor params
      const result = await deleteAdminUser(userId, currentUser?.id, userEmail)

      if (!result) {
        throw new Error("Não foi obtida resposta do servidor.")
      }

      if (result.error) {
        console.error("❌ Admin: Error deleting user:", result.error)
        toast({
          title: "Erro",
          description: `Não foi possível apagar o utilizador: ${result.error}`,
          variant: "destructive",
        })
        return
      }

      console.log("✅ Admin: User deleted successfully")
      // Server logs automatically now

      toast({
        title: "Sucesso",
        description: "Utilizador apagado com sucesso.",
      })

      fetchUsers() // Reload list
    } catch (err) {
      console.error("❌ Admin: Unexpected error:", err)
      toast({
        title: "Erro",
        description: "Erro inesperado ao apagar utilizador.",
        variant: "destructive",
      })
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200"
      case "provider":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const hasUserPermission = (user: Profile, perm: string) => {
    const perms = (user.permissions as string[]) || []
    return perms.includes("super_admin") || perms.includes(perm)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />
      case "provider":
        return <Users className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "unlimited":
        return "bg-purple-100 text-purple-800"
      case "pro":
        return "bg-green-100 text-green-800"
      case "essential":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando utilizadores...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestão de Utilizadores
            </span>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {users.length} utilizadores
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pesquisar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={fetchUsers} variant="outline" size="sm">
              Atualizar
            </Button>
            {canManageAdmins && (
              <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 ml-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Membro Equipa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Membro</DialogTitle>
                    <DialogDescription>
                      Crie uma conta interna para a sua equipa. Apenas admins selecionados podem aceder ao dashboard.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-name">Nome Completo</Label>
                      <Input
                        id="add-name"
                        value={addForm.full_name}
                        onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                        placeholder="Ex: João Silva"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-email">Email</Label>
                      <Input
                        id="add-email"
                        type="email"
                        value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        placeholder="exemplo@email.com"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-sm font-bold text-red-600">Permissões de Administrador</Label>
                      <div className="grid grid-cols-1 gap-2 border rounded-md p-3 bg-red-50/30">
                        {AVAILABLE_PERMISSIONS.map((perm) => (
                          <div key={perm.id} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              id={`add-perm-${perm.id}`}
                              checked={addForm.permissions.includes(perm.id)}
                              onChange={(e) => {
                                const newPerms = e.target.checked
                                  ? [...addForm.permissions, perm.id]
                                  : addForm.permissions.filter(p => p !== perm.id)
                                setAddForm({ ...addForm, permissions: newPerms })
                              }}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={`add-perm-${perm.id}`}
                                className="text-sm font-medium leading-none"
                              >
                                {perm.label}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                      Nota: A password temporária será: <code className="font-bold">GigHubTemporary123!</code>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingUser(false)} disabled={isSaving}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddUser} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Criar Utilizador
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {getRoleIcon(user.role || "user")}
                        {user.full_name || "Nome não informado"}
                      </h3>
                      <p className="text-gray-600">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-2">
                        <Badge className={getRoleBadgeColor(user.role || "user")}>
                          {user.role === 'admin' && hasUserPermission(user, 'super_admin') ? 'Super Admin' : (user.role === 'provider' ? 'Profissional' : 'Cliente')}
                        </Badge>
                        <Badge className={getPlanBadgeColor(user.plan || "free")}>{user.plan || "free"}</Badge>
                        <span className="text-sm text-gray-500">Respostas: {user.responses_used || 0}</span>
                        <span className="text-sm text-gray-500">
                          Criado: {new Date(user.created_at).toLocaleDateString("pt-PT")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Botão Editar */}
                  <Button variant="outline" size="sm" onClick={() => router.push(`/admin/users/${user.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Dialog
                    open={editingUser?.id === user.id}
                    onOpenChange={(open) => {
                      if (!open) setEditingUser(null)
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Editar Utilizador</DialogTitle>
                        <DialogDescription>Editar informações para {user.email}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="full_name">Nome Completo</Label>
                          <Input
                            id="full_name"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Role (Função)</Label>
                          <Select
                            value={editForm.role}
                            onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Cliente</SelectItem>
                              <SelectItem value="provider">Profissional</SelectItem>
                              {canManageAdmins && <SelectItem value="admin">Admin</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>

                        {canManageAdmins && editForm.role === 'admin' && (
                          <div className="space-y-3 pt-2">
                            <Label className="text-sm font-bold">Permissões de Administrador</Label>
                            <div className="grid grid-cols-1 gap-2 border rounded-md p-3 bg-gray-50">
                              {AVAILABLE_PERMISSIONS.map((perm) => (
                                <div key={perm.id} className="flex items-start space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`perm-${perm.id}`}
                                    checked={editForm.permissions.includes(perm.id)}
                                    onChange={(e) => {
                                      const newPerms = e.target.checked
                                        ? [...editForm.permissions, perm.id]
                                        : editForm.permissions.filter(p => p !== perm.id)
                                      setEditForm({ ...editForm, permissions: newPerms })
                                    }}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                  />
                                  <div className="grid gap-1.5 leading-none">
                                    <label
                                      htmlFor={`perm-${perm.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {perm.label}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                      {perm.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {editForm.role !== 'admin' && (
                          <div>
                            <Label htmlFor="plan">Plano</Label>
                            <Select
                              value={editForm.plan}
                              onValueChange={(value) => setEditForm({ ...editForm, plan: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Grátis</SelectItem>
                                <SelectItem value="essential">Essencial</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="unlimited">Ilimitado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveUser}>Guardar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Botão Apagar */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apagar Utilizador</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem a certeza que deseja apagar o utilizador <strong>{user.email}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(user.id, user.email || "")}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Apagar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">
              {searchTerm ? "Nenhum utilizador encontrado para a pesquisa." : "Nenhum utilizador encontrado."}
            </p>
            {!searchTerm && (
              <p className="text-sm text-gray-400">
                Verifique se as políticas RLS permitem ver todos os utilizadores.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
