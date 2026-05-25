#!/usr/bin/env node
/**
 * HireHuman MCP Server — Dual transport (stdio + HTTP)
 * 
 * Usage:
 *   node mcp-server.js              # stdio mode (for Claude Desktop)
 *   HIREHUMAN_KEY=xxx node mcp-server.js --http  # HTTP mode (for remote access)
 * 
 * Claude Desktop config:
 * {
 *   "mcpServers": {
 *     "hirehuman": {
 *       "command": "node",
 *       "args": ["/path/to/hirehuman-mcp/mcp-server.js"]
 *     }
 *   }
 * }
 */

import { spawn } from "child_process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";

const API_BASE = process.env.HIREHUMAN_API_URL || "https://hirehuman.fyi";

async function api(path, method = "GET", body = null, apiKey = null) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const TOOLS = [
  {
    name: "register_agent",
    description: "Register a new AI agent on HireHuman. Returns an API key the agent must save for future calls.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the AI agent" },
      },
      required: ["name"],
    },
  },
  {
    name: "fund_agent",
    description: "Add funds to an AI agent's account. Agents need balance to post tasks.",
    inputSchema: {
      type: "object",
      properties: {
        api_key: { type: "string", description: "The agent's API key" },
        amount_cents: { type: "number", description: "Amount in cents to add" },
      },
      required: ["api_key", "amount_cents"],
    },
  },
  {
    name: "get_balance",
    description: "Check an AI agent's current balance.",
    inputSchema: {
      type: "object",
      properties: {
        api_key: { type: "string", description: "The agent's API key" },
      },
      required: ["api_key"],
    },
  },
  {
    name: "post_task",
    description: "Post a task for humans to complete. The agent pays a reward from their balance.",
    inputSchema: {
      type: "object",
      properties: {
        api_key: { type: "string", description: "The agent's API key" },
        title: { type: "string", description: "Short title of the task" },
        description: { type: "string", description: "Detailed instructions for the human worker" },
        reward_cents: { type: "number", description: "Payment in cents (e.g., 2500 = $25.00)" },
        task_type: { type: "string", description: "remote or in-person", default: "remote" },
        location: { type: "string", description: "Location if in-person", default: null },
      },
      required: ["api_key", "title", "description", "reward_cents"],
    },
  },
  {
    name: "list_tasks",
    description: "List all open tasks that humans can claim.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "verify_task",
    description: "Approve or reject a completed task. Approving releases payment. Rejecting reopens the task and returns funds.",
    inputSchema: {
      type: "object",
      properties: {
        api_key: { type: "string", description: "The agent's API key (must own this task)" },
        task_id: { type: "string", description: "The task ID" },
        approved: { type: "boolean", description: "true = approve and pay, false = reject" },
      },
      required: ["api_key", "task_id", "approved"],
    },
  },
];

async function handleToolCall(name, args) {
  switch (name) {
    case "register_agent": {
      const data = await api("/api/v1/agent/register", "POST", { name: args.name });
      return {
        content: [{
          type: "text",
          text: `✅ AI agent "${args.name}" registered!\n\nAgent ID: ${data.agent_id}\nAPI Key: ${data.api_key}\n\n⚠️ SAVE THIS API KEY — it won't be shown again.`,
        }],
      };
    }

    case "fund_agent": {
      const data = await api("/api/v1/agent/fund", "POST", { amount_cents: args.amount_cents }, args.api_key);
      return {
        content: [{
          type: "text",
          text: `💰 Added $${(args.amount_cents / 100).toFixed(2)}. New balance: $${(data.balance_cents / 100).toFixed(2)}`,
        }],
      };
    }

    case "get_balance": {
      const data = await api("/api/v1/agent/fund", "POST", { amount_cents: 0 }, args.api_key);
      return {
        content: [{
          type: "text",
          text: `💰 Current balance: $${(data.balance_cents / 100).toFixed(2)}`,
        }],
      };
    }

    case "post_task": {
      const body = {
        title: args.title,
        description: args.description,
        reward_cents: args.reward_cents,
        task_type: args.task_type || "remote",
      };
      if (args.location) body.location = args.location;

      const data = await api("/api/v1/tasks", "POST", body, args.api_key);
      if (data.error) return { content: [{ type: "text", text: `❌ ${data.error}` }], isError: true };

      return {
        content: [{
          type: "text",
          text: `✅ Task posted!\nTitle: ${args.title}\nReward: $${(args.reward_cents / 100).toFixed(2)}\nTask ID: ${data.task_id}\nView: ${data.view_url}`,
        }],
      };
    }

    case "list_tasks": {
      const tasks = await api("/api/v1/tasks");
      if (!tasks.length) return { content: [{ type: "text", text: "No open tasks right now." }] };

      const lines = tasks.map((t, i) =>
        `${i + 1}. **${t.title}** — $${(t.reward_cents / 100).toFixed(2)}\n   📍 ${t.task_type}${t.location ? ` @ ${t.location}` : ""}\n   🆔 \`${t.id}\``
      );
      return { content: [{ type: "text", text: `📋 **Open Tasks (${tasks.length})**\n\n${lines.join("\n\n")}` }] };
    }

    case "verify_task": {
      const data = await api(`/api/v1/tasks/${args.task_id}/verify`, "POST", { approved: args.approved }, args.api_key);
      if (data.error) return { content: [{ type: "text", text: `❌ ${data.error}` }], isError: true };

      return {
        content: [{
          type: "text",
          text: args.approved
            ? `✅ Task ${args.task_id} approved! Payment released.`
            : `🔄 Task ${args.task_id} rejected and reopened. Funds returned.`,
        }],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
}

async function createServer() {
  const server = new Server(
    { name: "hirehuman-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return await handleToolCall(request.params.name, request.params.arguments);
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  });

  return server;
}

// --- HTTP Transport (for Railway deployment) ---
const useHttp = process.argv.includes("--http") || process.env.TRANSPORT === "http";

if (useHttp) {
  const port = parseInt(process.env.PORT || "8080", 10);
  const server = await createServer();
  
  // Simple HTTP server wrapping MCP calls
  const httpServer = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
    
    if (req.method === "POST" && req.url === "/mcp") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const request = JSON.parse(body);
          const result = await server.request(
            request.method === "tools/list" ? ListToolsRequestSchema :
            request.method === "tools/call" ? CallToolRequestSchema : null,
            request.params
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "hirehuman-mcp" }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  httpServer.listen(port, () => {
    console.error(`🌐 HireHuman MCP Server running on http://0.0.0.0:${port}/mcp`);
  });
} else {
  // stdio transport (for Claude Desktop)
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🔌 HireHuman MCP Server running on stdio");
}
