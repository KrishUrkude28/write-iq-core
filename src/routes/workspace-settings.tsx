import { createFileRoute, Link } from "@tanstack/react-router";
import { UserMenu } from "@/components/auth/UserMenu";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { useWorkspace } from "@/hooks/use-workspace";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { 
  listWorkspaceMembers, 
  inviteToWorkspace, 
  removeMember 
} from "@/server/workspace.functions";
import { getWorkspaceUsage } from "@/server/usage.functions";
import { 
  getRetentionPolicy, 
  updateRetentionPolicy, 
  cleanupWorkspaceData 
} from "@/server/retention.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Users, 
  Settings, 
  Shield, 
  Mail, 
  Plus, 
  Trash2, 
  ArrowLeft,
  LayoutGrid,
  Lock,
  Loader2,
  BarChart3,
  CreditCard,
  Clock,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace-settings")({
  component: WorkspaceSettings,
});

function WorkspaceSettings() {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const listMembersFn = useServerFn(listWorkspaceMembers);
  const inviteFn = useServerFn(inviteToWorkspace);
  const removeFn = useServerFn(removeMember);
  const getUsageFn = useServerFn(getWorkspaceUsage);
  const getRetentionFn = useServerFn(getRetentionPolicy);
  const updateRetentionFn = useServerFn(updateRetentionPolicy);
  const cleanupFn = useServerFn(cleanupWorkspaceData);

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<{ credits_total: number, credits_used: number } | null>(null);
  const [retention, setRetention] = useState<{ retention_days: number, auto_archive: boolean }>({
    retention_days: 0,
    auto_archive: false
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  const refreshData = async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    try {
      const [membersData, usageData, retentionData] = await Promise.all([
        listMembersFn({ data: { workspaceId: activeWorkspaceId } }),
        getUsageFn({ data: { workspaceId: activeWorkspaceId } }),
        getRetentionFn({ data: { workspaceId: activeWorkspaceId } })
      ]);
      setMembers(membersData);
      setUsage(usageData);
      if (retentionData) setRetention(retentionData as any);
    } catch (err: any) {
      toast.error(err.message || "Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeWorkspaceId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspaceId) return;
    
    setInviting(true);
    const tid = toast.loading(`Sending invite to ${inviteEmail}...`);
    try {
      await inviteFn({ 
        data: { 
          workspaceId: activeWorkspaceId, 
          userEmail: inviteEmail.trim(), 
          role: "member" 
        } 
      });
      toast.success("Member added to workspace!", { id: tid });
      setInviteEmail("");
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Invitation failed", { id: tid });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeWorkspaceId) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await removeFn({ data: { workspaceId: activeWorkspaceId, userId } });
      toast.success("Member removed.");
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  const saveRetention = async (newRetention: typeof retention) => {
    if (!activeWorkspaceId) return;
    setSavingRetention(true);
    try {
      await updateRetentionFn({
        data: {
          workspaceId: activeWorkspaceId,
          retentionDays: newRetention.retention_days,
          autoArchive: newRetention.auto_archive,
        }
      });
      setRetention(newRetention);
      toast.success("Retention policy updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update retention policy");
    } finally {
      setSavingRetention(false);
    }
  };

  const runCleanup = async () => {
    if (!activeWorkspaceId) return;
    if (!confirm("Are you sure? This will permanently delete old analysis data based on your retention policy.")) return;
    
    setCleaningUp(true);
    const tid = toast.loading("Running data cleanup...");
    try {
      const res = await cleanupFn({ data: { workspaceId: activeWorkspaceId } });
      toast.success(`Cleanup complete! Deleted ${res.deletedCount || 0} old records.`, { id: tid });
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Cleanup failed", { id: tid });
    } finally {
      setCleaningUp(false);
    }
  };

  if (!activeWorkspace) return null;

  const usagePercent = usage ? (usage.credits_used / usage.credits_total) * 100 : 0;
  const isNearLimit = usagePercent > 80;

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
              >
                <LayoutGrid className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="font-display font-bold text-xl tracking-tight">WriteIQ</div>
            </Link>
            <div className="h-6 w-[1px] bg-border/60 mx-2 hidden md:block" />
            <WorkspaceSwitcher />
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Workspace Settings</h1>
            <p className="text-muted-foreground">Manage members and preferences for {activeWorkspace.name}.</p>
          </div>
        </div>

        <div className="space-y-12">
          {/* General Settings */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> General
            </h2>
            <Card className="p-6 space-y-4 shadow-soft">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Workspace Name</Label>
                <div className="flex gap-4">
                  <Input id="ws-name" defaultValue={activeWorkspace.name} className="max-w-sm" />
                  <Button variant="outline">Update</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-slug">Workspace Slug</Label>
                <Input id="ws-slug" defaultValue={activeWorkspace.slug} disabled className="max-w-sm bg-secondary/50" />
                <p className="text-[10px] text-muted-foreground italic">Slugs are permanent and used for direct workspace URLs.</p>
              </div>
            </Card>
          </section>

          {/* Usage & Billing */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Usage & Billing
              </h2>
              <Badge variant="outline" className="gap-1">
                <CreditCard className="w-3 h-3" /> Professional Plan
              </Badge>
            </div>
            <Card className="p-6 shadow-soft space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">AI Credits Used</span>
                  <span className="text-muted-foreground">
                    {usage?.credits_used?.toLocaleString()} / {usage?.credits_total?.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={usagePercent} 
                  className={cn("h-2", isNearLimit ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary")}
                />
                <p className="text-[11px] text-muted-foreground">
                  Credits reset on the 1st of every month. Your current plan includes 1,000 monthly credits.
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10">
                <div>
                  <h4 className="text-sm font-semibold">Need more credits?</h4>
                  <p className="text-xs text-muted-foreground">Upgrade to Enterprise for unlimited credits and bulk analysis tools.</p>
                </div>
                <Button size="sm" style={{ background: "var(--gradient-primary)" }}>Upgrade Now</Button>
              </div>
            </Card>
          </section>

          {/* Data Retention Policies */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Data Retention
            </h2>
            <Card className="p-6 shadow-soft space-y-6">
              <div className="flex items-center justify-between gap-8">
                <div className="space-y-1">
                  <Label>Retention Period</Label>
                  <p className="text-xs text-muted-foreground">How long to keep analysis history before deletion.</p>
                </div>
                <Select 
                  value={String(retention.retention_days)} 
                  onValueChange={(val) => saveRetention({ ...retention, retention_days: Number(val) })}
                  disabled={savingRetention}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Indefinite</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                    <SelectItem value="365">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />

              <div className="flex items-center justify-between gap-8">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    Auto-Archive
                    <Badge variant="secondary" className="text-[9px] uppercase h-4">Alpha</Badge>
                  </Label>
                  <p className="text-xs text-muted-foreground">Automatically delete records older than the retention period.</p>
                </div>
                <Switch 
                  checked={retention.auto_archive} 
                  onCheckedChange={(val) => saveRetention({ ...retention, auto_archive: val })}
                  disabled={savingRetention}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between items-start gap-8">
                <div>
                  <h4 className="text-sm font-semibold">Manual Cleanup</h4>
                  <p className="text-xs text-muted-foreground mt-1">Immediately trigger a cleanup of data outside your retention policy.</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2" 
                  onClick={runCleanup}
                  disabled={cleaningUp || retention.retention_days === 0}
                >
                  {cleaningUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Run Cleanup
                </Button>
              </div>
            </Card>
          </section>

          {/* Members Management */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Team Members
              </h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {activeWorkspace.role === 'owner' ? 'Owner Access' : 'Member Access'}
              </Badge>
            </div>
            
            <Card className="overflow-hidden shadow-soft">
              <div className="p-6 border-b border-border/40 bg-secondary/10">
                <form onSubmit={handleInvite} className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="email" className="sr-only">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        placeholder="colleague@company.com" 
                        className="pl-10" 
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        disabled={inviting}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="gap-2" disabled={inviting}>
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Invite
                  </Button>
                </form>
              </div>

              <div className="divide-y divide-border/40">
                {loading ? (
                  <div className="p-12 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    No members found.
                  </div>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="px-6 py-4 flex items-center justify-between group hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary overflow-hidden shadow-inner">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            member.name[0]
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {member.name}
                            {member.role === 'owner' && <Shield className="w-3 h-3 text-amber-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-[10px] capitalize font-medium">{member.role}</Badge>
                        {member.role !== 'owner' && activeWorkspace.role === 'owner' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>

          {/* Security & Danger Zone */}
          <section className="space-y-4 pt-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
              <Lock className="w-5 h-5" /> Danger Zone
            </h2>
            <Card className="p-6 border-destructive/20 bg-destructive/5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-8">
                <div>
                  <h3 className="font-semibold text-sm">Archive Workspace</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will make all analyses and voices in this workspace read-only for all members.
                  </p>
                </div>
                <Button variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10">Archive</Button>
              </div>
              <Separator className="bg-destructive/10" />
              <div className="flex items-center justify-between gap-8">
                <div>
                  <h3 className="font-semibold text-sm">Delete Workspace</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Permanently delete this workspace and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button variant="destructive">Delete Workspace</Button>
              </div>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
