import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PresenceUser {
  user_id: string;
  email: string;
  online_at: string;
}

export function Presence() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const channel = supabase.channel("presence_global", {
      config: {
        presence: {
          key: "global",
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            users.push(p);
          });
        });
        // Filter unique users by id
        const uniqueUsers = Array.from(new Map(users.map(u => [u.user_id, u])).values());
        setOnlineUsers(uniqueUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const session = await supabase.auth.getSession();
          const user = session.data.session?.user;
          if (user) {
            await channel.track({
              user_id: user.id,
              email: user.email,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (onlineUsers.length <= 1) return null;

  return (
    <div className="flex items-center -space-x-2">
      <TooltipProvider>
        {onlineUsers.map((user) => (
          <Tooltip key={user.user_id}>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border cursor-default hover:translate-y-[-2px] transition-transform">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_id}`} />
                <AvatarFallback className="text-[10px]">
                  {user.email.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-medium">{user.email} is online</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {onlineUsers.length > 5 && (
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-secondary text-[10px] font-bold border-2 border-background">
            +{onlineUsers.length - 5}
          </div>
        )}
      </TooltipProvider>
    </div>
  );
}
