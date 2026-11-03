/**
 * Configuracion central de la escena de ajedrez.
 * Unidades: metros (los GLB vienen exportados en metros desde Blender, Y-up,
 * con el origen de cada pieza en el centro de su base).
 */

export type PieceKind = 'bust' | 'knight' | 'king' | 'queen' | 'bishop' | 'rook' | 'pawn';
export type MaterialKind = 'marble' | 'obsidian' | 'crystal';

export const MODEL_URLS: Record<PieceKind | 'board', string> = {
  board: '/models/chess/board.glb',
  bust: '/models/chess/bust.glb',
  knight: '/models/chess/knight.glb',
  king: '/models/chess/king.glb',
  queen: '/models/chess/queen.glb',
  bishop: '/models/chess/bishop.glb',
  rook: '/models/chess/rook.glb',
  pawn: '/models/chess/pawn.glb',
};

/** Medidas del tablero `board.glb` (medidas tomadas en Blender). */
export const BOARD = {
  size: 0.978,
  /** altura de la superficie de juego */
  topY: 0.082,
  /** lado de una casilla (rejilla de 8x8 de ~0.869 m) */
  square: 0.1087,
};

/** Altura final (m) de cada tipo de pieza en el tablero. Proporciones Staunton. */
export const PIECE_HEIGHT: Record<PieceKind, number> = {
  bust: 0.215,
  king: 0.19,
  queen: 0.172,
  bishop: 0.15,
  knight: 0.142,
  rook: 0.122,
  pawn: 0.102,
};

/** Rotacion base (Y, radianes) para que cada pieza mire a camara (+Z). */
export const PIECE_YAW: Partial<Record<PieceKind, number>> = {
  bust: 0,
  knight: 0,
};

/** Convierte notacion algebraica (`e4`) a coordenadas XZ sobre el tablero. */
export function square(sq: string): [number, number] {
  const file = sq.charCodeAt(0) - 97; // a = 0
  const rank = Number(sq[1]) - 1; // 1 = 0
  const s = BOARD.square;
  return [(file - 3.5) * s, (3.5 - rank) * s];
}

/** Convierte coordenadas XZ sobre el tablero a notacion algebraica (`e4`) o null si esta fuera. */
export function coordsToSquare(x: number, z: number): string | null {
  const s = BOARD.square;
  const file = Math.round(x / s + 3.5);
  const rank = Math.round(3.5 - z / s);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return String.fromCharCode(97 + file) + (rank + 1);
}

export interface PiecePlacement {
  id: string;
  kind: PieceKind;
  material: MaterialKind;
  square: string;
  yaw?: number;
}

/** Las siete piezas protagonistas de la narrativa (presentadas en orden de scroll). */
export const HEROES = {
  bust: { id: 'hero-bust', kind: 'bust', material: 'marble', square: 'd4', yaw: -1.3 },
  knight: { id: 'hero-knight', kind: 'knight', material: 'obsidian', square: 'e6', yaw: 0.85 },
  rook: { id: 'hero-rook', kind: 'rook', material: 'marble', square: 'c5', yaw: 0.35 },
  bishop: { id: 'hero-bishop', kind: 'bishop', material: 'obsidian', square: 'f5', yaw: -0.65 },
  queen: { id: 'hero-queen', kind: 'queen', material: 'crystal', square: 'd3', yaw: 0.25 },
  king: { id: 'hero-king', kind: 'king', material: 'crystal', square: 'e4', yaw: 0.15 },
  pawn: { id: 'hero-pawn', kind: 'pawn', material: 'marble', square: 'e5', yaw: 0.0 },
} as const satisfies Record<string, PiecePlacement>;

/**
 * Elenco secundario: partida en curso (inspirada en `img/image5.png`).
 * Negras en obsidiana, blancas en marmol, con acentos de cristal.
 */
export const SUPPORTING_CAST: PiecePlacement[] = [
  // --- Negras (obsidiana)
  { id: 'b-rook-a8', kind: 'rook', material: 'obsidian', square: 'a8' },
  { id: 'b-knight-b8', kind: 'knight', material: 'obsidian', square: 'b8', yaw: Math.PI },
  { id: 'b-bishop-c8', kind: 'bishop', material: 'obsidian', square: 'c8' },
  { id: 'b-queen-d8', kind: 'queen', material: 'obsidian', square: 'd8' },
  { id: 'b-rook-f8', kind: 'rook', material: 'obsidian', square: 'f8' },
  { id: 'b-king-g8', kind: 'king', material: 'obsidian', square: 'g8' },
  { id: 'b-bishop-e7', kind: 'bishop', material: 'obsidian', square: 'e7' },
  { id: 'b-pawn-a7', kind: 'pawn', material: 'obsidian', square: 'a7' },
  { id: 'b-pawn-b7', kind: 'pawn', material: 'obsidian', square: 'b7' },
  { id: 'b-pawn-c6', kind: 'pawn', material: 'obsidian', square: 'c6' },
  { id: 'b-pawn-d5', kind: 'pawn', material: 'obsidian', square: 'd5' },
  { id: 'b-pawn-f7', kind: 'pawn', material: 'obsidian', square: 'f7' },
  { id: 'b-pawn-g7', kind: 'pawn', material: 'obsidian', square: 'g7' },
  { id: 'b-pawn-h6', kind: 'pawn', material: 'obsidian', square: 'h6' },
  // --- Blancas (marmol + cristal)
  { id: 'w-rook-a1', kind: 'rook', material: 'marble', square: 'a1' },
  { id: 'w-bishop-c1', kind: 'bishop', material: 'marble', square: 'c1' },
  { id: 'w-rook-f1', kind: 'rook', material: 'marble', square: 'f1' },
  { id: 'w-knight-f3', kind: 'knight', material: 'marble', square: 'f3', yaw: -0.6 },
  { id: 'w-queen-g4', kind: 'queen', material: 'crystal', square: 'g4' },
  { id: 'w-pawn-a2', kind: 'pawn', material: 'marble', square: 'a2' },
  { id: 'w-pawn-b2', kind: 'pawn', material: 'marble', square: 'b2' },
  { id: 'w-pawn-c2', kind: 'pawn', material: 'marble', square: 'c2' },
  { id: 'w-pawn-f2', kind: 'pawn', material: 'marble', square: 'f2' },
  { id: 'w-pawn-g2', kind: 'pawn', material: 'marble', square: 'g2' },
  { id: 'w-pawn-h3', kind: 'pawn', material: 'marble', square: 'h3' },
  { id: 'w-bishop-b5', kind: 'bishop', material: 'crystal', square: 'b5' },
];

/** Paleta / atmosfera (low-key chiaroscuro mate y sobrio). */
export const LOOK = {
  background: 0x020306,
  fogColor: 0x030508,
  fogDensity: 0.50,
  exposure: 0.88,
  keyColor: 0xe6eaf0,
  rimColor: 0x8eb0df,
  warmAccent: 0xe0ad50,
};
