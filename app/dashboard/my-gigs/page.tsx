"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import { MapPin, Euro, Clock, Eye, MessageSquare, Calendar, Plus, Loader2, Edit, Trash2 } from "lucide-react"
import Link from "next/link"

interface Gig {
  id: string
  title: string
  description: string
  category: string
  price: number | null
  location: string | null
  estimated_duration: number | null
  duration_unit: string
  status: string
  created_at: string
  views?: number
  responses?: number
}

import { useTranslations } from "next-intl"

export default function MyGigsPage() {
  const t = useTranslations("Dashboard.MyGigs")
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()
  // const supabase = createClient() - Using imported singleton instead

  useEffect(() => {
    if (user) {
      fetchMyGigs()
    }
  }, [user])

  const fetchMyGigs = async () => {
    try {
      const { data, error } = await supabase
        .from("gigs")
        .select("*")
        .eq("user_id", user?.id || "")
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setGigs(data || [])
    } catch (error) {
      console.error("Error loading gigs:", error)
      console.error("Error loading gigs:", error)
      toast({
        title: t("errors.loadingTitle"),
        description: t("errors.loadingDesc"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("status.active")
      case "completed":
        return t("status.completed")
      case "cancelled":
        return t("status.cancelled")
      default:
        return status
    }
  }

  const formatDuration = (duration: number | null, unit: string) => {
    if (!duration) return t("duration.notSpecified")

    const unitText = unit === "hours" ? t("duration.hours") : unit === "days" ? t("duration.days") : t("duration.weeks")
    return `${duration} ${unitText}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
          <p className="text-gray-600">{t("subtitle")}</p>
        </div>
        <Link href="/dashboard/create-gig">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            {t("newGig")}
          </Button>
        </Link>
      </div>

      {gigs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{t("noGigs")}</h3>
              <p className="text-gray-600 mb-4">{t("createFirstDesc")}</p>
              <Link href="/dashboard/create-gig">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("createFirstBtn")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {gigs.map((gig) => (
            <Card key={gig.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{gig.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {gig.description.length > 150 ? `${gig.description.substring(0, 150)}...` : gig.description}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(gig.status)}>{getStatusText(gig.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Badge variant="outline">{gig.category}</Badge>
                  </div>

                  {gig.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {gig.location}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {formatDuration(gig.estimated_duration, gig.duration_unit)}
                  </div>

                  {gig.price && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">$</span>
                      {gig.price}
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(gig.created_at).toLocaleDateString("en-US")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {gig.views || 0} {t("stats.views")}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {gig.responses || 0} {t("stats.responses")}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/my-gigs/${gig.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        {t("actions.view")}
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      {t("actions.edit")}
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("actions.delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
