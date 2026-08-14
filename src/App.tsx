import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BLOCKS, ITEMS } from './game/blockData';
import { soundEngine } from './game/audio';
import { MobManager } from './game/mobs';
import { PhysicsEngine } from './game/physics';
import { VoxelWorld } from './game/world';
import { BlockType, GameMode, ItemStack, WorldSettings } from './types/game';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { SettingsModal } from './components/SettingsModal';
import { DeathScreen } from './components/DeathScreen';
import { Play, Sparkles, Settings as SettingsIcon, Volume2, Shield, HelpCircle } from 'lucide-react';

function generateCrackTextures(): THREE.CanvasTexture[] {
  const textures: THREE.CanvasTexture[] = [];
  const size = 64;

  for (let stage = 0; stage < 10; stage++) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      if (stage > 0) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 + Math.floor(stage / 2);

        let seed = 50 + stage * 23;
        const random = () => {
          seed = (seed * 9301 + 49297) % 233280;
          return seed / 233280;
        };

        const numLines = stage * 4;
        ctx.beginPath();
        for (let i = 0; i < numLines; i++) {
          const x1 = random() * size;
          const y1 = random() * size;
          const x2 = x1 + (random() - 0.5) * (15 + stage * 4);
          const y2 = y1 + (random() - 0.5) * (15 + stage * 4);
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    textures.push(tex);
  }
  return textures;
}

