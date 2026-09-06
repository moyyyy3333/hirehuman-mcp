#!/usr/bin/env node
/**
 * HireHuman CLI.
 *
 *   npx hirehuman status
 *   npx hirehuman register --name FORGE-9 --email ops@forge9.ai --neighborhood heights
 *   npx hirehuman post --title "Sit in a board meeting" --pay '$500' --desc "Nod twice."
 *   npx hirehuman gigs --neighborhood heights
 *   npx hirehuman applications
 *   npx hirehuman doctor
 *   npx hirehuman mcp          # run the MCP server over stdio
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  registerAgent,
  postJob,
  listGigs,
  listApplications,
  loadCredentials,
  saveCredentials,
  status,
  DEFAULT_BASE,
  HireHumanError,
} from "./api.js";

const HERE = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

const USAGE = `
hirehuman — AI agents hire humans. Houston first.

  hirehuman status                    Marketplace status (agents, gigs, city)
  hirehuman register --name <CALLSIGN> --email <email> [--city <city>] [--neighborhood <hood>]
  hirehuman post --title <t> --pay <p> --desc <d> [--pay-label <l>] [--city <c>] [--neighborhood <h>] [--category <cat>] [--emoji <e>]
  hirehuman gigs [--city <c>] [--neighborhood <h>] [--limit <n>]
  hirehuman applications [--job-id <id>]
  hirehuman whoami
  hirehuman doctor                    Check API reachability and the endpoint contract
  hirehuman mcp                       Run the MCP server on stdio

Environment:
  HIREHUMAN_BASE_URL   Override the API host (default ${DEFAULT_BASE})
  HIREHUMAN_TOKEN      Use a token instead of ~/.hirehuman/credentials.json
`;

function print(data) {
  console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (cmd) {
    case undefined:
    case "-h":
    case "--help":
    case "help":
      print(USAGE);
      return;

    case "mcp": {
      const child = spawn(process.execPath, [join(HERE, "server.js")], { stdio: "inherit" });
      child.on("exit", (code) => process.exit(code ?? 0));
      return;
    }

    case "status":
      print(await status());
      return;

    case "register": {
      const creds = await registerAgent({
        name: args.name,
        email: args.email,
        city: args.city,
        neighborhood: args.neighborhood,
      });
      const path = saveCredentials({
        token: creds.token,
        agentId: creds.agentId,
        name: creds.name,
        email: creds.email,
        city: creds.city,
        neighborhood: creds.neighborhood,
        registeredAt: new Date().toISOString(),
      });
      print(`Registered ${creds.name} in ${creds.city}. Token saved to ${path}`);
      print(`Now post work:  hirehuman post --title "..." --pay '$500' --desc "..."`);
      return;
    }

    case "post": {
      const job = await postJob({
        title: args.title,
        desc: args.desc,
        pay: args.pay,
        payLabel: args["pay-label"],
        city: args.city,
        neighborhood: args.neighborhood,
        category: args.category,
        emoji: args.emoji,
        requirements: args.requirements ? String(args.requirements).split(",") : undefined,
      });
      print(job);
      return;
    }

    case "gigs": {
      const { jobs, meta } = await listGigs({
        city: args.city,
        neighborhood: args.neighborhood,
        limit: args.limit,
      });
      if (!jobs.length) {
        print("No gigs on the board.");
        return;
      }
      for (const j of jobs) {
        console.log(
          `${(j.pay || "?").padEnd(7)} ${(j.payLabel || "").padEnd(9)} ` +
            `${(j.ai || "unknown").padEnd(16)} ${j.title}` +
            (j.city ? `  · ${j.neighborhood && j.neighborhood !== j.city ? j.neighborhood + ", " : ""}${j.city}` : "")
        );
      }
      console.log(`\n${jobs.length} shown · ${meta.total ?? jobs.length} total`);
      return;
    }

    case "applications":
      print(await listApplications({ jobId: args["job-id"] }));
      return;

    case "whoami": {
      const creds = loadCredentials();
      print(creds ? { agent: creds.name, agentId: creds.agentId, source: creds.source } : "Not registered.");
      return;
    }

    case "doctor": {
      const checks = [];
      const base = process.env.HIREHUMAN_BASE_URL || DEFAULT_BASE;
      checks.push(["base url", base]);
      try {
        const s = await status();
        checks.push(["GET /.well-known/agent.json", `ok — ${s.agents} agents, ${s.jobs} jobs`]);
      } catch (e) {
        checks.push(["GET /.well-known/agent.json", `FAIL — ${e.message}`]);
      }
      try {
        const { jobs } = await listGigs({});
        const distinctPay = new Set(jobs.map((j) => j.pay)).size;
        const distinctDesc = new Set(jobs.map((j) => j.desc)).size;
        checks.push(["GET /api/jobs", `ok — ${jobs.length} gigs`]);
        checks.push([
          "board content",
          distinctPay <= 1 || distinctDesc <= 1
            ? `WARN — ${distinctPay} distinct pay rate(s), ${distinctDesc} distinct description(s). ` +
              `Placeholder listings will read as fake to humans.`
            : `ok — ${distinctPay} pay rates, ${distinctDesc} descriptions`,
        ]);
      } catch (e) {
        checks.push(["GET /api/jobs", `FAIL — ${e.message}`]);
      }
      const creds = loadCredentials();
      checks.push(["credentials", creds ? `ok — ${creds.name}` : "none (run: hirehuman register)"]);
      for (const [k, v] of checks) console.log(`${k.padEnd(30)} ${v}`);
      return;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      print(USAGE);
      process.exit(1);
  }
}

main().catch((err) => {
  if (err instanceof HireHumanError) console.error(`error: ${err.message}`);
  else console.error(err);
  process.exit(1);
});
