import { createNoise2D, createNoise3D } from 'simplex-noise';
import * as THREE from 'three';
import { BlockType } from '../types/game';
import { getBlockMaterials } from './textures';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

// Shared box geometry to avoid memory leaks
const sharedBoxGeometry = new THREE.BoxGeometry(1, 1, 1);

export class VoxelWorld {
  private seed: number;
  private noise2D: (x: number, y: number) => number;
  private noise3D: (x: number, y: number, z: number) => number;
  // Map of modified blocks: key = "x,y,z" -> BlockType
  public modifiedBlocks: Map<string, BlockType> = new Map();
  // Map of generated chunk data: key = "cx,cz" -> Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)
  private loadedChunks: Map<string, Uint8Array> = new Map();
  // Group containing chunk meshes
  public worldGroup: THREE.Group = new THREE.Group();
  private chunkMeshes: Map<string, THREE.Object3D[]> = new Map();

  constructor(seed: number = 12345) {
    this.seed = seed;
    // Simple deterministic pseudo random seed
    const rng = () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.noise2D = createNoise2D(rng);
    this.noise3D = createNoise3D(rng);
  }

  public getBlockKey(x: number, y: number, z: number): string {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);

    if (iy < 0 || iy >= CHUNK_HEIGHT) return BlockType.AIR;

    // Check user modifications first
    const key = this.getBlockKey(ix, iy, iz);
    if (this.modifiedBlocks.has(key)) {
      return this.modifiedBlocks.get(key)!;
    }

    const cx = Math.floor(ix / CHUNK_SIZE);
    const cz = Math.floor(iz / CHUNK_SIZE);

    let chunk = this.loadedChunks.get(this.getChunkKey(cx, cz));
    if (!chunk) {
      chunk = this.generateChunkData(cx, cz);
      this.loadedChunks.set(this.getChunkKey(cx, cz), chunk);
    }

