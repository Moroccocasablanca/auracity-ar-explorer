import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";
import { useRef } from "react";
import { MapPin, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { BottomNav } from "@/components/BottomNav";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Guida di Bra · AURACITY" },
      { name: "description", content: "Chiedi alla guida AURACITY di monumenti, locali e giardini parlanti di Bra." },
      { property: "og:title", content: "Guida di Bra · AURACITY" },
      { property: "og:description", content: "Una guida in chat per scoprire Bra: storia, posti dove mangiare e oggetti parlanti." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidePage,
});

function GuideMark() {
  return (
    <div className="relative flex size-12 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10">
      <MapPin className="size-5 text-primary" />
      <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full bg-primary" />
    </div>
  );
}

function GuidePage() {
  const { t, lang } = useI18n();
  const langRef = useRef(lang);
  langRef.current = lang;
  const transportRef = useRef(
    new DefaultChatTransport({ api: "/api/guide", body: () => ({ lang: langRef.current }) }),
  );
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: transportRef.current,
    onError: () => toast.error(t("guide.error")),
  });
  const busy = status === "submitted" || status === "streaming";
  const ask = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() });
  };
  const last = messages[messages.length - 1];
  const waiting = busy && (!last || last.role === "user" || !last.parts.some((p) => p.type === "text" && p.text));

  return (
    <main className="mx-auto flex h-[100dvh] max-w-2xl flex-col px-4 pb-24 pt-6">
      <header className="mb-3 flex items-center gap-3">
        <GuideMark />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold tracking-tight">{t("guide.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("guide.subtitle")}</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { stop(); setMessages([]); }}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3.5" /> {t("guide.reset")}
          </button>
        )}
      </header>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="flex flex-col gap-2 pt-6">
              {(["guide.s1", "guide.s2", "guide.s3"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => ask(t(k))}
                  className="glass rounded-2xl px-4 py-3 text-left text-sm text-foreground"
                >
                  {t(k)}
                </button>
              ))}
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent
                className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent text-foreground"}
              >
                {m.parts.map((p, i) => {
                  if (p.type === "text") {
                    return m.role === "assistant"
                      ? <MessageResponse key={i}>{p.text}</MessageResponse>
                      : <span key={i} className="whitespace-pre-wrap">{p.text}</span>;
                  }
                  if (isToolUIPart(p)) {
                    const name = getToolName(p);
                    return (
                      <Tool key={i} defaultOpen={false}>
                        <ToolHeader
                          type={p.type as never}
                          state={p.state}
                          title={name === "get_place" ? t("guide.tool.get") : t("guide.tool.list")}
                        />
                        <ToolContent>
                          <ToolInput input={p.input} />
                          <ToolOutput output={p.output} errorText={p.errorText} />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {waiting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="size-4" /><Shimmer>{t("guide.thinking")}</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={(msg) => ask(msg.text ?? "")} className="mt-3">
        <PromptInputTextarea placeholder={t("guide.placeholder")} />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} onStop={stop} />
        </PromptInputFooter>
      </PromptInput>
      <BottomNav />
    </main>
  );
}
