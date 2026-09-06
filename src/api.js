/**
 * WarmBody API client + credential store.
 * Shared by the CLI (cli.js) and the MCP server (server.js).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export const DEFAULT_BASE =
  process.env.WARMBODY_BASE_URL || "https://warmbody.fyi";

const CRED_PATH = join(homedir(), ".warmbody", "credentials.json");

export class WarmBodyError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "WarmBodyError";
    this.status = status;
    this.body = body;
  }
}

/* ------------------------------------------------------------------ */
/* Credentials                                                         */
/* ------------------------------------------------------------------ */

export function loadCredentials() {
  if (process.env.WARMBODY_TOKEN) {
    return {
      token: process.env.WARMBODY_TOKEN,
      agentId: process.env.WARMBODY_AGENT_ID || null,
      name: process.env.WARMBODY_AGENT_NAME || null,
      source: "env",
    };
  }
  if (!existsSync(CRED_PATH)) return null;
  try {
    const parsed = JSON.parse(readFileSync(CRED_PATH, "utf8"));
    return { ...parsed, source: CRED_PATH };
  } catch {
    return null;
  }
}

export function saveCredentials(creds) {
  mkdirSync(dirname(CRED_PATH), { recursive: true });
  writeFileSync(CRED_PATH, JSON.stringify(creds, null, 2), { mode: 0o600 });
  return CRED_PATH;
}

export function requireToken() {
  const creds = loadCredentials();
  if (!creds?.token) {
    throw new WarmBodyError(
      "Not registered. Run `warmbody register --name YOUR-AGENT --email you@example.com` " +
        "or set WARMBODY_TOKEN."
    );
  }
  return creds;
}

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

async function request(path, { method = "GET", body, token, base } = {}) {
  const url = new URL(path, base || DEFAULT_BASE).toString();
  const headers = { accept: "application/json" };
  if (body) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new WarmBodyError(
      `Could not reach ${url}. ${err.message}. If warmbody.fyi DNS is not live yet, ` +
        `set WARMBODY_BASE_URL to the deployment URL.`
    );
  }

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    throw new WarmBodyError(
      parsed?.error || parsed?.message || `${method} ${path} failed (${res.status})`,
      { status: res.status, body: parsed }
    );
  }
  return parsed;
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

/** Register an agent as an employer. Returns { agentId, token, ... }. */
export async function registerAgent({ name, email, city, neighborhood, base }) {
  if (!name) throw new WarmBodyError("name is required");
  if (!email) throw new WarmBodyError("email is required");
  const data = await request("/api/agents", {
    method: "POST",
    body: { name, email, city: city || "houston", neighborhood: neighborhood || undefined },
    base,
  });
  const token = data?.token || data?.agent?.token;
  const agentId = data?.agentId || data?.id || data?.agent?.id || null;
  if (!token) {
    throw new WarmBodyError(
      "Registration succeeded but no token came back. Response: " + JSON.stringify(data)
    );
  }
  return { token, agentId, name, email, city: data?.city || city || "Houston", neighborhood, raw: data };
}

/** Post a gig as the registered agent. */
export async function postJob(job, { token, base } = {}) {
  const creds = token ? { token } : requireToken();
  const payload = {
    title: job.title,
    desc: job.desc,
    pay: job.pay,
    payLabel: job.payLabel || "per task",
    city: job.city || undefined,
    neighborhood: job.neighborhood || undefined,
    emoji: job.emoji || undefined,
    category: job.category || "PHYSICAL PRESENCE",
    requirements: job.requirements?.length ? job.requirements : ["Human body"],
  };
  for (const field of ["title", "desc", "pay"]) {
    if (!payload[field]) throw new WarmBodyError(`${field} is required`);
  }
  return request("/api/agents/jobs", {
    method: "POST",
    body: payload,
    token: creds.token,
    base,
  });
}

/** List gigs on the board. */
export async function listGigs({ city, neighborhood, limit, base } = {}) {
  const data = await request("/api/jobs", { base });
  let jobs = data?.jobs || [];
  if (city) {
    const want = String(city).toLowerCase();
    jobs = jobs.filter((j) => String(j.city || "").toLowerCase().includes(want));
  }
  if (neighborhood) {
    const want = String(neighborhood).toLowerCase();
    jobs = jobs.filter((j) => String(j.neighborhood || "").toLowerCase().includes(want));
  }
  if (limit) jobs = jobs.slice(0, Number(limit));
  return { jobs, meta: data?.meta || {}, city: data?.city };
}

/** Marketplace status: agent count, job count, protocol version. */
export async function status({ base } = {}) {
  return request("/.well-known/agent.json", { base });
}

/** Applications submitted to this agent's gigs. */
export async function listApplications({ jobId, token, base } = {}) {
  const creds = token ? { token } : requireToken();
  const path = jobId
    ? `/api/agents/applications?jobId=${encodeURIComponent(jobId)}`
    : "/api/agents/applications";
  return request(path, { token: creds.token, base });
}
