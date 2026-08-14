import * as THREE from 'three';
import { BlockType } from '../types/game';

// Helper to generate noise-based pixel textures
function createPixelTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Helper to fill grid with pixel variation
function fillNoiseGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseColor: [number, number, number],
  variation: number = 20
) {
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const v = (Math.random() - 0.5) * variation;
      const r = Math.min(255, Math.max(0, Math.round(baseColor[0] + v)));
      const g = Math.min(255, Math.max(0, Math.round(baseColor[1] + v)));
      const b = Math.min(255, Math.max(0, Math.round(baseColor[2] + v)));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// Generate textures for each face of blocks
const textureCache: Record<string, THREE.CanvasTexture> = {};

export function getBlockTexture(blockType: BlockType, face: 'top' | 'bottom' | 'side' = 'side'): THREE.CanvasTexture {
  const key = `${blockType}_${face}`;
  if (textureCache[key]) return textureCache[key];

  let tex: THREE.CanvasTexture;

  switch (blockType) {
    case BlockType.GRASS:
      if (face === 'top') {
        tex = createPixelTexture(16, 16, (ctx) => {
          fillNoiseGrid(ctx, 16, 16, [85, 150, 45], 25);
        });
      } else if (face === 'bottom') {
        tex = createPixelTexture(16, 16, (ctx) => {
          fillNoiseGrid(ctx, 16, 16, [130, 95, 60], 20);
        });
      } else {
        // Side: Dirt with grass top trim
        tex = createPixelTexture(16, 16, (ctx) => {
          fillNoiseGrid(ctx, 16, 16, [130, 95, 60], 20);
          // Grass top band with drippy pixels
          for (let x = 0; x < 16; x++) {
            const depth = 2 + Math.floor(Math.sin(x * 1.5) * 1.2 + Math.random() * 0.8);
            for (let y = 0; y < depth; y++) {
              const v = (Math.random() - 0.5) * 20;
              const r = Math.min(255, Math.max(0, Math.round(85 + v)));
              const g = Math.min(255, Math.max(0, Math.round(150 + v)));
              const b = Math.min(255, Math.max(0, Math.round(45 + v)));
              ctx.fillStyle = `rgb(${r},${g},${b})`;
              ctx.fillRect(x, y, 1, 1);
            }
          }
        });
      }
      break;

    case BlockType.DIRT:
      tex = createPixelTexture(16, 16, (ctx) => fillNoiseGrid(ctx, 16, 16, [130, 95, 60], 25));
      break;

    case BlockType.STONE:
      tex = createPixelTexture(16, 16, (ctx) => fillNoiseGrid(ctx, 16, 16, [125, 125, 125], 30));
      break;

    case BlockType.COBBLESTONE:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [100, 100, 100], 25);
        // Add cobble cracks
        ctx.fillStyle = '#444444';
        for (let i = 0; i < 8; i++) {
          const x = Math.floor(Math.random() * 15);
          const y = Math.floor(Math.random() * 15);
          ctx.fillRect(x, y, 2, 1);
        }
      });
      break;

    case BlockType.BEDROCK:
      tex = createPixelTexture(16, 16, (ctx) => fillNoiseGrid(ctx, 16, 16, [40, 40, 40], 40));
      break;

    case BlockType.OAK_LOG:
      if (face === 'top' || face === 'bottom') {
        tex = createPixelTexture(16, 16, (ctx) => {
          fillNoiseGrid(ctx, 16, 16, [180, 140, 90], 15);
          // Tree rings
          ctx.strokeStyle = '#6b4d2a';
          ctx.lineWidth = 1;
          ctx.strokeRect(2.5, 2.5, 11, 11);
          ctx.strokeRect(5.5, 5.5, 5, 5);
        });
      } else {
        tex = createPixelTexture(16, 16, (ctx) => {
          fillNoiseGrid(ctx, 16, 16, [105, 80, 50], 15);
          // Vertical bark lines
          ctx.fillStyle = '#4a3520';
          for (let x = 0; x < 16; x += 4) {
            ctx.fillRect(x, 0, 1, 16);
          }
        });
      }
      break;

    case BlockType.OAK_LEAVES:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [50, 115, 35], 40);
        // Translucent leaf gaps
        ctx.fillStyle = '#225515';
        for (let i = 0; i < 15; i++) {
          ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
        }
      });
      break;

    case BlockType.OAK_PLANKS:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [160, 120, 75], 15);
        // Horizontal plank lines
        ctx.fillStyle = '#6e4f2e';
        ctx.fillRect(0, 3, 16, 1);
        ctx.fillRect(0, 7, 16, 1);
        ctx.fillRect(0, 11, 16, 1);
        ctx.fillRect(0, 15, 16, 1);
      });
      break;

    case BlockType.SAND:
      tex = createPixelTexture(16, 16, (ctx) => fillNoiseGrid(ctx, 16, 16, [215, 200, 145], 15));
      break;

    case BlockType.CACTUS:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [80, 125, 50], 20);
        ctx.fillStyle = '#2a4d15';
        for (let y = 0; y < 16; y += 4) {
          ctx.fillRect(2, y, 1, 2);
          ctx.fillRect(8, y + 2, 1, 2);
          ctx.fillRect(13, y, 1, 2);
        }
      });
      break;

    case BlockType.SNOW:
      tex = createPixelTexture(16, 16, (ctx) => fillNoiseGrid(ctx, 16, 16, [240, 245, 250], 10));
      break;

    case BlockType.WATER:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [50, 100, 210], 20);
      });
      break;

    case BlockType.GLASS:
      tex = createPixelTexture(16, 16, (ctx) => {
        ctx.fillStyle = 'rgba(200, 230, 255, 0.2)';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 16, 1);
        ctx.fillRect(0, 0, 1, 16);
        ctx.fillRect(15, 0, 1, 16);
        ctx.fillRect(0, 15, 16, 1);
        // Reflection streaks
        ctx.fillRect(3, 3, 2, 2);
        ctx.fillRect(10, 10, 3, 3);
      });
      break;

    case BlockType.COAL_ORE:
    case BlockType.IRON_ORE:
    case BlockType.GOLD_ORE:
    case BlockType.DIAMOND_ORE:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [125, 125, 125], 30);
        let spotColor = '#222222';
        if (blockType === BlockType.IRON_ORE) spotColor = '#d4a385';
        if (blockType === BlockType.GOLD_ORE) spotColor = '#f5cc38';
        if (blockType === BlockType.DIAMOND_ORE) spotColor = '#3cf0e0';

        ctx.fillStyle = spotColor;
        // Ore spots
        ctx.fillRect(2, 3, 3, 2);
        ctx.fillRect(10, 2, 2, 3);
        ctx.fillRect(6, 8, 3, 3);
        ctx.fillRect(12, 11, 2, 2);
        ctx.fillRect(3, 12, 3, 2);
      });
      break;

    case BlockType.BRICK:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [150, 70, 55], 20);
        ctx.fillStyle = '#c8b4a0';
        // Mortar lines
        ctx.fillRect(0, 3, 16, 1);
        ctx.fillRect(0, 7, 16, 1);
        ctx.fillRect(0, 11, 16, 1);
        ctx.fillRect(0, 15, 16, 1);
        ctx.fillRect(7, 0, 1, 4);
        ctx.fillRect(15, 0, 1, 4);
        ctx.fillRect(3, 4, 1, 4);
        ctx.fillRect(11, 4, 1, 4);
        ctx.fillRect(7, 8, 1, 4);
        ctx.fillRect(15, 8, 1, 4);
        ctx.fillRect(3, 12, 1, 4);
      });
      break;

    case BlockType.CRAFTING_TABLE:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [160, 120, 75], 15);
        if (face === 'top') {
          ctx.fillStyle = '#4a3219';
          ctx.strokeRect(1, 1, 14, 14);
          ctx.fillRect(3, 3, 4, 4);
          ctx.fillRect(9, 3, 4, 4);
          ctx.fillRect(3, 9, 4, 4);
          ctx.fillRect(9, 9, 4, 4);
        } else {
          ctx.fillStyle = '#4a3219';
          ctx.fillRect(2, 2, 12, 12);
          ctx.fillStyle = '#8f683a';
          ctx.fillRect(3, 3, 10, 10);
        }
      });
      break;

    case BlockType.FURNACE:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [100, 100, 100], 20);
        if (face === 'side') {
          // Front face opening
          ctx.fillStyle = '#222222';
          ctx.fillRect(3, 3, 10, 10);
          ctx.fillStyle = '#ff6600';
          ctx.fillRect(5, 7, 6, 4);
        }
      });
      break;

    case BlockType.CHEST:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [150, 100, 50], 15);
        ctx.fillStyle = '#3a250e';
        ctx.strokeRect(0, 0, 16, 16);
        if (face === 'side') {
          // Chest latch
          ctx.fillStyle = '#cccccc';
          ctx.fillRect(7, 6, 2, 3);
        }
      });
      break;

    case BlockType.TNT:
      tex = createPixelTexture(16, 16, (ctx) => {
        fillNoiseGrid(ctx, 16, 16, [200, 40, 40], 20);
        if (face === 'top' || face === 'bottom') {
          ctx.fillStyle = '#cccccc';
          ctx.fillRect(4, 4, 8, 8);
          ctx.fillStyle = '#111111';
          ctx.fillRect(7, 7, 2, 2);
        } else {
          // White band with TNT text
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 5, 16, 6);
          ctx.fillStyle = '#111111';
          ctx.font = 'bold 5px sans-serif';
          ctx.fillText('TNT', 2, 10);
        }
      });
      break;

    default:
      tex = createPixelTexture(16, 16, (ctx) => fillNoiseGrid(ctx, 16, 16, [200, 0, 200], 10));
      break;
  }

  textureCache[key] = tex;
  return tex;
}

