import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/** Grado final limpio: viñeta suave y grano fino de cine sin resplandores artificiales. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 1.15 },
    uGrain: { value: 0.025 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec3 col = texture2D(tDiffuse, vUv).rgb;

      // Viñeteado elegante que oscurece suavemente los bordes
      float vig = smoothstep(0.9, 0.2, r2 * uVignette * 1.8);
      col *= mix(0.35, 1.0, vig);

      // Micro-grano cinematográfico casi imperceptible
      float g = rand(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 10.0) - 0.5;
      col += g * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class PostFX {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  readonly grade: ShaderPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const size = renderer.getSize(new THREE.Vector2());
    // Sin multisampling pesado: render ultra rápido y bajo consumo de VRAM
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 0,
    });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, camera));

    // Bloom selectivo de bajo impacto: solo destellos especulares extremos brillan, cero lavado de imagen
    const bloomSize = new THREE.Vector2(Math.floor(size.x / 2), Math.floor(size.y / 2));
    this.bloom = new UnrealBloomPass(bloomSize, 0.14, 0.35, 0.88);
    this.composer.addPass(this.bloom);

    this.composer.addPass(new OutputPass());

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setFocus(_distance: number, _aperture?: number) {
    // No-op ultraligero sin BokehPass
  }

  setSize(w: number, h: number) {
    this.composer.setSize(w, h);
    this.bloom.setSize(Math.floor(w / 2), Math.floor(h / 2));
  }

  render(time: number) {
    this.grade.uniforms.uTime.value = time;
    this.composer.render();
  }
}
