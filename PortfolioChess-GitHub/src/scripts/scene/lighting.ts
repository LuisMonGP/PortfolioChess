import * as THREE from 'three';
import { LOOK } from './config';

/**
 * Estudio "low-key" procedural calibrado para evitar sobre-exposición.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x000000);

  const box = (w: number, h: number, color: number, intensity: number) => {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    m.color.multiplyScalar(intensity);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  };

  // Key softbox suave
  const key = box(4, 2.5, LOOK.keyColor, 2.4);
  key.position.set(4, 5, 4);
  key.lookAt(0, 0, 0);
  env.add(key);

  // Rim strip frío templado
  const rim = box(0.6, 6, LOOK.rimColor, 3.5);
  rim.position.set(5, 3, -5);
  rim.lookAt(0, 0.5, 0);
  env.add(rim);

  // Contraluz de recorte sutil
  const rimL = box(0.4, 5, 0xb0c4de, 1.2);
  rimL.position.set(-6, 2.5, -3);
  rimL.lookAt(0, 0.5, 0);
  env.add(rimL);

  // Banda superior tenue
  const top = box(6, 1.2, 0xffffff, 0.8);
  top.position.set(0, 8, 0);
  top.rotation.x = Math.PI / 2;
  env.add(top);

  // Relleno frontal mínimo
  const fill = box(8, 1.5, 0x7a8b9e, 0.2);
  fill.position.set(0, 0.6, 7);
  fill.lookAt(0, 0.6, 0);
  env.add(fill);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  env.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return tex;
}

export interface Rig {
  key: THREE.SpotLight;
  rim: THREE.DirectionalLight;
  grazing: THREE.SpotLight;
  warm: THREE.PointLight;
  ambient: THREE.HemisphereLight;
}

/** Iluminación chiaroscuro calibrada para alto rendimiento y estética sobria. */
export function createLightRig(scene: THREE.Scene): Rig {
  const ambient = new THREE.HemisphereLight(0x18202c, 0x010203, 0.2);
  scene.add(ambient);

  // Key spot moderado y sin sombras dinámicas en tiempo real (ahorra 50% de draw calls)
  const key = new THREE.SpotLight(LOOK.keyColor, 8.5, 6, THREE.MathUtils.degToRad(32), 0.8, 1.6);
  key.position.set(1.4, 2.2, 1.5);
  key.target.position.set(0.05, 0.12, 0);
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(LOOK.rimColor, 1.8);
  rim.position.set(1.6, 1.4, -2.2);
  rim.target.position.set(0, 0.15, 0);
  scene.add(rim, rim.target);

  const grazing = new THREE.SpotLight(0xa5b8cf, 2.4, 4, THREE.MathUtils.degToRad(42), 1, 1.8);
  grazing.position.set(-1.8, 0.28, 0.6);
  grazing.target.position.set(0.3, 0.08, -0.1);
  scene.add(grazing, grazing.target);

  // Acento cálido sobrio para la sección del Rey
  const warm = new THREE.PointLight(LOOK.warmAccent, 0, 1.2, 2);
  warm.position.set(0.35, 0.45, -0.35);
  scene.add(warm);

  return { key, rim, grazing, warm, ambient };
}
