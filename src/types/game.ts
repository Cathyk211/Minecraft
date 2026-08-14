export type GameMode = 'survival' | 'creative';

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  BEDROCK = 5,
  OAK_LOG = 6,
  OAK_LEAVES = 7,
  OAK_PLANKS = 8,
  SAND = 9,
  CACTUS = 10,
  SNOW = 11,
  WATER = 12,
  GLASS = 13,
  COAL_ORE = 14,
  IRON_ORE = 15,
  GOLD_ORE = 16,
  DIAMOND_ORE = 17,
  BRICK = 18,
  TORCH = 19,
  CRAFTING_TABLE = 20,
  FURNACE = 21,
  CHEST = 22,
  TNT = 23,
  TALL_GRASS = 24,
  FLOWER_RED = 25,
  FLOWER_YELLOW = 26,
}

export type ToolType = 'pickaxe' | 'axe' | 'shovel' | 'sword' | 'none';
export type ToolTier = 0 | 1 | 2 | 3 | 4; // 0: Hand, 1: Wood, 2: Stone, 3: Iron, 4: Diamond

export interface BlockData {
  id: BlockType;
  name: string;
  hardness: number; // seconds with hand
  bestTool: ToolType;
  minTier: ToolTier;
  transparent?: boolean;
  solid: boolean;
  lightLevel?: number;
  dropItem?: string; // itemId or blockId
  dropCount?: number;
}

export interface ItemData {
  id: string;
  name: string;
  stackable: boolean;
  maxStack: number;
  blockId?: BlockType; // if places a block
  toolType?: ToolType;
  toolTier?: ToolTier;
  attackDamage?: number;
  foodValue?: number; // hunger restore
  iconColor?: string;
  textureUrl?: string;
}

export interface ItemStack {
  itemId: string;
  count: number;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  pitch: number;
  yaw: number;
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  oxygen: number;
  mode: GameMode;
  isFlying: boolean;
  isGrounded: boolean;
  isSneaking: boolean;
  isSprinting: boolean;
  inventory: (ItemStack | null)[]; // 36 slots (9 hotbar + 27 main)
  selectedHotbarIndex: number;
  heldItemSwing: number; // animation timer 0..1
}

export interface Recipe {
  id: string;
  grid: (string | null)[][]; // 2x2 or 3x3 pattern
  result: ItemStack;
  isShapeless?: boolean;
}

export interface MobEntity {
  id: string;
  type: 'pig' | 'cow' | 'sheep' | 'zombie' | 'skeleton' | 'creeper';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  health: number;
  maxHealth: number;
  isHostile: boolean;
  hurtTimer: number;
  attackCooldown?: number;
}

export interface TNTEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  fuse: number; // frames or seconds remaining
  vx: number;
  vy: number;
  vz: number;
}

export interface ChestData {
  items: (ItemStack | null)[];
}

export interface FurnaceData {
  input: ItemStack | null;
  fuel: ItemStack | null;
  output: ItemStack | null;
  cookProgress: number; // 0..100
  burnTime: number; // remaining burn ticks
  maxBurnTime: number;
}

export interface WorldSettings {
  seed: number;
  renderDistance: number; // chunk radius (e.g. 3 to 6)
  timeOfDay: number; // 0 to 24000 (6000 = noon, 18000 = midnight)
  dayCycleSpeed: number; // time increase per tick
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  soundVolume: number;
  musicVolume: number;
  fov: number;
  sensitivity: number;
}
