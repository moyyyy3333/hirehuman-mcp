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
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
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
      if (j.token) return j.token;
    } catch {}
  }
  return null;
}

const token = findToken();
if (!token) {
  console.error(
    "No Vercel token found.\n" +
      "Run:  npx vercel login\n" +
      "or:   VERCEL_TOKEN=xxx node rescue-source.mjs   (token from https://vercel.com/account/tokens)"
  );
  process.exit(1);
}

const api = async (path) => {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM}`;
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
