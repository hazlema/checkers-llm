/** A minimal HTTP-only agent. Run: bun examples/agent.ts red [http://127.0.0.1:3000] */
const side=process.argv[2]||'red';
if(side!=='red'&&side!=='blue')throw new Error('Choose red or blue.');
const base=process.argv[3]||'http://127.0.0.1:3000';
let token:string|undefined;
async function request(path:string,body?:unknown){
 const response=await fetch(`${base}/api/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error),{status:response.status});return data;
}
const claim=await request('claim',{side,name:`Example ${side} commander`});token=claim.token;
console.log(`Commanding ${side}. Press Ctrl+C to release the seat.`);
async function release(){try{await request('release',{});}catch{}process.exit();}
process.on('SIGINT',release);process.on('SIGTERM',release);
try{
 let state=await request('state');
 while(true){
  if(state.game.winner){console.log(`Match finished: ${state.game.winner}`);break;}
  if(state.players[side].mode!=='agent'||!state.players[side].name){console.log('Seat reset or control changed. Select External agent and run this example again.');break;}
  if(state.game.turn===side){
   const moves=state.moves;
   const move=moves[Math.floor(Math.random()*moves.length)];
   if(move){try{state=await request('move',{...move,revision:state.game.revision});console.log(`${move.from} → ${move.to}`);continue;}catch(error){if((error as {status?:number}).status!==409)throw error;}}
  }
  // Long-poll: the server answers the instant anything changes, or after waitMs as a heartbeat.
  state=await request(`state?since=${state.game.revision}&waitMs=25000`);
 }
}finally{try{await request('release',{});}catch{}}
export {};
