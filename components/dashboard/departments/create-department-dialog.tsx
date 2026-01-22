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
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createDepartment, DepartmentState } from "@/app/actions/org-departments";
import { PlusCircle } from "lucide-react";

const initialState: DepartmentState = {
    message: "",
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "A criar..." : "Criar Departamento"}
        </Button>
    );
}

export function CreateDepartmentDialog({ organizationId }: { organizationId: string }) {
    const [open, setOpen] = useState(false);
    // @ts-ignore
    const [state, formAction] = useFormState(createDepartment, initialState);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Departamento
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Criar Departamento</DialogTitle>
                    <DialogDescription>
                        Crie uma nova área para organizar a sua equipa.
                    </DialogDescription>
                </DialogHeader>

                <form action={formAction} className="grid gap-4 py-4">
                    <input type="hidden" name="organizationId" value={organizationId} />

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Nome
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Ex: Marketing, Vendas"
                            className="col-span-3"
                            required
                        />
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
