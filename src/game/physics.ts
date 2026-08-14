import * as THREE from 'three';
import { BLOCKS } from './blockData';
import { BlockType, PlayerState } from '../types/game';
import { VoxelWorld } from './world';

export interface RaycastResult {
  hit: boolean;
  blockX: number;
  blockY: number;
  blockZ: number;
  placeX: number;
  placeY: number;
  placeZ: number;
  faceNormal: THREE.Vector3;
}

export class PhysicsEngine {
  private world: VoxelWorld;
  public player: PlayerState;
  private fallStartHeight: number = 0;
  private drowningTimer: number = 0;

  constructor(world: VoxelWorld) {
    this.world = world;
    this.player = {
      x: 8.5,
      y: 35.0,
      z: 8.5,
      vx: 0,
      vy: 0,
      vz: 0,
      pitch: 0,
      yaw: 0,
      health: 20,
      maxHealth: 20,
      hunger: 20,
      maxHunger: 20,
      oxygen: 20,
      mode: 'survival',
      isFlying: false,
      isGrounded: false,
      isSneaking: false,
      isSprinting: false,
      inventory: Array(36).fill(null),
      selectedHotbarIndex: 0,
      heldItemSwing: 0,
    };
    this.fallStartHeight = this.player.y;
  }

  public findSurfaceY(x: number, z: number): number {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    for (let y = 63; y >= 0; y--) {
      const b = this.world.getBlock(bx, y, bz);
      if (BLOCKS[b]?.solid) {
        return y + 1;
      }
    }
    return 30;
  }

  public resetPlayerToSpawn() {
    const surfaceY = this.findSurfaceY(8.5, 8.5);
    this.player.x = 8.5;
    this.player.y = surfaceY;
    this.player.z = 8.5;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.vz = 0;
    this.player.isGrounded = true;
    this.fallStartHeight = this.player.y;
    this.drowningTimer = 0;
  }

  // Raycast from camera to find targeted block
  public raycast(cameraPos: THREE.Vector3, cameraDir: THREE.Vector3, maxDistance: number = 6): RaycastResult {
    const step = 0.05;
    const pos = cameraPos.clone();
    const dir = cameraDir.clone().normalize();

    let lastBlockX = Math.floor(pos.x);
    let lastBlockY = Math.floor(pos.y);
    let lastBlockZ = Math.floor(pos.z);

    for (let d = 0; d < maxDistance; d += step) {
      pos.addScaledVector(dir, step);
      const bx = Math.floor(pos.x);
      const by = Math.floor(pos.y);
      const bz = Math.floor(pos.z);

      const blockType = this.world.getBlock(bx, by, bz);
      if (blockType !== BlockType.AIR && blockType !== BlockType.WATER) {
        // Hit a solid or targetable block!
        const normal = new THREE.Vector3(lastBlockX - bx, lastBlockY - by, lastBlockZ - bz);
        return {
          hit: true,
          blockX: bx,
          blockY: by,
          blockZ: bz,
          placeX: lastBlockX,
          placeY: lastBlockY,
          placeZ: lastBlockZ,
          faceNormal: normal,
        };
      }

      lastBlockX = bx;
      lastBlockY = by;
      lastBlockZ = bz;
    }

    return {
      hit: false,
      blockX: 0,
      blockY: 0,
      blockZ: 0,
      placeX: 0,
      placeY: 0,
      placeZ: 0,
      faceNormal: new THREE.Vector3(),
    };
  }

