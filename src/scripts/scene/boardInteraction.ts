import * as THREE from 'three';
import { BOARD, coordsToSquare, square } from './config';

export interface MoveEvent {
  pieceId: string;
  pieceKind: string;
  fromSquare: string;
  toSquare: string;
  capturedPieceId?: string;
}

export class BoardInteraction {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD.topY);
  private planeIntersect = new THREE.Vector3();

  private selectedPiece: THREE.Group | null = null;
  private hoveredPiece: THREE.Group | null = null;
  private dragOffset = new THREE.Vector3();
  private isDragging = false;

  // Resaltador de casilla
  private highlightMesh: THREE.Mesh;
  private onMoveCallback?: (event: MoveEvent) => void;

  // Estado libre / órbita 360
  public isFreeViewActive = false;
  private isOrbiting = false;
  private previousMousePosition = { x: 0, y: 0 };
  public orbitAngles = { azimuth: 0, elevation: 0 };

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private domElement: HTMLElement,
    private getPieces: () => THREE.Group[],
  ) {
    // Casilla brillante de feedback magnético
    const geom = new THREE.PlaneGeometry(BOARD.square * 0.94, BOARD.square * 0.94);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.highlightMesh = new THREE.Mesh(geom, mat);
    this.highlightMesh.position.y = BOARD.topY + 0.002;
    this.highlightMesh.renderOrder = 2;
    this.scene.add(this.highlightMesh);

    this.bindEvents();
  }

  public getSelectedPiece(): THREE.Group | null {
    return this.selectedPiece;
  }

  public isPieceDragging(): boolean {
    return this.isDragging;
  }

  onMove(callback: (event: MoveEvent) => void) {
    this.onMoveCallback = callback;
  }

  private isPieceVisible(p: THREE.Group): boolean {
    let curr: THREE.Object3D | null = p;
    while (curr) {
      if (!curr.visible) return false;
      curr = curr.parent;
    }
    return true;
  }

  private updateRaycaster(event: MouseEvent | Touch | PointerEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  private getPieceFromIntersect(intersect: THREE.Intersection): THREE.Group | null {
    let curr: THREE.Object3D | null = intersect.object;
    const pieces = this.getPieces();
    while (curr && curr !== this.scene) {
      if (pieces.includes(curr as THREE.Group)) {
        return curr as THREE.Group;
      }
      curr = curr.parent;
    }
    return null;
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private bindEvents() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  private onPointerDown = (e: PointerEvent) => {
    // Si se pulsa con botón secundario (derecho) o en vista libre sobre el fondo vacío: orbitar
    if (e.button === 2 || (this.isFreeViewActive && e.button === 0 && !this.hoveredPiece)) {
      this.isOrbiting = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.domElement.style.cursor = 'grabbing';
      try {
        this.domElement.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (e.button !== 0) return; // Solo clic primario para arrastrar piezas

    this.updateRaycaster(e);
    const visiblePieces = this.getPieces().filter((p) => this.isPieceVisible(p));
    const intersects = this.raycaster.intersectObjects(visiblePieces, true);

    if (intersects.length > 0) {
      const piece = this.getPieceFromIntersect(intersects[0]);
      if (piece && this.isPieceVisible(piece)) {
        this.selectedPiece = piece;
        this.isDragging = true;
        this.domElement.style.cursor = 'grabbing';
        try {
          this.domElement.setPointerCapture(e.pointerId);
        } catch {}

        if (this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect)) {
          this.dragOffset.copy(piece.position).sub(this.planeIntersect);
        }

        // Elevar la pieza 4 cm
        this.selectedPiece.position.y = BOARD.topY + 0.04;

        // Mostrar casilla actual iluminada en dorado
        (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.65;
        (this.highlightMesh.material as THREE.MeshBasicMaterial).color.setHex(0xe0ad50); // Oro
        this.highlightMesh.position.x = piece.position.x;
        this.highlightMesh.position.z = piece.position.z;
      }
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.isOrbiting && this.isFreeViewActive) {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      this.orbitAngles.azimuth -= deltaX * 0.0055;
      this.orbitAngles.elevation = THREE.MathUtils.clamp(
        this.orbitAngles.elevation + deltaY * 0.0045,
        -0.3,
        0.55,
      );
      return;
    }

    this.updateRaycaster(e);

    if (this.isDragging && this.selectedPiece) {
      if (this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect)) {
        // Arrastrar en XZ
        this.selectedPiece.position.x = this.planeIntersect.x + this.dragOffset.x;
        this.selectedPiece.position.z = this.planeIntersect.z + this.dragOffset.z;

        // Feedback magnético sobre casilla más cercana
        const sq = coordsToSquare(this.selectedPiece.position.x, this.selectedPiece.position.z);
        if (sq) {
          const [hx, hz] = square(sq);
          this.highlightMesh.position.x = hx;
          this.highlightMesh.position.z = hz;
          (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
          (this.highlightMesh.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8); // Cian
        } else {
          (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.2;
        }
      }
      return;
    }

    // Hover detection sobre piezas visibles
    const visiblePieces = this.getPieces().filter((p) => this.isPieceVisible(p));
    const intersects = this.raycaster.intersectObjects(visiblePieces, true);

    if (intersects.length > 0) {
      const piece = this.getPieceFromIntersect(intersects[0]);
      if (piece && this.isPieceVisible(piece)) {
        if (this.hoveredPiece !== piece) {
          this.hoveredPiece = piece;
          this.domElement.style.cursor = 'grab';
          (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.4;
          (this.highlightMesh.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
          this.highlightMesh.position.x = piece.position.x;
          this.highlightMesh.position.z = piece.position.z;
        }
        return;
      }
    }

    if (this.hoveredPiece) {
      this.hoveredPiece = null;
      this.domElement.style.cursor = 'default';
      (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
    }
  };

  private onPointerUp = (e?: PointerEvent) => {
    if (e && e.pointerId !== undefined) {
      try {
        this.domElement.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (this.isOrbiting) {
      this.isOrbiting = false;
      this.domElement.style.cursor = 'default';
    }

    if (!this.isDragging || !this.selectedPiece) {
      return;
    }

    const piece = this.selectedPiece;
    this.isDragging = false;
    this.selectedPiece = null;
    this.domElement.style.cursor = 'default';

    // Identificar casilla destino
    const targetSq = coordsToSquare(piece.position.x, piece.position.z);
    const fromSq = piece.userData.square || piece.userData.initialSquare || 'e4';

    if (targetSq && targetSq !== fromSq) {
      const [snapX, snapZ] = square(targetSq);

      // Comprobar si hay pieza enemiga u ocupante para capturarla
      let capturedId: string | undefined;
      const pieces = this.getPieces();
      for (const other of pieces) {
        if (other !== piece && this.isPieceVisible(other) && other.userData.square === targetSq) {
          // Captura: ocultar la pieza capturada
          other.visible = false;
          capturedId = other.name;
          break;
        }
      }

      // Asentar pieza en la nueva casilla
      piece.position.set(snapX, BOARD.topY, snapZ);
      piece.userData.square = targetSq;
      if (piece.userData.home) {
        piece.userData.home.position.set(snapX, BOARD.topY, snapZ);
      }

      // Notificar evento de movimiento
      this.onMoveCallback?.({
        pieceId: piece.name,
        pieceKind: piece.userData.kind || 'piece',
        fromSquare: fromSq,
        toSquare: targetSq,
        capturedPieceId: capturedId,
      });

      // Pulso luminoso de aterrizaje
      (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
      (this.highlightMesh.material as THREE.MeshBasicMaterial).color.setHex(0xe0ad50);
      this.highlightMesh.position.x = snapX;
      this.highlightMesh.position.z = snapZ;

      setTimeout(() => {
        (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
      }, 700);
    } else {
      // Si soltó fuera del tablero o en la misma casilla, regresa a su casilla
      const returnSq = fromSq;
      const [homeX, homeZ] = square(returnSq);
      piece.position.set(homeX, BOARD.topY, homeZ);
      (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
    }
  };

  resetPieces() {
    const pieces = this.getPieces();
    pieces.forEach((p) => {
      p.visible = true;
      const initSq = p.userData.initialSquare || p.userData.square;
      if (initSq) {
        const [x, z] = square(initSq);
        p.position.set(x, BOARD.topY, z);
        p.userData.square = initSq;
        if (p.userData.home) {
          p.userData.home.position.set(x, BOARD.topY, z);
        }
      }
    });
    this.orbitAngles = { azimuth: 0, elevation: 0 };
    (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.scene.remove(this.highlightMesh);
    this.highlightMesh.geometry.dispose();
    (this.highlightMesh.material as THREE.Material).dispose();
  }
}
