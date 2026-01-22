export const runtime = 'edge';

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvite } from "@/app/actions/org-team";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function JoinTeamPage({ searchParams }: { searchParams: { token: string } }) {
    const token = searchParams.token;

    if (!token) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Erro</CardTitle>
                        <CardDescription>Link de convite inválido ou em falta.</CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button asChild><Link href="/">Voltar à Home</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch Invite Details Security (using RPC)
    // Fetch Invite Details Security (using RPC)
    const { data: invite, error } = await (supabase
        .rpc('get_invite_details', { invite_token: token } as any) as any)
        .single();

    const isValid = !error && invite;

    async function handleAccept() {
        "use server";
        const result = await acceptInvite(token);
        if (result.success) {
            redirect(`/dashboard/org/${invite.organization_id}`);
        } else {
            // Handle error display? redirect to error page?
            // for simplicity, we redirect to dashboard with error?
            // or stay here.
            // Server actions inside server components is tricky for state.
            // Better to use Client Component wrapper if we want interactivity.
            // converting this default logic to just server-side form submission.
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        {isValid ? <CheckCircle2 className="h-6 w-6 text-blue-600" /> : <XCircle className="h-6 w-6 text-red-600" />}
                    </div>
                    <CardTitle className="text-2xl">
                        {isValid ? "Convite para Equipa" : "Convite Inválido"}
                    </CardTitle>
                    {isValid && (
                        <CardDescription className="text-base mt-2">
                            Foi convidado para se juntar à organização <br />
                            <span className="font-semibold text-gray-900 text-lg">{invite?.organization_name}</span>
                            <br /> como <span className="capitalize">{invite?.role}</span>.
                        </CardDescription>
                    )}
                </CardHeader>

                <CardContent>
                    {!isValid && (
                        <p className="text-center text-gray-500">
                            Este convite expirou ou não existe.
                        </p>
                    )}

                    {isValid && !user && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
                            Precisa de ter uma conta GigHub para aceitar este convite.
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    {isValid && user && (
                        <form action={handleAccept} className="w-full">
                            <Button type="submit" className="w-full text-lg h-12">
                                Aceitar Convite
                            </Button>
                        </form>
                    )}

                    {isValid && !user && (
                        <div className="flex flex-col gap-2 w-full">
                            <Button asChild className="w-full" variant="default">
                                <Link href={`/login?next=/join-team?token=${token}`}>Entrar</Link>
                            </Button>
                            <Button asChild className="w-full" variant="outline">
                                <Link href={`/register?next=/join-team?token=${token}`}>Criar Conta</Link>
                            </Button>
                        </div>
                    )}

                    <Button asChild variant="ghost" className="mt-2">
                        <Link href="/dashboard">Não, obrigado</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