    const lx = ((ix % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((iz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const index = (iy * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;

    return chunk[index];
  }

  public setBlock(x: number, y: number, z: number, type: BlockType) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);

    if (iy < 0 || iy >= CHUNK_HEIGHT) return;

    const key = this.getBlockKey(ix, iy, iz);
    this.modifiedBlocks.set(key, type);

    const cx = Math.floor(ix / CHUNK_SIZE);
    const cz = Math.floor(iz / CHUNK_SIZE);

    // Rebuild mesh for this chunk and neighbor chunks if on boundary
    this.rebuildChunkMesh(cx, cz);
    const lx = ((ix % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((iz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    if (lx === 0) this.rebuildChunkMesh(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.rebuildChunkMesh(cx + 1, cz);
    if (lz === 0) this.rebuildChunkMesh(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.rebuildChunkMesh(cx, cz + 1);
  }

  public generateChunkData(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;

        // Determine biome base height using octave noise
        const n1 = this.noise2D(wx * 0.01, wz * 0.01);
        const n2 = this.noise2D(wx * 0.03, wz * 0.03) * 0.5;
        const height = Math.floor(24 + (n1 + n2) * 12);

        // Biome selector
        const biomeNoise = this.noise2D(wx * 0.005, wz * 0.005);
        const isDesert = biomeNoise > 0.35;
        const isMountain = height > 34;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const index = (y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;

          if (y === 0) {
            data[index] = BlockType.BEDROCK;
            continue;
          }

          // Check 3D cave noise
          const caveNoise = this.noise3D(wx * 0.05, y * 0.05, wz * 0.05);
          const isCave = y < height - 2 && y > 3 && caveNoise > 0.45;

          if (isCave) {
            data[index] = BlockType.AIR;
            continue;
          }

          if (y < height) {
            if (y === height - 1) {
              // Surface block
              if (isDesert) {
                data[index] = BlockType.SAND;
              } else if (isMountain && y > 36) {
                data[index] = BlockType.SNOW;
              } else {
                data[index] = BlockType.GRASS;
              }
            } else if (y > height - 4) {
              data[index] = isDesert ? BlockType.SAND : BlockType.DIRT;
            } else {
              // Stone & Ores
              const oreN = Math.random();
              if (y < 16 && oreN < 0.015) {
                data[index] = BlockType.DIAMOND_ORE;
              } else if (y < 28 && oreN < 0.02) {
                data[index] = BlockType.GOLD_ORE;
              } else if (y < 40 && oreN < 0.035) {
                data[index] = BlockType.IRON_ORE;
              } else if (y < 50 && oreN < 0.05) {
                data[index] = BlockType.COAL_ORE;
              } else {
                data[index] = BlockType.STONE;
              }
            }
          } else if (y <= 18 && y >= height) {
            // Water level at y = 18
            data[index] = BlockType.WATER;
          } else {
            data[index] = BlockType.AIR;
          }
        }

        // Tree / Cactus feature generation
        if (!isDesert && height < 34 && height > 19) {
          const treeChance = this.noise2D(wx * 0.1, wz * 0.1);
          if (treeChance > 0.72 && lx > 2 && lx < 13 && lz > 2 && lz < 13) {
            // Plant an oak tree
            const trunkH = 4 + Math.floor(Math.random() * 2);
            for (let th = 0; th < trunkH; th++) {
              const idx = ((height + th) * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
              data[idx] = BlockType.OAK_LOG;
            }
            // Foliage crown
            for (let dx = -2; dx <= 2; dx++) {
              for (let dz = -2; dz <= 2; dz++) {
                for (let dy = trunkH - 2; dy <= trunkH + 1; dy++) {
                  if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && Math.random() > 0.5) continue;
                  const leafX = lx + dx;
                  const leafZ = lz + dz;
                  const leafY = height + dy;
                  if (leafX >= 0 && leafX < CHUNK_SIZE && leafZ >= 0 && leafZ < CHUNK_SIZE && leafY < CHUNK_HEIGHT) {
                    const lIdx = (leafY * CHUNK_SIZE + leafZ) * CHUNK_SIZE + leafX;
                    if (data[lIdx] === BlockType.AIR) {
                      data[lIdx] = BlockType.OAK_LEAVES;
                    }
                  }
                }
              }
            }
          } else if (treeChance < -0.6 && lx > 1 && lx < 14 && lz > 1 && lz < 14) {
            // Plant tall grass or flower
            const fIdx = (height * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
            const r = Math.random();
            if (r < 0.6) data[fIdx] = BlockType.TALL_GRASS;
            else if (r < 0.8) data[fIdx] = BlockType.FLOWER_RED;
            else data[fIdx] = BlockType.FLOWER_YELLOW;
          }
        } else if (isDesert && height > 18) {
          const cactusChance = Math.random();
          if (cactusChance < 0.02 && lx > 1 && lx < 14 && lz > 1 && lz < 14) {
            const cactusH = 2 + Math.floor(Math.random() * 2);
            for (let ch = 0; ch < cactusH; ch++) {
              const idx = ((height + ch) * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
              data[idx] = BlockType.CACTUS;
            }
          }
        }
      }
    }

    return data;
  }

  // Update chunks around player position
  public updateChunks(playerX: number, playerZ: number, radius: number = 3) {
    const currentCx = Math.floor(playerX / CHUNK_SIZE);
    const currentCz = Math.floor(playerZ / CHUNK_SIZE);

    const neededKeys = new Set<string>();

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dz * dz > radius * radius + 1) continue;
        const cx = currentCx + dx;
        const cz = currentCz + dz;
        const key = this.getChunkKey(cx, cz);
        neededKeys.add(key);

        if (!this.chunkMeshes.has(key)) {
          this.buildChunkMesh(cx, cz);
        }
      }
    }

    // Remove distant chunk meshes to free memory
    for (const [key, meshes] of this.chunkMeshes.entries()) {
      if (!neededKeys.has(key)) {
        meshes.forEach((m) => {
          this.worldGroup.remove(m);
          if (m instanceof THREE.InstancedMesh) m.dispose();
        });
        this.chunkMeshes.delete(key);
      }
    }
  }

  public rebuildChunkMesh(cx: number, cz: number) {
    const key = this.getChunkKey(cx, cz);
    const existing = this.chunkMeshes.get(key);
    if (existing) {
      existing.forEach((m) => {
        this.worldGroup.remove(m);
        if (m instanceof THREE.InstancedMesh) m.dispose();
      });
      this.chunkMeshes.delete(key);
    }
    this.buildChunkMesh(cx, cz);
  }

  private isBlockTransparent(type: BlockType): boolean {
    return (
      type === BlockType.AIR ||
      type === BlockType.WATER ||
      type === BlockType.GLASS ||
      type === BlockType.OAK_LEAVES ||
      type === BlockType.TORCH ||
      type === BlockType.TALL_GRASS ||
      type === BlockType.FLOWER_RED ||
      type === BlockType.FLOWER_YELLOW
    );
  }

  // Build InstancedMeshes per block type for high performance
  private buildChunkMesh(cx: number, cz: number) {
    const key = this.getChunkKey(cx, cz);
    const blockInstances: Map<BlockType, THREE.Matrix4[]> = new Map();

    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    const dummy = new THREE.Object3D();

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = startX + lx;
        const wz = startZ + lz;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const type = this.getBlock(wx, y, wz);
          if (type === BlockType.AIR) continue;

          // Face culling optimization: only render if at least one adjacent face borders air/different transparency
          const top = this.getBlock(wx, y + 1, wz);
          const bottom = this.getBlock(wx, y - 1, wz);
          const left = this.getBlock(wx - 1, y, wz);
          const right = this.getBlock(wx + 1, y, wz);
          const front = this.getBlock(wx, y, wz + 1);
          const back = this.getBlock(wx, y, wz - 1);

          const isExposed =
            (top !== type && this.isBlockTransparent(top)) ||
            (bottom !== type && this.isBlockTransparent(bottom)) ||
            (left !== type && this.isBlockTransparent(left)) ||
            (right !== type && this.isBlockTransparent(right)) ||
            (front !== type && this.isBlockTransparent(front)) ||
            (back !== type && this.isBlockTransparent(back));

          if (!isExposed) continue;

          dummy.position.set(wx + 0.5, y + 0.5, wz + 0.5);
          dummy.updateMatrix();

          if (!blockInstances.has(type)) {
            blockInstances.set(type, []);
          }
          blockInstances.get(type)!.push(dummy.matrix.clone());
        }
      }
    }

    const meshes: THREE.Object3D[] = [];

    for (const [type, matrices] of blockInstances.entries()) {
      if (matrices.length === 0) continue;

      const materials = getBlockMaterials(type);
      const instancedMesh = new THREE.InstancedMesh(sharedBoxGeometry, materials, matrices.length);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;

      for (let i = 0; i < matrices.length; i++) {
        instancedMesh.setMatrixAt(i, matrices[i]);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      this.worldGroup.add(instancedMesh);
      meshes.push(instancedMesh);
    }

    this.chunkMeshes.set(key, meshes);
  }
}
