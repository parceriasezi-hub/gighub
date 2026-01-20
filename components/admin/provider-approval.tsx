"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, XCircle, Eye, User, FileText, Phone, Check, ShieldCheck, MapPin, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface Provider {
  id: string
  full_name: string
  email: string
  provider_status: string
  bio: string | null
  avatar_url: string | null
  phone: string | null
  phone_verified: boolean
  created_at: string
  documents: Document[]
  portfolio: PortfolioItem[]
  specialties: Specialty[]
  hourly_rate: number | null
  provider_experience_years: number | null
  provider_availability: string | null
  services: ProviderService[]
  service_radius_km?: number
  postal_code?: string
  performs_emergency_services?: boolean
}

interface Specialty {
  id: string
  specialty_name: string
  experience_level: string
  years_experience: number
}

interface ProviderService {
  service_id: string
  is_emergency?: boolean // Added per user request
  services: {
    name: string
  }
}

interface Document {
  id: string
  document_type: string
  document_name: string
  document_url: string
  status: string
  rejection_reason?: string
  description?: string
  created_at: string
}

interface PortfolioItem {
  id: string
  title: string
  description: string
  image_url: string
}

export function ProviderApproval() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchProviders()

    // Real-time Subscription
    const channel = supabase
      .channel('admin-provider-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'profiles',
          filter: 'is_provider=eq.true' // Only provider profiles
        },
        (payload) => {
          console.log('RT: Profile change detected', payload)
          fetchProviders(true)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for new docs too
          schema: 'public',
          table: 'provider_documents'
        },
        (payload) => {
          console.log('RT: Document change detected', payload)
          fetchProviders(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Move fetchProviders logic to be update-friendly
  const fetchProviders = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      // Buscar prestadores pendentes
      const { data: providersData, error: providersError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_provider", true)
        .in("provider_status", ["pending", "approved", "rejected", "changes_requested"])
        .order("created_at", { ascending: false })

      if (providersError) throw providersError

      // Buscar documentos e portfolio para cada prestador
      const profiles = providersData as unknown as Provider[]
      const providersWithDetails = await Promise.all(
        profiles.map(async (provider) => {
          const { data: documents, error: docsError } = await supabase
            .from("provider_documents")
            .select("*")
            .eq("provider_id", provider.id)
            .order("created_at", { ascending: false })

          if (docsError) console.error("Error fetching docs", docsError)

          const { data: portfolio, error: portfolioError } = await supabase
            .from("portfolio_items")
            .select("*")
            .eq("provider_id", provider.id)

          if (portfolioError) console.error("Error fetching portfolio", portfolioError)

          const { data: services, error: servicesError } = await supabase
            .from("provider_services")
            .select("service_id, is_emergency, services(name)")
            .eq("provider_id", provider.id)

          if (servicesError) console.error("Error fetching services", servicesError)

          const { data: specialties, error: specialtiesError } = await supabase
            .from("provider_specialties")
            .select("*")
            .eq("provider_id", provider.id)

          if (specialtiesError) console.error("Error fetching specialties", specialtiesError)

          return {
            ...provider,
            documents: documents || [],
            portfolio: portfolio || [],
            specialties: specialties || [],
            services: services || []
          }
        }),
      )

      setProviders(providersWithDetails)

      // Update selected provider if it exists
      if (selectedProvider) {
        const updatedSelected = providersWithDetails.find(p => p.id === selectedProvider.id)
        if (updatedSelected) {
          setSelectedProvider(updatedSelected)
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const updateProviderStatus = async (providerId: string, status: string, reason?: string) => {
    try {
      const response = await fetch("/api/admin/providers/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          providerId,
          status,
          reason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update provider status")
      }

      toast({
        title: "Status updated",
        description: `Provider ${status === "approved" ? "approved" : "rejected"} successfully.`,
      })

      fetchProviders(true)
      setSelectedProvider(null)
      setRejectionReason("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Reuse rejectionReason state for changes request as well, or rename it to "statusReason"
  // For simplicity, let's use the same state variable but interpret it based on the action button clicked


  const togglePhoneVerification = async (providerId: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase
        .from("profiles") as any)
        .update({ phone_verified: !currentStatus })
        .eq("id", providerId)

      if (error) throw error

      toast({ title: "Phone Verification Updated" })

      // Update local state
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, phone_verified: !currentStatus } : p))
      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider(prev => prev ? { ...prev, phone_verified: !currentStatus } : null)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const updateDocumentStatus = async (providerId: string, docId: string, status: string, reason?: string) => {
    try {
      const { error } = await (supabase
        .from("provider_documents") as any)
        .update({ status, rejection_reason: reason })
        .eq("id", docId)

      if (error) throw error

      toast({
        title: "Document status updated",
        description: `Document set to ${status}.`,
      })

      // Update local state
      setProviders((prev) =>
        prev.map((p) => {
          if (p.id === providerId) {
            const updatedDocs = p.documents.map((d) => (d.id === docId ? { ...d, status, rejection_reason: reason } : d))
            return { ...p, documents: updatedDocs }
          }
          return p
        }),
      )

      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider((prev) => {
          if (!prev) return null
          const updatedDocs = prev.documents.map((d) => (d.id === docId ? { ...d, status, rejection_reason: reason } : d))
          return { ...prev, documents: updatedDocs }
        })
      }
    } catch (err: any) {
      toast({
        title: "Error updating document",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      suspended: "destructive",
      changes_requested: "outline", // Orange/Amber not in default variants, outline is distinct enough or we can use custom class
    } as const

    const labels = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      suspended: "Suspended",
      changes_requested: "Changes Requested",
    }

    return (
      <Badge
        variant={variants[status as keyof typeof variants] || "secondary"}
        className={status === "changes_requested" ? "bg-amber-100 text-amber-800 border-amber-200" : ""}
      >
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const filterProviders = (status: string) => {
    if (status === "pending") {
      return providers.filter((provider) => provider.provider_status === "pending" || provider.provider_status === "changes_requested")
    }
    return providers.filter((provider) => provider.provider_status === status)
  }



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Provider Approval</h1>
        <p className="text-muted-foreground">Manage service provider applications</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">Pending ({filterProviders("pending").length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({filterProviders("approved").length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({filterProviders("rejected").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Pending Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filterProviders("pending").length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No pending providers.</p>
                </div>
              ) : (
                filterProviders("pending").map((provider) => (
                  <Card key={provider.id} className="mb-4 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-14 w-14 border-2 border-muted">
                            <AvatarImage src={provider.avatar_url || ""} />
                            <AvatarFallback className="text-lg">{provider.full_name?.charAt(0).toUpperCase() || provider.email.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">{provider.full_name || "Name not provided"}</h3>
                              {getStatusBadge(provider.provider_status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{provider.email}</p>

                            <div className="flex items-center gap-4 mt-2">
                              {provider.phone && (
                                <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {provider.phone}
                                  {provider.phone_verified && <CheckCircle className="w-3 h-3 ml-1 text-green-600" />}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                {new Date(provider.created_at).toLocaleDateString()}
                              </div>
                            </div>

                            {provider.services?.some(s => s.is_emergency) && (
                              <div className="mt-2 inline-flex items-center text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Emergency Provider
                              </div>
                            )}
                          </div>
                        </div>

                        <Button variant="outline" onClick={() => setSelectedProvider(provider)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Review Application
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Approved Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filterProviders("approved").length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No providers approved yet.</p>
                </div>
              ) : (
                filterProviders("approved").map((provider) => (
                  <Card key={provider.id} className="mb-4 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-14 w-14 border-2 border-muted">
                            <AvatarImage src={provider.avatar_url || ""} />
                            <AvatarFallback className="text-lg">{provider.full_name?.charAt(0).toUpperCase() || provider.email.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">{provider.full_name || "Name not provided"}</h3>
                              {getStatusBadge(provider.provider_status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{provider.email}</p>
                            <div className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-1 rounded inline-block">
                              {new Date(provider.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => setSelectedProvider(provider)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <XCircle className="h-5 w-5 mr-2" />
                Rejected Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filterProviders("rejected").length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No providers rejected.</p>
                </div>
              ) : (
                filterProviders("rejected").map((provider) => (
                  <Card key={provider.id} className="mb-4 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 opacity-75">
                          <Avatar className="h-14 w-14 border-2 border-muted">
                            <AvatarImage src={provider.avatar_url || ""} />
                            <AvatarFallback className="text-lg">{provider.full_name?.charAt(0).toUpperCase() || provider.email.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">{provider.full_name || "Name not provided"}</h3>
                              {getStatusBadge(provider.provider_status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{provider.email}</p>
                            <div className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-1 rounded inline-block">
                              {new Date(provider.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => setSelectedProvider(provider)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog - Centrally Managed */}
      <Dialog open={!!selectedProvider} onOpenChange={(open) => !open && setSelectedProvider(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                  <AvatarImage src={selectedProvider?.avatar_url || ""} />
                  <AvatarFallback>{selectedProvider?.full_name?.charAt(0) || "P"}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl">{selectedProvider?.full_name}</DialogTitle>
                  <DialogDescription className="mt-1 flex items-center gap-2">
                    <span>{selectedProvider?.email}</span>
                    <span className="text-muted-foreground/30">•</span>
                    <span>{selectedProvider?.phone}</span>
                  </DialogDescription>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {selectedProvider && getStatusBadge(selectedProvider.provider_status)}
              </div>
            </div>
          </DialogHeader>

          {selectedProvider && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {/* Critical Alerts */}
              {selectedProvider.services?.some(s => s.is_emergency) && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
                  <div className="p-2 bg-red-100 rounded-full">
                    <ShieldCheck className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-900 text-lg">⚠️ Emergency Services Provider</h4>
                    <p className="text-red-700 text-sm mt-1">
                      This provider has declared ability to perform 24h Emergency Services.
                      Please verify their qualifications and location carefully.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedProvider.services.filter(s => s.is_emergency).map((s, i) => (
                        <Badge key={i} variant="destructive" className="bg-red-600 hover:bg-red-700">
                          {s.services?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="overview">Overview & Stats</TabsTrigger>
                  <TabsTrigger value="documents" className="relative">
                    Documents
                    {selectedProvider.documents.length > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 min-w-[1.25rem]">{selectedProvider.documents.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="portfolio">Portfolio & Services</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-in fade-in-50">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Hourly Rate</p>
                        <p className="text-2xl font-bold mt-1">{selectedProvider.hourly_rate ? `€${selectedProvider.hourly_rate}` : "-"}</p>
                        <p className="text-xs text-muted-foreground">per hour</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Experience</p>
                        <p className="text-2xl font-bold mt-1">{selectedProvider.provider_experience_years || 0}</p>
                        <p className="text-xs text-muted-foreground">years</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Radius</p>
                        <p className="text-2xl font-bold mt-1">{selectedProvider.service_radius_km || 30}</p>
                        <p className="text-xs text-muted-foreground">km coverage</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Postal Code</p>
                        <p className="text-lg font-bold mt-1 truncate max-w-full px-2">{selectedProvider.postal_code || "-"}</p>
                        <p className="text-xs text-muted-foreground">Base location</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bio */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Biography</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                        {selectedProvider.bio || "No biography provided."}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Location */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      Service Area
                    </h4>
                    <p className="text-sm">
                      This provider is based in <strong>{selectedProvider.postal_code}</strong> and serves a <strong>{selectedProvider.service_radius_km}km</strong> radius.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-6 animate-in fade-in-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Required Documentation</h3>
                    <p className="text-sm text-muted-foreground">Verify all documents before approving.</p>
                  </div>

                  {selectedProvider.documents.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                      <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                      <p className="text-muted-foreground font-medium">No documents uploaded.</p>
                      <p className="text-xs text-muted-foreground mt-1">This application is incomplete.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {selectedProvider.documents.map((doc) => (
                        <Card key={doc.id} className="overflow-hidden border-l-4 border-l-primary">
                          <div className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold truncate pr-4" title={doc.document_name}>{doc.document_name}</h4>
                                {getStatusBadge(doc.status)}
                              </div>
                              <p className="text-xs text-muted-foreground uppercase font-bold mt-1">
                                {doc.document_type}
                              </p>
                              {doc.description && <p className="text-sm mt-1">"{doc.description}"</p>}
                            </div>
                          </div>
                          <div className="bg-muted/50 p-3 flex items-center justify-between border-t gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.document_url, 60)
                                  if (error) throw error
                                  window.open(data.signedUrl, "_blank")
                                } catch (err) {
                                  console.error("Error signing URL:", err)
                                  toast({ title: "Error opening document", variant: "destructive" })
                                }
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Document
                            </Button>

                            {doc.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 hover:border-green-300"
                                  onClick={() => updateDocumentStatus(selectedProvider.id, doc.id, "approved")}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 hover:border-red-300"
                                  onClick={() => {
                                    const reason = window.prompt("Reason for rejection:")
                                    if (reason) updateDocumentStatus(selectedProvider.id, doc.id, "rejected", reason)
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="portfolio" className="space-y-6 animate-in fade-in-50">
                  <div>
                    <h3 className="font-semibold mb-3">Selected Services</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProvider.services?.map((s, idx) => (
                        <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                          {s.services?.name}
                          {s.is_emergency && <ShieldCheck className="w-3 h-3 text-red-600" />}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Specialties & Skills</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProvider.specialties?.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-2 border rounded bg-white">
                          <span className="font-medium">{s.specialty_name}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {s.experience_level} • {s.years_experience}y
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Portfolio Projects ({selectedProvider.portfolio.length})</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedProvider.portfolio?.map((item) => (
                        <Card key={item.id} className="overflow-hidden group cursor-pointer hover:border-primary transition-colors">
                          <div className="aspect-video relative bg-gray-100">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.title} className="object-cover w-full h-full" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <Briefcase className="h-8 w-8 opacity-20" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="font-medium text-sm truncate">{item.title}</p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-6 border-t bg-white flex justify-between items-center z-10">
            <div className="text-sm text-muted-foreground">
              Status: <span className="font-semibold">{selectedProvider?.provider_status}</span>
            </div>
            {selectedProvider && selectedProvider.provider_status === "pending" && (
              <div className="flex space-x-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Application
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Provider</DialogTitle>
                      <DialogDescription>State the reason for rejection to notify the provider.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Rejection reason</label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explain the reason for rejection..."
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="destructive" onClick={() => updateProviderStatus(selectedProvider.id, "rejected", rejectionReason)}>Reject</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800">
                      <FileText className="h-4 w-4 mr-2" />
                      Request Changes
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Changes</DialogTitle>
                      <DialogDescription>
                        Explain what is missing or needs correction. The provider will be notified to update their application.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="changes-reason" className="text-sm font-medium">Instructions</Label>
                        <Textarea
                          id="changes-reason"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="E.g., Please upload a clearer ID and add more portfolio items..."
                          rows={4}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="default" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => updateProviderStatus(selectedProvider.id, "changes_requested", rejectionReason)}>
                          Send Request
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button onClick={() => updateProviderStatus(selectedProvider.id, "approved")} className="bg-green-600 hover:bg-green-700 text-white min-w-[150px]">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Provider
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
