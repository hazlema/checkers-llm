import {createGame, applyMove, legalMoves, opponent, type Side} from './game';
export type Mode='human'|'ai'|'agent';
export type Player={mode:Mode; name:string|null};
export function createMatchService() {
 let game=createGame();
 const instanceId=crypto.randomUUID();
 const players:Record<Side,Player>={red:{mode:'human',name:null},blue:{mode:'ai',name:null}};
 const tokens:Partial<Record<Side,string>>={};
 let drawOffer:Side|null=null;
 const uiToken=crypto.randomUUID();
 const listeners=new Set<()=>void>();
 const snapshot=()=>({instanceId,game:structuredClone(game),players:structuredClone(players),moves:legalMoves(game),drawOffer});
 const waiters=new Set<{since:number;resolve:(response:Response)=>void;timer:ReturnType<typeof setTimeout>}>();
 const emit=()=>{for(const waiter of [...waiters]){if(game.revision>waiter.since){clearTimeout(waiter.timer);waiters.delete(waiter);waiter.resolve(json(snapshot()));}}listeners.forEach(fn=>fn());};
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 const fail=(message:string,status=400)=>json({error:message},status);
 const subscribe=(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn);};};
 async function handle(req:Request):Promise<Response> {
  const url=new URL(req.url),path=url.pathname;
  if(req.method==='GET'){
   if(path==='/api/state'){
    const sinceParam=url.searchParams.get('since'),since=Number(sinceParam);
    if(sinceParam!==null&&Number.isInteger(since)&&game.revision<=since){
     const waitMs=Math.min(Math.max(Number(url.searchParams.get('waitMs'))||25000,1),30000);
     return new Promise<Response>(resolve=>{const waiter={since,resolve,timer:setTimeout(()=>{waiters.delete(waiter);resolve(json(snapshot()));},waitMs)};waiters.add(waiter);});
    }
    return json(snapshot());
   }
   if(path==='/api/moves')return json({revision:game.revision,turn:game.turn,forcedPiece:game.forcedPiece,moves:legalMoves(game)});
   return fail('Not found',404);
  }
  if(req.method!=='POST')return fail('Method not allowed',405);
  const origin=req.headers.get('origin');
  if(origin && origin!==url.origin)return fail('Cross-origin control is not allowed.',403);
  let body:any;
  try{body=await req.json();}catch{return fail('Request must contain valid JSON.');}
  if(!body||typeof body!=='object'||Array.isArray(body))return fail('Expected a JSON object.');
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'') || req.headers.get('cookie')?.match(/(?:^|; )crown_session=([^;]+)/)?.[1];
  const isUI=token===uiToken;
  if(path==='/api/claim'){
   if(body.side!=='red'&&body.side!=='blue')return fail('Side must be red or blue.');
   if(typeof body.name!=='string'||!body.name.trim()||body.name.length>40)return fail('Agent name must contain 1–40 characters.');
   const side=body.side as Side;
   if(players[side].mode!=='agent'||tokens[side])return fail('Seat unavailable. Select External agent in the game, or release the occupied seat first.',409);
   const newToken=crypto.randomUUID(); tokens[side]=newToken;players[side].name=body.name.trim();game.revision++;emit();
   return json({side,token:newToken,...snapshot()});
  }
  if(path==='/api/release'){
   const side=(['red','blue'] as Side[]).find(s=>tokens[s]===token && token);
   if(!side)return fail('A valid agent token is required.',403);
   delete tokens[side];players[side].name=null;drawOffer=null;game.revision++;emit();return json(snapshot());
  }
  if(path==='/api/move'){
   const steps=Array.isArray(body.steps)&&body.steps.length>=2&&body.steps.every((s:unknown)=>typeof s==='string')?body.steps as string[]:null;
   if(!steps&&(typeof body.from!=='string'||typeof body.to!=='string'))return fail('Provide from and to, or a steps array of squares, plus the current integer revision.');
   if(!Number.isInteger(body.revision))return fail('Provide from, to, and the current integer revision.');
   if(body.revision!==game.revision)return fail('Board changed. Fetch /api/state and choose a current legal move.',409);
   const side=game.turn;
   if(!(isUI&&players[side].mode==='human') && !(token&&token===tokens[side]&&players[side].mode==='agent'))return fail('This army is controlled by another player.',403);
   const squares=steps??[body.from,body.to];
   let next=game;
   try{for(let i=0;i<squares.length-1;i++){if(i>0&&!next.forcedPiece)throw new Error('The jump chain ended before all steps were used. Submit only the legal continuation.');next=applyMove(next,squares[i],squares[i+1]);}}catch(e){return fail((e as Error).message);}
   game=next;drawOffer=null;emit();return json(snapshot());
  }
  if(path==='/api/draw-offer'){
   if(!['offer','accept','decline'].includes(body.action))return fail('Action must be offer, accept, or decline.');
   if(game.winner)return fail('The match is already decided.',409);
   let side=(['red','blue'] as Side[]).find(s=>token&&tokens[s]===token);
   if(!side&&isUI&&(body.side==='red'||body.side==='blue')&&players[body.side as Side].mode==='human')side=body.side as Side;
   if(!side)return fail('Use your seat bearer token, or the local interface with its human side.',403);
   if(body.action==='offer'){
    if(drawOffer===side)return fail('Your draw offer already stands.',409);
    if(drawOffer)return fail('Your rival already offers a draw. Accept or decline it instead.',409);
    drawOffer=side;
   }else{
    if(drawOffer!==opponent(side))return fail(drawOffer?'You cannot answer your own offer. It expires after the next move.':'No draw offer stands.',409);
    if(body.action==='accept')game.winner='draw';
    drawOffer=null;
   }
   game.revision++;emit();return json(snapshot());
  }
  if(path==='/api/control'||path==='/api/reset'){
   if(!isUI)return fail('Only the local game interface can change the match.',403);
   if(path==='/api/control'){
    if(!['red','blue'].includes(body.side)||!['human','ai','agent'].includes(body.mode))return fail('Choose a valid army and control mode.');
    const side=body.side as Side;players[side]={mode:body.mode,name:null};delete tokens[side];game.revision++;
   }else{
    const revision=game.revision+1;game=createGame();game.revision=revision;
    for(const side of ['red','blue'] as Side[]){delete tokens[side];players[side].name=null;}
   }
   drawOffer=null;emit();return json(snapshot());
  }
  return fail('Not found',404);
 }
 function tickAI(){
  if(game.winner||players[game.turn].mode!=='ai')return;
  const side=game.turn;
  // Prefer material, promotion, and safe squares; vary equal positions.
  const ranked=legalMoves(game).map(move=>{const next=applyMove(game,move.from,move.to);const replies=legalMoves(next);const danger=next.turn!==side&&replies.some(r=>r.capture===move.to)?4:0;const score=(move.capture?5:0)+(next.history.at(-1)?.crowned?4:0)+(next.winner===side?100:0)-danger+Math.random();return {move,score};}).sort((a,b)=>b.score-a.score);
  if(ranked.length){game=applyMove(game,ranked[0].move.from,ranked[0].move.to);drawOffer=null;emit();}
 }
 return {uiToken,handle,snapshot,subscribe,tickAI};
}
export type Snapshot=ReturnType<ReturnType<typeof createMatchService>['snapshot']>;
