import * as THREE from 'three';
import { BlockType, ItemStack, MobEntity, PlayerState, TNTEntity } from '../types/game';
import { BLOCKS, ITEMS } from './blockData';
import { soundEngine } from './audio';
import { VoxelWorld } from './world';

export interface DroppedItemEntity {
  id: string;
  itemId: string;
  count: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
}

export class MobManager {
  private world: VoxelWorld;
  public mobs: MobEntity[] = [];
  public tntList: TNTEntity[] = [];
  public droppedItems: DroppedItemEntity[] = [];

  public mobGroup: THREE.Group = new THREE.Group();
  public tntGroup: THREE.Group = new THREE.Group();
  public itemGroup: THREE.Group = new THREE.Group();

  private mobMeshMap: Map<string, THREE.Group> = new Map();
  private tntMeshMap: Map<string, THREE.Mesh> = new Map();
  private itemMeshMap: Map<string, THREE.Mesh> = new Map();

  constructor(world: VoxelWorld) {
    this.world = world;
  }

  // Spawn initial passive and hostile mobs around player position
  public spawnInitialMobs(playerX: number, playerY: number, playerZ: number) {
    const mobTypes: ('pig' | 'cow' | 'sheep' | 'zombie' | 'creeper')[] = ['pig', 'cow', 'sheep', 'zombie', 'creeper'];

    for (let i = 0; i < 12; i++) {
      const type = mobTypes[Math.floor(Math.random() * mobTypes.length)];
      const isHostile = type === 'zombie' || type === 'creeper';
      // Hostile mobs spawn further away (at least 15-30 blocks)
      const minRadius = isHostile ? 15 : 5;
      const maxRadius = isHostile ? 35 : 25;
      const angle = Math.random() * Math.PI * 2;
      const dist = minRadius + Math.random() * (maxRadius - minRadius);

      const mx = playerX + Math.sin(angle) * dist;
      const mz = playerZ + Math.cos(angle) * dist;

      const bx = Math.floor(mx);
      const bz = Math.floor(mz);
      let my = playerY + 2;

      for (let y = 63; y >= 0; y--) {
        const b = this.world.getBlock(bx, y, bz);
        if (BLOCKS[b]?.solid) {
          my = y + 1;
          break;
        }
      }

      // Avoid spawning inside water
      if (this.world.getBlock(bx, my, bz) !== BlockType.WATER) {
        this.spawnMob(type, mx, my, mz);
      }
    }
  }

  public spawnMob(type: 'pig' | 'cow' | 'sheep' | 'zombie' | 'creeper', x: number, y: number, z: number) {
    const id = `mob_${Date.now()}_${Math.random()}`;
    const isHostile = type === 'zombie' || type === 'creeper';

    const mob: MobEntity = {
      id,
      type,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.random() * Math.PI * 2,
      health: isHostile ? 20 : 10,
      maxHealth: isHostile ? 20 : 10,
      isHostile,
      hurtTimer: 0,
      attackCooldown: 0,
    };

    this.mobs.push(mob);

    // Create 3D Voxel Mesh for Mob
    const group = this.createMobMesh(type);
    group.position.set(x, y, z);
    this.mobGroup.add(group);
    this.mobMeshMap.set(id, group);
  }

  private createPrimedTNTMesh(): THREE.Mesh {
    // Create TNT side texture
    const sideCanvas = document.createElement('canvas');
    sideCanvas.width = 64;
    sideCanvas.height = 64;
    const sCtx = sideCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#db3b3b';
      sCtx.fillRect(0, 0, 64, 64);
      // White middle banner
      sCtx.fillStyle = '#ffffff';
      sCtx.fillRect(0, 20, 64, 24);
      // Black TNT label
      sCtx.fillStyle = '#000000';
      sCtx.font = 'bold 22px monospace';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText('TNT', 32, 32);
    }
    const sideTex = new THREE.CanvasTexture(sideCanvas);
    sideTex.magFilter = THREE.NearestFilter;

