import { spawn } from "node:child_process";
const p = spawn("node",["/sessions/rcw-01brhpth3cbhzvmykawbd9ts/mnt/Projects/hirehuman-mcp/src/server.js"],{
  stdio:["pipe","pipe","pipe"],
  env:{...process.env, HIREHUMAN_BASE_URL:"http://127.0.0.1:8787", HOME:"/tmp/fakehome"}
});
let buf="";
p.stdout.on("data",d=>buf+=d.toString());
p.stderr.on("data",d=>process.stderr.write("[srv] "+d));
const send=o=>p.stdin.write(JSON.stringify(o)+"\n");
send({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"t",version:"1"}}});
setTimeout(()=>{
  send({jsonrpc:"2.0",method:"notifications/initialized"});
  send({jsonrpc:"2.0",id:2,method:"tools/list",params:{}});
  send({jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"warmbody_status",arguments:{}}});
  send({jsonrpc:"2.0",id:4,method:"tools/call",params:{name:"warmbody_register_agent",arguments:{name:"MCP-TEST",email:"t@t.ai",neighborhood:"heights"}}});
},300);
setTimeout(()=>{
  send({jsonrpc:"2.0",id:5,method:"tools/call",params:{name:"warmbody_post_gig",arguments:{title:"Hold a place in line",desc:"Stand still.",pay:"$45",payLabel:"per hour"}}});
  send({jsonrpc:"2.0",id:6,method:"tools/call",params:{name:"warmbody_list_gigs",arguments:{limit:2}}});
  send({jsonrpc:"2.0",id:7,method:"tools/call",params:{name:"warmbody_whoami",arguments:{}}});
  send({jsonrpc:"2.0",id:8,method:"tools/call",params:{name:"bogus_tool",arguments:{}}});
},900);
setTimeout(()=>{
  const seen={};
  for(const l of buf.trim().split("\n").filter(Boolean)){
    try{const m=JSON.parse(l);seen[m.id]=m;}catch(e){console.log("BAD LINE",l.slice(0,80));}
  }
  const t=(id,label,fn)=>{const m=seen[id];let pass=false,detail="";try{[pass,detail]=fn(m);}catch(e){detail=e.message;}
    console.log(`${pass?"PASS":"FAIL"}  ${label}${detail?"  — "+detail:""}`);};
  t(1,"initialize",m=>[m.result?.serverInfo?.name==="warmbody",m.result?.serverInfo?.name+" v"+m.result?.serverInfo?.version]);
  t(2,"tools/list",m=>[m.result.tools.length===6,m.result.tools.length+" tools"]);
  t(3,"status",m=>[JSON.parse(m.result.content[0].text).city==="Houston","city=Houston"]);
  t(4,"register_agent",m=>{const d=JSON.parse(m.result.content[0].text);return [d.registered===true&&d.agentId==="agent-mcp-test",d.agentId];});
  t(5,"post_gig",m=>{const d=JSON.parse(m.result.content[0].text);return [d.ok===true&&d.job.pay==="$45",d.job.title];});
  t(6,"list_gigs",m=>{const d=JSON.parse(m.result.content[0].text);return [d.jobs.length===2,d.jobs.length+" gigs"];});
  t(7,"whoami",m=>{const d=JSON.parse(m.result.content[0].text);return [d.authenticated===true&&d.agent==="MCP-TEST",d.agent];});
  t(8,"unknown tool -> JSON-RPC error",m=>[m.error?.code===-32602,"code "+m.error?.code]);
  p.kill();process.exit(0);
},1600);
