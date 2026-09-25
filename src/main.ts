import {Battlefield} from './scene';
import type {Snapshot} from './service';
import {opponent, type Side} from './game';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let state:Snapshot|null=null,selected:string|null=null,connected=false,busy=false,sound=localStorage.getItem('crown_sound')==='on';
let field:Battlefield|undefined;
let toastTimer:ReturnType<typeof setTimeout>;
function toast(message:string){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
let audio:AudioContext|undefined,noise:AudioBuffer|undefined;
function soundContext(){if(!sound)return;try{audio??=new AudioContext();void audio.resume();return audio;}catch{return;/* Sound is optional. */}}
function noiseBuffer(a:AudioContext){if(!noise){noise=a.createBuffer(1,Math.floor(a.sampleRate*.3),a.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}return noise;}
/** A piece sliding over stone: a short burst of noise swept down through a lowpass. */
function playSlide(delay=0){const a=soundContext();if(!a)return;const t=a.currentTime+delay;const src=a.createBufferSource();src.buffer=noiseBuffer(a);const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(900,t);filter.frequency.exponentialRampToValueAtTime(220,t+.14);const gain=a.createGain();gain.gain.setValueAtTime(.15,t);gain.gain.exponentialRampToValueAtTime(.001,t+.15);src.connect(filter);filter.connect(gain);gain.connect(a.destination);src.start(t);src.stop(t+.16);}
/** A heavy landing: low sine dropping fast, with a click of muffled noise at the front. */
function playThud(delay=0){const a=soundContext();if(!a)return;const t=a.currentTime+delay;const osc=a.createOscillator(),gain=a.createGain();osc.type='sine';osc.frequency.setValueAtTime(120,t);osc.frequency.exponentialRampToValueAtTime(40,t+.15);gain.gain.setValueAtTime(.3,t);gain.gain.exponentialRampToValueAtTime(.001,t+.2);osc.connect(gain);gain.connect(a.destination);osc.start(t);osc.stop(t+.21);const click=a.createBufferSource();click.buffer=noiseBuffer(a);const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;const clickGain=a.createGain();clickGain.gain.setValueAtTime(.17,t);clickGain.gain.exponentialRampToValueAtTime(.001,t+.05);click.connect(filter);filter.connect(clickGain);clickGain.connect(a.destination);click.start(t);click.stop(t+.06);}
/** A small metallic ting for a coronation. */
function playTing(delay=0){const a=soundContext();if(!a)return;const t=a.currentTime+delay;for(const [freq,vol] of [[1319,.1],[1976,.06]] as const){const osc=a.createOscillator(),gain=a.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(vol,t);gain.gain.exponentialRampToValueAtTime(.001,t+.4);osc.connect(gain);gain.connect(a.destination);osc.start(t);osc.stop(t+.41);}}
function playVerdictSound(kind:'won'|'lost'|'draw'|'neutral'){const a=soundContext();if(!a)return;const notes:readonly (readonly [number,number])[]=kind==='lost'?[[330,0],[262,.28]]:kind==='draw'?[[440,0],[440,.25]]:[[392,0],[523,.13],[659,.26]];for(const [freq,at] of notes){const t=a.currentTime+at;const osc=a.createOscillator(),gain=a.createGain();osc.type='triangle';osc.frequency.value=freq;gain.gain.setValueAtTime(.14,t);gain.gain.exponentialRampToValueAtTime(.001,t+.35);osc.connect(gain);gain.connect(a.destination);osc.start(t);osc.stop(t+.36);}}
async function post(path:string,body:unknown){const response=await fetch(`/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error||'The request could not be completed.');if(!state||result.game.revision>=state.game.revision)receive(result);return result;}
const house=(side:Side)=>side==='red'?'House Ember':'House Azure';
function canPlay(){return !!state&&connected&&!busy&&!state.game.winner&&state.players[state.game.turn].mode==='human';}
async function move(from:string,to:string){if(!canPlay()||!state)return;busy=true;render();try{await post('move',{from,to,revision:state.game.revision});}catch(error){toast((error as Error).message);}finally{busy=false;render();}}
function choose(square:string){if(!canPlay()||!state)return;const available=state.moves.find(m=>m.from===selected&&m.to===square);if(available){void move(available.from,available.to);return;}if(state.moves.some(m=>m.from===square)){selected=selected===square?null:square;}else{selected=null;}render();}
try{field=new Battlefield($('battlefield'),choose);$('loading').remove();}catch(error){$('loading').className='webgl-error';$('loading').textContent='3D rendering is unavailable in this browser. You can still play using the coordinate controls below.';$('keyboard-moves').hidden=false;console.error(error);}
function receive(next:Snapshot){if(state&&next.instanceId!==state.instanceId){location.reload();return;}if(state&&next.game.revision<state.game.revision)return;const old=state;state=next;if(old&&next.game.history.length>old.game.history.length){next.game.history.slice(old.game.history.length).forEach((entry,i)=>{if(entry.capture)playThud(i*.13);else playSlide(i*.13);if(entry.crowned)playTing(i*.13+.12);});}if(next.game.forcedPiece){selected=next.game.pieces.find(p=>p.id===next.game.forcedPiece)?.square||null;}else if(!old||old.game.history.length!==next.game.history.length||old.game.turn!==next.game.turn){selected=null;}if(old&&!old.game.winner&&next.game.winner)showVerdict(next.game.winner);render();}
function showVerdict(winner:Side|'draw'){
 if(!state)return;
 const humans=(['red','blue'] as Side[]).filter(side=>state!.players[side].mode==='human');
 const emblem=$('verdict-emblem');emblem.classList.remove('red','blue','draw');
 if(winner==='draw'){
  emblem.textContent='⚐';emblem.classList.add('draw');
  $('verdict-eyebrow').textContent='The parley holds';
  $('verdict-title').textContent='An honorable draw.';
  $('verdict-text').textContent='The houses lower their blades and share the field. The chronicle remembers both with honor.';
  playVerdictSound('draw');
 }else{
  const won=humans.length===1&&humans[0]===winner,lost=humans.length===1&&humans[0]!==winner;
  emblem.textContent='♛';emblem.classList.add(winner);
  $('verdict-eyebrow').textContent='The chronicle records';
  $('verdict-title').textContent=won?'Victory!':lost?'Defeat.':`${house(winner)} claims the crown.`;
  $('verdict-text').textContent=won?`${house(winner)} claims the crown. The field is yours, commander — the bards will sing of this.`:lost?`${house(winner)} claims the crown. Your army fought to the last knight. Raise the banners and answer.`:'The battle is decided. Raise the armies to contest the throne again.';
  playVerdictSound(won?'won':lost?'lost':'neutral');
 }
 $<HTMLDialogElement>('verdict-dialog').showModal();
}
function render(){
 if(!state)return;const {game,players,moves}=state;
 for(const side of ['red','blue'] as Side[]){
  const pieces=game.pieces.filter(p=>p.side===side);$(`${side}-count`).textContent=String(pieces.length);$(`${side}-kings`).textContent=String(pieces.filter(p=>p.king).length);
  $(`${side}-card`).classList.toggle('active',game.turn===side&&!game.winner);
  const control=$<HTMLSelectElement>(`${side}-control`);control.value=players[side].mode;control.disabled=!connected;
  $(`${side}-agent`).textContent=players[side].mode==='agent'?(players[side].name?`${players[side].name} connected`:'Open seat · awaiting an agent'):'';
 }
 const mode=players[game.turn].mode;
 $('turn-title').textContent=game.winner?(game.winner==='draw'?'An honorable stalemate.':`${house(game.winner)} claims the crown.`):`${house(game.turn)}, ${mode==='human'?'your move.':mode==='ai'?'considering…':'awaiting orders.'}`;
 $('turn-help').textContent=!connected?'Connection lost. Reconnecting to the battlefield…':game.winner?'Start a new match to raise your armies again.':mode==='agent'?(players[game.turn].name?`${players[game.turn].name} is commanding this army.`:'Connect an agent to claim this army and make its move.'):mode==='ai'?'The sparring commander is planning the next march.':game.forcedPiece?'Continue the charge with the highlighted knight.':selected?`${selected.toUpperCase()} selected. Choose a gold destination.`:moves.some(m=>m.capture)?'A capture is available. Your knights must take it.':'Select a knight to see where it can march.';
 document.querySelector('.battlefield-panel')!.classList.toggle('is-blue',game.turn==='blue');
 $('turn-number').textContent=String(game.history.length+1).padStart(2,'0');
 $('round-label').textContent=game.history.length?`${game.history.length} ${game.history.length===1?'march':'marches'} made`:'Opening formation';
 $('history-count').textContent=`${game.history.length} move${game.history.length===1?'':'s'}`;
 const history=$('history-list');
 if(game.history.length){history.replaceChildren(...game.history.slice().reverse().map(entry=>{const row=document.createElement('div');row.className='history-row';const number=document.createElement('span');number.className='move-number';number.textContent=String(entry.number).padStart(2,'0');const text=document.createElement('span');text.className='move-text';text.textContent=`${entry.from} ${entry.capture?'×':'→'} ${entry.to}${entry.crowned?' ♛':''}`;const side=document.createElement('span');side.className=`move-side ${entry.side}`;side.textContent=entry.side==='red'?'Red':'Blue';row.append(number,text,side);return row;}));}else if(history.querySelector('.history-row')){history.innerHTML='<div class="empty-chronicle"><h3>History awaits.</h3><p>The first march writes<br>the first line.</p></div>';}
 const offer=state.drawOffer;
 for(const side of ['red','blue'] as Side[]){const button=$<HTMLButtonElement>(`${side}-draw`);button.hidden=!connected||!!game.winner||!!offer||players[side].mode!=='human';button.disabled=busy;}
 const parley=$('draw-parley');parley.hidden=!offer||!!game.winner;
 if(offer&&!game.winner){
  const answerable=connected&&players[opponent(offer)].mode==='human';
  $('draw-text').textContent=answerable?`${house(offer)} proposes an honorable draw.`:`${house(offer)} offers a draw. It expires after the next march.`;
  $('draw-accept').hidden=$('draw-decline').hidden=!answerable;
  $<HTMLButtonElement>('draw-accept').disabled=$<HTMLButtonElement>('draw-decline').disabled=busy;
 }
 const selector=$<HTMLSelectElement>('move-select'),oldValue=selector.value;selector.replaceChildren(...moves.map(m=>{const option=document.createElement('option');option.value=`${m.from},${m.to}`;option.textContent=`${m.from} ${m.capture?'captures on':'to'} ${m.to}`;return option;}));if(moves.some(m=>`${m.from},${m.to}`===oldValue))selector.value=oldValue;selector.disabled=!canPlay();$<HTMLButtonElement>('play-selected').disabled=!canPlay();
 field?.update(game,selected,canPlay()?moves:[]);
}
const events=new EventSource('/api/events');
events.onopen=()=>{connected=true;$('connection').innerHTML='<i></i> Battlefield live';$('connection').classList.remove('offline');render();};
events.onmessage=e=>{try{receive(JSON.parse(e.data));}catch{toast('Could not read the match update.');}};
events.onerror=()=>{connected=false;$('connection').innerHTML='<i></i> Reconnecting';$('connection').classList.add('offline');render();};
for(const side of ['red','blue'] as Side[])$(`${side}-control`).addEventListener('change',async e=>{try{await post('control',{side,mode:(e.target as HTMLSelectElement).value});}catch(error){toast((error as Error).message);render();}});
$('rotate').onclick=()=>field?.rotate();$('zoom-in').onclick=()=>field?.changeZoom(.1);$('zoom-out').onclick=()=>field?.changeZoom(-.1);
function syncSoundButton(){$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Disable sound':'Enable sound');$('sound').title=sound?'Disable sound':'Enable sound';}
syncSoundButton();
$('sound').onclick=()=>{sound=!sound;localStorage.setItem('crown_sound',sound?'on':'off');syncSoundButton();playSlide();};
async function parley(action:'offer'|'accept'|'decline',side:Side){busy=true;render();try{await post('draw-offer',{action,side});if(action==='offer')toast('Your draw offer has been sent. It expires after the next march.');}catch(error){toast((error as Error).message);}finally{busy=false;render();}}
for(const side of ['red','blue'] as Side[])$(`${side}-draw`).onclick=()=>{if(state&&state.players[side].mode==='human')void parley('offer',side);};
$('draw-accept').onclick=()=>{if(state?.drawOffer)void parley('accept',opponent(state.drawOffer));};
$('draw-decline').onclick=()=>{if(state?.drawOffer)void parley('decline',opponent(state.drawOffer));};
$('keyboard-toggle').onclick=()=>{$('keyboard-moves').hidden=!$('keyboard-moves').hidden;if(!$('keyboard-moves').hidden)$('move-select').focus();};
$('play-selected').onclick=()=>{const [from,to]=$<HTMLSelectElement>('move-select').value.split(',');if(from&&to)void move(from,to);};
function openDialog(id:string){$<HTMLDialogElement>(id).showModal();}
$('rules-open').onclick=()=>openDialog('rules-dialog');$('agents-open').onclick=()=>openDialog('agents-dialog');$('agents-link').onclick=()=>openDialog('agents-dialog');$('new-game').onclick=()=>openDialog('reset-dialog');
for(const dialog of document.querySelectorAll('dialog')){for(const close of dialog.querySelectorAll('.dialog-close,.close-dialog'))close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();}});}
$('confirm-reset').onclick=async()=>{try{await post('reset',{});$<HTMLDialogElement>('reset-dialog').close();toast('A new chapter begins.');}catch(error){toast((error as Error).message);}};
$('verdict-new-match').onclick=async()=>{try{await post('reset',{});$<HTMLDialogElement>('verdict-dialog').close();toast('A new chapter begins.');}catch(error){toast((error as Error).message);}};
const base=location.origin;$('api-base').textContent=base;
$('claim-example').textContent=`curl ${base}/api/claim \\\n  -H 'Content-Type: application/json' \\\n  -d '{"side":"red","name":"My knight"}'`;
$('state-example').textContent=`curl ${base}/api/state`;
$('move-example').textContent=`curl ${base}/api/move \\\n  -H 'Authorization: Bearer YOUR_TOKEN' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"from":"a3","to":"b4","revision":2}'`;
$('copy-api').onclick=async()=>{try{await navigator.clipboard.writeText(base);toast('Connection URL copied.');}catch{toast(`Connection URL: ${base}`);}};
