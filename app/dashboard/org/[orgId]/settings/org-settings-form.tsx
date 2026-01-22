"use client";

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
import { useFormState, useFormStatus } from "react-dom";
import { updateOrganizationDetails, OrgSettingsState } from "@/app/actions/org-settings";

const initialState: OrgSettingsState = {
    message: "",
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "A guardar..." : "Guardar Alterações"}
        </Button>
    );
}

export function OrgSettingsForm({ organization }: { organization: any }) {
    // @ts-ignore
    const [state, formAction] = useFormState(updateOrganizationDetails, initialState);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dados Gerais</CardTitle>
                <CardDescription>
                    Informações visíveis nos documentos e na plataforma.
                </CardDescription>
            </CardHeader>
            <form action={formAction}>
                <CardContent className="space-y-4">
                    <input type="hidden" name="organizationId" value={organization.id} />

                    <div className="grid gap-2">
                        <Label htmlFor="legalName">Nome Legal</Label>
                        <Input
                            id="legalName"
                            name="legalName"
                            defaultValue={organization.legal_name}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="vatNumber">NIF</Label>
                        <Input
                            id="vatNumber"
                            name="vatNumber"
                            defaultValue={organization.vat_number}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address">Morada</Label>
                        <Input
                            id="address"
                            name="address"
                            defaultValue={organization.address || ""}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                            id="website"
                            name="website"
                            defaultValue={organization.website || ""}
                            placeholder="https://..."
                        />
                    </div>

                    {state?.message && (
                        <div className={`text-sm ${state.success ? 'text-green-600' : 'text-red-500'}`}>
                            {state.message}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
    );
}
