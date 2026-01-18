import { Suspense } from "react"
import { PageLoading } from "@/components/ui/page-loading"
import { UsersManagement } from "@/components/admin/lazy-admin-components"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<PageLoading text="Carregando gestão de utilizadores..." />}>
      <UsersManagement />
    </Suspense>
  )
}
