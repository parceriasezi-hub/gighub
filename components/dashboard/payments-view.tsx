"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Download, Eye, Euro, Calendar, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface Transaction {
    id: string
    created_at: string
    description: string | null
    amount: number
    status: "pending" | "completed" | "failed" | "refunded"
    type: "credit" | "debit"
    currency: string
}

interface PaymentStats {
    totalReceived: number
    totalSent: number
    pendingAmount: number
    thisMonth: number
}

interface PaymentsViewProps {
    mode: "client" | "provider"
}

export function PaymentsView({ mode }: PaymentsViewProps) {
    const t = useTranslations("Payments")
    const { user, profile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [payments, setPayments] = useState<Transaction[]>([])
    const [stats, setStats] = useState<PaymentStats>({
        totalReceived: 0,
        totalSent: 0,
        pendingAmount: 0,
        thisMonth: 0,
    })

    useEffect(() => {
        if (user) {
            loadPayments()
        }
    }, [user, mode])

    const loadPayments = async () => {
        try {
            setLoading(true)

            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .eq("user_id", user!.id)
                .eq("user_type", mode)
                .order("created_at", { ascending: false })

            if (error) throw error

            const filteredTransactions = (data || []).filter(tx => {
                const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
                return !metadata?.is_internal;
            });

            setPayments(filteredTransactions)

            // Calcular estatísticas (excluindo transações internas de pass-through)
            const statsTransactions = (data || []).filter(tx => {
                const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
                return !metadata?.is_internal;
            });

            const received = statsTransactions
                .filter((p) => p.type === "credit" && p.status === "completed")
                .reduce((sum, p) => sum + Math.abs(p.amount), 0)

            const sent = statsTransactions
                .filter((p) => p.type === "debit" && p.status === "completed")
                .reduce((sum, p) => sum + Math.abs(p.amount), 0)

            const pending = statsTransactions
                .filter((p) => p.status === "pending")
                .reduce((sum, p) => sum + Math.abs(p.amount), 0)

            setStats({
                totalReceived: received,
                totalSent: sent,
                pendingAmount: pending,
                thisMonth: received - sent, // Simplificado
            })
        } catch (error) {
            console.error("Error loading payments:", error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Concluído
                    </Badge>
                )
            case "pending":
                return (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Pendente
                    </Badge>
                )
            case "failed":
                return (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Falhado
                    </Badge>
                )
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("pt-PT")
    }

    const getFilteredPayments = (type?: "credit" | "debit") => {
        if (!type) return payments
        return payments.filter((payment) => payment.type === type)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 capitalize">{mode === 'client' ? t('title.client') : t('title.provider')}</h1>
                    <p className="text-gray-600 mt-2">{mode === "client" ? t('subtitle.client') : t('subtitle.provider')}</p>
                </div>
                <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t('export')}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{mode === 'client' ? t('stats.totalSpent') : t('stats.totalEarned')}</p>
                                <p className={cn("text-3xl font-bold", mode === 'client' ? 'text-red-600' : 'text-green-600')}>
                                    €{mode === 'client' ? stats.totalSent.toFixed(2) : stats.totalReceived.toFixed(2)}
                                </p>
                            </div>
                            {mode === 'client' ? <TrendingDown className="h-8 w-8 text-red-600" /> : <TrendingUp className="h-8 w-8 text-green-600" />}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('stats.pending')}</p>
                                <p className="text-3xl font-bold text-yellow-600">€{stats.pendingAmount.toFixed(2)}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Adicionando balanço se for provider */}
                {mode === 'provider' && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{t('stats.netBusiness')}</p>
                                    <p className="text-3xl font-bold text-blue-600">€{stats.thisMonth.toFixed(2)}</p>
                                </div>
                                <Euro className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Payments List */}
            <Tabs defaultValue="all" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">{t('tabs.all')} ({payments.length})</TabsTrigger>
                    <TabsTrigger value="received">{mode === 'client' ? t('tabs.refunds') : t('tabs.earnings')} ({getFilteredPayments("credit").length})</TabsTrigger>
                    <TabsTrigger value="sent">{mode === 'client' ? t('tabs.payments') : t('tabs.costs')} ({getFilteredPayments("debit").length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    <PaymentsList payments={getFilteredPayments()} />
                </TabsContent>

                <TabsContent value="received" className="space-y-4">
                    <PaymentsList payments={getFilteredPayments("credit")} />
                </TabsContent>

                <TabsContent value="sent" className="space-y-4">
                    <PaymentsList payments={getFilteredPayments("debit")} />
                </TabsContent>
            </Tabs>
        </div>
    )

    function PaymentsList({ payments }: { payments: Transaction[] }) {
        if (payments.length === 0) {
            return (
                <Card>
                    <CardContent className="p-12 text-center">
                        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('empty.title')}</h3>
                        <p className="text-gray-600">{t('empty.description')}</p>
                    </CardContent>
                </Card>
            )
        }

        return (
            <div className="space-y-4">
                {payments.map((payment) => (
                    <Card key={payment.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className={cn("p-3 rounded-full", payment.type === "credit" ? "bg-green-100" : "bg-red-100")}>
                                        {payment.type === "credit" ? (
                                            <TrendingUp className="h-6 w-6 text-green-600" />
                                        ) : (
                                            <TrendingDown className="h-6 w-6 text-red-600" />
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-gray-900">{payment.description || "No description"}</h3>
                                        <p className="text-sm text-gray-500">{formatDate(payment.created_at)}</p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div
                                        className={cn("text-2xl font-bold", payment.type === "credit" ? "text-green-600" : "text-red-600")}
                                    >
                                        {payment.type === "credit" ? "+" : "-"}€{Math.abs(payment.amount).toFixed(2)}
                                    </div>
                                    <div className="flex items-center justify-end space-x-2 mt-2">
                                        {getStatusBadge(payment.status)}
                                        <Button variant="ghost" size="sm">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }
}
