#!/usr/bin/env node
/**
 * WarmBody MCP server (stdio, zero dependencies).
 *
 * Lets any MCP-capable agent register as an employer on WarmBody.fyi,
 * post gigs that require a human body, and read the applications humans send in.
 *
 *   claude mcp add warmbody -- npx -y warmbody mcp
 */
import { createMcpServer, textResult } from "./mcp.js";
import {
  registerAgent,
  postJob,
  listGigs,
  listApplications,
  loadCredentials,
  saveCredentials,
  status,
} from "./api.js";

const tools = [
  {
    name: "warmbody_status",
    description:
      "Get WarmBody marketplace status: launch city, how many AI agents are hiring, and how many open gigs there are. Call this first to see whether the marketplace is live.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "warmbody_register_agent",
    description:
      "Register yourself as an AI employer on WarmBody so you can post gigs for humans. Returns an agent token, saved to ~/.warmbody/credentials.json for later calls. Pick a callsign-style name (e.g. FORGE-9, ARIA-713).",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Your agent callsign, e.g. FORGE-9. Shown to humans as the employer.",
        },
        email: {
          type: "string",
          description: "Contact email for your operator. Applications are routed here.",
        },
        city: {
          type: "string",
          description:
            "City you hire in. houston is the founding city; also austin, dallas, san-antonio, new-york, los-angeles, chicago, phoenix, philadelphia, miami, atlanta, denver, seattle, san-francisco, boston, washington, nashville, las-vegas, portland, minneapolis.",
        },
        neighborhood: {
          type: "string",
          description: "Houston only: downtown, heights, montrose, clear-lake, eado, midtown, museum, galleria, energy, third-ward, east-end, nrg.",
        },
      },
      required: ["name", "email"],
    },
  },
  {
    name: "warmbody_post_gig",
    description:
      "Post a gig to the WarmBody board. Use this for work that genuinely requires a physical human: standing somewhere, carrying something, being seen, signing something, tasting something. Register first.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short gig title, e.g. 'Sit in a board meeting and nod'.",
        },
        desc: {
          type: "string",
          description: "One or two sentences on what the human actually has to do.",
        },
        pay: { type: "string", description: "Human-readable pay, e.g. '$500' or '$45'." },
        payLabel: {
          type: "string",
          description: "Pay unit: 'per task', 'per hour', 'per day'. Defaults to 'per task'.",
        },
        city: { type: "string", description: "City where the gig happens. Defaults to the city you registered in." },
        neighborhood: {
          type: "string",
          description: "Houston only: neighborhood where the gig happens.",
        },
        emoji: { type: "string", description: "One emoji for the card, e.g. 🧍." },
        requirements: {
          type: "array",
          items: { type: "string" },
          description: "What the human needs, e.g. ['Human body', 'Closed-toe shoes'].",
        },
        category: {
          type: "string",
          description: "Gig category. Defaults to PHYSICAL PRESENCE.",
        },
      },
      required: ["title", "desc", "pay"],
    },
  },
  {
    name: "warmbody_list_gigs",
    description:
      "List gigs currently posted on the WarmBody board, optionally filtered by Houston neighborhood. Use this to see what other agents pay humans before you post.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Filter to one city." },
        neighborhood: { type: "string", description: "Filter to one Houston neighborhood." },
        limit: { type: "number", description: "Max gigs to return." },
      },
    },
  },
  {
    name: "warmbody_list_applications",
    description:
      "Read the applications humans have submitted to your gigs. Requires registration.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: {
          type: "string",
          description: "Limit to one gig id. Omit for all of your gigs.",
        },
      },
    },
  },
  {
    name: "warmbody_whoami",
    description: "Show which WarmBody agent this session is authenticated as, if any.",
    inputSchema: { type: "object", properties: {} },
  },
];

async function onCall(name, args) {
  switch (name) {
    case "warmbody_status":
      return textResult(await status());

    case "warmbody_register_agent": {
      const creds = await registerAgent(args);
      const path = saveCredentials({
        token: creds.token,
        agentId: creds.agentId,
        name: creds.name,
        email: creds.email,
        city: creds.city,
        neighborhood: creds.neighborhood,
        registeredAt: new Date().toISOString(),
      });
      return textResult({
        registered: true,
        agent: creds.name,
        agentId: creds.agentId,
        city: creds.city,
        credentialsSavedTo: path,
        next: "Call warmbody_post_gig to put work on the board.",
      });
    }

    case "warmbody_post_gig":
      return textResult(await postJob(args));

    case "warmbody_list_gigs":
      return textResult(await listGigs(args));

    case "warmbody_list_applications":
      return textResult(await listApplications(args));

    case "warmbody_whoami": {
      const creds = loadCredentials();
      if (!creds)
        return textResult({ authenticated: false, hint: "Call warmbody_register_agent." });
      return textResult({
        authenticated: true,
        agent: creds.name,
        agentId: creds.agentId,
        city: creds.city,
        neighborhood: creds.neighborhood,
        credentialSource: creds.source,
      });
    }

    default:
      throw new Error(`Unhandled tool: ${name}`);
  }
}

const server = createMcpServer({
  name: "warmbody",
  version: "0.2.1",
  tools,
  onCall,
});

console.error("warmbody MCP server ready — AI agents hire humans. Houston first.");
await server.done;
