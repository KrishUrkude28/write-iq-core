import { useWorkspace } from "@/hooks/use-workspace";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useServerFn } from "@tanstack/react-start";
import { createWorkspace } from "@/server/workspace.functions";
import { toast } from "sonner";
import { useState } from "react";
import { ChevronDown, Plus, LayoutGrid, Check, Settings } from "lucide-react";

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspaceId, refresh } = useWorkspace();
  const createWsFn = useServerFn(createWorkspace);
  
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const slug = name.toLowerCase().replace(/\s+/g, "-");
      const newWs = await createWsFn({ data: { name: name.trim(), slug } });
      toast.success(`Workspace "${newWs.name}" created!`);
      await refresh();
      setActiveWorkspaceId(newWs.id);
      setIsOpen(false);
      setName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  if (workspaces.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-9 px-3 gap-2 border border-border/50 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all active:scale-95"
        >
          <LayoutGrid className="w-4 h-4 text-primary" />
          <span className="max-w-[120px] truncate font-medium">
            {activeWorkspace?.name || "Select Workspace"}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 glassmorphic border-border/50 animate-in fade-in zoom-in duration-200">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        
        <div className="max-h-[300px] overflow-y-auto">
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => setActiveWorkspaceId(ws.id)}
              className="flex items-center justify-between cursor-pointer px-2 py-2 m-1 rounded-md transition-colors hover:bg-primary/10"
            >
              <div className="flex flex-col">
                <span className="font-medium">{ws.name}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{ws.role}</span>
              </div>
              {activeWorkspace?.id === ws.id && (
                <div className="bg-primary/20 p-1 rounded-full">
                  <Check className="w-3 h-3 text-primary" />
                </div>
              )}
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="bg-border/50" />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem 
              onSelect={(e) => e.preventDefault()}
              className="gap-2 cursor-pointer text-primary focus:text-primary focus:bg-primary/10 m-1 rounded-md py-2"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">New Workspace</span>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] glassmorphic">
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                Establish a new collaborative space for your team.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  placeholder="Acme Writing Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Link to="/workspace-settings">
          <DropdownMenuItem 
            className="gap-2 cursor-pointer m-1 rounded-md py-2"
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium">Workspace Settings</span>
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
