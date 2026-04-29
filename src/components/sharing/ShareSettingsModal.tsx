import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, Lock, Clock, ShieldCheck, Copy, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { updateShareSettings } from "@/server/history.functions";
import { toast } from "sonner";

interface ShareSettingsModalProps {
  id: string;
  shareId: string;
  isOpen: boolean;
  onClose: () => void;
  initialSettings?: {
    isPublic: boolean;
    expiresAt: string | null;
  };
}

export function ShareSettingsModal({
  id,
  shareId,
  isOpen,
  onClose,
  initialSettings,
}: ShareSettingsModalProps) {
  const [isPublic, setIsPublic] = useState(initialSettings?.isPublic ?? true);
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState("never");
  const [copied, setCopied] = useState(false);

  const updateSettingsFn = useServerFn(updateShareSettings);
  const shareUrl = `${window.location.origin}/share/${shareId}`;

  const handleSave = async () => {
    let expiresAt: string | null = null;
    if (expiration !== "never") {
      const date = new Date();
      if (expiration === "24h") date.setHours(date.getHours() + 24);
      if (expiration === "7d") date.setDate(date.getDate() + 7);
      if (expiration === "30d") date.setDate(date.getDate() + 30);
      expiresAt = date.toISOString();
    }

    const tid = toast.loading("Updating share settings...");
    try {
      await updateSettingsFn({
        data: {
          id,
          isPublic,
          password: password || null,
          expiresAt,
        },
      });
      toast.success("Settings updated!", { id: tid });
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to update settings", { id: tid });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-morphism border-none">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Share2 className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">Share Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure security and accessibility for this document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Public Access */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 group hover:border-primary/30 transition-colors">
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Public Access</Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Allow anyone with the link to view the document.
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Link Preview */}
          <div className="space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground px-1">
              Shareable Link
            </Label>
            <div className="flex gap-2 p-1.5 rounded-xl bg-background/50 border border-white/5 focus-within:border-primary/30 transition-colors">
              <Input
                readOnly
                value={shareUrl}
                className="bg-transparent border-none focus-visible:ring-0 h-9 text-xs font-mono"
              />
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9 shrink-0 rounded-lg bg-white/10 hover:bg-white/20"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Password Protection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-2 text-muted-foreground ml-1">
                <Lock className="w-3.5 h-3.5 text-primary/70" /> Password
              </Label>
              <Input
                type="password"
                placeholder="Optional"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 h-10 border-white/5 focus:border-primary/30 rounded-xl"
              />
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-2 text-muted-foreground ml-1">
                <Clock className="w-3.5 h-3.5 text-primary/70" /> Expiration
              </Label>
              <Select value={expiration} onValueChange={setExpiration}>
                <SelectTrigger className="bg-background/50 h-10 border-white/5 focus:border-primary/30 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-morphism border-white/10">
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-white/5 text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <ShieldCheck className="w-4 h-4" /> Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
