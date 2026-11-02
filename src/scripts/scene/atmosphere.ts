import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Polvo cósmico sutil en suspensión (Ultra-ligero, 320 partículas)           */
/* -------------------------------------------------------------------------- */

export class DustField {
  readonly points: THREE.Points;
  readonly uniforms: {
    uTime: { value: number };
    uPixelRatio: { value: number };
    uFocus: { value: number };
    uWarm: { value: number };
    uOpacity: { value: number };
  };

  constructor(count = 380) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    const warm = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.0;
      pos[i * 3 + 1] = Math.random() * 1.2 + 0.05;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
      seed[i] = Math.random() * 100;
      size[i] = Math.random() < 0.12 ? 2.4 : 1.1;
      warm[i] = Math.random() < 0.15 ? 1 : 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aWarm', new THREE.BufferAttribute(warm, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.5) },
      uFocus: { value: 1.2 },
      uWarm: { value: 0 },
      uOpacity: { value: 0.8 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uWarm;
        attribute float aSeed;
        attribute float aSize;
        attribute float aWarm;
        varying float vAlpha;
        varying float vWarm;

        void main() {
          vec3 p = position;
          float t = uTime * 0.025;
          p.x += sin(t * 1.1 + aSeed) * 0.04;
          p.y += sin(t * 0.8 + aSeed * 1.5) * 0.03 - mod(t * 0.05 + aSeed, 1.2) + 0.6;
          p.z += cos(t * 0.9 + aSeed * 0.5) * 0.04;
          p.x = mod(p.x + 1.5, 3.0) - 1.5;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = -mv.z;
          vWarm = aWarm * uWarm;
          float twinkle = 0.5 + 0.5 * sin(uTime * 1.2 + aSeed);
          vAlpha = twinkle * 0.45;
          gl_PointSize = aSize * uPixelRatio * (2.0 / max(dist, 0.2));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vAlpha;
        varying float vWarm;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float r = length(uv) * 2.0;
          if (r > 1.0) discard;
          float disk = 1.0 - smoothstep(0.4, 1.0, r);
          vec3 cool = vec3(0.75, 0.82, 0.92);
          vec3 warm = vec3(1.0, 0.72, 0.35);
          vec3 col = mix(cool, warm, vWarm);
          float a = disk * vAlpha * uOpacity;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  update(time: number, focus: number) {
    this.uniforms.uTime.value = time;
    this.uniforms.uFocus.value = focus;
  }
}

/**
 * Suelo arquitectónico oscuro mate sin reflejos indeseados ni sombras pesadas.
 */
export function createFloor(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(6, 48);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x020305,
  });
  return new THREE.Mesh(geo, mat);
}
