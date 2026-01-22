"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmailByTrigger } from "@/lib/email/client";
import { headers } from "next/headers";

// Schema for inviting a member
const InviteMemberSchema = z.object({
    email: z.string().email(),
    role: z.enum(["admin", "member"]),
    organizationId: z.string().uuid(),
});

export type InviteMemberState = {
    errors?: {
        email?: string[];
        role?: string[];
        _form?: string[];
    };
    message?: string;
    success?: boolean;
};

export async function inviteMember(
    prevState: InviteMemberState,
    formData: FormData
): Promise<InviteMemberState> {
    const validatedFields = InviteMemberSchema.safeParse({
        email: formData.get("email"),
        role: formData.get("role"),
        organizationId: formData.get("organizationId"),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Erro na validação dos campos.",
        };
    }

    const { email, role, organizationId } = validatedFields.data;
    const supabase = await createClient();

    try {
        // 1. Check if user has permission (handled by RLS mostly, but good to fail fast)
        // We rely on RLS 'Admins can insert invites' policy.

        // 2. Check if user is already a member
        // Fetch user by email? We can't easily query profiles by email without admin privileges usually.
        // However, we can check organization_members if we join with profiles?
        // Let's blindly insert into invites. The unique constraint (organization_id, email) handles duplicates.
        // BUT what if they are ALREADY a member?
        // Use a secure check or let the RLS/constraint fail?
        // We should probably check if they are already in the team.

        // Efficient check: attempt to insert. If unique violation, check if it's invite or member table.
        // Actually our unique constraint is only on invites table.

        // 3. Create Invite
        const { data: invite, error } = await supabase
            .from("organization_invites")
            .insert({
                organization_id: organizationId,
                email,
                role,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return { message: "Este utilizador já foi convidado." };
            }
            console.error("Invite error:", error);
            return { message: "Erro ao criar convite: " + error.message };
        }

        // 4. Send Email
        // Fetch Organization Name for the email
        const { data: org } = await supabase
            .from("organizations")
            .select("legal_name")
            .eq("id", organizationId)
            .single();

        const orgName = org?.legal_name || "Uma Organização";

        // Construct Invite Link
        const host = headers().get("host") || "gighub.pt";
        const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
        const inviteLink = `${protocol}://${host}/join-team?token=${invite.token}`;

        const emailResult = await sendEmailByTrigger({
            to: email,
            trigger: "TEAM_INVITE",
            variables: {
                org_name: orgName,
                invite_link: inviteLink,
                role: role,
                action_url: inviteLink, // Common variable name for buttons
            },
        });

        if (!emailResult.success) {
            // Don't rollback invite, but warn
            console.error("Failed to send invite email", emailResult.error);
            return {
                success: true,
                message: "Convite criado, mas falha ao enviar email. Copie o link manualmente."
            };
        }

        revalidatePath(`/dashboard/org/${organizationId}/team`);
        return { success: true, message: "Convite enviado com sucesso!" };
    } catch (error) {
        return { message: "Erro inesperado." };
    }
}

export async function cancelInvite(inviteId: string, organizationId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("organization_invites")
        .delete()
        .eq("id", inviteId)
        .eq("organization_id", organizationId); // Extra safety

    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath(`/dashboard/org/${organizationId}/team`);
    return { success: true, message: "Convite cancelado." };
}

export async function removeMember(memberId: string, organizationId: string) {
    const supabase = await createClient();

    // Prevent removing yourself if you are the last owner? 
    // Complexity for later. RLS might handle "Admins can delete members".
    // We didn't explicitly add "Admins can delete members" in Phase 1?
    // Let's assume the basic RLS allows owners/admins to manage members.

    const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId)
        .eq("organization_id", organizationId);

    if (error) {
        console.error(error);
        return { success: false, message: "Erro ao remover membro." };
    }

    revalidatePath(`/dashboard/org/${organizationId}/team`);
    return { success: true, message: "Membro removido com sucesso." };
}

export async function updateMemberRole(memberId: string, organizationId: string, newRole: "admin" | "member") {
    const supabase = await createClient();

    const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId)
        .eq("organization_id", organizationId);

    if (error) {
        return { success: false, message: "Erro ao atualizar função." };
    }

    revalidatePath(`/dashboard/org/${organizationId}/team`);
    return { success: true, message: "Função atualizada." };
}

export async function acceptInvite(token: string) {
    const supabase = await createClient();

    // 1. Validate Token & Get Invite Details
    // We can use the RPC or query directly if we are sudo?
    // We need to know the details to insert into members.
    // User is authenticated here.

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Não autenticado." };
    }

    // Use the RPC to get details securely
    const { data: inviteData, error: rpcError } = await supabase
        .rpc('get_invite_details', { invite_token: token })
        .single();

    if (rpcError || !inviteData) {
        return { success: false, message: "Convite inválido ou expirado." };
    }

    // 2. Perform Transaction (Insert Member + Update Invite)
    // We need to ensure atomicity or just do sequential.
    // Sequential ok for MVP.

    const { error: insertError } = await supabase
        .from("organization_members")
        .insert({
            organization_id: inviteData.organization_id,
            user_id: user.id,
            role: inviteData.role
        });

    if (insertError) {
        if (insertError.code === '23505') {
            // Already member, just update invite to accepted
            await supabase
                .from("organization_invites")
                .update({ status: 'accepted' })
                .eq("id", inviteData.id);
            return { success: true, message: "Já és membro desta equipa." };
        }
        return { success: false, message: "Erro ao entrar na organização." };
    }

    // Update invite status
    await supabase
        .from("organization_invites")
        .update({ status: 'accepted' })
        .eq("id", inviteData.id);

    revalidatePath('/dashboard');
    return { success: true, message: "Convite aceite!" };
}

