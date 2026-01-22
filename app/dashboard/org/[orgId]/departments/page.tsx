import { createClient } from "@/lib/supabase/server";
import { CreateDepartmentDialog } from "@/components/dashboard/departments/create-department-dialog";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { deleteDepartment } from "@/app/actions/org-departments";
import { Trash2, Users } from "lucide-react";
import { canManageTeam, getCurrentOrgRole } from "@/lib/b2b/permissions";

export default async function DepartmentsPage({ params }: { params: { orgId: string } }) {
    const supabase = await createClient();
    const orgId = params.orgId;

    // Check Permissions
    const currentUserRole = await getCurrentOrgRole(orgId);
    const canManage = canManageTeam(currentUserRole);

    // Fetch Departments with member counts
    // We need to join manually or use a view/rpc for counts, but for now simple select.
    // We can select departments and then count members? 
    // Supabase doesn't support COUNT in select easily without foreign table aggregate.
    // Let's just fetch depts and we'll (in future) show count.
    // Or we can fetch `departments, organization_members(count)` if relationship exists?
    // The FK is on members->department.
    // So `select *, organization_members(count)` works if we define the relationship explicitly.
    // But let's start simple: just list departments.

    const { data: departments, error } = await supabase
        .from("departments")
        .select("*, organization_members(count)") // Aggregate count
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });

    // Type safety
    // The count comes as `organization_members: [{ count: 12 }]` usually if using `count`.
    // Actually `.select('*, organization_members(count)')` returns `organization_members: [{ count: N }]`.

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Departamentos</h2>
                    <p className="text-muted-foreground">
                        Organize a sua equipa em diferentes unidades funcionais.
                    </p>
                </div>
                {canManage && <CreateDepartmentDialog organizationId={orgId} />}
            </div>

            {!canManage && (
                <div className="bg-blue-50 text-blue-800 p-4 rounded-md mb-4 text-sm">
                    Tem acesso de leitura. Apenas administradores podem gerir departamentos.
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departments?.map((dept: any) => {
                    const memberCount = dept.organization_members?.[0]?.count || 0;

                    return (
                        <Card key={dept.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {dept.name}
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{memberCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    Membros atribuídos
                                </p>

                                {canManage && (
                                    <div className="mt-4 flex justify-end">
                                        <form action={async () => {
                                            "use server";
                                            await deleteDepartment(dept.id, orgId);
                                        }}>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </form>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {departments?.length === 0 && (
                    <div className="col-span-full text-center p-12 bg-white rounded-lg border border-dashed">
                        <p className="text-muted-foreground">Nenhum departamento criado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
