import { createClient } from "@/lib/supabase/server";

export type OrganizationRole = "owner" | "admin" | "member";

export async function getCurrentOrgRole(organizationId: string): Promise<OrganizationRole | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: member } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

    // Safety check and casting
    if (!member) return null;
    return (member as any).role as OrganizationRole;
}

export function canManageTeam(role: OrganizationRole | null): boolean {
    return role === "owner" || role === "admin";
}

export function canDeleteOrganization(role: OrganizationRole | null): boolean {
    return role === "owner";
}

export function canUpdateRole(userRole: OrganizationRole | null, targetRole: OrganizationRole): boolean {
    if (!userRole) return false;
    if (userRole === "owner") return true;
    if (userRole === "admin" && targetRole === "member") return true;
    return false;
}
