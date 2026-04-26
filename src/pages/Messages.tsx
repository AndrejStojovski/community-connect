import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  report_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Thread {
  reportId: string;
  reportTitle: string;
  otherUserId: string;
  otherName: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reportsMap, setReportsMap] = useState<Record<string, { title: string; user_id: string }>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    const list = (msgs ?? []) as Message[];
    setMessages(list);

    const reportIds = [...new Set(list.map((m) => m.report_id))];
    const userIds = [...new Set(list.flatMap((m) => [m.sender_id, m.recipient_id]))];

    if (reportIds.length) {
      const { data: rs } = await supabase.from("reports").select("id,title,user_id").in("id", reportIds);
      const map: Record<string, { title: string; user_id: string }> = {};
      (rs ?? []).forEach((r) => (map[r.id] = { title: r.title, user_id: r.user_id }));
      setReportsMap(map);
    }
    if (userIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id,display_name").in("id", userIds);
      const pmap: Record<string, string> = {};
      (ps ?? []).forEach((p) => (pmap[p.id] = p.display_name));
      setProfilesMap(pmap);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`msgs-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if (m.sender_id === user.id || m.recipient_id === user.id) load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [user?.id]);

  const threads: Thread[] = useMemo(() => {
    if (!user) return [];
    const m: Record<string, Thread> = {};
    for (const msg of messages) {
      const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      const key = `${msg.report_id}:${otherId}`;
      const r = reportsMap[msg.report_id];
      if (!m[key]) {
        m[key] = {
          reportId: msg.report_id,
          reportTitle: r?.title ?? "Report",
          otherUserId: otherId,
          otherName: profilesMap[otherId] ?? "User",
          lastMessage: msg.content,
          lastAt: msg.created_at,
          unread: 0,
        };
      } else {
        m[key].lastMessage = msg.content;
        m[key].lastAt = msg.created_at;
      }
      if (msg.recipient_id === user.id && !msg.read_at) m[key].unread++;
    }
    return Object.entries(m)
      .map(([k, v]) => ({ ...v, _key: k }))
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
      .map(({ _key, ...rest }) => ({ ...rest, key: _key } as Thread & { key: string }));
  }, [messages, reportsMap, profilesMap, user]);

  // auto-select thread from URL
  useEffect(() => {
    const r = params.get("report");
    if (r && threads.length && !activeKey) {
      const t = threads.find((x) => x.reportId === r);
      if (t) setActiveKey(`${t.reportId}:${t.otherUserId}`);
    }
    if (!activeKey && threads.length && !r) {
      setActiveKey(`${threads[0].reportId}:${threads[0].otherUserId}`);
    }
    // eslint-disable-next-line
  }, [threads.length]);

  const active = threads.find((t) => `${t.reportId}:${t.otherUserId}` === activeKey);
  const activeMessages = active
    ? messages.filter(
        (m) =>
          m.report_id === active.reportId &&
          (m.sender_id === active.otherUserId || m.recipient_id === active.otherUserId)
      )
    : [];

  // mark read on open
  useEffect(() => {
    if (!active || !user) return;
    const unreadIds = activeMessages.filter((m) => m.recipient_id === user.id && !m.read_at).map((m) => m.id);
    if (unreadIds.length) {
      supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds).then(() => {});
    }
    // eslint-disable-next-line
  }, [activeKey, activeMessages.length]);

  const send = async () => {
    if (!user || !active || !reply.trim()) return;
    const { error } = await supabase.from("messages").insert({
      report_id: active.reportId,
      sender_id: user.id,
      recipient_id: active.otherUserId,
      content: reply.trim().slice(0, 2000),
    });
    if (!error) { setReply(""); load(); }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Messages</h1>
      <Card className="grid md:grid-cols-[280px_1fr] overflow-hidden h-[70vh]">
        <div className="border-r border-border">
          <ScrollArea className="h-full">
            {threads.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No conversations yet</div>
            ) : (
              threads.map((t) => {
                const k = `${t.reportId}:${t.otherUserId}`;
                return (
                  <button
                    key={k}
                    onClick={() => { setActiveKey(k); setParams({ report: t.reportId }); }}
                    className={`w-full text-left p-3 border-b border-border hover:bg-muted transition-smooth ${
                      activeKey === k ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm truncate">{t.otherName}</div>
                      {t.unread > 0 && (
                        <span className="bg-secondary text-secondary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">{t.unread}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{t.reportTitle}</div>
                    <div className="text-xs text-muted-foreground truncate mt-1">{t.lastMessage}</div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        <div className="flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="border-b p-4">
                <div className="font-semibold">{active.otherName}</div>
                <Link to={`/reports/${active.reportId}`} className="text-xs text-primary hover:underline">
                  {active.reportTitle}
                </Link>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {activeMessages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                          <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="border-t p-3 flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a message…"
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  maxLength={2000}
                />
                <Button onClick={send} disabled={!reply.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}