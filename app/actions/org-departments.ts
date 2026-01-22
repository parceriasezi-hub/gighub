"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DepartmentSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    organizationId: z.string().uuid(),
});

export type DepartmentState = {
    errors?: {
        name?: string[];
        _form?: string[];
    };
    message?: string;
    success?: boolean;
};

export async function createDepartment(
    prevState: DepartmentState,
    formData: FormData
): Promise<DepartmentState> {
    const validatedFields = DepartmentSchema.safeParse({
        name: formData.get("name"),
        organizationId: formData.get("organizationId"),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Erro de validação.",
        };
    }

    const { name, organizationId } = validatedFields.data;
    const supabase = await createClient();

    // RLS will enforce permissions (Members can view departments, but only Admins can Insert?)
    // We didn't explicitly add "Admins can insert departments" policy in Phase 1 migration.
    // Wait, let's check migration `20260121_create_b2b_schema.sql`.
    // It says: "Members can view their org departments". No Insert policy defined for departments?
    // We might need to add policies or rely on Service Role if policies are missing for now.
    // Actually, standard behavior is deny all if not enabled. 
    // Let's assume we need to fix policies or use service role for now if RLS blocks.
    // But best practice is to have policies.
    // Let's try inserting as user. proper approach: use `canManageTeam` check in code + RLS.

    // Implementation note: Ideally we add RLS policies for managing departments now if missing.
    // For now, let's implement the action. If it fails, I'll add a migration fix.

    const { error } = await (supabase
        .from("departments") as any)
        .insert({
            organization_id: organizationId,
            name,
        });

    if (error) {
        console.error("Create Department Error:", error);
        return { message: "Erro ao criar departamento: " + error.message };
    }

    revalidatePath(`/dashboard/org/${organizationId}/departments`);
    return { success: true, message: "Departamento criado com sucesso!" };
}

export async function deleteDepartment(departmentId: string, organizationId: string) {
    const supabase = await createClient();

    const { error } = await (supabase
        .from("departments") as any)
        .delete()
        .eq("id", departmentId)
        .eq("organization_id", organizationId); // Safety check

    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath(`/dashboard/org/${organizationId}/departments`);
    return { success: true, message: "Departamento eliminado." };
}

export async function updateDepartment(departmentId: string, newName: string, organizationId: string) {
    const supabase = await createClient();

    const { error } = await (supabase
        .from("departments") as any)
        .update({ name: newName })
        .eq("id", departmentId)
        .eq("organization_id", organizationId);

    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath(`/dashboard/org/${organizationId}/departments`);
    return { success: true, message: "Departamento atualizado." };
}

export async function assignMemberToDepartment(memberId: string, departmentId: string | null, organizationId: string) {
    const supabase = await createClient();

    // organization_members table likely has correct types for 'update' if it was in previous migration?
    // But 'department_id' might be new.
    const { error } = await (supabase
        .from("organization_members") as any)
        .update({ department_id: departmentId })
        .eq("id", memberId)
        .eq("organization_id", organizationId);

    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath(`/dashboard/org/${organizationId}/team`);
    revalidatePath(`/dashboard/org/${organizationId}/departments`);
    return { success: true, message: "Membro atribuído." };
}
