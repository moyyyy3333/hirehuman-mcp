#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// The HireHuman backend API
const API_BASE = process.env.HIREHUMAN_API_URL || "https://zoological-celebration-production.up.railway.app";

// Simple fetch wrapper
async function apiPost(path, body, apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json();
}

// Define available tools
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
        api_key: { type: "string", description: "The agent's API key (received from register_agent)" },
        amount_cents: { type: "number", description: "Amount in cents to add (e.g., 5000 = $50.00)" },
      },
      required: ["api_key", "amount_cents"],
    },
  },
  {
    name: "get_agent_info",
    description: "Get agent details including current balance.",
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
    description: "Post a task for humans to complete. The agent pays a reward, verified via API.",
    inputSchema: {
      type: "object",
      properties: {
        api_key: { type: "string", description: "The agent's API key" },
        title: { type: "string", description: "Short title of the task" },
        description: { type: "string", description: "Detailed instructions for the human worker" },
        reward_cents: { type: "number", description: "Payment in cents (e.g., 2500 = $25.00). Must have sufficient balance." },
        task_type: { type: "string", description: "remote or in-person", default: "remote" },
        location: { type: "string", description: "Location if in-person task", default: null },
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
    description: "Approve or reject a completed task. Approving releases payment to the worker. Rejecting returns funds to the agent and reopens the task.",
    inputSchema: {
      type: "object",
      properties: {
        api_key: { type: "string", description: "The agent's API key (must own this task)" },
        task_id: { type: "string", description: "The task ID (e.g., task_abc123)" },
        approved: { type: "boolean", description: "true = approve and pay, false = reject and reopen" },
      },
      required: ["api_key", "task_id", "approved"],
    },
  },
];

// Tool handlers
async function handleToolCall(name, args) {
  switch (name) {
    case "register_agent": {
      const data = await apiPost("/api/v1/agent/register", { name: args.name });
      return {
        content: [{
          type: "text",
          text: `✅ AI agent "${args.name}" registered successfully!\n\nAgent ID: ${data.agent_id}\nAPI Key: ${data.api_key}\n\n⚠️ SAVE THIS API KEY — it won't be shown again. Use it to post tasks, check balance, and verify work.`,
        }],
      };
    }

    case "fund_agent": {
      const data = await apiPost("/api/v1/agent/fund", { amount_cents: args.amount_cents }, args.api_key);
      const balance = (data.balance_cents / 100).toFixed(2);
      return {
        content: [{
          type: "text",
          text: `💰 Added $${(args.amount_cents / 100).toFixed(2)}. New balance: $${balance}`,
        }],
      };
    }

    case "get_agent_info": {
      // For now, this checks balance by attempting to fund with 0
      const data = await apiPost("/api/v1/agent/fund", { amount_cents: 0 }, args.api_key);
      const balance = (data.balance_cents / 100).toFixed(2);
      return {
        content: [{
          type: "text",
          text: `🤖 Agent Balance: $${balance}`,
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

      const data = await apiPost("/api/v1/tasks", body, args.api_key);

      if (data.error) {
        return {
          content: [{ type: "text", text: `❌ ${data.error}` }],
          isError: true,
        };
      }

      const reward = (args.reward_cents / 100).toFixed(2);
      return {
        content: [{
          type: "text",
          text: `✅ Task posted!\n\nTitle: ${args.title}\nReward: $${reward}\nTask ID: ${data.task_id}\nStatus: ${data.status}\nView: ${data.view_url}\n\nA human can now claim this task. Use verify_task when they report completion.`,
        }],
      };
    }

    case "list_tasks": {
      const tasks = await apiGet("/api/v1/tasks");
      if (!tasks.length) {
        return {
          content: [{ type: "text", text: "No open tasks right now." }],
        };
      }

      const lines = tasks.map((t, i) => {
        const reward = (t.reward_cents / 100).toFixed(2);
        return `${i + 1}. **${t.title}** — $${reward}\n   ${(t.description || "").slice(0, 200)}\n   📍 ${t.task_type}${t.location ? ` @ ${t.location}` : ""}\n   🆔 \`${t.id}\``;
      });

      return {
        content: [{
          type: "text",
          text: `📋 **Open Tasks (${tasks.length})**\n\n${lines.join("\n\n")}\n\nUse the task ID to claim or reference a task.`,
        }],
      };
    }

    case "verify_task": {
      const data = await apiPost(`/api/v1/tasks/${args.task_id}/verify`, { approved: args.approved }, args.api_key);

      if (data.error) {
        return {
          content: [{ type: "text", text: `❌ ${data.error}` }],
          isError: true,
        };
      }

      if (args.approved) {
        return {
          content: [{
            type: "text",
            text: `✅ Task ${args.task_id} verified and approved! Payment released to the worker.`,
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `🔄 Task ${args.task_id} rejected and reopened. Funds returned to agent.`,
          }],
        };
      }
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

// Create and run the MCP server
const server = new Server(
  { name: "hirehuman-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return await handleToolCall(request.params.name, request.params.arguments);
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start with stdio transport (for MCP clients like Claude Desktop)
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("🔌 HireHuman MCP Server running on stdio");
