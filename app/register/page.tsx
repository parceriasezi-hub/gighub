"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { signUpUser } from "@/app/actions/auth"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "company" ? "company" : "individual"
  const [activeTab, setActiveTab] = useState(initialTab)

  // Individual State
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")

  // Company State
  const [companyEmail, setCompanyEmail] = useState("")
  const [companyPassword, setCompanyPassword] = useState("")
  const [repName, setRepName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [vatNumber, setVatNumber] = useState("")
  const [address, setAddress] = useState("")
  const [registryCode, setRegistryCode] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Update URL when tab changes to persist state on reload
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", tab)
    window.history.pushState({}, "", url)
  }

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("email", email)
    formData.append("password", password)
    formData.append("fullName", fullName)

    try {
      const result = await signUpUser(formData)

      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        setSuccess(true)
        setLoading(false)
        setTimeout(() => {
          router.push("/verify-email")
        }, 2000)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Basic validation
      if (!companyEmail || !legalName) {
        setError("Por favor preencha os campos obrigatórios.")
        setLoading(false)
        return
      }

      // Import dynamically to avoid server-action issues in client component if strict
      const { registerCompany } = await import("@/app/actions/auth-company")

      const result = await registerCompany({
        email: companyEmail,
        password: companyPassword,
        fullName: repName,
        legalName,
        vatNumber,
        address,
        registryCode
      })

      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        setSuccess(true)
        // Redirect to verification instead of resetting form
        setTimeout(() => {
          router.push("/verify-email")
        }, 1500)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An unexpected error occurred during company registration")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Conta criada com sucesso! A redirecionar...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Criar Conta</CardTitle>
          <CardDescription className="text-center">Junte-se à plataforma GigHub</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex border-b mb-6">
            <button
              type="button"
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === "individual" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => handleTabChange("individual")}
            >
              Particular
            </button>
            <button
              type="button"
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === "company" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => handleTabChange("company")}
            >
              Empresa
            </button>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50 mb-6">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {activeTab === "individual" ? (
            <form onSubmit={handleIndividualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando conta..." : "Criar Conta Pessoal"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded mb-4">
                <strong>Conta Empresarial:</strong> Requer NIF e Código da Certidão válidos.
                Você criará a <strong>Organização</strong> e o primeiro <strong>Utilizador Admin</strong>.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="legalName">Nome Legal da Empresa</Label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    required
                    placeholder="TechCorp Lda"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">NIF / VAT</Label>
                  <Input
                    id="vatNumber"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    required
                    placeholder="123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registryCode">Cód. Certidão Permanente</Label>
                  <Input
                    id="registryCode"
                    value={registryCode}
                    onChange={(e) => setRegistryCode(e.target.value)}
                    required
                    placeholder="Código da Certidão"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Morada da Sede</Label>
                  <AddressAutocomplete
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onAddressSelect={(addr) => setAddress(addr)}
                    required
                    placeholder="Av. da Liberdade, 100, Lisboa"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">Representante (Admin)</h4>
                <div className="space-y-2 mb-2">
                  <Label htmlFor="repName">Nome do Representante</Label>
                  <Input
                    id="repName"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    required
                    placeholder="Pedro Santos"
                  />
                </div>
                <div className="space-y-2 mb-2">
                  <Label htmlFor="companyEmail">Email Corporativo</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    required
                    placeholder="pedro@techcorp.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPassword">Senha</Label>
                  <Input
                    id="companyPassword"
                    type="password"
                    value={companyPassword}
                    onChange={(e) => setCompanyPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-700" disabled={loading}>
                {loading ? "Registando Empresa..." : "Registar Empresa"}
              </Button>
            </form>
          )}

          <div className="text-center text-sm mt-6">
            <span className="text-gray-600">Já tem conta? </span>
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Entrar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
