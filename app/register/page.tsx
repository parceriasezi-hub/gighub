"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { signUpUser } from "@/app/actions/auth"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState("individual")

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
  const router = useRouter()

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
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push("/verify-email")
        }, 2000)
      }
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred during company registration")
    } finally {
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
                Account created successfully! Redirecting...
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
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">Join the GigHub platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex border-b mb-6">
            <button
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === "individual" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("individual")}
            >
              Individual
            </button>
            <button
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === "company" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("company")}
            >
              Business (Company)
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
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Your full name"
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
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                {loading ? "Creating account..." : "Create Personal Account"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded mb-4">
                <strong>Business Account:</strong> Requires a valid VAT number and Registry Code.
                You will be creating the <strong>Organization</strong> and its first <strong>Admin User</strong>.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="legalName">Company Legal Name</Label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    required
                    placeholder="TechCorp Lda"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">VAT / NIF</Label>
                  <Input
                    id="vatNumber"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    required
                    placeholder="123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registryCode">Registry Code</Label>
                  <Input
                    id="registryCode"
                    value={registryCode}
                    onChange={(e) => setRegistryCode(e.target.value)}
                    required
                    placeholder="Code from Certidão"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Headquarters Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="Av. da Liberdade, 100, Lisboa"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">Representative (Admin User)</h4>
                <div className="space-y-2 mb-2">
                  <Label htmlFor="repName">Admin Full Name</Label>
                  <Input
                    id="repName"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    required
                    placeholder="Pedro Manager"
                  />
                </div>
                <div className="space-y-2 mb-2">
                  <Label htmlFor="companyEmail">Business Email</Label>
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
                  <Label htmlFor="companyPassword">Password</Label>
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
                {loading ? "Registering Company..." : "Register Company"}
              </Button>
            </form>
          )}

          <div className="text-center text-sm mt-6">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
