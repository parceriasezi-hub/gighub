export const runtime = 'edge';

import { createClient } from "@/lib/supabase/server";
import { updateOrganizationDetails, deleteOrganizationAction } from "@/app/actions/org-settings";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { canDeleteOrganization, canManageTeam, getCurrentOrgRole } from "@/lib/b2b/permissions";
import { redirect } from "next/navigation";
import { OrgSettingsForm } from "./org-settings-form";

export default async function SettingsPage({ params }: { params: { orgId: string } }) {
    const supabase = await createClient();
    const orgId = params.orgId;

    // Permissions
    const role = await getCurrentOrgRole(orgId);
    if (!canManageTeam(role)) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Não tem permissão para aceder a esta página.
            </div>
        );
    }

    // Fetch Data
    const { data: organization } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

    if (!organization) return <div>Organização não encontrada</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Definições</h2>
                <p className="text-muted-foreground">
                    Gerencie os detalhes e preferências da sua organização.
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="billing" disabled>Faturação (Brevemente)</TabsTrigger>
                    {canDeleteOrganization(role) && <TabsTrigger value="danger" className="text-red-500">Zona de Perigo</TabsTrigger>}
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <OrgSettingsForm organization={organization} />
                </TabsContent>

                <TabsContent value="danger">
                    <Card className="border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-600">Eliminar Organização</CardTitle>
                            <CardDescription>
                                Esta ação é irreversível. Todos os dados, departamentos e associações de membros serão permanentemente removidos.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <form action={async () => {
                                "use server";
                                await deleteOrganizationAction(orgId);
                                redirect('/dashboard');
                            }}>
                                <Button variant="destructive">Eliminar Organização</Button>
                            </form>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
