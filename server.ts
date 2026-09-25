import {createMatchService} from './src/service';
import {resolve} from 'node:path';
const service=createMatchService();
const root=import.meta.dir;
const build=await Bun.build({entrypoints:[resolve(root,'src/main.ts')],target:'browser',minify:true,sourcemap:'none'});
if(!build.success)throw new Error(build.logs.join('\n'));
const script=await build.outputs[0].text();
const assets:Record<string,string>={'/':'index.html','/style.css':'style.css','/assets/citadel.png':'assets/citadel.png','/favicon.svg':'favicon.svg'};
const server=Bun.serve({
 hostname:process.env.HOST||'127.0.0.1',port:Number(process.env.PORT||3000),idleTimeout:60,maxRequestBodySize:8192,
 async fetch(req){
  const url=new URL(req.url);
  if(req.method==='GET' && url.pathname==='/api/events'){
   let unsubscribe=()=>{};let timer:ReturnType<typeof setInterval>;
   const stream=new ReadableStream({start(controller){
    const send=()=>controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(service.snapshot())}\n\n`));
    send();unsubscribe=service.subscribe(send);timer=setInterval(()=>controller.enqueue(new TextEncoder().encode(': heartbeat\n\n')),15000);
   },cancel(){unsubscribe();clearInterval(timer);}});
   return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'}});
  }
  if(url.pathname.startsWith('/api/'))return service.handle(req);
  if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method not allowed',{status:405});
  if(url.pathname==='/app.js')return new Response(script,{headers:{'Content-Type':'text/javascript'}});
  if(!assets[url.pathname])return new Response('Not found',{status:404});
  const headers:Record<string,string>={};
  if(url.pathname==='/')headers['Set-Cookie']=`crown_session=${service.uiToken}; HttpOnly; SameSite=Strict; Path=/`;
  return new Response(Bun.file(resolve(root,'public',assets[url.pathname])),{headers});
 }
});
setInterval(()=>service.tickAI(),1500);
console.log(`Crown & Steel is ready at ${server.url}`);
