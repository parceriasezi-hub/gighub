"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, PlusCircle, User, Building2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth, type Organization } from "@/contexts/auth-context"

export function OrgSwitcher({ className }: { className?: string }) {
    const { organizations, currentOrganization, switchOrganization, user } = useAuth()
    const router = useRouter()
    const [open, setOpen] = React.useState(false)

    const handleSelectOrg = (orgId: string) => {
        switchOrganization(orgId)
        router.push(`/dashboard/org/${orgId}`)
        setOpen(false)
    }

    const handleSelectPersonal = () => {
        switchOrganization(null)
        router.push("/dashboard")
        setOpen(false)
    }

    const activeLabel = currentOrganization ? currentOrganization.legal_name : "Personal Account"

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Select a workspace"
                    className={cn("w-full justify-between mb-4", className)}
                >
                    {currentOrganization ? (
                        <Building2 className="mr-2 h-4 w-4" />
                    ) : (
                        <User className="mr-2 h-4 w-4" />
                    )}
                    <span className="truncate flex-1 text-left">{activeLabel}</span>
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandList>
                        <CommandInput placeholder="Search workspace..." />
                        <CommandEmpty>No workspace found.</CommandEmpty>
                        <CommandGroup heading="Personal">
                            <CommandItem
                                onSelect={handleSelectPersonal}
                                className="text-sm"
                            >
                                <User className="mr-2 h-4 w-4" />
                                Personal Account
                                {!currentOrganization && (
                                    <Check className="ml-auto h-4 w-4" />
                                )}
                            </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Organizations">
                            {organizations.map((org) => (
                                <CommandItem
                                    key={org.id}
                                    onSelect={() => handleSelectOrg(org.id)}
                                    className="text-sm"
                                >
                                    <Building2 className="mr-2 h-4 w-4" />
                                    {org.legal_name}
                                    {currentOrganization?.id === org.id && (
                                        <Check className="ml-auto h-4 w-4" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                    setOpen(false)
                                    router.push("/register?tab=company") // Assuming simple redirect for now or create a modal later
                                }}
                            >
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Create Organization
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
