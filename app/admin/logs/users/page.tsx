"use client"

export const runtime = "edge"
export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
// ... (imports remain)
import { DateRange } from "react-day-picker"

export default function UserLogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [date, setDate] = useState<DateRange | undefined>(undefined)
    const loadLogs = async () => {
        setLoading(true)
        try {
            // Use server action to fetch logs
            const data = await getLogs({
                role: 'user',
                search: search,
                startDate: date?.from,
                endDate: date?.to,
            })
            setLogs(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Failed to load logs", error)
            setLogs([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadLogs()
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Registo de Atividade de Utilizadores</h1>
                <Button onClick={loadLogs} variant="outline" size="icon">
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Pesquisar por nome, email, ação..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[300px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y", { locale: pt })} -{" "}
                                                {format(date.to, "LLL dd, y", { locale: pt })}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y", { locale: pt })
                                        )
                                    ) : (
                                        <span>Selecione um intervalo de datas</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                        <Button onClick={loadLogs}>Aplicar</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data/Hora</TableHead>
                                <TableHead>Utilizador</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Ação</TableHead>
                                <TableHead>Detalhes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        Nenhum registo encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log: any) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{log.users?.raw_user_meta_data?.full_name || "N/A"}</span>
                                                <span className="text-xs text-gray-500">{log.users?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={log.user_role === 'provider' ? 'default' : 'secondary'}>
                                                {log.user_role === 'provider' ? (
                                                    <><Briefcase className="w-3 h-3 mr-1" /> Provider</>
                                                ) : (
                                                    <><User className="w-3 h-3 mr-1" /> Client</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-gray-700">{log.action}</span>
                                        </TableCell>
                                        <TableCell>
                                            <pre className="text-xs bg-gray-50 p-2 rounded max-w-[300px] overflow-auto">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