    // Create TNT top texture
    const topCanvas = document.createElement('canvas');
    topCanvas.width = 64;
    topCanvas.height = 64;
    const tCtx = topCanvas.getContext('2d');
    if (tCtx) {
      tCtx.fillStyle = '#db3b3b';
      tCtx.fillRect(0, 0, 64, 64);
      tCtx.fillStyle = '#444444';
      tCtx.fillRect(24, 24, 16, 16);
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(30, 20, 4, 8);
    }
    const topTex = new THREE.CanvasTexture(topCanvas);
    topTex.magFilter = THREE.NearestFilter;

    const sideMat = new THREE.MeshBasicMaterial({ map: sideTex });
    const topMat = new THREE.MeshBasicMaterial({ map: topTex });
    const materials = [sideMat, sideMat, topMat, topMat, sideMat, sideMat];

    const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const mesh = new THREE.Mesh(geo, materials);
    return mesh;
  }

  public spawnTNT(x: number, y: number, z: number, customFuse?: number) {
    const id = `tnt_${Date.now()}_${Math.random()}`;
    const tnt: TNTEntity = {
      id,
      x: Math.floor(x) + 0.5,
      y: Math.floor(y) + 0.5,
      z: Math.floor(z) + 0.5,
      fuse: customFuse ?? 3.2,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2.5,
      vz: (Math.random() - 0.5) * 1.5,
    };

    this.tntList.push(tnt);

    const mesh = this.createPrimedTNTMesh();
    mesh.position.set(tnt.x, tnt.y, tnt.z);

    this.tntGroup.add(mesh);
    this.tntMeshMap.set(id, mesh);

    soundEngine.playTNTFuse();
  }

  public spawnDroppedItem(
    itemId: string,
    count: number,
    x: number,
    y: number,
    z: number,
    vx?: number,
    vy?: number,
    vz?: number
  ) {
    if (!ITEMS[itemId]) return;

    const id = `item_${Date.now()}_${Math.random()}`;
    const item: DroppedItemEntity = {
      id,
      itemId,
      count,
      x,
      y,
      z,
      vx: vx ?? (Math.random() - 0.5) * 1.5,
      vy: vy ?? 1.5 + Math.random() * 1.5,
      vz: vz ?? (Math.random() - 0.5) * 1.5,
      age: 0,
    };

    this.droppedItems.push(item);

    const mesh = this.createItemMesh(itemId);
    mesh.position.set(x, y, z);
    this.itemGroup.add(mesh);
    this.itemMeshMap.set(id, mesh);
  }

  private createItemMesh(itemId: string): THREE.Mesh {
    const itemData = ITEMS[itemId];
    const colorHex = itemData?.iconColor ? parseInt(itemData.iconColor.replace('#', ''), 16) : 0x888888;

    const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.4,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Black wireframe voxel outlines
    const edgesGeo = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
    const wireframe = new THREE.LineSegments(edgesGeo, lineMat);
    mesh.add(wireframe);

    return mesh;
  }

  // Raycast to check if player hits a mob
  public hitMob(rayPos: THREE.Vector3, rayDir: THREE.Vector3, maxDistance = 5): { mob: MobEntity; lootItem?: string } | null {
    let closestMob: MobEntity | null = null;
    let closestDist = maxDistance;

    const normDir = rayDir.clone().normalize();

    for (const m of this.mobs) {
      const mobCenter = new THREE.Vector3(m.x, m.y + 0.8, m.z);
      const toMob = mobCenter.clone().sub(rayPos);
      const proj = toMob.dot(normDir);

      if (proj > 0 && proj < closestDist) {
        const perpDist = toMob.clone().sub(normDir.clone().multiplyScalar(proj)).length();
        if (perpDist < 0.8) {
          closestMob = m;
          closestDist = proj;
        }
      }
    }

    if (closestMob) {
      closestMob.hurtTimer = 0.3;
      let lootItem: string | undefined = undefined;

      if (closestMob.type === 'pig') lootItem = 'porkchop';
      if (closestMob.type === 'cow') lootItem = 'porkchop';
      if (closestMob.type === 'sheep') lootItem = 'dirt';
      if (closestMob.type === 'zombie') lootItem = 'apple';
      if (closestMob.type === 'creeper') lootItem = 'gunpowder';

      return { mob: closestMob, lootItem };
    }

    return null;
  }

  public update(
    dt: number,
    player: PlayerState,
    onPlayerDamage?: (damage: number, reason?: string) => void
  ) {
    const playerX = player.x;
    const playerY = player.y;
    const playerZ = player.z;

    // Update Mobs
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      const mesh = this.mobMeshMap.get(m.id);

      // Decrement mob attack cooldown
      m.attackCooldown = Math.max(0, (m.attackCooldown || 0) - dt);

      // Simple AI logic
      const distToPlayer = Math.hypot(playerX - m.x, playerZ - m.z);

      if (m.isHostile && distToPlayer < 12) {
        // Chase player
        const angle = Math.atan2(playerX - m.x, playerZ - m.z);
        m.yaw = angle;
        m.vx = Math.sin(angle) * 2.5;
        m.vz = Math.cos(angle) * 2.5;

        if (distToPlayer < 1.6 && m.attackCooldown <= 0) {
          m.attackCooldown = 1.2; // 1.2s cooldown between hits
          if (m.type === 'creeper') {
            // Creeper explosion!
            soundEngine.playExplosion();
            this.explodeAt(m.x, m.y, m.z, 3.5, playerX, playerY, playerZ, onPlayerDamage);
            m.health = 0; // dies on explode
            if (onPlayerDamage) {
              onPlayerDamage(8, 'You were blown up by a Creeper');
            }
          } else if (onPlayerDamage) {
            onPlayerDamage(2, `You were slain by a ${m.type === 'zombie' ? 'Zombie' : 'Hostile Mob'}`);
            soundEngine.playPlayerHurt();
          }
        }
      } else {
        // Random wander
        if (Math.random() < 0.02) {
          m.yaw += (Math.random() - 0.5) * 1.5;
        }
        if (Math.random() < 0.05) {
          m.vx = Math.sin(m.yaw) * 1.0;
          m.vz = Math.cos(m.yaw) * 1.0;
        } else {
          m.vx *= 0.9;
          m.vz *= 0.9;
        }
      }

      let targetX = m.x + m.vx * dt;
      let targetZ = m.z + m.vz * dt;

      // Check if current position or next step is in water
      const bx = Math.floor(targetX);
      const bz = Math.floor(targetZ);
      const curFeetBlock = this.world.getBlock(Math.floor(m.x), Math.floor(m.y), Math.floor(m.z));
      const curBodyBlock = this.world.getBlock(Math.floor(m.x), Math.floor(m.y + 0.5), Math.floor(m.z));
      const nextFeetBlock = this.world.getBlock(bx, Math.floor(m.y), bz);

      const inWater = curFeetBlock === BlockType.WATER || curBodyBlock === BlockType.WATER;

      // Passive animals avoid wandering into water when on land
      if (!m.isHostile && !inWater && nextFeetBlock === BlockType.WATER) {
        m.yaw += Math.PI * 0.8;
        m.vx = -m.vx * 0.5;
        m.vz = -m.vz * 0.5;
        targetX = m.x;
        targetZ = m.z;
      }

      // Water float / swimming vs normal gravity
      if (inWater) {
        // Float / paddle upward to surface
        m.vy = Math.min((m.vy || 0) + 10 * dt, 2.0);
        m.vx *= 0.85;
        m.vz *= 0.85;
      } else {
        m.vy = (m.vy || 0) - 20 * dt;
      }

      let targetY = m.y + m.vy * dt;

      // Find solid ground beneath mob
      let groundY = 0;
      for (let y = Math.min(63, Math.floor(m.y) + 2); y >= 0; y--) {
        const b = this.world.getBlock(bx, y, bz);
        if (BLOCKS[b]?.solid) {
          groundY = y + 1;
          break;
        }
      }

      if (targetY < groundY) {
        targetY = groundY;
        m.vy = 0;
      }

      // Jump over 1-block obstacles when moving on solid land
      if (!inWater && groundY > m.y + 0.5 && groundY <= m.y + 1.2 && Math.hypot(m.vx, m.vz) > 0.5) {
        m.vy = 5;
      }

      m.x = targetX;
      m.y = targetY;
      m.z = targetZ;

      // Update Mesh
      if (mesh) {
        mesh.position.set(m.x, m.y, m.z);
        mesh.rotation.y = m.yaw;

        // Animate legs
        const legSwing = Math.sin(Date.now() * 0.01) * 0.4 * (m.vx !== 0 || m.vz !== 0 ? 1 : 0);
        const leg1 = mesh.getObjectByName('leg1');
        const leg2 = mesh.getObjectByName('leg2');
        if (leg1) leg1.rotation.x = legSwing;
        if (leg2) leg2.rotation.x = -legSwing;
      }

      // Remove dead mobs
      if (m.health <= 0) {
        if (mesh) this.mobGroup.remove(mesh);
        this.mobMeshMap.delete(m.id);
        this.mobs.splice(i, 1);
      }
    }

    // Update TNT
    for (let i = this.tntList.length - 1; i >= 0; i--) {
      const tnt = this.tntList[i];
      const mesh = this.tntMeshMap.get(tnt.id);

      tnt.fuse -= dt;
      tnt.vy -= 15 * dt;

      let nextX = tnt.x + tnt.vx * dt;
      let nextY = tnt.y + tnt.vy * dt;
      let nextZ = tnt.z + tnt.vz * dt;

      // Check collision with solid blocks underneath TNT
      const bx = Math.floor(nextX);
      const byBelow = Math.floor(nextY - 0.49);
      const bz = Math.floor(nextZ);

      const blockBelow = this.world.getBlock(bx, byBelow, bz);
      if (BLOCKS[blockBelow]?.solid) {
        nextY = byBelow + 1 + 0.49;
        tnt.vy = 0;
        tnt.vx *= 0.8;
        tnt.vz *= 0.8;
      }

      tnt.x = nextX;
      tnt.y = nextY;
      tnt.z = nextZ;

      if (mesh) {
        mesh.position.set(tnt.x, tnt.y, tnt.z);

        // Flashing white animation
        const isWhite = Math.floor(tnt.fuse * 8) % 2 === 0;

        // Swell up slightly as fuse nears 0
        if (tnt.fuse < 0.6) {
          const scale = 1.0 + (0.6 - tnt.fuse) * 0.25;
          mesh.scale.set(scale, scale, scale);
        }

        // Apply white tint when flashing
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if (mat instanceof THREE.MeshBasicMaterial) {
              mat.color.setHex(isWhite ? 0xffffff : 0xcccccc);
            }
          });
        }
      }

      if (tnt.fuse <= 0) {
        soundEngine.playExplosion();
        this.explodeAt(tnt.x, tnt.y, tnt.z, 4.0, playerX, playerY, playerZ, onPlayerDamage);

        if (mesh) this.tntGroup.remove(mesh);
        this.tntMeshMap.delete(tnt.id);
        this.tntList.splice(i, 1);
      }
    }

    // Update Dropped Items
    this.updateDroppedItems(dt, player);
  }

  private updateDroppedItems(dt: number, player: PlayerState) {
    const pX = player.x;
    const pY = player.y + 0.8;
    const pZ = player.z;

    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];
      const mesh = this.itemMeshMap.get(item.id);

      item.age += dt;

      // Despawn after 5 minutes
      if (item.age > 300) {
        if (mesh) this.itemGroup.remove(mesh);
        this.itemMeshMap.delete(item.id);
        this.droppedItems.splice(i, 1);
        continue;
      }

      // Gravity
      item.vy -= 12 * dt;

      let nextX = item.x + item.vx * dt;
      let nextY = item.y + item.vy * dt;
      let nextZ = item.z + item.vz * dt;

      // Solid block collision under item
      const bx = Math.floor(nextX);
      const byBelow = Math.floor(nextY - 0.15);
      const bz = Math.floor(nextZ);

      const blockBelow = this.world.getBlock(bx, byBelow, bz);
      if (BLOCKS[blockBelow]?.solid) {
        nextY = byBelow + 1 + 0.15;
        item.vy = 0;
        item.vx *= 0.8;
        item.vz *= 0.8;
      }

      item.x = nextX;
      item.y = nextY;
      item.z = nextZ;

      const dx = pX - item.x;
      const dy = pY - item.y;
      const dz = pZ - item.z;
      const pDist = Math.hypot(dx, dy, dz);

      // Magnetize towards player within 2.5 blocks
      if (pDist < 2.5 && pDist > 0.01) {
        const pullSpeed = 7.0;
        item.vx += (dx / pDist) * pullSpeed * dt;
        item.vy += (dy / pDist) * pullSpeed * dt;
        item.vz += (dz / pDist) * pullSpeed * dt;
      }

      // Pickup item within 1.1 blocks
      if (pDist < 1.1) {
        const { remaining, updated } = this.addItemToInventory(player.inventory, item.itemId, item.count);
        if (updated) {
          soundEngine.playPickup();
        }
        if (remaining <= 0) {
          if (mesh) this.itemGroup.remove(mesh);
          this.itemMeshMap.delete(item.id);
          this.droppedItems.splice(i, 1);
          continue;
        } else {
          item.count = remaining;
        }
      }

      // Rotate and float bobbing animation
      if (mesh) {
        mesh.rotation.y += dt * 3.0;
        mesh.position.set(item.x, item.y + Math.sin(item.age * 5) * 0.08, item.z);
      }
    }
  }

  private addItemToInventory(
    inventory: (ItemStack | null)[],
    itemId: string,
    count: number
  ): { remaining: number; updated: boolean } {
    let remaining = count;
    const maxStack = ITEMS[itemId]?.maxStack || 64;
    let updated = false;

    // 1. Merge into existing stacks
    for (let i = 0; i < inventory.length && remaining > 0; i++) {
      const slot = inventory[i];
      if (slot && slot.itemId === itemId && slot.count < maxStack) {
        const room = maxStack - slot.count;
        const add = Math.min(room, remaining);
        inventory[i] = { ...slot, count: slot.count + add };
        remaining -= add;
        updated = true;
      }
    }

    // 2. Put in first empty slot
    for (let i = 0; i < inventory.length && remaining > 0; i++) {
      if (inventory[i] === null) {
        const add = Math.min(maxStack, remaining);
        inventory[i] = { itemId, count: add };
        remaining -= add;
        updated = true;
      }
    }

    return { remaining, updated };
  }

  // Explode blocks in radius with damage, chain reactions, and item drops
  public explodeAt(
    x: number,
    y: number,
    z: number,
    radius: number,
    playerX?: number,
    playerY?: number,
    playerZ?: number,
    onPlayerDamage?: (damage: number, reason?: string) => void
  ) {
    const minX = Math.floor(x - radius);
    const maxX = Math.ceil(x + radius);
    const minY = Math.floor(y - radius);
    const maxY = Math.ceil(y + radius);
    const minZ = Math.floor(z - radius);
    const maxZ = Math.ceil(z + radius);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          const distSq = (bx + 0.5 - x) ** 2 + (by + 0.5 - y) ** 2 + (bz + 0.5 - z) ** 2;
          if (distSq <= radius * radius) {
            const block = this.world.getBlock(bx, by, bz);
            if (block === BlockType.TNT) {
              // TNT Chain reaction!
              this.world.setBlock(bx, by, bz, BlockType.AIR);
              this.spawnTNT(bx, by, bz, 0.2 + Math.random() * 0.5);
            } else if (block !== BlockType.AIR && block !== BlockType.BEDROCK) {
              const blockMeta = BLOCKS[block];
              this.world.setBlock(bx, by, bz, BlockType.AIR);

              // Find item ID to drop for this exploded block
              let dropItemId = blockMeta?.dropItem;
              if (!dropItemId) {
                dropItemId = Object.keys(ITEMS).find((k) => ITEMS[k].blockId === block);
              }

              // DROP ITEM ON EXPLOSION!
              if (dropItemId) {
                const dx = bx + 0.5 - x;
                const dy = by + 0.5 - y;
                const dz = bz + 0.5 - z;
                const len = Math.hypot(dx, dy, dz) || 1;
                const speed = 2.0 + Math.random() * 4.0;

                this.spawnDroppedItem(
                  dropItemId,
                  blockMeta?.dropCount || 1,
                  bx + 0.5,
                  by + 0.5,
                  bz + 0.5,
                  (dx / len) * speed + (Math.random() - 0.5) * 1.0,
                  3.0 + Math.random() * 3.0,
                  (dz / len) * speed + (Math.random() - 0.5) * 1.0
                );
              }
            }
          }
        }
      }
    }

    // Damage Player if in radius
    if (playerX !== undefined && playerY !== undefined && playerZ !== undefined && onPlayerDamage) {
      const pDist = Math.hypot(playerX - x, playerY + 0.9 - y, playerZ - z);
      if (pDist <= radius * 1.5) {
        const damage = Math.max(1, Math.floor((1 - pDist / (radius * 1.5)) * 20));
        onPlayerDamage(damage, 'You were blown up by an explosion');
      }
    }

    // Damage Mobs in radius & drop loot if killed
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      const mDist = Math.hypot(mob.x - x, mob.y + 0.8 - y, mob.z - z);
      if (mDist <= radius * 1.5) {
        const damage = Math.max(1, Math.floor((1 - mDist / (radius * 1.5)) * 20));
        mob.health -= damage;
        mob.hurtTimer = 0.3;

        if (mob.health <= 0) {
          let lootItem: string | undefined = undefined;
          if (mob.type === 'pig') lootItem = 'porkchop';
          if (mob.type === 'cow') lootItem = 'porkchop';
          if (mob.type === 'sheep') lootItem = 'dirt';
          if (mob.type === 'zombie') lootItem = 'apple';
          if (mob.type === 'creeper') lootItem = 'gunpowder';

          if (lootItem) {
            const dx = mob.x - x;
            const dz = mob.z - z;
            const len = Math.hypot(dx, dz) || 1;
            this.spawnDroppedItem(
              lootItem,
              1 + Math.floor(Math.random() * 2),
              mob.x,
              mob.y + 0.5,
              mob.z,
              (dx / len) * 2.5,
              3.0 + Math.random() * 2.0,
              (dz / len) * 2.5
            );
          }

          const mesh = this.mobMeshMap.get(mob.id);
          if (mesh) this.mobGroup.remove(mesh);
          this.mobMeshMap.delete(mob.id);
          this.mobs.splice(i, 1);
        }
      }
    }
  }

  private createMobMesh(type: string): THREE.Group {
    const group = new THREE.Group();

    let bodyColor = 0x587a38; // pig pink / green
    if (type === 'pig') bodyColor = 0xf09090;
    if (type === 'cow') bodyColor = 0x503820;
    if (type === 'sheep') bodyColor = 0xeeeeee;
    if (type === 'zombie') bodyColor = 0x307040;
    if (type === 'creeper') bodyColor = 0x309030;

    const mat = new THREE.MeshLambertMaterial({ color: bodyColor });

    // Body box
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 1.0);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.8;
    group.add(body);

    // Head box
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 1.3, 0.4);
    group.add(head);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
    const leg1 = new THREE.Mesh(legGeo, mat);
    leg1.name = 'leg1';
    leg1.position.set(-0.25, 0.3, 0.25);

    const leg2 = new THREE.Mesh(legGeo, mat);
    leg2.name = 'leg2';
    leg2.position.set(0.25, 0.3, -0.25);

    group.add(leg1);
    group.add(leg2);

    return group;
  }
}
