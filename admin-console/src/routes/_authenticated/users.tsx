import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/users")({
  ssr: false,
  component: UsersPage,
});

type Profile = {
  id: string;
  name?: string;
  email?: string;
  photoURL?: string;
  createdAt?: unknown;
  phoneNumber?: string;
};

async function loadProfiles(): Promise<Profile[]> {
  const db = getDb();
  // Try ordered by createdAt; fall back to unordered if the field doesn't exist.
  try {
    const snap = await getDocs(query(collection(db, "profile"), orderBy("createdAt", "desc"), limit(500)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Profile[];
  } catch {
    const snap = await getDocs(query(collection(db, "profile"), limit(500)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Profile[];
  }
}

function UsersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["profiles"], queryFn: loadProfiles });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(s) ||
        (p.email || "").toLowerCase().includes(s) ||
        (p.id || "").toLowerCase().includes(s),
    );
  }, [data, search]);

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or uid…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading users…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">User</th>
                    <th className="text-left px-5 py-3 font-medium">Email</th>
                    <th className="text-left px-5 py-3 font-medium">Joined</th>
                    <th className="text-left px-5 py-3 font-medium">UID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const initials =
                      (u.name || u.email || "?")
                        .split(/[\s@]/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join("") || "?";
                    return (
                      <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              {u.photoURL ? (
                                <AvatarImage src={u.photoURL} alt={u.name || u.email} />
                              ) : null}
                              <AvatarFallback className="bg-brand text-gold text-xs font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">
                                {u.name || "—"}
                              </div>
                              {u.phoneNumber ? (
                                <div className="text-xs text-muted-foreground">
                                  {u.phoneNumber}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{u.email || "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground">
                          {u.id}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
