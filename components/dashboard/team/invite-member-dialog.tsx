"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { inviteMember, InviteMemberState } from "@/app/actions/org-team";
import { UserPlus } from "lucide-react";

const initialState: InviteMemberState = {
    message: "",
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "A enviar..." : "Enviar Convite"}
        </Button>
    );
}

export function InviteMemberDialog({ organizationId }: { organizationId: string }) {
    const [open, setOpen] = useState(false);
    // We need to wrap the action to include organizationId if not passed in hidden input, 
    // but using hidden input is easier for direct server action.

    // @ts-ignore
    const [state, formAction] = useFormState(inviteMember, initialState);

    // Close dialog on success? 
    // We can listen to state changes.
    // Simple check: if state.success changed to true, close.
    // React hook logic is simpler if we just handle it or let user close.
    // Ideally use `useEffect` to close dialog if state.success is true.

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Convidar Membro
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Convidar Membro</DialogTitle>
                    <DialogDescription>
                        Envie um convite por email para adicionar um novo membro à sua equipa.
                    </DialogDescription>
                </DialogHeader>

                <form action={formAction} className="grid gap-4 py-4">
                    <input type="hidden" name="organizationId" value={organizationId} />

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="colaborador@exemplo.com"
                            className="col-span-3"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            Função
                        </Label>
                        <Select name="role" defaultValue="member">
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione uma função" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="member">Membro (Padrão)</SelectItem>
                                <SelectItem value="admin">Admin (Gestão Total)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {state?.message && (
                        <div className={`text-sm ${state.success ? 'text-green-600' : 'text-red-500'} col-span-4 text-center`}>
                            {state.message}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
