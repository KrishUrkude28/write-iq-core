import { DOCUMENT_TEMPLATES, DocumentTemplate } from "@/lib/templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Megaphone, GraduationCap, Linkedin, Mail, Search, Sparkles } from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, any> = {
  Megaphone,
  GraduationCap,
  Linkedin,
  Mail,
};

interface TemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: DocumentTemplate) => void;
}

export function TemplateGallery({ open, onOpenChange, onSelect }: TemplateGalleryProps) {
  const [search, setSearch] = useState("");

  const filtered = DOCUMENT_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-none glass-morphism">
        <div className="p-6 pb-0">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Template Gallery
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Select a professional structure to jumpstart your writing session.
            </DialogDescription>
          </DialogHeader>

          <div className="relative my-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, or use case..."
              className="pl-9 h-11 bg-background/50 border-white/10 focus:ring-primary/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-white/10">
          <div className="grid grid-cols-2 gap-4">
            {filtered.length > 0 ? (
              filtered.map((template) => {
                const Icon = ICON_MAP[template.icon] || Megaphone;
                return (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template)}
                    className="flex flex-col text-left p-5 rounded-2xl border border-white/5 bg-white/5 hover:border-primary/40 hover:bg-white/10 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
                    
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    
                    <h3 className="font-bold text-foreground text-lg mb-1 group-hover:text-primary transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                      {template.description}
                    </p>
                    
                    <div className="mt-auto flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary-foreground border border-primary/20">
                        {template.category}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="col-span-2 py-12 text-center">
                <p className="text-muted-foreground">No templates found matching "{search}"</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
