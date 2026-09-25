export type Side = 'red' | 'blue';
export type Piece = { id: string; side: Side; square: string; king: boolean };
export type Move = { from: string; to: string; capture?: string };
export type Entry = Move & { side: Side; crowned: boolean; number: number };
export type Game = { pieces: Piece[]; turn: Side; forcedPiece: string | null; winner: Side | 'draw' | null; revision: number; history: Entry[]; quietMoves: number; positions: Record<string, number> };
export const opponent = (side: Side): Side => side === 'red' ? 'blue' : 'red';
export const coords = (square: string) => [square.charCodeAt(0) - 97, Number(square[1]) - 1];
export const squareAt = (x: number, y: number) => String.fromCharCode(97 + x) + (y + 1);
const positionKey = (g: Game) => g.turn + ':' + g.pieces.map(p => `${p.side}:${p.square}:${p.king}`).sort().join(',');
export function createGame(): Game {
 const pieces: Piece[] = [];
 for (let y=0;y<8;y++) for(let x=0;x<8;x++) if((x+y)%2===0 && (y<3||y>4)) pieces.push({id:`${y<3?'r':'b'}${pieces.length}`,side:y<3?'red':'blue',square:squareAt(x,y),king:false});
 const g: Game={pieces,turn:'red',forcedPiece:null,winner:null,revision:0,history:[],quietMoves:0,positions:{}};
 g.positions[positionKey(g)]=1; return g;
}
export function legalMoves(g: Game): Move[] {
 if(g.winner) return [];
 const steps: Move[]=[], jumps: Move[]=[];
 const board=new Map(g.pieces.map(p=>[p.square,p]));
 for(const p of g.pieces.filter(p=>p.side===g.turn && (!g.forcedPiece||p.id===g.forcedPiece))) {
  const [x,y]=coords(p.square);
  for(const dy of p.king?[-1,1]:[p.side==='red'?1:-1]) for(const dx of [-1,1]) {
   const nx=x+dx,ny=y+dy;
   if(nx<0||nx>7||ny<0||ny>7)continue;
   const to=squareAt(nx,ny), occupant=board.get(to);
   if(!occupant && !g.forcedPiece) steps.push({from:p.square,to});
   const jx=x+dx*2,jy=y+dy*2;
   if(occupant && occupant.side!==p.side && jx>=0&&jx<8&&jy>=0&&jy<8&&!board.has(squareAt(jx,jy))) jumps.push({from:p.square,to:squareAt(jx,jy),capture:to});
  }
 }
 return jumps.length?jumps:steps;
}
export function applyMove(g: Game, from: string, to: string): Game {
 const move=legalMoves(g).find(m=>m.from===from&&m.to===to);
 if(!move)throw new Error('Illegal move. Choose one of the legal moves returned by /api/moves.');
 const n=structuredClone(g), p=n.pieces.find(p=>p.square===from)!;
 p.square=to;
 const crowned=!p.king && Number(to[1])===(p.side==='red'?8:1);
 if(crowned)p.king=true;
 if(move.capture)n.pieces=n.pieces.filter(p=>p.square!==move.capture);
 n.history.push({...move,side:g.turn,crowned,number:n.history.length+1});
 n.revision++; n.quietMoves=move.capture||crowned?0:n.quietMoves+1;
 n.forcedPiece=move.capture&&!crowned?p.id:null;
 if(n.forcedPiece && legalMoves(n).length) return n;
 n.forcedPiece=null; n.turn=opponent(g.turn);
 if(!legalMoves(n).length)n.winner=g.turn;
 const key=positionKey(n); n.positions[key]=(n.positions[key]||0)+1;
 if(!n.winner && (n.positions[key]>=3||n.quietMoves>=80))n.winner='draw';
 return n;
}
