"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { StripePaymentForm } from "./stripe-payment-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, CreditCard, AlertCircle, AlertTriangle, Download, ArrowUpRight, ArrowDownLeft, Clock, Loader2, Wallet, Landmark, Plus, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Plan Interface
interface Plan {
    id: string
    name: string
    price: number
    features: string[]
    description?: string
}

interface Transaction {
    id: string
    created_at: string
    description: string | null
    amount: number
    status: "pending" | "completed" | "failed" | "refunded"
    type: "credit" | "debit"
    currency: string
}

interface PaymentMethod {
    id: string
    type: "card" | "paypal" | "bank_transfer"
    provider: string
    last4: string | null
    brand: string | null
    expiry_date: string | null
    is_default: boolean
    created_at: string
}

interface BillingViewProps {
    mode: 'client' | 'provider'
}

export function BillingView({ mode }: BillingViewProps) {
    const { profile, refreshProfile, loading: authLoading } = useAuth()
    const isProviderUser = profile?.role === 'provider'
    const [plans, setPlans] = useState<Plan[]>([])
    const [loadingPlans, setLoadingPlans] = useState(true)
    const [planError, setPlanError] = useState<string | null>(null)
    const [upgrading, setUpgrading] = useState<string | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loadingTransactions, setLoadingTransactions] = useState(true)
    const [balance, setBalance] = useState(0)

    // Withdrawal State
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
    const [withdrawAmount, setWithdrawAmount] = useState("")
    const [withdrawing, setWithdrawing] = useState(false)


    // Payment Methods State
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true)
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
    const [newCard, setNewCard] = useState({
        number: "",
        expiry: "",
        cvc: "",
        name: ""
    })
    const [addingPayment, setAddingPayment] = useState(false)
    const [showUpgradeConfirmation, setShowUpgradeConfirmation] = useState(false)
    const [pendingUpgradePlanId, setPendingUpgradePlanId] = useState<string | null>(null)
    const [upgradeClientSecret, setUpgradeClientSecret] = useState<string | null>(null)
    const [upgradeCardAmount, setUpgradeCardAmount] = useState(0)

    const currentPlanId = profile?.plan || "free"

    const fetchPlans = async () => {
        setLoadingPlans(true)
        setPlanError(null)
        try {
            const { data, error } = await supabase
                .from("plan_limits")
                .select("*")
                .order("price", { ascending: true })

            if (error) throw error

            const queryMode = (mode === 'provider' || profile?.role === 'provider') ? 'provider' : 'client'
            const filteredData = (data || []).filter(p => p.user_type === queryMode || p.user_type === 'both')

            if (filteredData.length === 0) {
                setPlans([])
                return
            }

            const formattedPlans: Plan[] = filteredData.map(p => {
                const features: string[] = []

                // Add quota features
                if (p.contact_views_limit === 2147483647) features.push("Unlimited contact views")
                else if (p.contact_views_limit > 0) features.push(`${p.contact_views_limit} Contact views / ${p.reset_period}`)

                if (p.proposals_limit === 2147483647) features.push("Unlimited proposals")
                else if (p.proposals_limit > 0) features.push(`${p.proposals_limit} Proposals / ${p.reset_period}`)

                if (p.gig_responses_limit === 2147483647) features.push("Unlimited gig responses")
                else if (p.gig_responses_limit > 0) features.push(`${p.gig_responses_limit} Gig responses / ${p.reset_period}`)

                // Add boolean features
                if (p.has_search_boost) features.push("Search results boost")
                if (p.has_profile_highlight) features.push("Profile highlight")

                // Add features from JSON
                if (p.features && typeof p.features === 'object') {
                    Object.entries(p.features).forEach(([key, value]) => {
                        if (value === true) {
                            features.push(key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
                        }
                    })
                }

                return {
                    id: p.plan_tier,
                    name: (p.badge_text || p.plan_tier).charAt(0).toUpperCase() + (p.badge_text || p.plan_tier).slice(1).toLowerCase(),
                    price: Number(p.price) || 0,
                    features,
                    description: p.plan_tier === 'free' ? "Perfect for getting started" :
                        p.plan_tier === 'pro' ? "For growing professionals" :
                            p.plan_tier === 'unlimited' ? "Maximum visibility and earnings" :
                                "Essential features for your business"
                }
            })

            setPlans(formattedPlans)
        } catch (error: any) {
            console.error("Error fetching plans:", error)
            setPlanError(error.message || "Failed to load plans")
        } finally {
            setLoadingPlans(false)
        }
    }

    // Unified effect for initial data loading
    useEffect(() => {
        let isMounted = true
        let channel: any = null

        const loadData = async () => {
            if (profile?.id) {
                fetchTransactions()
                fetchPaymentMethods()

                // Realtime listener for transactions
                channel = supabase
                    .channel(`transactions_${profile.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'transactions',
                            filter: `user_id=eq.${profile.id}`
                        },
                        () => {
                            fetchTransactions()
                        }
                    )
                    .subscribe()
            }
            if (isMounted) {
                await fetchPlans()
            }
        }

        loadData()

        return () => {
            isMounted = false
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [profile?.id, mode, profile?.role])

    const fetchPaymentMethods = async () => {
        try {
            setLoadingPaymentMethods(true)
            const { data, error } = await supabase
                .from("payment_methods")
                .select("*")
                .order("is_default", { ascending: false })
                .order("created_at", { ascending: false })

            if (error) throw error
            setPaymentMethods(data || [])
        } catch (error) {
            console.error("Error fetching payment methods:", error)
        } finally {
            setLoadingPaymentMethods(false)
        }
    }



    const fetchTransactions = async () => {
        try {
            setLoadingTransactions(true)
            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .eq("user_id", profile!.id)
                .eq("user_type", mode)
                .order("created_at", { ascending: false })

            if (error) throw error

            const allTransactions = data || []

            // Calculate balance using ALL transactions
            const currentBalance = allTransactions.reduce((acc, tx) => {
                const val = Number(tx.amount)
                if (tx.type === 'credit') return acc + Math.abs(val)
                if (tx.type === 'debit') return acc - Math.abs(val)
                return acc
            }, 0)
            setBalance(currentBalance)

            // Filter out 'is_internal' for visual representation
            const visibleTransactions = allTransactions.filter(tx => {
                const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
                return !metadata?.is_internal;
            });

            setTransactions(visibleTransactions)
        } catch (error) {
            console.error("Error fetching transactions:", error)
            toast({
                title: "Error",
                description: "Failed to load transaction history.",
                variant: "destructive",
            })
        } finally {
            setLoadingTransactions(false)
        }
    }

    const handleUpgradeClick = (planId: string) => {
        setPendingUpgradePlanId(planId)
        setShowUpgradeConfirmation(true)
        setUpgradeClientSecret(null)
    }

    const finalizeUpgrade = async (planId: string, paymentIntentId: string | null) => {
        if (!profile) return
        try {
            const plan = plans.find(p => p.id === planId)
            const price = plan?.price || 0
            const walletPortion = Math.min(balance, price)
            const cardPortion = price - walletPortion

            // 1. Process Wallet Portion (if any)
            if (walletPortion > 0) {
                await supabase.from('transactions').insert({
                    user_id: profile.id,
                    amount: -walletPortion,
                    type: 'debit',
                    status: 'completed',
                    user_type: mode,
                    description: `Subscription Upgrade (Wallet): ${plan?.name}`,
                    currency: 'EUR',
                    metadata: { payment_source: 'wallet', is_system: true }
                })
            }

            // 2. Process Card Portion (if any)
            if (cardPortion > 0 && paymentIntentId) {
                // Record the external payment credit
                await supabase.from('transactions').insert({
                    user_id: profile.id,
                    amount: cardPortion,
                    type: 'credit',
                    status: 'completed',
                    user_type: mode,
                    description: `Card Payment: ${plan?.name} Plan`,
                    currency: 'EUR',
                    metadata: { payment_source: 'card', stripe_payment_intent: paymentIntentId, is_system: true, is_internal: true }
                })
                // Record the cost debit
                await supabase.from('transactions').insert({
                    user_id: profile.id,
                    amount: -cardPortion,
                    type: 'debit',
                    status: 'completed',
                    user_type: mode,
                    description: `Subscription Upgrade (Card): ${plan?.name}`,
                    currency: 'EUR',
                    metadata: { payment_source: 'card', is_system: true }
                })
            }

            // 3. Update Profile Plan
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ plan: planId })
                .eq("id", profile.id)

            if (updateError) throw updateError

            // 3.1 Also update user_subscriptions table to make it visible in Admin
            const periodEnd = new Date()
            if (plan?.name.toLowerCase().includes('year')) {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1)
            } else if (plan?.name.toLowerCase().includes('week')) {
                periodEnd.setDate(periodEnd.getDate() + 7)
            } else {
                periodEnd.setMonth(periodEnd.getMonth() + 1)
            }

            await supabase.from("user_subscriptions").upsert({
                user_id: profile.id,
                plan_id: planId,
                status: 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: periodEnd.toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

            // 4. Trigger Notifications
            await fetch("/api/notifications/trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trigger: "plan_upgraded",
                    data: {
                        userId: profile.id,
                        planName: plan?.name,
                        plan_name: plan?.name,
                        price,
                        userName: profile.full_name,
                        user_name: profile.full_name,
                        userEmail: profile.email,
                        user_email: profile.email
                    }
                })
            })

            toast({ title: "Upgrade Successful! 🎉", description: `You are now on the ${plan?.name} plan.` })
            setShowUpgradeConfirmation(false)
            fetchTransactions()
            await refreshProfile() // Refresh profile after successful upgrade
        } catch (error: any) {
            console.error("Finalize upgrade error:", error)
            toast({ title: "Error", description: "Failed to complete upgrade.", variant: "destructive" })
        } finally {
            setUpgrading(null)
        }
    }

    const processUpgrade = async () => {
        if (!pendingUpgradePlanId || !profile) return
        const plan = plans.find(p => p.id === pendingUpgradePlanId)
        if (!plan) return

        const price = plan.price
        const walletPortion = Math.min(balance, price)
        const cardPortion = price - walletPortion

        if (cardPortion > 0) {
            try {
                setUpgradeCardAmount(cardPortion)
                const response = await fetch("/api/payments/create-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: cardPortion,
                        type: 'subscription_upgrade',
                        metadata: { planId: pendingUpgradePlanId, walletUsed: walletPortion }
                    })
                })
                const data = await response.json()
                if (data.error) throw new Error(data.error)
                setUpgradeClientSecret(data.clientSecret)
            } catch (error: any) {
                console.error("Upgrade intent error:", error)
                toast({ title: "Error", description: error.message || "Failed to initiate payment.", variant: "destructive" })
            }
            return
        }

        finalizeUpgrade(pendingUpgradePlanId, null)
    }

    const handleWithdrawal = async () => {
        const amount = Number(withdrawAmount)
        if (!amount || amount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid amount greater than 0.", variant: "destructive" })
            return
        }
        if (amount > balance) {
            toast({ title: "Insufficient Funds", description: "You cannot withdraw more than your current balance.", variant: "destructive" })
            return
        }

        try {
            setWithdrawing(true)

            const { error } = await supabase.from('transactions').insert({
                user_id: profile?.id,
                amount: -amount,
                type: 'debit',
                status: 'pending',
                user_type: mode,
                description: 'Withdrawal Request',
                currency: 'EUR'
            })

            if (error) throw error

            toast({
                title: "Withdrawal Requested",
                description: `Your request for €${amount.toFixed(2)} has been submitted.`,
            })
            setIsWithdrawOpen(false)
            setWithdrawAmount("")
            fetchTransactions()

            // Trigger Notifications
            await fetch("/api/notifications/trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trigger: "withdrawal_requested",
                    data: {
                        userId: profile?.id,
                        amount,
                        userName: profile?.full_name,
                        user_name: profile?.full_name,
                        userEmail: profile?.email,
                        user_email: profile?.email
                    }
                })
            })
        } catch (error: any) {
            console.error("Withdrawal error:", error)
            toast({ title: "Error", description: "Failed to process withdrawal.", variant: "destructive" })
        } finally {
            setWithdrawing(false)
        }
    }


    if (authLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading billing info...</div>
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Billing & Subscription</h1>
                    <p className="text-muted-foreground">
                        {mode === 'provider'
                            ? "Manage your earnings and subscriptions."
                            : "View your financial history."}
                    </p>
                </div>

                {/* Balance Card for Providers (and maybe clients? usually clients just pay) */}
                {/* Use for both? Clients might have wallet balance too? Usually provider. */}
                {/* Requirements said "provider that pays subscriptions" and "client that pays commissions". */}
                {/* But user specifically asked "providers must be able to withdrawl". */}
                <Card className="bg-primary/5 border-primary/20 min-w-[300px]">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">Saldo Disponível</p>
                            <h2 className="text-2xl font-bold text-primary">€{balance.toFixed(2)}</h2>
                        </div>
                        <div className="flex gap-2">
                            <Wallet className="h-8 w-8 text-primary/50 hidden sm:block" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue={mode === 'provider' ? "plans" : "payment-methods"} className="space-y-8">
                <TabsList>
                    {(mode === 'provider' || isProviderUser) && <TabsTrigger value="plans">Plans & Subscription</TabsTrigger>}
                    <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
                    {(mode === 'provider' || isProviderUser) && <TabsTrigger value="withdrawals">Withdrawal Methods</TabsTrigger>}
                </TabsList>

                {/* Plans Tab (Provider Only) */}
                {(mode === 'provider' || isProviderUser) && (
                    <TabsContent value="plans" className="space-y-6">
                        {loadingPlans ? (
                            <div className="grid md:grid-cols-3 gap-8">
                                {[1, 2, 3].map((i) => (
                                    <Card key={i} className="animate-pulse">
                                        <div className="h-64 bg-gray-100 rounded-lg"></div>
                                    </Card>
                                ))}
                            </div>
                        ) : planError ? (
                            <div className="text-center py-12 text-red-500 border-2 border-dashed border-red-200 rounded-xl bg-red-50">
                                <p className="font-semibold mb-2">Error loading plans</p>
                                <p className="text-sm">{planError}</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchPlans()}>
                                    Try Again
                                </Button>
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                No plans available at the moment.
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
                                {plans.map((plan) => {
                                    const isCurrent = currentPlanId === plan.id
                                    return (
                                        <Card
                                            key={plan.id}
                                            className={cn(
                                                "flex flex-col relative transition-all duration-300",
                                                isCurrent ? "border-primary shadow-lg scale-105 z-10" : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            {isCurrent && (
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                                                    Current Plan
                                                </div>
                                            )}
                                            <CardHeader>
                                                <CardTitle className="flex justify-between items-center">
                                                    {plan.name}
                                                    <span className="text-2xl font-bold">€{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                                                </CardTitle>
                                                <CardDescription>
                                                    {plan.description}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-1">
                                                <ul className="space-y-3">
                                                    {plan.features.map((feature, idx) => (
                                                        <li key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                                            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                            <CardFooter>
                                                <Button
                                                    className="w-full"
                                                    disabled={upgrading === plan.id || currentPlanId === plan.id}
                                                    variant={currentPlanId === plan.id ? "secondary" : "default"}
                                                    onClick={() => handleUpgradeClick(plan.id)}
                                                >
                                                    {currentPlanId === plan.id ? (
                                                        <>
                                                            <Check className="mr-2 h-4 w-4" />
                                                            Current Plan
                                                        </>
                                                    ) : (
                                                        upgrading === plan.id ? "Processing..." : `Upgrade to ${plan.name}`
                                                    )}
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>
                )}


                {/* Payment Methods Tab */}
                <TabsContent value="payment-methods">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 text-left">
                            <div className="flex-1">
                                <CardTitle>Payment Methods</CardTitle>
                                <CardDescription>Manage your cards for plan upgrades and other payments.</CardDescription>
                            </div>
                            <Button onClick={() => setIsAddPaymentOpen(true)} size="sm">
                                <CreditCard className="mr-2 h-4 w-4" />
                                Add Card
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {loadingPaymentMethods ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : paymentMethods.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <CreditCard className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium">No payment methods yet</h3>
                                    <p className="text-muted-foreground mb-6">Add a card to start {mode === 'provider' ? 'upgrading to paid plans' : 'making payments'}.</p>
                                    <Button onClick={() => setIsAddPaymentOpen(true)} variant="outline">Add First Card</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {paymentMethods.map((pm) => (
                                        <div key={pm.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center space-x-4">
                                                <div className="p-2 bg-gray-100 rounded">
                                                    <CreditCard className="h-6 w-6 text-gray-600" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium">
                                                        {pm.brand ? pm.brand.toUpperCase() : "CARD"} •••• {pm.last4}
                                                        {pm.is_default && <Badge variant="secondary" className="ml-2">Default</Badge>}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Expires {pm.expiry_date}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">Remove</Button>
                                        </div>
                                    ))}
                                    <Button onClick={() => setIsAddPaymentOpen(true)} variant="outline" className="w-full dashed border-dashed border-2">
                                        + Add New Card
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Withdrawals (Provider Only) */}
                {(mode === 'provider' || isProviderUser) && (
                    <TabsContent value="withdrawals">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Withdrawal Methods</CardTitle>
                                    <CardDescription>Manage how you get paid.</CardDescription>
                                </div>
                                <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                                    <DialogTrigger asChild>
                                        <Button disabled={balance <= 0}>
                                            <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw Funds
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Withdraw Funds</DialogTitle>
                                            <DialogDescription>
                                                Insira o montante que deseja levantar. Saldo disponível: €{balance.toFixed(2)}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4 text-left">
                                            <div className="space-y-2">
                                                <Label htmlFor="amount">Amount (€)</Label>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={withdrawAmount}
                                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                                    max={balance}
                                                />
                                            </div>
                                            <div className="space-y-2 text-left">
                                                <Label>Payout Method</Label>
                                                <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/50">
                                                    <Landmark className="h-5 w-5 text-gray-500" />
                                                    <div className="flex-1 text-left">
                                                        <p className="text-sm font-medium">Bank Account (IBAN)</p>
                                                        <p className="text-xs text-muted-foreground">**** 1234</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>Cancel</Button>
                                            <Button onClick={handleWithdrawal} disabled={withdrawing}>
                                                {withdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Confirm Withdrawal
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border rounded-lg p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-100 p-2 rounded">
                                            <Landmark className="h-6 w-6 text-gray-700" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium">Direct Deposit (IBAN)</p>
                                            <p className="text-sm text-muted-foreground">PT50 **** **** **** 1234</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">Default</Badge>
                                </div>
                                <Button variant="outline" className="w-full dashed border-dashed border-2">
                                    + Add New Withdrawal Method
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* Add Payment Method Dialog */}
            <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Payment Method</DialogTitle>
                        <DialogDescription>
                            Enter your card details securely. In a production environment, this would use Stripe or another secure provider.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Cardholder Name</Label>
                            <Input
                                id="name"
                                value={newCard.name}
                                onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                                placeholder="Full Name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="number">Card Number</Label>
                            <Input
                                id="number"
                                value={newCard.number}
                                onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                                placeholder="0000 0000 0000 0000"
                                maxLength={16}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="expiry">Expiry Date</Label>
                                <Input
                                    id="expiry"
                                    value={newCard.expiry}
                                    onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                                    placeholder="MM/YY"
                                    maxLength={5}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cvc">CVC</Label>
                                <Input
                                    id="cvc"
                                    type="password"
                                    value={newCard.cvc}
                                    onChange={(e) => setNewCard({ ...newCard, cvc: e.target.value })}
                                    placeholder="•••"
                                    maxLength={3}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                try {
                                    setAddingPayment(true)
                                    const { error } = await supabase
                                        .from("payment_methods")
                                        .insert({
                                            user_id: profile?.id,
                                            type: "card",
                                            provider: "stripe_mock",
                                            last4: newCard.number.slice(-4),
                                            brand: "visa",
                                            expiry_date: newCard.expiry,
                                            is_default: paymentMethods.length === 0
                                        })

                                    if (error) throw error

                                    toast({ title: "Success", description: "Payment method added successfully." })
                                    setIsAddPaymentOpen(false)
                                    setNewCard({ number: "", expiry: "", cvc: "", name: "" })
                                    fetchPaymentMethods()
                                } catch (error) {
                                    console.error("Error adding payment method:", error)
                                    toast({ title: "Error", description: "Failed to add payment method.", variant: "destructive" })
                                } finally {
                                    setAddingPayment(false)
                                }
                            }}
                            disabled={addingPayment || !newCard.number || !newCard.expiry || !newCard.cvc}
                        >
                            {addingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Card"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Upgrade Confirmation Dialog */}
            <Dialog open={showUpgradeConfirmation} onOpenChange={setShowUpgradeConfirmation}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Plan Upgrade</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to upgrade to the {plans.find(p => p.id === pendingUpgradePlanId)?.name} plan?
                        </DialogDescription>
                    </DialogHeader>

                    {!upgradeClientSecret ? (
                        <div className="space-y-4 py-4">
                            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800">Important Note</AlertTitle>
                                <AlertDescription className="text-amber-700 text-xs">
                                    You will be charged the full price of the new plan immediately. Any remaining features from your current plan will not be carried over.
                                </AlertDescription>
                            </Alert>

                            {pendingUpgradePlanId && (
                                <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                                    <div className="flex justify-between text-sm">
                                        <span>Total Price:</span>
                                        <span className="font-semibold">€{plans.find(p => p.id === pendingUpgradePlanId)?.price.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Wallet Discount:</span>
                                        <span>-€{Math.min(balance, plans.find(p => p.id === pendingUpgradePlanId)?.price || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="border-t pt-2 flex justify-between font-bold">
                                        <span>Amount to Pay:</span>
                                        <span>€{Math.max(0, (plans.find(p => p.id === pendingUpgradePlanId)?.price || 0) - balance).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-4 border rounded-lg p-4 bg-muted/30">
                            <Elements stripe={stripePromise} options={{ clientSecret: upgradeClientSecret }}>
                                <StripePaymentForm
                                    amount={upgradeCardAmount}
                                    onSuccess={(pi) => finalizeUpgrade(pendingUpgradePlanId!, pi)}
                                />
                            </Elements>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-4 text-muted-foreground hover:text-primary"
                                onClick={() => setUpgradeClientSecret(null)}
                            >
                                Back to summary
                            </Button>
                        </div>
                    )}

                    {!upgradeClientSecret && (
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowUpgradeConfirmation(false)}>Cancel</Button>
                            <Button onClick={processUpgrade} disabled={upgrading !== null}>
                                {upgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {Math.max(0, (plans.find(p => p.id === pendingUpgradePlanId)?.price || 0) - balance) > 0 ? "Continue to Payment" : "Confirm & Pay"}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    )
}
