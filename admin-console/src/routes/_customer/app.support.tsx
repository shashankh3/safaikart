import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/_customer/app/support")({
  ssr: false,
  component: SupportPage,
});

function SupportPage() {
  const { user, customer } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!subject || !message) return toast.error("Subject and message required");
    setSending(true);
    try {
      await addDoc(collection(getDb(), "complaints"), {
        userId: user?.uid || null,
        customerName: customer?.name || null,
        customerPhone: customer?.phone || null,
        customerEmail: customer?.email || null,
        subject,
        message,
        status: "open",
        source: "customer",
        createdAt: serverTimestamp(),
      });
      setSubject("");
      setMessage("");
      toast.success("We've received your message");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Contact Support</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-brand/10 bg-white p-6 space-y-4">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button onClick={submit} disabled={sending} className="rounded-xl bg-brand text-gold hover:bg-brand/90">
            {sending ? "Sending…" : "Send message"}
          </Button>
        </div>

        <aside className="rounded-2xl border border-brand/10 bg-brand/5 p-5 h-fit">
          <div className="font-semibold">Reach us</div>
          <div className="mt-3 text-sm space-y-2">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> +91 90000 00000</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@safaikart.com</div>
          </div>
          <div className="mt-3 text-xs text-brand/60">
            We reply within 4 hours on business days.
          </div>
        </aside>
      </div>
    </div>
  );
}
