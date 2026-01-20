"use client"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useNotifications } from "@/hooks/use-notifications" // Assuming this hook exists and works

interface NotificationCenterProps {
  onClose?: () => void
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { notifications, markAsRead, markAllAsRead, clearAllNotifications } = useNotifications()

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  return (
    <Card className="w-full max-w-md md:max-w-lg lg:max-w-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Notificações ({unreadNotifications.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={unreadNotifications.length === 0}>
            Marcar todas como lidas
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAllNotifications} disabled={notifications.length === 0}>
            Limpar todas
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Bell className="h-8 w-8 mb-2" />
            <p>Não há notificações.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-gray-200">
              {unreadNotifications.length > 0 && (
                <>
                  <h3 className="px-4 py-2 text-sm font-medium text-gray-600">Não Lidas</h3>
                  {unreadNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors ${notification.data?.action_url ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (notification.data?.action_url) {
                          window.location.href = notification.data.action_url
                        }
                      }}
                    >
                      <div className="flex-1 grid gap-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-sm text-gray-500">{notification.message}</p>
                        <time className="text-xs text-gray-400">
                          {new Date(notification.created_at).toLocaleString()}
                        </time>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                        >
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  ))}
                  {readNotifications.length > 0 && <Separator className="my-2" />}
                </>
              )}

              {readNotifications.length > 0 && (
                <>
                  <h3 className="px-4 py-2 text-sm font-medium text-gray-600">Lidas</h3>
                  {readNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-4 p-4 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 grid gap-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-sm">{notification.message}</p>
                        <time className="text-xs text-gray-400">
                          {new Date(notification.created_at).toLocaleString()}
                        </time>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
