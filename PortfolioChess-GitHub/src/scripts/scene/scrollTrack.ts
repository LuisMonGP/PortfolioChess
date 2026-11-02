import * as THREE from 'three';

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  heroBlend: number;
  castOpacity: number;
  focusTarget: 'hero-trio' | 'bust' | 'knight' | 'rook' | 'bishop' | 'queen' | 'king' | 'pawn' | 'board';
  warmAccent: number;
}

export interface Keyframe {
  progress: number;
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
  heroBlend: number;
  castOpacity: number;
  focusTarget: 'hero-trio' | 'bust' | 'knight' | 'rook' | 'bishop' | 'queen' | 'king' | 'pawn' | 'board';
  warmAccent: number;
}

/**
 * 8 Estaciones Maestras para Desktop.
 * Cada una ubica la pieza protagonista en el tercio derecho (ndcX ~ +0.40 a +0.45),
 * dejando el tercio izquierdo limpio para el texto editorial.
 */
export const STATIONS_DESKTOP: Keyframe[] = [
  // 0. Hero: Tríada flotando ingrávida en tercio derecho, tablero centrado abajo
  {
    progress: 0 / 7,
    pos: [0.0, 0.34, 1.25],
    target: [0.0, 0.19, 0.10],
    fov: 28,
    heroBlend: 0.0,
    castOpacity: 0.0,
    focusTarget: 'hero-trio',
    warmAccent: 0.0,
  },
  // 1. Mármol: Macro frontal al Busto en tercio derecho (despejado)
  {
    progress: 1 / 7,
    pos: [-0.014, 0.28, 0.683],
    target: [-0.144, 0.162, 0.054],
    fov: 24,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'bust',
    warmAccent: 0.0,
  },
  // 2. Caballo: Perfil 3/4 izquierdo en tercio derecho con brillo en crin
  {
    progress: 2 / 7,
    pos: [0.094, 0.28, 0.466],
    target: [-0.036, 0.132, -0.163],
    fov: 23,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'knight',
    warmAccent: 0.0,
  },
  // 3. Torre: Enfoque frontal-alto a las almenas y porte arquitectónico
  {
    progress: 3 / 7,
    pos: [-0.123, 0.28, 0.576],
    target: [-0.253, 0.135, -0.054],
    fov: 23,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'rook',
    warmAccent: 0.0,
  },
  // 4. Alfil: Enfoque afilado a la mitra y bisel diagonal en obsidiana
  {
    progress: 4 / 7,
    pos: [0.203, 0.28, 0.576],
    target: [0.073, 0.145, -0.054],
    fov: 23,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'bishop',
    warmAccent: 0.0,
  },
  // 5. Reina: Corona multifacética y presencia dominante en cristal
  {
    progress: 5 / 7,
    pos: [-0.014, 0.28, 0.793],
    target: [-0.144, 0.155, 0.163],
    fov: 23,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'queen',
    warmAccent: 0.45,
  },
  // 6. Rey: Corona con cruz y clímax majestuoso dorado
  {
    progress: 6 / 7,
    pos: [0.094, 0.28, 0.683],
    target: [-0.036, 0.152, 0.054],
    fov: 23,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'king',
    warmAccent: 0.85,
  },
  // 7. Juego Completo: Plano cenital ~70° ortogonal con tablero a la derecha
  {
    progress: 1.000,
    pos: [-0.22, 1.48, 0.46],
    target: [-0.22, 0.08, -0.04],
    fov: 28,
    heroBlend: 1.0,
    castOpacity: 1.0,
    focusTarget: 'board',
    warmAccent: 0.0,
  },
];

/**
 * 8 Estaciones Maestras para Modo Responsive (Mobile / Tablet).
 * Centran la pieza protagonista exactamente en el eje horizontal (ndcX ~ 0.0).
 */
