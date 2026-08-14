import { ItemStack, Recipe } from '../types/game';

export const RECIPES: Recipe[] = [
  // Wood Log -> 4 Planks
  {
    id: 'log_to_planks',
    grid: [['oak_log']],
    result: { itemId: 'oak_planks', count: 4 },
  },
  // 2 Planks vertical -> 4 Sticks
  {
    id: 'planks_to_sticks',
    grid: [
      ['oak_planks'],
      ['oak_planks'],
    ],
    result: { itemId: 'stick', count: 4 },
  },
  // 4 Planks square -> Crafting Table
  {
    id: 'crafting_table',
    grid: [
      ['oak_planks', 'oak_planks'],
      ['oak_planks', 'oak_planks'],
    ],
    result: { itemId: 'crafting_table', count: 1 },
  },
  // 8 Cobblestone around edge -> Furnace
  {
    id: 'furnace',
    grid: [
      ['cobblestone', 'cobblestone', 'cobblestone'],
      ['cobblestone', null, 'cobblestone'],
      ['cobblestone', 'cobblestone', 'cobblestone'],
    ],
    result: { itemId: 'furnace', count: 1 },
  },
  // 8 Planks around edge -> Chest
  {
    id: 'chest',
    grid: [
      ['oak_planks', 'oak_planks', 'oak_planks'],
      ['oak_planks', null, 'oak_planks'],
      ['oak_planks', 'oak_planks', 'oak_planks'],
    ],
    result: { itemId: 'chest', count: 1 },
  },
  // Coal + Stick -> 4 Torches
  {
    id: 'torch',
    grid: [
      ['coal'],
      ['stick'],
    ],
    result: { itemId: 'torch', count: 4 },
  },
  // 5 Gunpowder + 4 Sand -> TNT
  {
    id: 'tnt',
    grid: [
      ['gunpowder', 'sand', 'gunpowder'],
      ['sand', 'gunpowder', 'sand'],
      ['gunpowder', 'sand', 'gunpowder'],
    ],
    result: { itemId: 'tnt', count: 1 },
  },
  // Iron Ingot + Flint -> Flint and Steel
  {
    id: 'flint_and_steel',
    grid: [
      ['iron_ingot', null],
      [null, 'flint'],
    ],
    result: { itemId: 'flint_and_steel', count: 1 },
  },

  // WOODEN TOOLS
  {
    id: 'wooden_pickaxe',
    grid: [
      ['oak_planks', 'oak_planks', 'oak_planks'],
      [null, 'stick', null],
      [null, 'stick', null],
    ],
    result: { itemId: 'wooden_pickaxe', count: 1 },
  },
  {
    id: 'wooden_axe',
    grid: [
      ['oak_planks', 'oak_planks'],
      ['oak_planks', 'stick'],
      [null, 'stick'],
    ],
    result: { itemId: 'wooden_axe', count: 1 },
  },
  {
    id: 'wooden_shovel',
    grid: [
      ['oak_planks'],
      ['stick'],
      ['stick'],
    ],
    result: { itemId: 'wooden_shovel', count: 1 },
  },
  {
    id: 'wooden_sword',
    grid: [
      ['oak_planks'],
      ['oak_planks'],
      ['stick'],
    ],
    result: { itemId: 'wooden_sword', count: 1 },
  },

  // STONE TOOLS
  {
    id: 'stone_pickaxe',
    grid: [
      ['cobblestone', 'cobblestone', 'cobblestone'],
      [null, 'stick', null],
      [null, 'stick', null],
    ],
    result: { itemId: 'stone_pickaxe', count: 1 },
  },
  {
    id: 'stone_axe',
    grid: [
      ['cobblestone', 'cobblestone'],
      ['cobblestone', 'stick'],
      [null, 'stick'],
    ],
    result: { itemId: 'stone_axe', count: 1 },
  },
  {
    id: 'stone_shovel',
    grid: [
      ['cobblestone'],
      ['stick'],
      ['stick'],
    ],
    result: { itemId: 'stone_shovel', count: 1 },
  },
  {
    id: 'stone_sword',
    grid: [
      ['cobblestone'],
      ['cobblestone'],
      ['stick'],
    ],
    result: { itemId: 'stone_sword', count: 1 },
  },

  // IRON TOOLS
  {
    id: 'iron_pickaxe',
    grid: [
      ['iron_ingot', 'iron_ingot', 'iron_ingot'],
      [null, 'stick', null],
      [null, 'stick', null],
    ],
    result: { itemId: 'iron_pickaxe', count: 1 },
  },
  {
    id: 'iron_axe',
    grid: [
      ['iron_ingot', 'iron_ingot'],
      ['iron_ingot', 'stick'],
      [null, 'stick'],
    ],
    result: { itemId: 'iron_axe', count: 1 },
  },
  {
    id: 'iron_shovel',
    grid: [
      ['iron_ingot'],
      ['stick'],
      ['stick'],
    ],
    result: { itemId: 'iron_shovel', count: 1 },
  },
  {
    id: 'iron_sword',
    grid: [
      ['iron_ingot'],
      ['iron_ingot'],
      ['stick'],
    ],
    result: { itemId: 'iron_sword', count: 1 },
  },

  // DIAMOND TOOLS
  {
    id: 'diamond_pickaxe',
    grid: [
      ['diamond', 'diamond', 'diamond'],
      [null, 'stick', null],
      [null, 'stick', null],
    ],
    result: { itemId: 'diamond_pickaxe', count: 1 },
  },
  {
    id: 'diamond_axe',
    grid: [
      ['diamond', 'diamond'],
      ['diamond', 'stick'],
      [null, 'stick'],
    ],
    result: { itemId: 'diamond_axe', count: 1 },
  },
  {
    id: 'diamond_shovel',
    grid: [
      ['diamond'],
      ['stick'],
      ['stick'],
    ],
    result: { itemId: 'diamond_shovel', count: 1 },
  },
  {
    id: 'diamond_sword',
    grid: [
      ['diamond'],
      ['diamond'],
      ['stick'],
    ],
    result: { itemId: 'diamond_sword', count: 1 },
  },
];

// Helper to trim empty rows & cols from input crafting grid
function trimGrid(grid: (string | null)[][]): (string | null)[][] {
  let minR = grid.length, maxR = -1, minC = 3, maxC = -1;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== null) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  if (maxR === -1) return [];

  const trimmed: (string | null)[][] = [];
  for (let r = minR; r <= maxR; r++) {
    const row: (string | null)[] = [];
    for (let c = minC; c <= maxC; c++) {
      row.push(grid[r][c]);
    }
    trimmed.push(row);
  }
  return trimmed;
}

// Compare 2D grid
function isGridMatch(a: (string | null)[][], b: (string | null)[][]): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

export function findMatchingRecipe(inputGrid: (string | null)[][]): Recipe | null {
  const trimmed = trimGrid(inputGrid);
  if (trimmed.length === 0) return null;

  for (const recipe of RECIPES) {
    const recipeTrimmed = trimGrid(recipe.grid);
    if (isGridMatch(trimmed, recipeTrimmed)) {
      return recipe;
    }
  }
  return null;
}

// Furnace smelting recipes
export const SMELTING_RECIPES: Record<string, string> = {
  raw_iron: 'iron_ingot',
  raw_gold: 'gold_ingot',
  sand: 'glass',
  cobblestone: 'stone',
  porkchop: 'cooked_porkchop',
};

// Fuel burn times in ticks (1 sec = 20 ticks)
export const FUELS: Record<string, number> = {
  coal: 1600, // 80 sec
  oak_log: 300,
  oak_planks: 300,
  stick: 100,
};
