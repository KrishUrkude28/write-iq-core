import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Type,
  Trash2,
  Wand2,
  Check,
  Zap,
  AlignLeft,
  ChevronDown,
  RotateCcw,
  Download,
  FileText,
  FileCode,
  FileJson,
  LayoutTemplate,
} from "lucide-react";
import { exportToPDF, exportToMarkdown, exportToTxt } from "@/lib/export.functions";
import { TemplateGallery } from "./TemplateGallery";
import { DocumentTemplate } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { forwardRef, useImperativeHandle, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { rewriteSelection } from "@/server/writeiq.functions";
import { predictNextWords } from "@/server/prediction.functions";
import { GhostText } from "./extensions/GhostText";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export interface WriteIQEditorHandle {
  /** Replace the first occurrence of `original` with `replacement` in the document. */
  applyReplacement: (original: string, replacement: string) => boolean;
  /** Get current plain text content. */
  getText: () => string;
  /** Focus the editor. */
  focus: () => void;
  /** Insert text at current selection or end. */
  insertText: (text: string) => void;
  /** Trigger PDF export */
  exportPDF: () => Promise<void>;
}

interface WriteIQEditorProps {
  value: string;
  onChange: (text: string) => void;
  onAnalyze?: () => void;
  placeholder?: string;
  className?: string;
  workspaceId?: string;
}

export const WriteIQEditor = forwardRef<WriteIQEditorHandle, WriteIQEditorProps>(
  function WriteIQEditor(
    {
      value,
      onChange,
      onAnalyze,
      placeholder = "Paste or write your draft here...",
      className = "",
      workspaceId,
    },
    ref,
  ) {
    const [rewriting, setRewriting] = useState(false);
    const [templateOpen, setTemplateOpen] = useState(false);
    const predictFn = useServerFn(predictNextWords);
    const timerRef = useRef<any>(null);

    const editor = useEditor({
      extensions: [
        StarterKit,
        UnderlineExt,
        Typography,
        Placeholder.configure({ placeholder }),
        CharacterCount,
        GhostText,
      ],
      content: value,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "prose prose-sm max-w-none min-h-[260px] px-4 py-3 focus:outline-none text-base leading-relaxed",
        },
        handleKeyDown(_, event) {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            onAnalyze?.();
            return true;
          }
          if (event.key === "Tab") {
            const ghostText = (editor?.storage as any).ghostText?.text as string | undefined;
            if (ghostText) {
              event.preventDefault();
              editor?.chain().focus().insertContent(ghostText).clearGhostText().run();
              return true;
            }
          }
          return false;
        },
      },
      onUpdate({ editor }) {
        onChange(editor.getText());

        // Prediction Logic (Debounced)
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // Only predict if there's no selection and some text exists
        const { from, to } = editor.state.selection;
        if (from !== to) return;

        timerRef.current = setTimeout(async () => {
          const text = editor.getText();
          if (text.length < 10) return;

          try {
            const prediction = await predictFn({
              data: {
                contextText: text.slice(-600),
                workspaceId,
              },
            });
            if (prediction && editor.isFocused) {
              editor.commands.setGhostText(prediction);
            }
          } catch (e) {
            // Silently fail for predictions
          }
        }, 1500); // 1.5s delay to be unobtrusive
      },
    });

    const handleRewrite = async (intent: string) => {
      if (!editor || rewriting) return;
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      if (!selectedText.trim()) return;

      setRewriting(true);
      editor.commands.clearGhostText(); // clear any prediction
      const tid = toast.loading(`AI is streaming ${intent} rewrite...`);

      try {
        const response = await fetch("/api/rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: selectedText,
            intent,
            workspaceId,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Streaming failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No stream reader available");

        const decoder = new TextDecoder();
        
        // 1. Clear selection and focus
        editor.chain().focus().deleteRange({ from, to }).run();
        let currentPos = from;

        // 2. Process stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(l => l.trim() !== "");

          for (const line of lines) {
            if (line.includes("[DONE]")) break;
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content || "";
                if (content) {
                  editor.chain().insertContentAt(currentPos, content).run();
                  currentPos += content.length;
                }
              } catch (e) {
                // Silently ignore malformed chunks
              }
            }
          }
        }

        toast.success("Rewritten!", { id: tid });
      } catch (err: any) {
        toast.error(err.message || "Rewrite failed", { id: tid });
      } finally {
        setRewriting(false);
      }
    };

    useImperativeHandle(ref, () => ({
      applyReplacement(original: string, replacement: string): boolean {
        if (!editor) return false;
        const { state, dispatch } = editor.view;
        const { doc } = state;
        const fullText = doc.textContent;
        const idx = fullText.indexOf(original);
        if (idx === -1) return false;

        let charPos = 0;
        let from = -1;
        let to = -1;

        doc.nodesBetween(0, doc.content.size, (node, pos) => {
          if (!node.isText) return;
          const text = node.text ?? "";
          const nodeEnd = charPos + text.length;

          if (from === -1 && idx >= charPos && idx < nodeEnd) {
            from = pos + (idx - charPos);
          }
          if (from !== -1 && to === -1 && idx + original.length <= nodeEnd) {
            to = pos + (idx + original.length - charPos);
          }
          charPos = nodeEnd;
        });

        if (from === -1 || to === -1) {
          const tr = state.tr.insertText(replacement, from, from + original.length);
          dispatch(tr);
          return true;
        }

        const tr = state.tr.insertText(replacement, from, to);
        dispatch(tr);
        return true;
      },
      async exportPDF() {
        const tid = toast.loading("Generating PDF...");
        try {
          await exportToPDF("writeiq-editor-content", "WriteIQ_Draft.pdf");
          toast.success("PDF Downloaded", { id: tid });
        } catch (err) {
          toast.error("Export failed", { id: tid });
        }
      },
      getText() {
        return editor?.getText() ?? "";
      },
      focus() {
        editor?.commands.focus();
      },
      insertText(text: string) {
        editor?.chain().focus().insertContent(text).run();
      },
    }));

    const wordCount =
      editor
        ?.getText()
        .trim()
        .split(/\s+/)
        .filter(Boolean).length ?? 0;
    const charCount = editor?.storage.characterCount?.characters() ?? 0;

    const ToolbarBtn = ({
      onClick,
      active,
      icon: Icon,
      title,
      children,
    }: {
      onClick: () => void;
      active?: boolean;
      icon?: any;
      title: string;
      children?: React.ReactNode;
    }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
          "h-8 w-8 p-0 rounded-md transition-all",
          active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
        )}
        title={title}
      >
        {Icon ? <Icon className="h-4 w-4" /> : children}
      </Button>
    );

    return (
      <div className={cn("relative flex flex-col border border-border/50 rounded-xl overflow-hidden bg-card/30 backdrop-blur-md shadow-elegant transition-all", editor?.isFocused && "ring-1 ring-primary/20 border-primary/30", className)}>
        {editor && (
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-1 p-1 bg-background/95 backdrop-blur-md border border-border/50 rounded-lg shadow-elegant animate-in fade-in zoom-in duration-200"
          >
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} title="Bold" />
            <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} title="Italic" />
            <div className="w-[1px] h-4 bg-border/50 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs px-2 text-primary font-semibold hover:bg-primary/5">
                  <Wand2 className="w-3.5 h-3.5" />
                  AI Rewrite
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => handleRewrite("formal")} className="gap-2 cursor-pointer">
                  <Zap className="w-3.5 h-3.5 text-primary" /> Make Formal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRewrite("shorten")} className="gap-2 cursor-pointer">
                  <AlignLeft className="w-3.5 h-3.5 text-primary" /> Shorten
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRewrite("expand")} className="gap-2 cursor-pointer">
                  <Type className="w-3.5 h-3.5 text-primary" /> Expand
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRewrite("simple")} className="gap-2 cursor-pointer">
                  <Check className="w-3.5 h-3.5 text-primary" /> Simplify
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </BubbleMenu>
        )}

        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border/40 bg-secondary/10">
          <ToolbarBtn
            title="Bold (Ctrl+B)"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold")}
            icon={Bold}
          />
          <ToolbarBtn
            title="Italic (Ctrl+I)"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive("italic")}
            icon={Italic}
          />
          <ToolbarBtn
            title="Underline (Ctrl+U)"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive("underline")}
            icon={Underline}
          />
          <ToolbarBtn
            title="Strikethrough"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            active={editor?.isActive("strike")}
            icon={Strikethrough}
          />

          <div className="w-px h-4 bg-border/60 mx-1" />

          <ToolbarBtn
            title="Clear formatting"
            onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
            icon={RotateCcw}
          />

          <Separator orientation="vertical" className="mx-1 h-4" />

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setTemplateOpen(true)}
            className="h-8 gap-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/20"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            Templates
          </Button>

          <Separator orientation="vertical" className="mx-1 h-4" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/20">
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem 
                onClick={async () => {
                  const tid = toast.loading("Generating PDF...");
                  try {
                    await exportToPDF("writeiq-editor-content", "WriteIQ_Draft.pdf");
                    toast.success("PDF Exported", { id: tid });
                  } catch (e) {
                    toast.error("PDF Export failed", { id: tid });
                  }
                }} 
                className="gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-primary" /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  exportToMarkdown(editor?.getText() ?? "", "WriteIQ_Draft.md");
                  toast.success("Markdown Exported");
                }} 
                className="gap-2 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-primary" /> Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  exportToTxt(editor?.getText() ?? "", "WriteIQ_Draft.txt");
                  toast.success("Text Exported");
                }} 
                className="gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-primary" /> Export as Plain Text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground select-none">
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
            {onAnalyze && (
              <span className="hidden sm:inline opacity-60">Ctrl+↵ to analyze</span>
            )}
          </div>
        </div>

        {/* Editor content */}
        <div
          className="flex-1 min-h-[300px] bg-secondary/5 rounded-b-md cursor-text p-4"
          onClick={() => editor?.commands.focus()}
        >
          <div id="writeiq-editor-content" className="min-h-full">
            <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none focus:outline-none" />
          </div>
        </div>
        
        <TemplateGallery 
          open={templateOpen} 
          onOpenChange={setTemplateOpen} 
          onSelect={(template) => {
            if (editor) {
              editor.commands.setContent(template.content);
              setTemplateOpen(false);
              toast.success(`${template.name} template applied`);
            }
          }}
        />
      </div>
    );

  },
);