export const STATIONS_MOBILE: Keyframe[] = [
  // 0. Hero móvil: Tríada centrada simétricamente
  {
    progress: 0 / 7,
    pos: [0.0, 0.38, 1.45],
    target: [0.0, 0.20, 0.10],
    fov: 34,
    heroBlend: 0.0,
    castOpacity: 0.0,
    focusTarget: 'hero-trio',
    warmAccent: 0.0,
  },
  // 1. Mármol móvil: Busto centrado
  {
    progress: 1 / 7,
    pos: [-0.079, 0.26, 0.68],
    target: [-0.079, 0.16, 0.054],
    fov: 27,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'bust',
    warmAccent: 0.0,
  },
  // 2. Caballo móvil: Caballo centrado
  {
    progress: 2 / 7,
    pos: [0.058, 0.26, 0.46],
    target: [0.058, 0.14, -0.163],
    fov: 26,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'knight',
    warmAccent: 0.0,
  },
  // 3. Torre móvil: Torre centrada
  {
    progress: 3 / 7,
    pos: [-0.163, 0.26, 0.576],
    target: [-0.163, 0.135, -0.054],
    fov: 26,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'rook',
    warmAccent: 0.0,
  },
  // 4. Alfil móvil: Alfil centrado
  {
    progress: 4 / 7,
    pos: [0.163, 0.26, 0.576],
    target: [0.163, 0.145, -0.054],
    fov: 26,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'bishop',
    warmAccent: 0.0,
  },
  // 5. Reina móvil: Reina centrada
  {
    progress: 5 / 7,
    pos: [-0.054, 0.26, 0.793],
    target: [-0.054, 0.155, 0.163],
    fov: 26,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'queen',
    warmAccent: 0.45,
  },
  // 6. Rey móvil: Rey centrado
  {
    progress: 6 / 7,
    pos: [0.054, 0.26, 0.68],
    target: [0.054, 0.16, 0.054],
    fov: 26,
    heroBlend: 1.0,
    castOpacity: 0.0,
    focusTarget: 'king',
    warmAccent: 0.85,
  },
  // 7. Juego Completo móvil: Tablero completo centrado
  {
    progress: 1.000,
    pos: [0.0, 1.65, 0.35],
    target: [0.0, 0.08, 0.0],
    fov: 34,
    heroBlend: 1.0,
    castOpacity: 1.0,
    focusTarget: 'board',
    warmAccent: 0.0,
  },
];

export const STATIONS = STATIONS_DESKTOP;

/**
 * Función de Remapeo con "Mesetas de Enfoque" (Dwell Plateaus).
 * Alrededor de cada una de las 8 estaciones el scroll desacelera
 * para que el usuario pueda contemplar la pieza y leer el texto.
 */
export function remapProgressWithDwell(rawP: number): number {
  const p = THREE.MathUtils.clamp(rawP, 0, 1);
  const stations = [0 / 7, 1 / 7, 2 / 7, 3 / 7, 4 / 7, 5 / 7, 6 / 7, 1.0];
  const halfWindow = 0.026; // ancho de la meseta

  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    if (Math.abs(p - s) <= halfWindow) {
      // Amortigua el avance en un 70% dentro de la ventana de la estación
      const diff = p - s;
      const damped = Math.sign(diff) * Math.pow(Math.abs(diff) / halfWindow, 1.8) * halfWindow * 0.35;
      return THREE.MathUtils.clamp(s + damped, 0, 1);
    }
  }

  // Entre estaciones: interpolación suave
  return p;
}

export class ScrollTrack {
  evaluate(rawProgress: number, isMobile = false): CameraState {
    const p = remapProgressWithDwell(rawProgress);
    const stations = isMobile ? STATIONS_MOBILE : STATIONS_DESKTOP;

    // Encontrar el tramo entre estaciones
    let idx = 0;
    while (idx < stations.length - 1 && stations[idx + 1].progress <= p) {
      idx++;
    }
    const k0 = stations[idx];
    const k1 = stations[Math.min(idx + 1, stations.length - 1)];

    const span = Math.max(k1.progress - k0.progress, 0.0001);
    const localT = (p - k0.progress) / span;
    // Curva cúbica suave (smootherstep) para transiciones cinematográficas
    const t = THREE.MathUtils.smootherstep(localT, 0, 1);

    const position = new THREE.Vector3(
      THREE.MathUtils.lerp(k0.pos[0], k1.pos[0], t),
      THREE.MathUtils.lerp(k0.pos[1], k1.pos[1], t),
      THREE.MathUtils.lerp(k0.pos[2], k1.pos[2], t),
    );

    const target = new THREE.Vector3(
      THREE.MathUtils.lerp(k0.target[0], k1.target[0], t),
      THREE.MathUtils.lerp(k0.target[1], k1.target[1], t),
      THREE.MathUtils.lerp(k0.target[2], k1.target[2], t),
    );

    const fov = THREE.MathUtils.lerp(k0.fov, k1.fov, t);
    const heroBlend = THREE.MathUtils.lerp(k0.heroBlend, k1.heroBlend, t);
    const castOpacity = THREE.MathUtils.lerp(k0.castOpacity, k1.castOpacity, t);
    const warmAccent = THREE.MathUtils.lerp(k0.warmAccent, k1.warmAccent, t);
    const focusTarget = localT < 0.5 ? k0.focusTarget : k1.focusTarget;

    return {
      position,
      target,
      fov,
      heroBlend,
      castOpacity,
      focusTarget,
      warmAccent,
    };
  }
}
