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
  private dragOffset = new THREE.Vector3();
  private isDragging = false;
  public isGameModeActive = false;

  // Resaltador de casilla magnética
  private highlightMesh: THREE.Mesh;
  private onMoveCallback?: (event: MoveEvent) => void;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private domElement: HTMLElement,
    private getPieces: () => THREE.Group[],
  ) {
    // Casilla brillante de feedback magnético (apagada por defecto)
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
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    // Los listeners permanecen DESCONECTADOS por defecto para rendimiento 100% puro en el scroll
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

  /**
   * Activa el modo partida bajo demanda cuando el usuario pulsa el botón
   */
  public enable() {
    if (this.isGameModeActive) return;
    this.isGameModeActive = true;
    this.highlightMesh.visible = true;
    (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0;

    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.domElement.style.cursor = 'default';
  }

  /**
   * Desactiva el modo partida y remueve todos los listeners
   */
  public disable() {
    if (!this.isGameModeActive) return;
    this.isGameModeActive = false;
    this.isDragging = false;
    this.selectedPiece = null;
    this.highlightMesh.visible = false;
    (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0;

    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.style.cursor = 'default';
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

  private onPointerDown = (e: PointerEvent) => {
    if (!this.isGameModeActive) return;
    if (e.button !== 0) return; // Solo clic primario para mover piezas

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

        // Elevar la pieza 3.8 cm
        this.selectedPiece.position.y = BOARD.topY + 0.038;

        // Mostrar casilla actual iluminada en dorado
        (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.65;
        (this.highlightMesh.material as THREE.MeshBasicMaterial).color.setHex(0xe0ad50); // Oro
        this.highlightMesh.position.x = piece.position.x;
        this.highlightMesh.position.z = piece.position.z;
      }
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    // Si no se está arrastrando nada, retornar de inmediato (CERO cálculo de raycasting sobre la malla)
    if (!this.isDragging || !this.selectedPiece) {
      return;
    }

    this.updateRaycaster(e);

    // Cálculo matemático instantáneo de plano (O(1), 0 microsegundos)
    if (this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect)) {
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
  };

  private onPointerUp = (e?: PointerEvent) => {
    if (e && e.pointerId !== undefined) {
      try {
        this.domElement.releasePointerCapture(e.pointerId);
      } catch {}
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

      // Comprobar si hay pieza para capturar
      let capturedId: string | undefined;
      const pieces = this.getPieces();
      for (const other of pieces) {
        if (other !== piece && this.isPieceVisible(other) && other.userData.square === targetSq) {
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
      }, 600);
    } else {
      // Si soltó fuera del tablero o en la misma casilla, regresa a su casilla previa
      const [homeX, homeZ] = square(fromSq);
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
    (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
  }

  dispose() {
    this.disable();
    this.scene.remove(this.highlightMesh);
    this.highlightMesh.geometry.dispose();
    (this.highlightMesh.material as THREE.Material).dispose();
  }
}
