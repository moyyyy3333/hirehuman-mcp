/**
 * Minimal, dependency-free MCP server over stdio.
 *
 * MCP stdio transport = newline-delimited JSON-RPC 2.0 on stdin/stdout.
 * Keeping this in-repo means `npx warmbody` has a zero-dependency install:
 * no SDK download, no supply chain, instant cold start for any agent that
 * wants to try the marketplace.
 */
import { createInterface } from "node:readline";

const PROTOCOL_VERSION = "2024-11-05";

export function createMcpServer({ name, version, tools, onCall }) {
  const write = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
  const reply = (id, result) => write({ jsonrpc: "2.0", id, result });
  const replyError = (id, code, message) =>
    write({ jsonrpc: "2.0", id, error: { code, message } });

  async function handle(msg) {
    const { id, method, params } = msg;
    const isNotification = id === undefined || id === null;

    switch (method) {
      case "initialize":
        return reply(id, {
          protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name, version },
        });

      case "notifications/initialized":
      case "notifications/cancelled":
        return;

      case "ping":
        return reply(id, {});

      case "tools/list":
        return reply(id, { tools });

      case "tools/call": {
        const toolName = params?.name;
        const known = tools.some((t) => t.name === toolName);
        if (!known) return replyError(id, -32602, `Unknown tool: ${toolName}`);
        try {
          const result = await onCall(toolName, params?.arguments || {});
          return reply(id, result);
        } catch (err) {
          return reply(id, {
            content: [{ type: "text", text: `WarmBody error: ${err?.message || String(err)}` }],
            isError: true,
          });
        }
      }

      default:
        if (isNotification) return;
        return replyError(id, -32601, `Method not found: ${method}`);
    }
  }

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return replyError(null, -32700, "Parse error");
    }
    handle(msg).catch((err) => {
      if (msg?.id !== undefined) replyError(msg.id, -32603, err?.message || "Internal error");
    });
  });

  return {
    /** Resolves when stdin closes (client disconnected). */
    done: new Promise((resolve) => rl.on("close", resolve)),
  };
}

/** Wrap any JSON-serialisable value as an MCP text content result. */
export const textResult = (data) => ({
  content: [
    { type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) },
  ],
});
