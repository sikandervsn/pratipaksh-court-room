import { redact } from "./guard";
import type { AgentName, StreamEvent } from "./types";

class ClientGone extends Error {}

/**
 * NDJSON streaming response; `work` receives an emitter.
 * If the browser disconnects (reload / navigate away), the next emit throws
 * ClientGone, which stops the agent pipeline so we don't burn API quota.
 */
export function ndjson(work: (emit: (e: StreamEvent) => void) => Promise<void>) {
  const enc = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: StreamEvent) => {
        if (closed) throw new ClientGone("client disconnected");
        try {
          controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        } catch {
          closed = true;
          throw new ClientGone("client disconnected");
        }
      };
      try {
        await work(emit);
      } catch (err) {
        if (err instanceof ClientGone || closed) {
          console.log("[stream] client disconnected — pipeline stopped");
        } else {
          console.error("[stream]", redact(err instanceof Error ? err.message : String(err)));
          try {
            emit({ type: "error", message: redact(err instanceof Error ? err.message : "Something went wrong.") });
          } catch {}
        }
      } finally {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {}
        }
      }
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replays pre-recorded agent steps for demo mode, so the UI shows the same live trace. */
export async function replayDemo(emit: (e: StreamEvent) => void, steps: [AgentName, string, string][]) {
  for (const [agent, detail, done] of steps) {
    emit({ type: "agent", agent, status: "running", detail });
    await sleep(900 + Math.random() * 700);
    emit({ type: "agent", agent, status: "done", detail: done });
  }
}
