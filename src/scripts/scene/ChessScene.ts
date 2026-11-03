import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HEROES, LOOK, SUPPORTING_CAST } from './config';
import { createLightRig, createStudioEnvironment, type Rig } from './lighting';
import { DustField, createFloor } from './atmosphere';
import { PostFX } from './postfx';
import { PieceFactory, loadAssets } from './pieces';
import { ScrollTrack, type CameraState } from './scrollTrack';
import { BoardInteraction, type MoveEvent } from './boardInteraction';

type HeroKey = keyof typeof HEROES;

/** Pose de levitación inicial en Desktop (Acto 01 / Hero): piezas erguidas verticales en tercio derecho. */
export const FLOAT_POSES_DESKTOP: Record<HeroKey, { pos: [number, number, number]; rot: [number, number, number] }> = {
  bust: { pos: [0.06, 0.205, 0.40], rot: [0.0, -0.45, 0.0] },
  knight: { pos: [0.15, 0.205, 0.38], rot: [0.0, -2.0, 0.0] },
  king: { pos: [0.235, 0.21, 0.36], rot: [0.0, 0.20, 0.0] },
  rook: { pos: [-0.163, 0.082, -0.054], rot: [0.0, 0.35, 0.0] },
  bishop: { pos: [0.163, 0.082, -0.054], rot: [0.0, -0.65, 0.0] },
  queen: { pos: [-0.054, 0.082, 0.163], rot: [0.0, 0.25, 0.0] },
  pawn: { pos: [0.054, 0.082, -0.054], rot: [0.0, 0.0, 0.0] },
};

/** Pose de levitación inicial en Responsive / Móvil: piezas centradas simétricamente. */
export const FLOAT_POSES_MOBILE: Record<HeroKey, { pos: [number, number, number]; rot: [number, number, number] }> = {
  bust: { pos: [-0.075, 0.205, 0.40], rot: [0.0, -0.45, 0.0] },
  knight: { pos: [0.0, 0.205, 0.38], rot: [0.0, -2.0, 0.0] },
  king: { pos: [0.075, 0.21, 0.36], rot: [0.0, 0.20, 0.0] },
  rook: { pos: [-0.163, 0.082, -0.054], rot: [0.0, 0.35, 0.0] },
  bishop: { pos: [0.163, 0.082, -0.054], rot: [0.0, -0.65, 0.0] },
  queen: { pos: [-0.054, 0.082, 0.163], rot: [0.0, 0.25, 0.0] },
  pawn: { pos: [0.054, 0.082, -0.054], rot: [0.0, 0.0, 0.0] },
};

export const FLOAT_POSES = FLOAT_POSES_DESKTOP;

