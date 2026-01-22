import { createClient } from "@/lib/supabase/server";
import { InviteMemberDialog } from "@/components/dashboard/team/invite-member-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { cancelInvite, removeMember } from "@/app/actions/org-team";
import { Trash2 } from "lucide-react";
import { canManageTeam, getCurrentOrgRole } from "@/lib/b2b/permissions";

export default async function TeamPage({ params }: { params: { orgId: string } }) {
    const supabase = await createClient();
    const orgId = params.orgId;

    // Check Permissions
    const currentUserRole = await getCurrentOrgRole(orgId);
    const canManage = canManageTeam(currentUserRole);

    // Fetch Members
    const { data: rawMembers, error: membersError } = await supabase
        .from("organization_members")
        .select(`
      id,
      role,
      created_at,
      profiles (
        full_name,
        email,
        avatar_url
      )
    `)
        .eq("organization_id", orgId);

    // Explicit casting to handle Supabase complex joins if types are not perfect
    const members = rawMembers as any[];

    // Fetch Invites
    const { data: rawInvites, error: invitesError } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("organization_id", orgId)
        .neq("status", "accepted"); // Only show pending/expired

    const invites = rawInvites as any[];

    // Simple formatter for name initials
    const getInitials = (name: string) => {
        return name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "??";
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestão de Equipa</h2>
                    <p className="text-muted-foreground">
                        Gerencie os membros e as permissões da sua organização.
                    </p>
                </div>
                {canManage && <InviteMemberDialog organizationId={orgId} />}
            </div>

            {/* Members Section Permissions Warning */}
            {!canManage && (
                <div className="bg-blue-50 text-blue-800 p-4 rounded-md mb-4 text-sm">
                    Tem acesso de leitura. Apenas administradores podem gerir a equipa.
                </div>
            )}

            {/* Members Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Membros Ativos</CardTitle>
                    <CardDescription>
                        Pessoas que têm acesso a este espaço de trabalho.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Utilizador</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Data de Entrada</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members?.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={member.profiles?.avatar_url || ""} />
                                            <AvatarFallback>
                                                {getInitials(member.profiles?.full_name || "")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{member.profiles?.full_name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {member.profiles?.email}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                                            {member.role === "owner" ? "Proprietário" :
                                                member.role === "admin" ? "Administrador" : "Membro"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(member.created_at).toLocaleDateString("pt-PT")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {canManage && member.role !== "owner" && (
                                            <form action={async () => {
                                                "use server";
                                                await removeMember(member.id, orgId);
                                            }}>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </form>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {members?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        Nenhum membro encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Invites Section */}
            {canManage && invites && invites.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Convites Pendentes</CardTitle>
                        <CardDescription>
                            Convites enviados que ainda não foram aceites.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Enviado em</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invites.map((invite) => (
                                    <TableRow key={invite.id}>
                                        <TableCell>{invite.email}</TableCell>
                                        <TableCell className="capitalize">
                                            {invite.role === "admin" ? "Administrador" : "Membro"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{invite.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(invite.created_at).toLocaleDateString("pt-PT")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <form action={async () => {
                                                "use server";
                                                await cancelInvite(invite.id, orgId);
                                            }}>
                                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                                    Cancelar
                                                </Button>
                                            </form>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