  // Update physics frame
  public update(
    dt: number,
    keys: Record<string, boolean>,
    onHurt?: (damage: number, reason?: string) => void
  ) {
    const p = this.player;

    // Movement speed
    let speed = p.isFlying ? 12 : p.isSprinting ? 7 : p.isSneaking ? 2.5 : 4.3;

    // Camera view directions
    const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));

    const moveDir = new THREE.Vector3(0, 0, 0);

    if (keys['KeyW']) moveDir.add(forward);
    if (keys['KeyS']) moveDir.sub(forward);
    if (keys['KeyD']) moveDir.add(right);
    if (keys['KeyA']) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      p.vx = moveDir.x * speed;
      p.vz = moveDir.z * speed;
    } else {
      p.vx *= 0.6; // friction damping
      p.vz *= 0.6;
    }

    // Check if player head or feet underwater
    const headBlock = this.world.getBlock(p.x, p.y + 1.6, p.z);
    const feetBlock = this.world.getBlock(p.x, p.y + 0.2, p.z);
    const inWater = headBlock === BlockType.WATER || feetBlock === BlockType.WATER;

    if (inWater) {
      if (headBlock === BlockType.WATER) {
        p.oxygen = Math.max(0, p.oxygen - dt * 2); // 10 seconds total air underwater (1 bubble per sec)
        if (p.oxygen === 0) {
          this.drowningTimer += dt;
          if (this.drowningTimer >= 1.0) {
            this.drowningTimer = 0;
            p.health = Math.max(0, p.health - 2);
            if (onHurt) onHurt(2, 'You drowned');
          }
        } else {
          this.drowningTimer = 0;
        }
      } else {
        p.oxygen = Math.min(20, p.oxygen + dt * 10);
        this.drowningTimer = 0;
      }
      // Water drag & float
      p.vy *= 0.8;
      if (keys['Space']) p.vy = 3.5;
      else p.vy -= 10 * dt;
    } else {
      p.oxygen = Math.min(20, p.oxygen + dt * 10);
      this.drowningTimer = 0;

      if (p.isFlying) {
        p.vy = 0;
        if (keys['Space']) p.vy = 8;
        if (keys['ShiftLeft'] || keys['KeyC']) p.vy = -8;
      } else {
        // Apply Gravity
        p.vy -= 28.0 * dt;

        // Jump
        if (keys['Space'] && p.isGrounded) {
          p.vy = 8.5;
          p.isGrounded = false;
        }
      }
    }

    // Move player with continuous AABB collision testing
    const boxWidth = 0.6;
    const boxHeight = 1.8;

    // X Axis Movement
    p.x += p.vx * dt;
    if (this.checkCollision(p.x, p.y, p.z, boxWidth, boxHeight)) {
      p.x -= p.vx * dt;
      p.vx = 0;
    }

    // Z Axis Movement
    p.z += p.vz * dt;
    if (this.checkCollision(p.x, p.y, p.z, boxWidth, boxHeight)) {
      p.z -= p.vz * dt;
      p.vz = 0;
    }

    // Y Axis Movement
    p.y += p.vy * dt;

    if (this.checkCollision(p.x, p.y, p.z, boxWidth, boxHeight)) {
      if (p.vy < 0) {
        // Touched ground
        if (!p.isGrounded && p.mode === 'survival' && !p.isFlying && !inWater) {
          const fallDistance = this.fallStartHeight - p.y;
          if (fallDistance > 3.5) {
            const damage = Math.floor(fallDistance - 3);
            p.health = Math.max(0, p.health - damage);
            if (onHurt) onHurt(damage, 'You fell from a high place');
          }
        }
        p.isGrounded = true;
        this.fallStartHeight = p.y;
      }
      p.y -= p.vy * dt;
      p.vy = 0;
    } else {
      if (p.isGrounded) {
        p.isGrounded = false;
        this.fallStartHeight = p.y;
      } else {
        // Track highest Y reached while airborne
        this.fallStartHeight = Math.max(this.fallStartHeight, p.y);
      }
    }

    // Void safe fall reset
    if (p.y < -10) {
      const surfaceY = this.findSurfaceY(8.5, 8.5);
      p.x = 8.5;
      p.y = surfaceY;
      p.z = 8.5;
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      p.isGrounded = true;
      this.fallStartHeight = p.y;
      p.health = Math.max(0, p.health - 5);
      if (onHurt) onHurt(5, 'You fell into the void');
    }
  }

  // AABB Bounding Box vs Voxel blocks collision helper
  private checkCollision(x: number, y: number, z: number, width: number, height: number): boolean {
    const eps = 0.001;
    const minX = Math.floor(x - width / 2 + eps);
    const maxX = Math.floor(x + width / 2 - eps);
    const minY = Math.floor(y + eps);
    const maxY = Math.floor(y + height - eps);
    const minZ = Math.floor(z - width / 2 + eps);
    const maxZ = Math.floor(z + width / 2 - eps);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          const block = this.world.getBlock(bx, by, bz);
          if (block !== BlockType.AIR && BLOCKS[block]?.solid) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
