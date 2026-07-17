import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["⌘", "K"], label: "Open command palette / global search" },
  { keys: ["?"], label: "Show this help" },
  { keys: ["G", "D"], label: "Go to Dashboard" },
  { keys: ["G", "O"], label: "Go to Orders" },
  { keys: ["G", "K"], label: "Go to Live Ops (Kanban)" },
  { keys: ["G", "A"], label: "Go to Analytics" },
  { keys: ["G", "C"], label: "Go to CRM" },
  { keys: ["Esc"], label: "Close dialogs / sheets" },
  { keys: ["⌘", "Enter"], label: "Send message in inbox" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
        if (target?.isContentEditable) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-brand" /> Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60"
            >
              <span className="text-sm">{s.label}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-1 rounded-md bg-muted border border-border font-mono text-[11px] font-semibold"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
