import { Suspense } from "react"
import { PageLoading } from "@/components/ui/page-loading"
import { GigsManagement } from "@/components/admin/lazy-admin-components"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export default function AdminGigsPage() {
  return (
    <Suspense fallback={<PageLoading text="Carregando gestão de biskates..." />}>
      <GigsManagement />
    </Suspense>
  )
}
