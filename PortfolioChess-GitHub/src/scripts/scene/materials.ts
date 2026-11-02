import * as THREE from 'three';
import { LOOK, type MaterialKind } from './config';

export interface SourceMaps {
  normalMap: THREE.Texture | null;
  normalScale: THREE.Vector2;
}

export function extractMaps(mesh: THREE.Mesh): SourceMaps {
  const m = mesh.material as THREE.MeshStandardMaterial;
  return {
    normalMap: m.normalMap ?? null,
    normalScale: m.normalScale?.clone() ?? new THREE.Vector2(1, 1),
  };
}

export function createPieceMaterial(kind: MaterialKind, maps: SourceMaps): THREE.MeshPhysicalMaterial {
  const normal = (k: number) => ({
    normalMap: maps.normalMap,
    normalScale: maps.normalScale.clone().multiplyScalar(k),
  });

  switch (kind) {
    case 'marble': {
      // Mármol Carrara mate sedoso: piedra natural tallada sin esmaltado reflectivo
      return new THREE.MeshPhysicalMaterial({
        name: 'Marble_Carrara_Matte',
        color: 0xd8dadf,
        roughness: 0.46,
        metalness: 0,
        ...normal(0.8),
        sheen: 0.18,
        sheenRoughness: 0.7,
        sheenColor: new THREE.Color(0xbcc3cb),
        clearcoat: 0, // Cero barniz artificial para evitar reflejos deslumbrantes
        specularIntensity: 0.35,
        envMapIntensity: 0.7,
      });
    }
    case 'obsidian': {
      // Obsidiana volcánica: negro profundo elegante con reflejos especulares nítidos
      return new THREE.MeshPhysicalMaterial({
        name: 'Obsidian_Polished',
        color: 0x0a0c10,
        roughness: 0.14,
        metalness: 0.02,
        ...normal(0.5),
        clearcoat: 0.5,
        clearcoatRoughness: 0.08,
        ior: 1.55,
        specularIntensity: 0.85,
        envMapIntensity: 1.6,
      });
    }
    case 'crystal': {
      // Cristal óptico: refracción pura y bordes finos con brillos especulares blancos
      return new THREE.MeshPhysicalMaterial({
        name: 'Crystal_Optical',
        color: 0xffffff,
        metalness: 0,
        roughness: 0.05,
        ...normal(0.2),
        transmission: 0.88,
        thickness: 0.18,
        ior: 1.54,
        dispersion: 0.15,
        attenuationColor: new THREE.Color(0xc8e0f8),
        attenuationDistance: 0.35,
        clearcoat: 0.8,
        clearcoatRoughness: 0.04,
        specularIntensity: 1.0,
        specularColor: new THREE.Color(0xffffff),
        envMapIntensity: 3.8,
      });
    }
  }
}

/** Fieltro verde inglés para la cara inferior de las piezas que flotan en Hero. */
export function createFeltMaterial() {
  return new THREE.MeshPhysicalMaterial({
    name: 'Base_Felt',
    color: 0x24924c,
    emissive: new THREE.Color(0x125828),
    emissiveIntensity: 0.85,
    roughness: 0.85,
    metalness: 0,
    sheen: 0.95,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0x52c47e),
    side: THREE.DoubleSide,
  });
}

/** Ajusta el material del tablero al look dark low-key. */
export function tuneBoardMaterial(mesh: THREE.Mesh) {
  const src = mesh.material as THREE.MeshStandardMaterial;
  const m = new THREE.MeshPhysicalMaterial({
    name: 'Board_Marble_LowKey',
    map: src.map,
    normalMap: src.normalMap,
    normalScale: src.normalScale.clone().multiplyScalar(0.7),
    roughnessMap: src.roughnessMap,
    roughness: 0.62,
    metalness: 0,
    color: new THREE.Color(0.48, 0.50, 0.54),
    clearcoat: 0.12,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.5,
  });
  if (m.map) m.map.anisotropy = 4;
  mesh.material = m;
  src.dispose();
}

export const WARM = new THREE.Color(LOOK.warmAccent);
