#!/usr/bin/env node
/**
 * Rescue the HireHuman source out of its Vercel deployment.
 *
 * The live site at hirehuman.fyi was deployed straight from a Cursor agent
 * workspace with no git repo connected, so this deployment is currently the
 * only copy of the source. This pulls all of it to disk.
 *
 *   node rescue-source.mjs
 *
 * Auth: reads the token your Vercel CLI already saved. If that isn't there,
 * set VERCEL_TOKEN (make one at https://vercel.com/account/tokens).
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const DEPLOYMENT = "dpl_JDo1zfwjBHEzEft641VBSicSBBix";
const TEAM = "team_bCBlnIFQfzF4chYlXGUzoRcD";
const DEST = join(homedir(), "Projects", "hirehuman-site");

function findToken() {
  if (process.env.VERCEL_TOKEN) return { token: process.env.VERCEL_TOKEN, from: "VERCEL_TOKEN env" };
  const candidates = [
    join(homedir(), "Library/Application Support/com.vercel.cli/auth.json"),
    join(homedir(), ".config/com.vercel.cli/auth.json"),
    join(homedir(), ".local/share/com.vercel.cli/auth.json"),
    join(homedir(), ".now/auth.json"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, "utf8"));
      if (j.token) return { token: j.token, from: p };
    } catch {}
  }
  return { token: null, from: null };
}

const { token, from } = findToken();
if (!token) {
  console.error(
    "No Vercel token found.\n" +
      "Run:  npx vercel login\n" +
      "or:   VERCEL_TOKEN=xxx node rescue-source.mjs   (token from https://vercel.com/account/tokens)"
  );
  process.exit(1);
}
console.log(`Token source: ${from}`);

const raw = async (path) =>
  fetch(`https://api.vercel.com${path}`, { headers: { Authorization: `Bearer ${token}` } });

// Validate the token before doing anything else, so a 403 is explainable.
const me = await raw("/v2/user");
if (!me.ok) {
  console.error(
    `\nThat token is not valid (${me.status} on /v2/user).\n` +
      `It came from: ${from}\n\n` +
      `Fix: create a fresh token at https://vercel.com/account/tokens\n` +
      `     scope it to the team "letsgomo52-2665's projects", then run:\n\n` +
      `     VERCEL_TOKEN=xxxxx node ~/Projects/hirehuman-mcp/rescue-source.mjs\n`
  );
  process.exit(1);
}
console.log(`Authenticated as: ${(await me.json())?.user?.username ?? "unknown"}`);

// Some tokens are team-scoped (teamId rejected), others need it. Try both.
let teamQuery = `?teamId=${TEAM}`;
const probe = await raw(`/v6/deployments/${DEPLOYMENT}/files${teamQuery}`);
if (probe.status === 403 || probe.status === 404) {
  const bare = await raw(`/v6/deployments/${DEPLOYMENT}/files`);
  if (bare.ok) {
    teamQuery = "";
    console.log("Using team-scoped token (no teamId param).");
  } else {
    console.error(
      `\nThis token cannot read that deployment.\n` +
        `  with teamId: ${probe.status}\n` +
        `  without:     ${bare.status}\n\n` +
        `The token is valid but not authorised for the team that owns\n` +
        `hirehuman-site. Create one at https://vercel.com/account/tokens with\n` +
        `scope "letsgomo52-2665's projects", then:\n\n` +
        `  VERCEL_TOKEN=xxxxx node ~/Projects/hirehuman-mcp/rescue-source.mjs\n`
    );
    process.exit(1);
  }
}

const api = async (path) => {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.vercel.com${path}${teamQuery ? sep + teamQuery.slice(1) : ""}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} on ${path}`);
  return r;
};

console.log("Reading deployment file tree...");
const tree = await (await api(`/v6/deployments/${DEPLOYMENT}/files`)).json();

const SKIP = /(^|\/)(node_modules|\.next|\.git)(\/|$)|package-lock\.json$/;
const files = [];
(function walk(nodes, prefix) {
  for (const n of nodes || []) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "directory") walk(n.children, p);
    else files.push({ path: p, uid: n.uid });
  }
})(tree, "");

const wanted = files.filter((f) => !SKIP.test(f.path));
console.log(`${files.length} files in deployment, ${wanted.length} to write.`);

let written = 0;
for (const f of wanted) {
  const res = await api(`/v7/deployments/${DEPLOYMENT}/files/${f.uid}`);
  const raw = await res.text();

  // The API returns either raw text or {"data":"<base64>"}
  let content = raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.data === "string") {
      content = Buffer.from(parsed.data, "base64").toString("utf8");
    }
  } catch {
    /* raw text, keep as-is */
  }

  // Deployment paths are prefixed with "src/" for the upload root
  const rel = f.path.replace(/^src\//, "");
  const dest = join(DEST, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
  written++;
  console.log(`  ${rel}`);
}

console.log(`\nWrote ${written} files to ${DEST}`);
console.log("\nNext:");
console.log(`  cd ${DEST} && npm install && npm run dev`);
console.log("  git init && git add -A && git commit -m 'Rescue deployed source'");
console.log("  gh repo create moyyyy3333/hirehuman-site-next --private --source=. --push");
