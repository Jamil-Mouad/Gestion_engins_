import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild,
  computed, effect, input, signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import * as THREE from 'three';

/**
 * Realistic 3D vertical fuel tank rendered with three.js. A transparent glass
 * shell holds a fuel volume scaled to the fill level; the scene auto-rotates and
 * responds to pointer drag. The percentage label and hover tooltip are DOM
 * overlays. Inputs are unchanged from the previous SVG implementation so call
 * sites need no edits.
 */
@Component({
  selector: 'app-tank-cylinder',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="tank-wrap"
         [style.width.px]="width"
         [style.height.px]="height"
         (mouseenter)="hovered.set(true)"
         (mouseleave)="hovered.set(false)">
      <canvas #canvas class="tank-canvas"></canvas>

      <div class="tank-pct">{{ pct() | number:'1.0-0' }}%</div>

      @if (hovered()) {
        <div class="tank-tooltip">
          <div class="tt-row tt-row--main">{{ litres() | number:'1.0-0' }} L</div>
          <div class="tt-row">≈ {{ tonnes() | number:'1.2-2' }} t</div>
          <div class="tt-row">{{ pct() | number:'1.1-1' }} % de {{ capacite() | number:'1.0-0' }} L</div>
          @if (hauteurCm() !== null) {
            <div class="tt-row tt-row--muted">Règle : {{ hauteurCm() | number:'1.0-1' }} cm</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .tank-wrap { position: relative; display: inline-block; cursor: grab; }
    .tank-wrap:active { cursor: grabbing; }
    .tank-canvas { display: block; width: 100%; height: 100%; }
    .tank-pct {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      font-family: 'JetBrains Mono', monospace;
      font-size: 26px;
      font-weight: 700;
      color: #1F2937;
      text-shadow: 0 0 6px rgba(255,255,255,0.85), 0 0 2px rgba(255,255,255,0.85);
    }
    .tank-tooltip {
      position: absolute;
      top: 8px;
      left: calc(100% + 10px);
      background: rgba(20,20,20,0.95);
      color: #fff;
      border-radius: 10px;
      padding: 10px 14px;
      min-width: 150px;
      z-index: 10;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      animation: ttIn 150ms ease both;
      white-space: nowrap;
    }
    @keyframes ttIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: none; } }
    .tt-row { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.7; color: rgba(255,255,255,0.85); }
    .tt-row--main { font-size: 16px; font-weight: 700; color: #F7941D; }
    .tt-row--muted { color: rgba(255,255,255,0.55); font-size: 11px; }
  `],
})
export class TankCylinderComponent implements AfterViewInit, OnDestroy {
  litres = input(0);
  capacite = input(0);
  densite = input(0.845);
  hauteurCm = input<number | null>(null);

  hovered = signal(false);

  readonly width = 190;
  readonly height = 300;

  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  pct = computed(() => {
    const cap = this.capacite();
    if (!cap || cap <= 0) return 0;
    return Math.max(0, Math.min(100, (this.litres() / cap) * 100));
  });
  tonnes = computed(() => this.litres() * this.densite() / 1000);

  // three.js handles
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private fuelMesh?: THREE.Mesh;
  private fuelGroup?: THREE.Group;
  private frameId = 0;
  private targetFill = 0;
  private currentFill = 0;
  private dragging = false;
  private lastX = 0;
  private yaw = 0;

  // Tank geometry constants (world units)
  private readonly RADIUS = 1;
  private readonly TANK_H = 2.6;

  constructor() {
    // Re-target the animated fill whenever the percentage changes.
    effect(() => {
      this.targetFill = this.pct() / 100;
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return; // no WebGL — leave the percentage label visible over an empty canvas
    }
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.width, this.height, false);

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.1, 100);
    camera.position.set(0, 0.6, 6.4);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd4ff, 0.4);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    const group = new THREE.Group();
    this.fuelGroup = group;
    scene.add(group);

    // Glass shell
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(this.RADIUS, this.RADIUS, this.TANK_H, 48, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xdfe3e8,
        metalness: 0.0,
        roughness: 0.15,
        transmission: 0.9,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
      }),
    );
    group.add(glass);

    // Top + bottom caps
    const capMat = new THREE.MeshStandardMaterial({ color: 0xc9cdd4, metalness: 0.3, roughness: 0.5 });
    const topCap = new THREE.Mesh(new THREE.CircleGeometry(this.RADIUS, 48), capMat);
    topCap.rotation.x = -Math.PI / 2;
    topCap.position.y = this.TANK_H / 2;
    group.add(topCap);
    const botCap = new THREE.Mesh(new THREE.CircleGeometry(this.RADIUS, 48), capMat);
    botCap.rotation.x = Math.PI / 2;
    botCap.position.y = -this.TANK_H / 2;
    group.add(botCap);

    // Fuel volume (scaled vertically by fill level)
    const fuel = new THREE.Mesh(
      new THREE.CylinderGeometry(this.RADIUS * 0.97, this.RADIUS * 0.97, this.TANK_H, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0xf2a13a,
        metalness: 0.1,
        roughness: 0.35,
        transmission: 0.2,
        transparent: true,
        opacity: 0.92,
        clearcoat: 0.4,
      }),
    );
    this.fuelMesh = fuel;
    group.add(fuel);
    this.applyFill(0);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);

    this.animate();
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastX = e.clientX;
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.yaw += (e.clientX - this.lastX) * 0.01;
    this.lastX = e.clientX;
  };
  private onPointerUp = () => { this.dragging = false; };

  /** Position/scale the fuel cylinder for a 0..1 fill ratio. */
  private applyFill(fill: number): void {
    if (!this.fuelMesh) return;
    const f = Math.max(0.0001, fill);
    this.fuelMesh.scale.y = f;
    // keep the fuel sitting on the bottom cap as it grows
    this.fuelMesh.position.y = -this.TANK_H / 2 + (this.TANK_H * f) / 2;
    this.fuelMesh.visible = fill > 0.001;
  }

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);
    // ease fill toward target
    this.currentFill += (this.targetFill - this.currentFill) * 0.08;
    this.applyFill(this.currentFill);
    if (this.fuelGroup) {
      if (!this.dragging) this.yaw += 0.004;
      this.fuelGroup.rotation.y = this.yaw;
    }
    this.renderer?.render(this.scene!, this.camera!);
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.scene?.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else mat?.dispose();
    });
    this.renderer?.dispose();
  }
}
