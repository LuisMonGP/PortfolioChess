// Copia los decodificadores Draco de three a /public/draco para que GLTFLoader
// pueda leer los GLB comprimidos sin depender de un CDN.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/three/examples/jsm/libs/draco/gltf');
const dest = resolve(root, 'public/draco');

if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log('[copy-draco] decoders copied to public/draco');
} else {
  console.warn('[copy-draco] three not installed yet, skipping');
}
