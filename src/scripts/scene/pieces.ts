import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import {
  MODEL_URLS,
  PIECE_HEIGHT,
  PIECE_YAW,
  BOARD,
  square,
  type MaterialKind,
  type PieceKind,
  type PiecePlacement,
} from './config';
import { createFeltMaterial, createPieceMaterial, extractMaps, tuneBoardMaterial, type SourceMaps } from './materials';

interface PieceSource {
  geometry: THREE.BufferGeometry;
  maps: SourceMaps;
  nativeHeight: number;
  baseRadius: number;
}

export interface LoadedAssets {
  board: THREE.Group;
  sources: Record<PieceKind, PieceSource>;
}

export async function loadAssets(manager: THREE.LoadingManager, renderer: THREE.WebGLRenderer): Promise<LoadedAssets> {
  const draco = new DRACOLoader(manager).setDecoderPath('/draco/');
  const loader = new GLTFLoader(manager).setDRACOLoader(draco);

  const entries = Object.entries(MODEL_URLS) as [PieceKind | 'board', string][];
  const gltfs = await Promise.all(entries.map(([, url]) => loader.loadAsync(url)));
  draco.dispose();

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const sources = {} as Record<PieceKind, PieceSource>;
  let board!: THREE.Group;

  entries.forEach(([key, ], i) => {
    const root = gltfs[i].scene;
    const mesh = root.getObjectByProperty('isMesh', true) as THREE.Mesh;
    if (key === 'board') {
      tuneBoardMaterial(mesh);
      const m = mesh.material as THREE.MeshPhysicalMaterial;
      [m.map, m.normalMap, m.roughnessMap].forEach((t) => t && (t.anisotropy = maxAniso));
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      board = new THREE.Group();
      board.name = 'Chessboard';
      board.add(root);
      return;
    }
    const geo = mesh.geometry;
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const norm = geo.attributes.normal as THREE.BufferAttribute | undefined;
    const h = bb.max.y - bb.min.y;
    const threshold = bb.min.y + h * 0.08;
    let cx = 0, cz = 0, count = 0;
    if (key === 'bust' && norm) {
      // Para el busto, aislar el anillo de la base inferior orientada hacia abajo (normal.y < -0.7)
      for (let v = 0; v < pos.count; v++) {
        if (norm.getY(v) < -0.7 && pos.getY(v) < bb.min.y + 0.05) {
          cx += pos.getX(v);
          cz += pos.getZ(v);
          count++;
        }
      }
      if (count > 0) {
        cx /= count;
        cz /= count;
      }
    } else {
      // Para las piezas Staunton torneadas, el centro geométrico real del pedestal circular
      // es el punto medio de los extremos (min/max) de la base, inmune a triangulación asimétrica.
      let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity;
      for (let v = 0; v < pos.count; v++) {
        if (pos.getY(v) < threshold) {
          const vx = pos.getX(v);
          const vz = pos.getZ(v);
          if (vx < bMinX) bMinX = vx;
          if (vx > bMaxX) bMaxX = vx;
          if (vz < bMinZ) bMinZ = vz;
          if (vz > bMaxZ) bMaxZ = vz;
        }
      }
      if (bMinX < Infinity) {
        cx = (bMinX + bMaxX) * 0.5;
        cz = (bMinZ + bMaxZ) * 0.5;
      }
    }
    geo.translate(-cx, -bb.min.y, -cz);
    geo.computeBoundingBox();
    const newBb = geo.boundingBox!;
    let r = 0;
    if (key === 'bust') {
      r = 0.136;
    } else {
      for (let v = 0; v < pos.count; v++) {
        if (pos.getY(v) < h * 0.08) {
          r = Math.max(r, Math.hypot(pos.getX(v), pos.getZ(v)));
        }
      }
    }
    sources[key] = { geometry: geo, maps: extractMaps(mesh), nativeHeight: newBb.max.y, baseRadius: r };
    (mesh.material as THREE.Material).dispose();
  });

  return { board, sources };
}

/** Crea instancias de piezas compartiendo geometria y materiales. */
export class PieceFactory {
  private materials = new Map<string, THREE.Material>();
  private felt = createFeltMaterial();

  constructor(private sources: Record<PieceKind, PieceSource>) {}

  private material(kind: PieceKind, mat: MaterialKind) {
    const key = `${kind}:${mat}`;
    let m = this.materials.get(key);
    if (!m) {
      m = createPieceMaterial(mat, this.sources[kind].maps);
      this.materials.set(key, m);
    }
    return m;
  }

  /**
   * Devuelve un Group con pivote en el centro de la base. `userData.home`
   * guarda la posicion de reposo sobre el tablero.
   */
  create(p: PiecePlacement, opts: { felt?: boolean } = {}): THREE.Group {
    const src = this.sources[p.kind];
    const mesh = new THREE.Mesh(src.geometry, this.material(p.kind, p.material));
    const s = PIECE_HEIGHT[p.kind] / src.nativeHeight;
    mesh.scale.setScalar(s);
    mesh.rotation.y = PIECE_YAW[p.kind] ?? 0;
    if (p.kind === 'bust') {
      mesh.rotation.x = 0.232;
      mesh.rotation.z = 0.11;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = p.material !== 'crystal';
    mesh.name = `${p.id}-mesh`;

    const g = new THREE.Group();
    g.name = p.id;
    g.add(mesh);

    if (opts.felt) {
      if (p.kind === 'bust') {
        const n = new THREE.Vector3(-0.1099, -0.967, 0.2298).normalize();
        const center = new THREE.Vector3(-0.022, 0.038, 0.035);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.12, 64), this.felt);
        disc.position.copy(center).addScaledVector(n, 0.005);
        disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        disc.name = `${p.id}-felt`;
        mesh.add(disc);
      } else {
        const disc = new THREE.Mesh(new THREE.CircleGeometry(src.baseRadius * 0.98, 48), this.felt);
        disc.rotation.x = Math.PI / 2; // mira hacia abajo
        disc.position.y = 0.001;
        disc.name = `${p.id}-felt`;
        mesh.add(disc);
      }
    }

    const [x, z] = square(p.square);
    g.position.set(x, BOARD.topY, z);
    g.rotation.y = p.yaw ?? 0;
    g.userData.home = { position: g.position.clone(), rotation: g.rotation.clone() };
    g.userData.kind = p.kind;
    g.userData.square = p.square;
    g.userData.initialSquare = p.square;
    g.userData.material = p.material;
    return g;
  }
}
