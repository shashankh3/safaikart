import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import { z } from "zod";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/_authenticated/imports")({
  ssr: false,
  component: ImportsPage,
});

type Kind = "services" | "customers";

const serviceSchema = z.object({
  categoryId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  priceMinor: z.coerce.number().int().nonnegative().max(10_000_000),
  unit: z.string().trim().max(24).optional().default("piece"),
  stock: z.coerce.number().int().nonnegative().max(1_000_000).optional(),
});

const customerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phoneNumber: z.string().trim().min(6).max(20).optional(),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
});

const TEMPLATES: Record<Kind, string> = {
  services: "categoryId,name,priceMinor,unit,stock\nlaundry,Shirt Wash,4000,piece,\n",
  customers: "name,phoneNumber,email\nRahul Singh,+919000000000,[email protected]\n",
};

type Row = Record<string, string>;
type Parsed = { ok: Row[]; errors: Array<{ row: number; message: string }> };

function ImportsPage() {
  const { admin } = useAuth();
  const [kind, setKind] = useState<Kind>("services");
  const [rows, setRows] = useState<Row[]>([]);
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ inserted: number } | null>(null);

  const parsed: Parsed = useMemo(() => {
    const ok: Row[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    rows.forEach((r, i) => {
      const schema = kind === "services" ? serviceSchema : customerSchema;
      const res = schema.safeParse(r);
      if (!res.success) {
        errors.push({ row: i + 2, message: res.error.issues[0]?.message || "Invalid row" });
      } else {
        ok.push(r);
      }
    });
    return { ok, errors };
  }, [rows, kind]);

  function onFile(file: File) {
    setDone(null);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data);
        setParseErrors(
          res.errors.slice(0, 20).map((e) => ({ row: e.row ?? 0, message: e.message })),
        );
      },
      error: (err) => toast.error(err.message),
    });
  }

  async function runImport() {
    if (parsed.ok.length === 0) return;
    setImporting(true);
    try {
      const db = getDb();
      let count = 0;
      // Firestore batch limit: 500 writes
      const chunkSize = 400;
      for (let i = 0; i < parsed.ok.length; i += chunkSize) {
        const chunk = parsed.ok.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const r of chunk) {
          if (kind === "services") {
            const parsed = serviceSchema.parse(r);
            const ref = doc(collection(db, "services"));
            batch.set(ref, {
              categoryId: parsed.categoryId,
              name: parsed.name,
              priceMinor: parsed.priceMinor,
              unit: parsed.unit,
              stock: parsed.stock ?? null,
              createdAt: serverTimestamp(),
              importedBy: admin?.uid ?? null,
            });
          } else {
            const parsed = customerSchema.parse(r);
            const ref = doc(collection(db, "profile"));
            batch.set(ref, {
              name: parsed.name,
              phoneNumber: parsed.phoneNumber ?? null,
              email: parsed.email || null,
              createdAt: serverTimestamp(),
              importedBy: admin?.uid ?? null,
              imported: true,
            });
          }
          count += 1;
        }
        await batch.commit();
      }
      setDone({ inserted: count });
      setRows([]);
      toast.success(`Imported ${count} rows`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATES[kind]], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const headers = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Import type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger className="h-11 rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>CSV file</Label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              className="h-11 rounded-xl mt-1 file:mr-2"
            />
          </div>
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="h-11 rounded-xl gap-2"
          >
            <FileText className="h-4 w-4" /> Download template
          </Button>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Preview</div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {parsed.ok.length} valid
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    {parsed.errors.length} invalid
                  </span>
                </div>
              </div>
              <Button
                onClick={runImport}
                disabled={importing || parsed.ok.length === 0}
                className="rounded-xl bg-brand hover:bg-brand-dark text-white gap-2"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Import {parsed.ok.length} rows
              </Button>
            </div>

            {parsed.errors.length > 0 && (
              <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 space-y-1 max-h-40 overflow-y-auto">
                {parsed.errors.slice(0, 20).map((e, i) => (
                  <div key={i}>
                    Row {e.row}: {e.message}
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">#</th>
                    {headers.map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, i) => {
                    const bad = parsed.errors.find((e) => e.row === i + 2);
                    return (
                      <tr
                        key={i}
                        className={`border-t border-border ${bad ? "bg-rose-50" : ""}`}
                      >
                        <td className="px-3 py-2 text-muted-foreground">{i + 2}</td>
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-2">
                            {r[h] || ""}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {done && (
        <Card className="rounded-2xl border-emerald-300 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Successfully imported {done.inserted} rows.
            <Badge variant="outline" className="ml-auto rounded-full bg-white">
              {kind}
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
