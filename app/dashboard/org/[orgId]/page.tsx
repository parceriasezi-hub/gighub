"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Users, CreditCard, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export default function OrganizationDashboard() {
    const { orgId } = useParams()
    const { organizations, switchOrganization, currentOrganization } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ members: 0, depts: 0 })

    useEffect(() => {
        // Ensure context matches URL
        if (orgId && currentOrganization?.id !== orgId) {
            switchOrganization(orgId as string)
        }
    }, [orgId, currentOrganization, switchOrganization])

    useEffect(() => {
        const fetchStats = async () => {
            const { count: memberCount } = await supabase
                .from('organization_members')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)

            const { count: deptCount } = await supabase
                .from('departments')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)

            setStats({
                members: memberCount || 1,
                depts: deptCount || 0
            })
            setLoading(false)
        }

        if (orgId) fetchStats()
    }, [orgId])

    if (!currentOrganization) return <div className="p-8">Loading Organization...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{currentOrganization.legal_name}</h1>
                    <p className="text-muted-foreground">Business Dashboard</p>
                </div>
                <div className="flex gap-2">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Request
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.members}</div>
                        <p className="text-xs text-muted-foreground">Active accounts</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Departments</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.depts}</div>
                        <p className="text-xs text-muted-foreground">Organizational units</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Budget</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€0.00</div>
                        <p className="text-xs text-muted-foreground">Current month spend</p>
                    </CardContent>
                </Card>
            </div>

            {/* Placeholder for Recent Activity */}
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-8">
                        No recent activity to show.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
