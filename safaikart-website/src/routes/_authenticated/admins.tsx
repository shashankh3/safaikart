import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { Plus, ShieldCheck, Trash2, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { ROLES, ROLE_LABEL, hasPermission, type Role } from "@/lib/rbac";
import { useDialogs } from "@/components/ui/dialog-provider";

export const Route = createFileRoute("/_authenticated/admins")({
  ssr: false,
  component: AdminsPage,
});

type Admin = {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  createdAt?: unknown;
};

function AdminsPage() {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const canManage = hasPermission(admin?.role, "admins.write");
  const [saving, setSaving] = useState(false);
  const { confirm } = useDialogs();

  useEffect(() => {
    const db = getDb();
    return onSnapshot(
      collection(db, "adminUsers"),
      (snap) => {
        setAdmins(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Admin,
          ),
        );
      },
      () => setAdmins([]),
    );
  }, []);

  const add = async () => {
    if (!uid.trim()) {
      toast.error("UID is required");
      return;
    }
    setSaving(true);
    try {
      const db = getDb();
      await setDoc(doc(db, "adminUsers", uid.trim()), {
        email: email.trim() || null,
        name: name.trim() || null,
        role,
        createdAt: serverTimestamp(),
        createdBy: admin?.uid ?? null,
      });
      toast.success("Admin added");
      setOpen(false);
      setUid("");
      setEmail("");
      setName("");
      setRole("admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Admin) => {
    if (a.id === admin?.uid) {
      toast.error("You cannot remove yourself");
      return;
    }
    if (!(await confirm({ title: `Revoke admin access for ${a.email || a.id}?`, destructive: true }))) return;
    try {
      const db = getDb();
      await deleteDoc(doc(db, "adminUsers", a.id));
      toast.success("Admin removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const isLoading = admins === null;

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <div>
              <div className="font-semibold">Admin Access</div>
              <div className="text-xs text-muted-foreground">
                Manage who can sign in to this console
              </div>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            disabled={!canManage}
            className="h-11 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2"
          >
            <Plus className="h-4 w-4" /> Grant access
          </Button>
        </CardContent>
      </Card>

      {!canManage ? (
        <Card className="rounded-2xl border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            Your role (<code>{admin?.role}</code>) can view admins but not modify them. Ask a
            Super Admin for changes.
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : admins.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              No admins configured yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">UID</th>
                    <th className="text-left px-5 py-3 font-medium">Name / Email</th>
                    <th className="text-left px-5 py-3 font-medium">Role</th>
                    <th className="text-left px-5 py-3 font-medium">Added</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(a.id);
                            toast.success("UID copied");
                          }}
                          className="font-mono text-xs inline-flex items-center gap-1 hover:text-brand"
                        >
                          {a.id.slice(0, 16)}… <Copy className="h-3 w-3" />
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium">{a.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{a.email || "—"}</div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className="bg-brand/10 text-brand border-brand/30 rounded-full"
                        >
                          {a.role || "admin"}
                        </Badge>
                        {a.id === admin?.uid ? (
                          <Badge
                            variant="outline"
                            className="ml-2 bg-gold/20 text-brand border-gold/40 rounded-full"
                          >
                            You
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(a)}
                          disabled={a.id === admin?.uid}
                          className="rounded-lg text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Grant admin access</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Firebase UID *</Label>
              <Input
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="Copy from Firebase Console → Authentication → Users"
                className="rounded-xl mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="[email protected]"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="rounded-xl mt-1 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={add}
              disabled={saving}
              className="rounded-xl bg-brand hover:bg-brand-dark text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Grant access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