export class ChessScene {
  floatPoses = FLOAT_POSES_DESKTOP;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.02, 30);
  readonly heroes = {} as Record<HeroKey, THREE.Group>;
  readonly cast = new THREE.Group();
  readonly board = new THREE.Group();
  rig!: Rig;
  post!: PostFX;
  dust = new DustField(380);
  boardInteraction!: BoardInteraction;
  controls?: OrbitControls;
  scrollTrack = new ScrollTrack();

  /** Progreso de scroll objetivo y actual suavizado [0..1] */
  targetProgress = 0;
  currentProgress = 0;

  private cameraTarget = new THREE.Vector3(0.17, 0.27, 0.28);
  private basePos = new THREE.Vector3(0.02, 0.36, 1.08);
  private currentFocusTarget: CameraState['focusTarget'] = 'hero-trio';
  private mouse = new THREE.Vector2();
  private mouseSmooth = new THREE.Vector2();
  private hasPointerMoved = false;
  private clock = new THREE.Clock();
  private raf = 0;

  get isMobile(): boolean {
    return typeof window !== 'undefined' && (window.innerWidth <= 900 || window.innerWidth / window.innerHeight < 1.15);
  }

  constructor(private canvas: HTMLCanvasElement, private opts: { debug?: boolean } = {}) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = LOOK.exposure;
    this.renderer.shadowMap.enabled = false;

    this.scene.background = new THREE.Color(LOOK.background);
    this.scene.fog = new THREE.FogExp2(LOOK.fogColor, LOOK.fogDensity);
  }

  async init(onProgress?: (p: number) => void) {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_u, loaded, total) => onProgress?.(loaded / total);

    this.scene.environment = createStudioEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.95;
    this.rig = createLightRig(this.scene);

    const { board, sources } = await loadAssets(manager, this.renderer);
    this.board.add(board);
    this.scene.add(this.board, createFloor());

    const factory = new PieceFactory(sources);
    (Object.keys(HEROES) as HeroKey[]).forEach((k) => {
      const g = factory.create(HEROES[k], { felt: false });
      this.heroes[k] = g;
      this.scene.add(g);
    });
    SUPPORTING_CAST.forEach((p) => this.cast.add(factory.create(p)));
    this.scene.add(this.cast);
    this.cast.visible = false;

    const getAllPieces = () => [...Object.values(this.heroes), ...this.cast.children] as THREE.Group[];
    this.boardInteraction = new BoardInteraction(this.scene, this.camera, this.canvas, getAllPieces);

    this.scene.add(this.dust.points);

    this.post = new PostFX(this.renderer, this.scene, this.camera);
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onPointer);

    if (this.opts.debug) {
      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
    }

    // Precompilar shaders en GPU para garantizar 60 FPS estables desde el primer frame
    await this.renderer.compileAsync(this.scene, this.camera);
    this.applyProgress(0, true);
  }

  setScrollProgress(p: number) {
    this.targetProgress = THREE.MathUtils.clamp(p, 0, 1);
  }

  inspectState(progress?: number) {
    if (progress !== undefined) {
      this.targetProgress = this.currentProgress = progress;
      this.applyProgress(progress, true);
    }
    const project = (obj: THREE.Object3D, yOffset = 0.2) => {
      const v = new THREE.Vector3(0, yOffset, 0);
      obj.localToWorld(v);
      v.project(this.camera);
      return { ndcX: +v.x.toFixed(3), ndcY: +v.y.toFixed(3) };
    };
    return {
      progress: +this.currentProgress.toFixed(3),
      camPos: this.camera.position.toArray().map((n) => +n.toFixed(3)),
      camTarget: this.cameraTarget.toArray().map((n) => +n.toFixed(3)),
      fov: +this.camera.fov.toFixed(1),
      focusDist: +this.focusDistance().toFixed(3),
      screenPos: {
        bust: this.heroes.bust ? project(this.heroes.bust, 0.35) : null,
        knight: this.heroes.knight ? project(this.heroes.knight, 0.20) : null,
        rook: this.heroes.rook ? project(this.heroes.rook, 0.18) : null,
        bishop: this.heroes.bishop ? project(this.heroes.bishop, 0.20) : null,
        queen: this.heroes.queen ? project(this.heroes.queen, 0.22) : null,
        king: this.heroes.king ? project(this.heroes.king, 0.22) : null,
        pawn: this.heroes.pawn ? project(this.heroes.pawn, 0.14) : null,
      },
    };
  }

  captureDataURL(): string {
    return this.renderer.domElement.toDataURL('image/png');
  }

  private onPointer = (e: PointerEvent) => {
    this.mouse.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    if (!this.hasPointerMoved) {
      this.mouseSmooth.copy(this.mouse);
      this.hasPointerMoved = true;
    }
  };

  resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post?.setSize(w, h);
    this.dust.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
  };

  private updateHeroes(t: number, blend: number, progress = 0) {
    const b = THREE.MathUtils.smootherstep(blend, 0, 1);
    const poses = this.isMobile ? FLOAT_POSES_MOBILE : this.floatPoses;

    // Control de visibilidad limpia en cada acto (sin oclusiones ni saltos):
    // Acto 0 (Hero, p <= 0.05): Tríada original de 3 piezas visibles flotando
    // Actos 1-6: Busto -> Caballo -> Torre -> Alfil -> Reina -> Rey
    // Acto 7 (Juego Completo, p >= 0.95): Todas las piezas visibles en el tablero
    const visMap: Record<HeroKey, number> = {
      bust: 0,
      knight: 0,
      rook: 0,
      bishop: 0,
      queen: 0,
      king: 0,
      pawn: 0,
    };

    if (progress <= 0.05) {
      // Acto 0: Hero Tríada
      visMap.bust = 1;
      visMap.knight = 1;
      visMap.king = 1;
    } else if (progress < 0.10) {
      // Transición Hero -> Acto 1 (Busto queda solo)
      const tr = (progress - 0.05) / (0.10 - 0.05);
      visMap.bust = 1;
      visMap.knight = 1 - tr;
      visMap.king = 1 - tr;
    } else if (progress >= 0.96) {
      // Acto 8: Juego Completo (todas las piezas protagonistas activas)
      visMap.bust = 1;
      visMap.knight = 1;
      visMap.rook = 1;
      visMap.bishop = 1;
      visMap.queen = 1;
      visMap.king = 1;
      visMap.pawn = 1;
    } else if (progress >= 0.91) {
      // Transición Acto 7 (Peón) -> Acto 8 (Juego Completo)
      const tr = (progress - 0.91) / (0.96 - 0.91);
      visMap.pawn = 1;
      visMap.bust = tr;
      visMap.knight = tr;
      visMap.rook = tr;
      visMap.bishop = tr;
      visMap.queen = tr;
      visMap.king = tr;
    } else {
      // Secuencia ordenada de piezas individuales en sus respectivos actos (1..7)
      // 1: bust, 2: knight, 3: rook, 4: bishop, 5: queen, 6: king, 7: pawn
      const SOLO_ORDER: HeroKey[] = ['bust', 'knight', 'rook', 'bishop', 'queen', 'king', 'pawn'];
      let handled = false;
      for (let k = 0; k < SOLO_ORDER.length - 1; k++) {
        const mid = (1 / 8) * (k + 1.5);
        const start = mid - 0.024;
        const end = mid + 0.024;
        if (progress < start) {
          visMap[SOLO_ORDER[k]] = 1;
          handled = true;
          break;
        } else if (progress <= end) {
          const tr = (progress - start) / (end - start);
          visMap[SOLO_ORDER[k]] = 1 - tr;
          visMap[SOLO_ORDER[k + 1]] = tr;
          handled = true;
          break;
        }
      }
      if (!handled) {
        visMap.pawn = 1;
      }
    }

    (Object.keys(this.heroes) as HeroKey[]).forEach((k, i) => {
      const g = this.heroes[k];
      const home = g.userData.home as { position: THREE.Vector3; rotation: THREE.Euler };
      const f = poses[k];
      const vis = visMap[k];

      g.visible = vis > 0.005;
      if (!g.visible) return;

      // Si la pieza está siendo arrastrada por el usuario, respetar el arrastre
      if (this.boardInteraction && this.boardInteraction.getSelectedPiece() === g) {
        return;
      }

      // Caída recta: las piezas descienden verticalmente aplomadas
      const bob = Math.sin(t * 0.9 + i * 2.1) * 0.008 * (1 - b);
      const sway = Math.sin(t * 0.5 + i * 1.3) * 0.035 * (1 - b);

      // Interacción viva con el cursor: las piezas rotan y se mueven suavemente siguiendo el ratón
      const mouseRotY = this.mouseSmooth.x * 0.28 * (1 - b * 0.6);
      const mouseRotX = -this.mouseSmooth.y * 0.12 * (1 - b * 0.6);
      const parallaxX = this.mouseSmooth.x * (0.016 + i * 0.008) * (1 - b);
      const parallaxY = -this.mouseSmooth.y * 0.012 * (1 - b);

      g.position.set(
        THREE.MathUtils.lerp(f.pos[0], home.position.x, b) + parallaxX,
        THREE.MathUtils.lerp(f.pos[1], home.position.y, b) + bob + parallaxY,
        THREE.MathUtils.lerp(f.pos[2], home.position.z, b),
      );

      // Rotación estrictamente vertical con seguimiento reactivo al mouse
      g.rotation.set(
        mouseRotX,
        THREE.MathUtils.lerp(f.rot[1], home.rotation.y, b) + sway + mouseRotY,
        0,
      );

      // Escalado suave durante aparición/desaparición
      const s = THREE.MathUtils.smootherstep(vis, 0, 1);
      g.scale.setScalar(s);
    });
  }

  private focusDistance(): number {
    const p = new THREE.Vector3();
    if (this.currentFocusTarget === 'board') {
      return this.camera.position.distanceTo(p.set(-0.1, 0.08, 0));
    }
    if (this.currentFocusTarget === 'hero-trio') {
      return this.camera.position.distanceTo(p.set(0.18, 0.28, 0.3));
    }
    const g = this.heroes[this.currentFocusTarget as HeroKey];
    if (g) {
      g.getWorldPosition(p);
      p.y += 0.1;
      return this.camera.position.distanceTo(p);
    }
    return 1.2;
  }

  private applyProgress(p: number, immediate = false) {
    const state = this.scrollTrack.evaluate(p, this.isMobile);
    this.currentFocusTarget = state.focusTarget;

    this.basePos.copy(state.position);
    this.cameraTarget.copy(state.target);

    if (immediate) {
      this.camera.position.copy(this.basePos);
      this.camera.lookAt(this.cameraTarget);
    }

    if (Math.abs(this.camera.fov - state.fov) > 0.01) {
      this.camera.fov = state.fov;
      this.camera.updateProjectionMatrix();
    }

    this.cast.visible = state.castOpacity > 0.02;

    this.rig.warm.intensity = THREE.MathUtils.lerp(this.rig.warm.intensity, state.warmAccent * 0.8, immediate ? 1 : 0.08);
    if (this.scene.fog instanceof THREE.FogExp2) { const targetFog = p >= 0.94 ? 0.22 : LOOK.fogDensity; this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, targetFog, immediate ? 1 : 0.06); }
    this.dust.uniforms.uWarm.value = THREE.MathUtils.lerp(this.dust.uniforms.uWarm.value, state.warmAccent, immediate ? 1 : 0.08);

    const t = this.clock.getElapsedTime();
    this.updateHeroes(t, state.heroBlend, p);
  }

  private updateFocusAndAperture() {
    const focus = this.focusDistance();
    const aperture = this.currentFocusTarget === 'board' ? 0.0008 : 0.013;
    this.post.setFocus(focus, aperture);
    return focus;
  }

  start() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const t = this.clock.getElapsedTime();

      // Suavizado exponencial independiente de framerate (respuesta viva y sin arrastre)
      const factor = 1.0 - Math.exp(-14.0 * delta);
      this.currentProgress = THREE.MathUtils.lerp(this.currentProgress, this.targetProgress, factor);
      this.applyProgress(this.currentProgress);

      if (this.controls) {
        this.controls.update();
      } else {
        // Parallax orbital interactivo reactivo al ratón
        this.mouseSmooth.lerp(this.mouse, 0.08);
        const right = new THREE.Vector3().subVectors(this.cameraTarget, this.basePos).cross(this.camera.up).normalize();
        if (this.boardInteraction && this.boardInteraction.isFreeViewActive) {
          const r = 1.82;
          const az = this.boardInteraction.orbitAngles.azimuth;
          const el = this.boardInteraction.orbitAngles.elevation + 0.98;
          this.camera.position.set(r * Math.sin(az) * Math.cos(el), r * Math.sin(el), r * Math.cos(az) * Math.cos(el));
        } else {
          this.camera.position.copy(this.basePos).addScaledVector(right, this.mouseSmooth.x * 0.028).addScaledVector(this.camera.up, -this.mouseSmooth.y * 0.018);
        }
        this.camera.lookAt(this.cameraTarget);
      }

      const focus = this.updateFocusAndAperture();
      this.dust.update(t, focus);
      this.post.render(t);
    };
    loop();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointer);
    this.boardInteraction?.dispose();
    this.controls?.dispose();
    this.renderer.dispose();
  }
}
