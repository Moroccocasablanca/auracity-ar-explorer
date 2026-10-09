const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });
  const publishRunId = (value?: string) => {
    const next = value?.trim() || undefined;
    if (!runId && next) runId = next;
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    },
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

/** Adds the gateway run id to a streaming response once the first upstream call has returned. */
export async function withRunIdHeader(
  response: Response,
  gateway: { waitForRunId: () => Promise<string | undefined> },
) {
  if (!response.body) return response;
  const reader = response.body.getReader();
  const first = reader.read();
  const runId = await gateway.waitForRunId();
  const headers = new Headers(response.headers);
  if (runId) {
    headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
    headers.set("Access-Control-Expose-Headers", LOVABLE_AIG_RUN_ID_HEADER);
  }
  const body = new ReadableStream({
    async start(controller) {
      try {
        const f = await first;
        if (f.done) return controller.close();
        controller.enqueue(f.value);
        while (true) {
          const c = await reader.read();
          if (c.done) break;
          controller.enqueue(c.value);
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel: (r) => reader.cancel(r),
  });
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