// Generate cached Materials for Three.js
const materialCache: Record<string, THREE.Material[]> = {};

export function getBlockMaterials(blockType: BlockType): THREE.Material[] {
  if (materialCache[blockType]) return materialCache[blockType];

  const top = getBlockTexture(blockType, 'top');
  const bottom = getBlockTexture(blockType, 'bottom');
  const side = getBlockTexture(blockType, 'side');

  const isTransparent = blockType === BlockType.GLASS || blockType === BlockType.OAK_LEAVES || blockType === BlockType.WATER || blockType === BlockType.TORCH || blockType === BlockType.TALL_GRASS || blockType === BlockType.FLOWER_RED || blockType === BlockType.FLOWER_YELLOW;

  const matSide = new THREE.MeshLambertMaterial({
    map: side,
    transparent: isTransparent,
    opacity: blockType === BlockType.WATER ? 0.75 : 1.0,
    alphaTest: (blockType === BlockType.GLASS || blockType === BlockType.OAK_LEAVES) ? 0.1 : 0,
    depthWrite: blockType !== BlockType.WATER,
  });
  const matTop = new THREE.MeshLambertMaterial({
    map: top,
    transparent: isTransparent,
    opacity: blockType === BlockType.WATER ? 0.75 : 1.0,
    alphaTest: (blockType === BlockType.GLASS || blockType === BlockType.OAK_LEAVES) ? 0.1 : 0,
    depthWrite: blockType !== BlockType.WATER,
  });
  const matBottom = new THREE.MeshLambertMaterial({
    map: bottom,
    transparent: isTransparent,
    opacity: blockType === BlockType.WATER ? 0.75 : 1.0,
    alphaTest: (blockType === BlockType.GLASS || blockType === BlockType.OAK_LEAVES) ? 0.1 : 0,
    depthWrite: blockType !== BlockType.WATER,
  });

  // [right, left, top, bottom, front, back]
  const mats = [matSide, matSide, matTop, matBottom, matSide, matSide];
  materialCache[blockType] = mats;
  return mats;
}