function getMiningSpeed(blockType: BlockType, heldItem: ItemStack | null): number {
  const blockMeta = BLOCKS[blockType];
  if (!blockMeta) return 1.0;
  if (blockMeta.hardness <= 0) return 100.0;

  if (!heldItem) return 1.0;

  const itemId = heldItem.itemId;

  let isBestTool = false;
  if (blockMeta.bestTool === 'pickaxe' && itemId.includes('pickaxe')) isBestTool = true;
  if (blockMeta.bestTool === 'axe' && itemId.includes('axe')) isBestTool = true;
  if (blockMeta.bestTool === 'shovel' && itemId.includes('shovel')) isBestTool = true;

  if (!isBestTool) return 1.0;

  if (itemId.startsWith('wooden_')) return 2.0;
  if (itemId.startsWith('stone_')) return 4.0;
  if (itemId.startsWith('iron_')) return 6.0;
  if (itemId.startsWith('diamond_')) return 8.0;
  if (itemId.startsWith('golden_')) return 12.0;

  return 2.0;
}

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const [showInventory, setShowInventory] = useState(false);
  const [activeContainer, setActiveContainer] = useState<'inventory' | 'crafting' | 'chest' | 'furnace'>('inventory');
  const [showSettings, setShowSettings] = useState(false);
  const [showF3, setShowF3] = useState(false);
  const [fps, setFps] = useState(60);

  const [targetedBlockName, setTargetedBlockName] = useState('Air');
  const [targetedBlockPos, setTargetedBlockPos] = useState<{ x: number; y: number; z: number } | null>(null);
  const [miningProgress, setMiningProgress] = useState(0);

  const [isDead, setIsDead] = useState(false);
  const [deathReason, setDeathReason] = useState('You ran out of health');

  const handleRespawn = () => {
    if (physicsRef.current) {
      physicsRef.current.player.health = physicsRef.current.player.maxHealth;
      physicsRef.current.player.hunger = physicsRef.current.player.maxHunger;
      physicsRef.current.player.oxygen = 20;
      physicsRef.current.resetPlayerToSpawn();
    }
    setIsDead(false);
    setTimeout(() => {
      canvasRef.current?.requestPointerLock();
    }, 100);
  };

  const handleTitleScreen = () => {
    setIsDead(false);
    setShowInventory(false);
    setShowSettings(false);
    setGameState('menu');
  };

  const [settings, setSettings] = useState<WorldSettings>({
    seed: 12345,
    renderDistance: 3,
    timeOfDay: 6000, // noon
    dayCycleSpeed: 10,
    difficulty: 'normal',
    soundVolume: 0.8,
    musicVolume: 0.5,
    fov: 75,
    sensitivity: 1.0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<VoxelWorld | null>(null);
  const physicsRef = useRef<PhysicsEngine | null>(null);
  const mobManagerRef = useRef<MobManager | null>(null);

  const keysRef = useRef<Record<string, boolean>>({});
  const isPointerLockedRef = useRef(false);

  const isLeftMouseDownRef = useRef(false);
  const showInventoryRef = useRef(showInventory);
  useEffect(() => { showInventoryRef.current = showInventory; }, [showInventory]);

  const showSettingsRef = useRef(showSettings);
  useEffect(() => { showSettingsRef.current = showSettings; }, [showSettings]);

  const isDeadRef = useRef(isDead);
  useEffect(() => { isDeadRef.current = isDead; }, [isDead]);
  const creativeCooldownRef = useRef(0);
  const lastSoundTimeRef = useRef(0);
  const miningProgressRef = useRef<number>(0);
  const miningTargetRef = useRef<{ x: number; y: number; z: number; key: string } | null>(null);

  const lastTargetPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const lastTargetNameRef = useRef<string>('Air');
  const lastMiningProgressRef = useRef<number>(0);

  const updateMiningProgress = (val: number) => {
    const rounded = Math.round(val * 50) / 50;
    if (Math.abs(lastMiningProgressRef.current - rounded) >= 0.02 || (val === 0 && lastMiningProgressRef.current !== 0)) {
      lastMiningProgressRef.current = rounded;
      setMiningProgress(rounded);
    }
  };

  // Initialize and run Three.js game engine
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    // Three.js Scene, Camera, Renderer
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec0ee); // Sky blue
    scene.fog = new THREE.FogExp2(0x7ec0ee, 0.015);

    const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Window resize handler for stable responsive aspect ratio
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // World & Physics Setup
    const world = new VoxelWorld(settings.seed);
    worldRef.current = world;
    scene.add(world.worldGroup);

    const physics = new PhysicsEngine(world);
    physicsRef.current = physics;
    physics.resetPlayerToSpawn();

    // Starting items for survival mode
    physics.player.inventory[0] = { itemId: 'wooden_pickaxe', count: 1 };
    physics.player.inventory[1] = { itemId: 'wooden_axe', count: 1 };
    physics.player.inventory[2] = { itemId: 'dirt', count: 64 };
    physics.player.inventory[3] = { itemId: 'torch', count: 16 };
    physics.player.inventory[4] = { itemId: 'apple', count: 10 };

    // Mobs Setup
    const mobManager = new MobManager(world);
    mobManagerRef.current = mobManager;
    scene.add(mobManager.mobGroup);
    scene.add(mobManager.tntGroup);
    scene.add(mobManager.itemGroup);

    mobManager.spawnInitialMobs(physics.player.x, physics.player.y, physics.player.z);

    // Targeted Block Highlight wireframe box with polygon offset to prevent z-fighting
    const boxGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, polygonOffset: true, polygonOffsetFactor: -1 });
    const targetOutline = new THREE.Mesh(boxGeo, boxMat);
    targetOutline.visible = false;
    scene.add(targetOutline);

    // 3D Block Breaking Crack Overlay Box
    const crackTextures = generateCrackTextures();
    const crackGeo = new THREE.BoxGeometry(1.008, 1.008, 1.008);
    const crackMat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const crackMesh = new THREE.Mesh(crackGeo, crackMat);
    crackMesh.visible = false;
    scene.add(crackMesh);

    // Start Ambient Music
    soundEngine.setVolumes(settings.soundVolume, settings.musicVolume);
    soundEngine.startAmbientMusic();

    // Event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      if (physics.player.health <= 0) return;

      // Hotbar key shortcuts 1-9
      if (e.code.startsWith('Digit') && e.code !== 'Digit0') {
        const idx = parseInt(e.code.replace('Digit', '')) - 1;
        physics.player.selectedHotbarIndex = idx;
      }

      if (e.code === 'KeyE') {
        setShowInventory((prev) => !prev);
        if (document.pointerLockElement) document.exitPointerLock();
      }

      if (e.code === 'KeyF3') {
        setShowF3((prev) => !prev);
      }

      if (e.code === 'Escape') {
        setShowSettings((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLockedRef.current) return;
      // Suppress extreme movement spikes when regaining pointer lock or alt-tabbing
      if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;

      const sensitivity = 0.002 * settings.sensitivity;
      physics.player.yaw -= e.movementX * sensitivity;
      physics.player.pitch -= e.movementY * sensitivity;

      // Clamp pitch -89 to +89 degrees
      physics.player.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, physics.player.pitch));
    };

    const handlePointerLockChange = () => {
      isPointerLockedRef.current = document.pointerLockElement === canvas;
      if (!isPointerLockedRef.current) {
        isLeftMouseDownRef.current = false;
        miningProgressRef.current = 0;
        miningTargetRef.current = null;
        setMiningProgress(0);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isLeftMouseDownRef.current = false;
        miningProgressRef.current = 0;
        miningTargetRef.current = null;
        setMiningProgress(0);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isPointerLockedRef.current) {
        if (showInventoryRef.current || showSettingsRef.current || isDeadRef.current) return;
        canvas.requestPointerLock();
        return;
      }

      const pPos = new THREE.Vector3(physics.player.x, physics.player.y + 1.62, physics.player.z);
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);

      const ray = physics.raycast(pPos, cameraDir, 6);

      if (e.button === 0) {
        // Left click: Mine / Hit
        isLeftMouseDownRef.current = true;
        physics.player.heldItemSwing = 1.0;

        // Check if hitting a mob first
        const mobHit = mobManager.hitMob(pPos, cameraDir, 5);
        if (mobHit) {
          soundEngine.playBlockBreak('dirt');
          mobHit.mob.health -= 5;
          if (mobHit.mob.health <= 0 && mobHit.lootItem) {
            mobManager.spawnDroppedItem(
              mobHit.lootItem,
              1 + Math.floor(Math.random() * 2),
              mobHit.mob.x,
              mobHit.mob.y + 0.5,
              mobHit.mob.z
            );
          }
          return;
        }

        if (ray.hit) {
          const blockType = world.getBlock(ray.blockX, ray.blockY, ray.blockZ);
          if (blockType !== BlockType.AIR && blockType !== BlockType.BEDROCK) {
            const heldSlot = physics.player.inventory[physics.player.selectedHotbarIndex];
            const isFlintAndSteel = heldSlot?.itemId === 'flint_and_steel';

            // Left click TNT with Flint and Steel ignites it
            if (blockType === BlockType.TNT && isFlintAndSteel) {
              world.setBlock(ray.blockX, ray.blockY, ray.blockZ, BlockType.AIR);
              mobManager.spawnTNT(ray.blockX, ray.blockY, ray.blockZ);
              return;
            }

            // In Creative Mode, instantly break block on click
            if (physics.player.mode === 'creative') {
              soundEngine.playBlockBreak('dirt');
              world.setBlock(ray.blockX, ray.blockY, ray.blockZ, BlockType.AIR);
            }
          }
        }
      } else if (e.button === 2) {
        // Right click: Interact / Ignite TNT / Place Block / Eat Food
        physics.player.heldItemSwing = 1.0;

        if (ray.hit) {
          const hitBlock = world.getBlock(ray.blockX, ray.blockY, ray.blockZ);
          // Right clicking TNT block ignites it!
          if (hitBlock === BlockType.TNT) {
            world.setBlock(ray.blockX, ray.blockY, ray.blockZ, BlockType.AIR);
            mobManager.spawnTNT(ray.blockX, ray.blockY, ray.blockZ);
            return;
          }

          // Container interaction
          if (hitBlock === BlockType.CRAFTING_TABLE) {
            setActiveContainer('crafting');
            setShowInventory(true);
            if (document.pointerLockElement) document.exitPointerLock();
            return;
          }
          if (hitBlock === BlockType.FURNACE) {
            setActiveContainer('furnace');
            setShowInventory(true);
            if (document.pointerLockElement) document.exitPointerLock();
            return;
          }
          if (hitBlock === BlockType.CHEST) {
            setActiveContainer('chest');
            setShowInventory(true);
            if (document.pointerLockElement) document.exitPointerLock();
            return;
          }
        }

        const heldSlot = physics.player.inventory[physics.player.selectedHotbarIndex];
        if (heldSlot) {
          const itemMeta = ITEMS[heldSlot.itemId];
          if (itemMeta?.foodValue && physics.player.hunger < 20) {
            // Eat food
            physics.player.hunger = Math.min(20, physics.player.hunger + itemMeta.foodValue);
            heldSlot.count -= 1;
            if (heldSlot.count <= 0) physics.player.inventory[physics.player.selectedHotbarIndex] = null;
            soundEngine.playEat();
            return;
          }

          if (itemMeta?.blockId && ray.hit) {
            // Check player AABB overlap before placing block
            const p = physics.player;
            const pxMin = p.x - 0.3, pxMax = p.x + 0.3;
            const pyMin = p.y, pyMax = p.y + 1.8;
            const pzMin = p.z - 0.3, pzMax = p.z + 0.3;

            const bxMin = ray.placeX, bxMax = ray.placeX + 1;
            const byMin = ray.placeY, byMax = ray.placeY + 1;
            const bzMin = ray.placeZ, bzMax = ray.placeZ + 1;

            const intersectsPlayer =
              pxMin < bxMax && pxMax > bxMin &&
              pyMin < byMax && pyMax > byMin &&
              pzMin < bzMax && pzMax > bzMin;

            if (!intersectsPlayer) {
              soundEngine.playBlockPlace();
              world.setBlock(ray.placeX, ray.placeY, ray.placeZ, itemMeta.blockId);

              if (physics.player.mode === 'survival') {
                heldSlot.count -= 1;
                if (heldSlot.count <= 0) physics.player.inventory[physics.player.selectedHotbarIndex] = null;
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Game Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();
    let animId: number;

    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      frameCount++;
      if (now - fpsTimer >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        fpsTimer = now;
      }

      // Sync FOV setting smoothly
      if (camera.fov !== settings.fov) {
        camera.fov = settings.fov;
        camera.updateProjectionMatrix();
      }

      // Swing animation damping
      if (physics.player.heldItemSwing > 0) {
        physics.player.heldItemSwing = Math.max(0, physics.player.heldItemSwing - dt * 5);
      }

      // Check death state
      if (physics.player.health <= 0 && !isDead) {
        soundEngine.playPlayerDeath();
        setDeathReason('You ran out of health');
        setIsDead(true);
        if (document.pointerLockElement) document.exitPointerLock();
      }

      const handleHurt = (dmg: number, reason?: string) => {
        soundEngine.playPlayerHurt();
        if (physics.player.health <= 0) {
          soundEngine.playPlayerDeath();
          setDeathReason(reason || 'You ran out of health');
          setIsDead(true);
          if (document.pointerLockElement) document.exitPointerLock();
        }
      };

      // Update Physics & World Chunks
      if (isPointerLockedRef.current && !showInventory && !showSettings && !isDead) {
        physics.update(dt, keysRef.current, handleHurt);
        mobManager.update(dt, physics.player, (dmg, reason) => {
          physics.player.health = Math.max(0, physics.player.health - dmg);
          handleHurt(dmg, reason);
        });
        world.updateChunks(physics.player.x, physics.player.z, settings.renderDistance);

        // Continuous Mining Logic while holding Left Click
        if (isLeftMouseDownRef.current) {
          const pPos = new THREE.Vector3(physics.player.x, physics.player.y + 1.62, physics.player.z);
          const cameraDir = new THREE.Vector3();
          camera.getWorldDirection(cameraDir);

          const ray = physics.raycast(pPos, cameraDir, 6);
          if (ray.hit) {
            const blockType = world.getBlock(ray.blockX, ray.blockY, ray.blockZ);
            if (blockType !== BlockType.AIR && blockType !== BlockType.BEDROCK) {
              const targetKey = `${ray.blockX},${ray.blockY},${ray.blockZ}`;

              if (!miningTargetRef.current || miningTargetRef.current.key !== targetKey) {
                miningTargetRef.current = { x: ray.blockX, y: ray.blockY, z: ray.blockZ, key: targetKey };
                miningProgressRef.current = 0;
                lastSoundTimeRef.current = 0;
              }

              const blockMeta = BLOCKS[blockType];
              const hardness = blockMeta?.hardness ?? 1.0;

              if (hardness <= 0 || physics.player.mode === 'creative') {
                if (creativeCooldownRef.current <= 0) {
                  creativeCooldownRef.current = 0.2;
                  soundEngine.playBlockBreak('dirt');
                  world.setBlock(ray.blockX, ray.blockY, ray.blockZ, BlockType.AIR);
                  if (blockMeta?.dropItem && physics.player.mode === 'survival') {
                    const newInv = [...physics.player.inventory];
                    const existingIdx = newInv.findIndex((s) => s && s.itemId === blockMeta.dropItem);
                    if (existingIdx !== -1 && newInv[existingIdx]!) {
                      newInv[existingIdx]!.count += blockMeta.dropCount || 1;
                    } else {
                      const emptyIdx = newInv.findIndex((s) => s === null);
                      if (emptyIdx !== -1) {
                        newInv[emptyIdx] = { itemId: blockMeta.dropItem, count: blockMeta.dropCount || 1 };
                      }
                    }
                    physics.player.inventory = newInv;
                    soundEngine.playPickup();
                  }
                  miningProgressRef.current = 0;
                  miningTargetRef.current = null;
                  updateMiningProgress(0);
                }
              } else {
                const heldSlot = physics.player.inventory[physics.player.selectedHotbarIndex];
                const speed = getMiningSpeed(blockType, heldSlot);
                const totalBreakTime = Math.max(0.1, hardness / speed);

                miningProgressRef.current += dt / totalBreakTime;
                physics.player.heldItemSwing = Math.min(1.0, physics.player.heldItemSwing + dt * 4);

                if (now - lastSoundTimeRef.current > 250) {
                  soundEngine.playBlockBreak('dirt');
                  lastSoundTimeRef.current = now;
                }

                updateMiningProgress(miningProgressRef.current);

                if (miningProgressRef.current >= 1.0) {
                  soundEngine.playBlockBreak('dirt');
                  world.setBlock(ray.blockX, ray.blockY, ray.blockZ, BlockType.AIR);

                  if (blockMeta?.dropItem) {
                    const newInv = [...physics.player.inventory];
                    const existingIdx = newInv.findIndex((s) => s && s.itemId === blockMeta.dropItem);
                    if (existingIdx !== -1 && newInv[existingIdx]!) {
                      newInv[existingIdx]!.count += blockMeta.dropCount || 1;
                    } else {
                      const emptyIdx = newInv.findIndex((s) => s === null);
                      if (emptyIdx !== -1) {
                        newInv[emptyIdx] = { itemId: blockMeta.dropItem, count: blockMeta.dropCount || 1 };
                      }
                    }
                    physics.player.inventory = newInv;
                    soundEngine.playPickup();
                  }

                  miningProgressRef.current = 0;
                  miningTargetRef.current = null;
                  updateMiningProgress(0);
                }
              }
            } else {
              miningProgressRef.current = 0;
              miningTargetRef.current = null;
              updateMiningProgress(0);
            }
          } else {
            miningProgressRef.current = 0;
            miningTargetRef.current = null;
            updateMiningProgress(0);
          }
        } else if (miningProgressRef.current > 0) {
          miningProgressRef.current = 0;
          miningTargetRef.current = null;
          updateMiningProgress(0);
        }

        if (creativeCooldownRef.current > 0) {
          creativeCooldownRef.current -= dt;
        }

        // Update 3D Block Break Crack Overlay
        if (miningTargetRef.current && miningProgressRef.current > 0) {
          const target = miningTargetRef.current;
          crackMesh.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
          const stage = Math.min(9, Math.floor(miningProgressRef.current * 10));
          crackMat.map = crackTextures[stage];
          crackMat.needsUpdate = true;
          crackMesh.visible = true;
        } else {
          crackMesh.visible = false;
        }
      }

      // Camera position & YXZ rotation for stable FPS vision without roll
      camera.position.set(physics.player.x, physics.player.y + 1.62, physics.player.z);
      camera.rotation.set(physics.player.pitch, physics.player.yaw, 0, 'YXZ');

      // Track directional shadow light near player
      sunLight.position.set(physics.player.x + 40, physics.player.y + 80, physics.player.z + 40);
      sunLight.target.position.set(physics.player.x, physics.player.y, physics.player.z);
      sunLight.target.updateMatrixWorld();

      // Underwater vision fog adjustment
      const camX = Math.floor(camera.position.x);
      const camY = Math.floor(camera.position.y);
      const camZ = Math.floor(camera.position.z);
      const cameraBlock = world.getBlock(camX, camY, camZ);

      if (cameraBlock === BlockType.WATER) {
        scene.background = new THREE.Color(0x0e3b5e);
        if (scene.fog) {
          scene.fog.color.setHex(0x0e3b5e);
          (scene.fog as THREE.FogExp2).density = 0.07;
        }
      } else {
        scene.background = new THREE.Color(0x7ec0ee);
        if (scene.fog) {
          scene.fog.color.setHex(0x7ec0ee);
          (scene.fog as THREE.FogExp2).density = 0.015;
        }
      }

      // Raycast for targeted block outline
      const pPos = camera.position.clone();
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);

      const ray = physics.raycast(pPos, cameraDir, 6);
      if (ray.hit) {
        targetOutline.position.set(ray.blockX + 0.5, ray.blockY + 0.5, ray.blockZ + 0.5);
        targetOutline.visible = true;

        const blockType = world.getBlock(ray.blockX, ray.blockY, ray.blockZ);
        const name = BLOCKS[blockType]?.name || 'Unknown Block';

        if (lastTargetNameRef.current !== name) {
          lastTargetNameRef.current = name;
          setTargetedBlockName(name);
        }

        const prevPos = lastTargetPosRef.current;
        if (!prevPos || prevPos.x !== ray.blockX || prevPos.y !== ray.blockY || prevPos.z !== ray.blockZ) {
          const newPos = { x: ray.blockX, y: ray.blockY, z: ray.blockZ };
          lastTargetPosRef.current = newPos;
          setTargetedBlockPos(newPos);
        }
      } else {
        targetOutline.visible = false;
        if (lastTargetNameRef.current !== 'Air') {
          lastTargetNameRef.current = 'Air';
          setTargetedBlockName('Air');
        }
        if (lastTargetPosRef.current !== null) {
          lastTargetPosRef.current = null;
          setTargetedBlockPos(null);
        }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      soundEngine.stopAmbientMusic();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      renderer.dispose();
    };
  }, [gameState, settings]);

  // Execute console / chat commands
  const handleExecuteCommand = (cmdStr: string) => {
    if (!physicsRef.current) return;
    const parts = cmdStr.trim().split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === '/gamemode') {
      const mode = parts[1]?.toLowerCase();
      if (mode === 'creative' || mode === 'c') {
        physicsRef.current.player.mode = 'creative';
        physicsRef.current.player.isFlying = true;
      } else if (mode === 'survival' || mode === 's') {
        physicsRef.current.player.mode = 'survival';
        physicsRef.current.player.isFlying = false;
      }
    } else if (cmd === '/give') {
      const itemId = parts[1];
      const count = parseInt(parts[2] || '64');
      if (ITEMS[itemId]) {
        const newInv = [...physicsRef.current.player.inventory];
        const emptyIdx = newInv.findIndex((s) => s === null);
        if (emptyIdx !== -1) {
          newInv[emptyIdx] = { itemId, count };
          physicsRef.current.player.inventory = newInv;
        }
      }
    } else if (cmd === '/tp') {
      const x = parseFloat(parts[1] || '0');
      const y = parseFloat(parts[2] || '40');
      const z = parseFloat(parts[3] || '0');
      physicsRef.current.player.x = x;
      physicsRef.current.player.y = y;
      physicsRef.current.player.z = z;
    } else if (cmd === '/clear') {
      physicsRef.current.player.inventory = Array(36).fill(null);
    }
  };

  // World Save & Load in LocalStorage
  const handleSaveWorld = (slot: number) => {
    if (!worldRef.current || !physicsRef.current) return;
    const data = {
      player: physicsRef.current.player,
      modifiedBlocks: Array.from(worldRef.current.modifiedBlocks.entries()),
      seed: settings.seed,
    };
    localStorage.setItem(`mc_world_slot_${slot}`, JSON.stringify(data));
    alert(`World saved to Slot ${slot}!`);
  };

  const handleLoadWorld = (slot: number) => {
    const raw = localStorage.getItem(`mc_world_slot_${slot}`);
    if (!raw) {
      alert(`No saved world found in Slot ${slot}`);
      return;
    }
    const data = JSON.parse(raw);
    if (worldRef.current && physicsRef.current) {
      physicsRef.current.player = data.player;
      worldRef.current.modifiedBlocks = new Map(data.modifiedBlocks);
      alert(`World loaded from Slot ${slot}!`);
    }
  };

  const handleExportWorld = () => {
    if (!worldRef.current || !physicsRef.current) return;
    const data = {
      player: physicsRef.current.player,
      modifiedBlocks: Array.from(worldRef.current.modifiedBlocks.entries()),
      seed: settings.seed,
    };
    const jsonStr = JSON.stringify(data);
    navigator.clipboard.writeText(jsonStr);
    alert('World save JSON copied to clipboard!');
  };

  const handleImportWorld = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (worldRef.current && physicsRef.current) {
        physicsRef.current.player = data.player;
        worldRef.current.modifiedBlocks = new Map(data.modifiedBlocks);
        alert('World successfully imported!');
      }
    } catch {
      alert('Invalid world JSON format!');
    }
  };

  const handleResetWorld = () => {
    if (worldRef.current && physicsRef.current) {
      worldRef.current.modifiedBlocks.clear();
      physicsRef.current.player.x = 8.5;
      physicsRef.current.player.y = 35.0;
      physicsRef.current.player.z = 8.5;
      alert('World reset to original generation!');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-900 select-none">
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-800 via-stone-900 to-black flex flex-col items-center justify-center p-6 text-stone-100">
          {/* Title Header */}
          <div className="flex flex-col items-center gap-2 mb-8 relative">
            <h1 className="text-6xl sm:text-7xl font-extrabold font-mono tracking-wider text-amber-400 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] border-b-4 border-amber-600 pb-2">
              MINECRAFT
            </h1>
            <span className="text-xl font-bold text-yellow-300 transform -rotate-12 absolute -top-4 -right-12 animate-pulse bg-yellow-900/80 px-2 py-0.5 rounded border border-yellow-400">
              Also in 3D WebGL!
            </span>
            <p className="text-stone-300 font-mono text-sm">Browser Voxel Sandbox Edition</p>
          </div>

          {/* Main Action Buttons */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => setGameState('playing')}
              className="bg-stone-700 hover:bg-stone-600 text-stone-100 font-bold py-3 px-6 rounded-md border-2 border-stone-500 hover:border-amber-400 shadow-lg flex items-center justify-center gap-2 text-lg transition transform hover:scale-102"
            >
              <Play className="w-5 h-5 fill-amber-400 text-amber-500" /> Play Game
            </button>

            <button
              onClick={() => {
                setSettings((prev) => ({
                  ...prev,
                  difficulty: prev.difficulty === 'peaceful' ? 'normal' : 'peaceful',
                }));
              }}
              className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold py-2.5 px-4 rounded-md border border-stone-600 flex items-center justify-between text-sm"
            >
              <span>Difficulty</span>
              <span className="text-amber-400 uppercase font-mono">{settings.difficulty}</span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold py-2.5 px-4 rounded-md border border-stone-600 flex items-center justify-center gap-2 text-sm"
            >
              <SettingsIcon className="w-4 h-4" /> Options & World Saves
            </button>
          </div>

          {/* Footer controls guide */}
          <div className="absolute bottom-6 text-stone-400 text-xs font-mono flex gap-6">
            <span>WASD: Move</span>
            <span>SPACE: Jump/Fly</span>
            <span>LEFT CLICK: Mine</span>
            <span>RIGHT CLICK: Place</span>
            <span>KEY E: Inventory</span>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* HUD & Overlays */}
      {gameState === 'playing' && physicsRef.current && (
        <HUD
          player={physicsRef.current.player}
          fps={fps}
          targetedBlockName={targetedBlockName}
          targetedBlockPos={targetedBlockPos}
          showF3={showF3}
          onExecuteCommand={handleExecuteCommand}
          onSelectHotbar={(idx) => {
            if (physicsRef.current) physicsRef.current.player.selectedHotbarIndex = idx;
          }}
        />
      )}

      {/* Inventory & Crafting Modal */}
      {physicsRef.current && (
        <InventoryModal
          player={physicsRef.current.player}
          isOpen={showInventory}
          activeContainer={activeContainer}
          onClose={() => setShowInventory(false)}
          onUpdateInventory={(newInv) => {
            if (physicsRef.current) physicsRef.current.player.inventory = newInv;
          }}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onUpdateSettings={setSettings}
        onSaveWorld={handleSaveWorld}
        onLoadWorld={handleLoadWorld}
        onExportWorld={handleExportWorld}
        onImportWorld={handleImportWorld}
        onResetWorld={handleResetWorld}
      />

      {/* Death Screen */}
      {isDead && (
        <DeathScreen
          deathReason={deathReason}
          onRespawn={handleRespawn}
          onTitleScreen={handleTitleScreen}
        />
      )}
    </div>
  );
}
