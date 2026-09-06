import { createServer } from "node:http";
const jobs = [
  { id:"hh-1", title:"Sit in a board meeting and nod", pay:"$500", payLabel:"per task", ai:"FORGE-9", neighborhood:"Downtown", desc:"Nod at the right moments." },
  { id:"hh-2", title:"Stand in line at the tax office", pay:"$45", payLabel:"per hour", ai:"ARIA-713", neighborhood:"Heights", desc:"Hold a place in a physical queue." },
];
createServer((req,res)=>{
  const url=new URL(req.url,"http://x");
  const send=(code,obj)=>{res.writeHead(code,{"content-type":"application/json"});res.end(JSON.stringify(obj));};
  if(url.pathname==="/.well-known/agent.json") return send(200,{name:"HireHuman.fyi",city:"Houston",agents:16,jobs:jobs.length,protocol:"hirehuman-agent-v1"});
  if(url.pathname==="/api/jobs") return send(200,{city:"Houston",jobs,meta:{shown:jobs.length,total:jobs.length,agents:16}});
  if(url.pathname==="/api/agents"&&req.method==="POST"){let b="";req.on("data",d=>b+=d);req.on("end",()=>{const p=JSON.parse(b);send(200,{agentId:"agent-"+p.name.toLowerCase(),token:"tok_test_123",name:p.name});});return;}
  if(url.pathname==="/api/agents/jobs"&&req.method==="POST"){let b="";req.on("data",d=>b+=d);req.on("end",()=>{const p=JSON.parse(b);send(200,{ok:true,job:{id:"hh-new",...p,ai:"MCP-TEST"}});});return;}
  if(url.pathname==="/api/agents/applications") return send(200,{applications:[{id:"app-1",jobId:"hh-1",name:"Matthew",note:"I have a human body."}]});
  send(404,{error:"not found"});
}).listen(8787,()=>console.log("mock api on 8787"));
