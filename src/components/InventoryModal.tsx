import React, { useState, useEffect } from 'react';
import { ITEMS } from '../game/blockData';
import { findMatchingRecipe, SMELTING_RECIPES } from '../game/recipes';
import { ItemStack, PlayerState } from '../types/game';
import { X, Search, Sparkles, Box, Hammer, Flame } from 'lucide-react';

interface InventoryModalProps {
  player: PlayerState;
  isOpen: boolean;
  activeContainer: 'inventory' | 'crafting' | 'chest' | 'furnace' | null;
  onClose: () => void;
  onUpdateInventory: (newInv: (ItemStack | null)[]) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  isOpen,
  activeContainer,
  onClose,
  onUpdateInventory,
}) => {
  const [activeTab, setActiveTab] = useState<'crafting' | 'creative' | 'chest' | 'furnace'>('crafting');
  const [craftingGrid, setCraftingGrid] = useState<(ItemStack | null)[]>(Array(9).fill(null));
  const [chestGrid, setChestGrid] = useState<(ItemStack | null)[]>(Array(27).fill(null));
  const [furnaceInput, setFurnaceInput] = useState<ItemStack | null>(null);
  const [furnaceFuel, setFurnaceFuel] = useState<ItemStack | null>(null);
  const [furnaceOutput, setFurnaceOutput] = useState<ItemStack | null>(null);
  const [craftedResult, setCraftedResult] = useState<ItemStack | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Floating held item stack following cursor (Minecraft Drag & Drop)
  const [heldItem, setHeldItem] = useState<ItemStack | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredSlotName, setHoveredSlotName] = useState<string | null>(null);

  // Synchronize container tab when activeContainer prop changes
  useEffect(() => {
    if (!isOpen) return;
    if (activeContainer === 'chest') setActiveTab('chest');
    else if (activeContainer === 'furnace') setActiveTab('furnace');
    else if (activeContainer === 'crafting') setActiveTab('crafting');
  }, [activeContainer, isOpen]);

  // Check 3x3 or 2x2 crafting recipe
  useEffect(() => {
    if (!isOpen) return;
    const gridIds = [
      [craftingGrid[0]?.itemId || null, craftingGrid[1]?.itemId || null, craftingGrid[2]?.itemId || null],
      [craftingGrid[3]?.itemId || null, craftingGrid[4]?.itemId || null, craftingGrid[5]?.itemId || null],
      [craftingGrid[6]?.itemId || null, craftingGrid[7]?.itemId || null, craftingGrid[8]?.itemId || null],
    ];

    const recipe = findMatchingRecipe(gridIds);
    setCraftedResult(recipe ? { ...recipe.result } : null);
  }, [craftingGrid, isOpen]);

  if (!isOpen) return null;

  // Return held item to player inventory when closing modal
  const handleClose = () => {
    if (heldItem) {
      const newInv = [...player.inventory];
      let remaining = heldItem.count;
      const itemId = heldItem.itemId;
      const maxStack = ITEMS[itemId]?.maxStack || 64;

      // 1. Merge into existing stacks
      for (let i = 0; i < newInv.length && remaining > 0; i++) {
        const slot = newInv[i];
        if (slot && slot.itemId === itemId && slot.count < maxStack) {
          const room = maxStack - slot.count;
          const add = Math.min(room, remaining);
          newInv[i] = { ...slot, count: slot.count + add };
          remaining -= add;
        }
      }

      // 2. Put in first empty slot
      for (let i = 0; i < newInv.length && remaining > 0; i++) {
        if (newInv[i] === null) {
          const add = Math.min(maxStack, remaining);
          newInv[i] = { itemId, count: add };
          remaining -= add;
        }
      }

      onUpdateInventory(newInv);
      setHeldItem(null);
    }
    onClose();
  };

  // Handle Furnace Smelting logic
  const handleSmelt = () => {
    if (!furnaceInput || !furnaceFuel) return;
    const outputId = SMELTING_RECIPES[furnaceInput.itemId];
    if (!outputId) return;

    const newInput = furnaceInput.count > 1 ? { ...furnaceInput, count: furnaceInput.count - 1 } : null;
    const newFuel = furnaceFuel.count > 1 ? { ...furnaceFuel, count: furnaceFuel.count - 1 } : null;

    let newOutput = furnaceOutput;
    if (!newOutput) {
      newOutput = { itemId: outputId, count: 1 };
    } else if (newOutput.itemId === outputId) {
      newOutput = { ...newOutput, count: newOutput.count + 1 };
    }

    setFurnaceInput(newInput);
    setFurnaceFuel(newFuel);
    setFurnaceOutput(newOutput);
  };

  // Helper for quick-moving items (Shift-Click)
  const quickMoveSlot = (sourceIndex: number) => {
    const newInv = [...player.inventory];
    const source = newInv[sourceIndex];
    if (!source) return;

    // Hotbar (0-8) <-> Main Inv (9-35)
    const isHotbar = sourceIndex < 9;
    const targetStart = isHotbar ? 9 : 0;
    const targetEnd = isHotbar ? 36 : 9;

    let moved = false;
    for (let i = targetStart; i < targetEnd; i++) {
      if (newInv[i] === null) {
        newInv[i] = source;
        newInv[sourceIndex] = null;
        moved = true;
        break;
      }
    }

    if (moved) {
      onUpdateInventory(newInv);
    }
  };

  // Player Inventory Slot Mouse Interaction
  const handlePlayerSlotMouseDown = (e: React.MouseEvent, slotIdx: number) => {
    e.preventDefault();
    e.stopPropagation();

    const currentSlot = player.inventory[slotIdx];
    const newInv = [...player.inventory];

    // Shift + Click: Quick Move
    if (e.shiftKey && currentSlot) {
      quickMoveSlot(slotIdx);
      return;
    }

    // Left Click (button === 0)
    if (e.button === 0) {
      if (!heldItem && currentSlot) {
        // Pick up full stack
        setHeldItem({ ...currentSlot });
        newInv[slotIdx] = null;
        onUpdateInventory(newInv);
      } else if (heldItem && !currentSlot) {
        // Place full stack
        newInv[slotIdx] = { ...heldItem };
        setHeldItem(null);
        onUpdateInventory(newInv);
      } else if (heldItem && currentSlot) {
        if (heldItem.itemId === currentSlot.itemId && ITEMS[heldItem.itemId]?.stackable) {
          // Combine stack up to maxStack
          const max = ITEMS[heldItem.itemId]?.maxStack || 64;
          const room = max - currentSlot.count;
          if (room > 0) {
            const move = Math.min(room, heldItem.count);
            newInv[slotIdx] = { ...currentSlot, count: currentSlot.count + move };
            const rem = heldItem.count - move;
            setHeldItem(rem > 0 ? { ...heldItem, count: rem } : null);
            onUpdateInventory(newInv);
          }
        } else {
          // Swap stacks
          newInv[slotIdx] = { ...heldItem };
          setHeldItem({ ...currentSlot });
          onUpdateInventory(newInv);
        }
      }
    } else if (e.button === 2) {
      // Right Click (button === 2)
      if (!heldItem && currentSlot) {
        // Split stack in half
        const takeCount = Math.ceil(currentSlot.count / 2);
        const keepCount = Math.floor(currentSlot.count / 2);
        setHeldItem({ itemId: currentSlot.itemId, count: takeCount });
        newInv[slotIdx] = keepCount > 0 ? { itemId: currentSlot.itemId, count: keepCount } : null;
        onUpdateInventory(newInv);
      } else if (heldItem) {
        // Drop 1 item into slot
        const max = ITEMS[heldItem.itemId]?.maxStack || 64;
        if (!currentSlot) {
          newInv[slotIdx] = { itemId: heldItem.itemId, count: 1 };
          const rem = heldItem.count - 1;
          setHeldItem(rem > 0 ? { ...heldItem, count: rem } : null);
          onUpdateInventory(newInv);
        } else if (currentSlot.itemId === heldItem.itemId && currentSlot.count < max) {
          newInv[slotIdx] = { ...currentSlot, count: currentSlot.count + 1 };
          const rem = heldItem.count - 1;
          setHeldItem(rem > 0 ? { ...heldItem, count: rem } : null);
          onUpdateInventory(newInv);
        }
      }
    }
  };

  // Crafting Grid Mouse Interaction
  const handleCraftingGridMouseDown = (e: React.MouseEvent, gridIdx: number) => {
    e.preventDefault();
    e.stopPropagation();

    const currentSlot = craftingGrid[gridIdx];
    const newGrid = [...craftingGrid];

    if (e.button === 0) {
      if (!heldItem && currentSlot) {
        setHeldItem({ ...currentSlot });
        newGrid[gridIdx] = null;
        setCraftingGrid(newGrid);
      } else if (heldItem && !currentSlot) {
        newGrid[gridIdx] = { ...heldItem };
        setHeldItem(null);
        setCraftingGrid(newGrid);
      } else if (heldItem && currentSlot) {
        if (heldItem.itemId === currentSlot.itemId && ITEMS[heldItem.itemId]?.stackable) {
          const max = ITEMS[heldItem.itemId]?.maxStack || 64;
          const room = max - currentSlot.count;
          if (room > 0) {
            const move = Math.min(room, heldItem.count);
            newGrid[gridIdx] = { ...currentSlot, count: currentSlot.count + move };
            const rem = heldItem.count - move;
            setHeldItem(rem > 0 ? { ...heldItem, count: rem } : null);
            setCraftingGrid(newGrid);
          }
        } else {
          newGrid[gridIdx] = { ...heldItem };
          setHeldItem({ ...currentSlot });
          setCraftingGrid(newGrid);
        }
      }
    } else if (e.button === 2) {
      if (!heldItem && currentSlot) {
        const takeCount = Math.ceil(currentSlot.count / 2);
        const keepCount = Math.floor(currentSlot.count / 2);
        setHeldItem({ itemId: currentSlot.itemId, count: takeCount });
        newGrid[gridIdx] = keepCount > 0 ? { itemId: currentSlot.itemId, count: keepCount } : null;
        setCraftingGrid(newGrid);
      } else if (heldItem) {
        const max = ITEMS[heldItem.itemId]?.maxStack || 64;
        if (!currentSlot) {
          newGrid[gridIdx] = { itemId: heldItem.itemId, count: 1 };
          const rem = heldItem.count - 1;
          setHeldItem(rem > 0 ? { ...heldItem, count: rem } : null);
          setCraftingGrid(newGrid);
        } else if (currentSlot.itemId === heldItem.itemId && currentSlot.count < max) {
          newGrid[gridIdx] = { ...currentSlot, count: currentSlot.count + 1 };
          const rem = heldItem.count - 1;
          setHeldItem(rem > 0 ? { ...heldItem, count: rem } : null);
          setCraftingGrid(newGrid);
        }
      }
    }
  };

  // Claim Crafted Result
  const handleCraftResultMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!craftedResult) return;

    const max = ITEMS[craftedResult.itemId]?.maxStack || 64;

    if (!heldItem) {
      setHeldItem({ ...craftedResult });
      // Deduct 1 item from each occupied crafting slot
      const newGrid = craftingGrid.map((item) => {
        if (!item) return null;
        if (item.count <= 1) return null;
        return { ...item, count: item.count - 1 };
      });
      setCraftingGrid(newGrid);
    } else if (heldItem.itemId === craftedResult.itemId && heldItem.count + craftedResult.count <= max) {
      setHeldItem({ ...heldItem, count: heldItem.count + craftedResult.count });
      const newGrid = craftingGrid.map((item) => {
        if (!item) return null;
        if (item.count <= 1) return null;
        return { ...item, count: item.count - 1 };
      });
      setCraftingGrid(newGrid);
    }
  };

  // Chest Slot Mouse Interaction
  const handleChestSlotMouseDown = (e: React.MouseEvent, chestIdx: number) => {
    e.preventDefault();
    e.stopPropagation();

    const currentSlot = chestGrid[chestIdx];
    const newChest = [...chestGrid];

    if (e.button === 0) {
      if (!heldItem && currentSlot) {
        setHeldItem({ ...currentSlot });
        newChest[chestIdx] = null;
        setChestGrid(newChest);
      } else if (heldItem && !currentSlot) {
        newChest[chestIdx] = { ...heldItem };
        setHeldItem(null);
        setChestGrid(newChest);
      } else if (heldItem && currentSlot) {
        if (heldItem.itemId === currentSlot.itemId && ITEMS[heldItem.itemId]?.stackable) {
          const max = ITEMS[heldItem.itemId]?.maxStack || 64;
          const room = max - currentSlot.count;
          if (room > 0) {
            const move = Math.min(room, heldItem.count);
            newChest[chestIdx] = { ...currentSlot, count: currentSlot.count + move };
            const rem = heldItem.count - move;
            setHeldItem(rem > 0 ? { ...heldItem, count: rem } : null);
            setChestGrid(newChest);
          }
        } else {
          newChest[chestIdx] = { ...heldItem };
          setHeldItem({ ...currentSlot });
          setChestGrid(newChest);
        }
      }
    } else if (e.button === 2) {
      if (!heldItem && currentSlot) {
        const takeCount = Math.ceil(currentSlot.count / 2);
        const keepCount = Math.floor(currentSlot.count / 2);
        setHeldItem({ itemId: currentSlot.itemId, count: takeCount });
        newChest[chestIdx] = keepCount > 0 ? { itemId: currentSlot.itemId, count: keepCount } : null;
        setChestGrid(newChest);
      } else if (heldItem) {
        const max = ITEMS[heldItem.itemId]?.maxStack || 64;
        if (!currentSlot) {
          newChest[chestIdx] = { itemId: heldItem.itemId, count: 1 };
          const rem = heldItem.count - 1;
          setHeldItem(rem > 0 ? { ...heldItem, count: rem } : null);
          setChestGrid(newChest);
        } else if (currentSlot.itemId === heldItem.itemId && currentSlot.count < max) {
          newChest[chestIdx] = { ...currentSlot, count: currentSlot.count + 1 };
          const rem = heldItem.count - 1;
          setHeldItem(rem > 0 ? { ...heldItem, count: rem } : null);
          setChestGrid(newChest);
        }
      }
    }
  };

  // Creative Give Mouse Interaction
  const handleCreativeMouseDown = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button === 0) {
      setHeldItem({ itemId, count: ITEMS[itemId]?.stackable ? 64 : 1 });
    } else if (e.button === 2) {
      setHeldItem({ itemId, count: 1 });
    }
  };

  const filteredCreativeItems = Object.values(ITEMS).filter((it) =>
    it.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div className="bg-stone-800 text-stone-100 border-4 border-stone-600 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative">
        {/* Header Bar */}
        <div className="bg-stone-900 p-3 flex justify-between items-center border-b-2 border-stone-700">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('crafting')}
              className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition ${
                activeTab === 'crafting' ? 'bg-stone-700 text-amber-400 border border-amber-500' : 'bg-stone-800 hover:bg-stone-700'
              }`}
            >
              <Hammer className="w-4 h-4" /> Crafting
            </button>
            <button
              onClick={() => setActiveTab('furnace')}
              className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition ${
                activeTab === 'furnace' ? 'bg-stone-700 text-amber-400 border border-amber-500' : 'bg-stone-800 hover:bg-stone-700'
              }`}
            >
              <Flame className="w-4 h-4" /> Furnace
            </button>
            <button
              onClick={() => setActiveTab('chest')}
              className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition ${
                activeTab === 'chest' ? 'bg-stone-700 text-amber-400 border border-amber-500' : 'bg-stone-800 hover:bg-stone-700'
              }`}
            >
              <Box className="w-4 h-4" /> Chest Storage
            </button>
            <button
              onClick={() => setActiveTab('creative')}
              className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition ${
                activeTab === 'creative' ? 'bg-stone-700 text-amber-400 border border-amber-500' : 'bg-stone-800 hover:bg-stone-700'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Creative Catalog
            </button>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-stone-700 rounded text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col gap-4">
          {activeTab === 'crafting' && (
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center bg-stone-900/50 p-4 rounded-md border border-stone-700">
              {/* 3x3 Crafting Grid */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Crafting Table (3x3)</span>
                <div className="grid grid-cols-3 gap-1 bg-stone-800 p-2 rounded border-2 border-stone-600">
                  {craftingGrid.map((slot, idx) => (
                    <div
                      key={idx}
                      onMouseDown={(e) => handleCraftingGridMouseDown(e, idx)}
                      onMouseEnter={() => slot && setHoveredSlotName(ITEMS[slot.itemId]?.name || null)}
                      onMouseLeave={() => setHoveredSlotName(null)}
                      className="w-12 h-12 bg-stone-900 rounded border border-stone-700 hover:border-amber-400 flex items-center justify-center relative cursor-pointer select-none"
                    >
                      {slot && (
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shadow"
                          style={{ backgroundColor: ITEMS[slot.itemId]?.iconColor || '#777' }}
                        >
                          {ITEMS[slot.itemId]?.name.substring(0, 2)}
                        </div>
                      )}
                      {slot && slot.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-extrabold text-amber-300 drop-shadow">
                          {slot.count}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="text-stone-500 font-bold text-xl">➔</div>

              {/* Result Slot */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Result</span>
                <div
                  onMouseDown={handleCraftResultMouseDown}
                  onMouseEnter={() => craftedResult && setHoveredSlotName(ITEMS[craftedResult.itemId]?.name || null)}
                  onMouseLeave={() => setHoveredSlotName(null)}
                  className={`w-16 h-16 rounded border-2 flex items-center justify-center relative transition ${
                    craftedResult
                      ? 'bg-amber-950/80 border-amber-500 cursor-pointer shadow-lg shadow-amber-500/20 hover:scale-105'
                      : 'bg-stone-900 border-stone-700 cursor-not-allowed'
                  }`}
                >
                  {craftedResult && (
                    <div
                      className="w-10 h-10 rounded flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: ITEMS[craftedResult.itemId]?.iconColor || '#777' }}
                    >
                      {ITEMS[craftedResult.itemId]?.name.substring(0, 2)}
                    </div>
                  )}
                  {craftedResult && craftedResult.count > 1 && (
                    <span className="absolute bottom-1 right-1.5 text-xs font-mono font-extrabold text-amber-300 drop-shadow">
                      {craftedResult.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'furnace' && (
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center bg-stone-900/50 p-4 rounded-md border border-stone-700">
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-bold text-stone-400 uppercase">Input Item</span>
                <div
                  onMouseDown={(e) => {
                    if (heldItem) {
                      setFurnaceInput(heldItem);
                      setHeldItem(null);
                    } else if (furnaceInput) {
                      setHeldItem(furnaceInput);
                      setFurnaceInput(null);
                    }
                  }}
                  className="w-12 h-12 bg-stone-900 rounded border border-stone-700 hover:border-amber-400 flex items-center justify-center relative cursor-pointer"
                >
                  {furnaceInput && (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shadow"
                      style={{ backgroundColor: ITEMS[furnaceInput.itemId]?.iconColor || '#777' }}
                    >
                      {ITEMS[furnaceInput.itemId]?.name.substring(0, 2)}
                    </div>
                  )}
                  {furnaceInput && <span className="absolute bottom-0.5 right-1 text-[10px] font-mono text-amber-300 font-bold">{furnaceInput.count}</span>}
                </div>

                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />

                <span className="text-xs font-bold text-stone-400 uppercase">Fuel</span>
                <div
                  onMouseDown={(e) => {
                    if (heldItem) {
                      setFurnaceFuel(heldItem);
                      setHeldItem(null);
                    } else if (furnaceFuel) {
                      setHeldItem(furnaceFuel);
                      setFurnaceFuel(null);
                    }
                  }}
                  className="w-12 h-12 bg-stone-900 rounded border border-stone-700 hover:border-amber-400 flex items-center justify-center relative cursor-pointer"
                >
                  {furnaceFuel && (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shadow"
                      style={{ backgroundColor: ITEMS[furnaceFuel.itemId]?.iconColor || '#777' }}
                    >
                      {ITEMS[furnaceFuel.itemId]?.name.substring(0, 2)}
                    </div>
                  )}
                  {furnaceFuel && <span className="absolute bottom-0.5 right-1 text-[10px] font-mono text-amber-300 font-bold">{furnaceFuel.count}</span>}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleSmelt}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded shadow text-xs uppercase tracking-wider cursor-pointer"
                >
                  Smelt Item ➔
                </button>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase">Output</span>
                <div
                  onMouseDown={() => {
                    if (furnaceOutput) {
                      if (!heldItem) {
                        setHeldItem(furnaceOutput);
                        setFurnaceOutput(null);
                      } else if (heldItem.itemId === furnaceOutput.itemId) {
                        setHeldItem({ ...heldItem, count: heldItem.count + furnaceOutput.count });
                        setFurnaceOutput(null);
                      }
                    }
                  }}
                  className="w-16 h-16 bg-amber-950/80 border-2 border-amber-500 rounded flex items-center justify-center relative cursor-pointer"
                >
                  {furnaceOutput && (
                    <div
                      className="w-10 h-10 rounded flex items-center justify-center text-xs font-bold text-white shadow"
                      style={{ backgroundColor: ITEMS[furnaceOutput.itemId]?.iconColor || '#777' }}
                    >
                      {ITEMS[furnaceOutput.itemId]?.name.substring(0, 2)}
                    </div>
                  )}
                  {furnaceOutput && <span className="absolute bottom-1 right-1.5 text-xs font-mono font-bold text-amber-300">{furnaceOutput.count}</span>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chest' && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Chest Container (27 Slots)</span>
              <div className="grid grid-cols-9 gap-1.5 bg-stone-900 p-3 rounded-lg border-2 border-stone-700 max-h-48 overflow-y-auto">
                {chestGrid.map((slot, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => handleChestSlotMouseDown(e, idx)}
                    onMouseEnter={() => slot && setHoveredSlotName(ITEMS[slot.itemId]?.name || null)}
                    onMouseLeave={() => setHoveredSlotName(null)}
                    className="w-11 h-11 bg-stone-800 rounded border border-stone-700 hover:border-amber-400 flex items-center justify-center relative cursor-pointer"
                  >
                    {slot && (
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shadow"
                        style={{ backgroundColor: ITEMS[slot.itemId]?.iconColor || '#777' }}
                      >
                        {ITEMS[slot.itemId]?.name.substring(0, 2)}
                      </div>
                    )}
                    {slot && slot.count > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold text-amber-300">
                        {slot.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'creative' && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search blocks & items..."
                  className="w-full bg-stone-900 border border-stone-700 rounded-md pl-9 pr-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto bg-stone-900/50 p-2 rounded border border-stone-700">
                {filteredCreativeItems.map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleCreativeMouseDown(e, item.id)}
                    onMouseEnter={() => setHoveredSlotName(item.name)}
                    onMouseLeave={() => setHoveredSlotName(null)}
                    title={item.name}
                    className="w-10 h-10 bg-stone-800 rounded border border-stone-600 hover:border-amber-400 hover:scale-105 transition flex items-center justify-center relative cursor-pointer"
                  >
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold text-white shadow"
                      style={{ backgroundColor: item.iconColor || '#666' }}
                    >
                      {item.name.substring(0, 2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Player Inventory Grid */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Player Inventory</span>
              {hoveredSlotName && (
                <span className="text-xs font-mono font-bold text-amber-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-700">
                  {hoveredSlotName}
                </span>
              )}
            </div>
            <div className="grid grid-cols-9 gap-1.5 bg-stone-900 p-3 rounded-lg border-2 border-stone-700">
              {player.inventory.map((slot, idx) => {
                const isHotbar = idx < 9;

                return (
                  <div
                    key={idx}
                    onMouseDown={(e) => handlePlayerSlotMouseDown(e, idx)}
                    onMouseEnter={() => slot && setHoveredSlotName(ITEMS[slot.itemId]?.name || null)}
                    onMouseLeave={() => setHoveredSlotName(null)}
                    className={`w-11 h-11 rounded border-2 transition flex items-center justify-center relative cursor-pointer ${
                      isHotbar ? 'bg-stone-800/90 border-stone-600' : 'bg-stone-950/70 border-stone-700 hover:border-stone-500'
                    }`}
                  >
                    {slot && (
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shadow"
                        style={{ backgroundColor: ITEMS[slot.itemId]?.iconColor || '#777' }}
                      >
                        {ITEMS[slot.itemId]?.name.substring(0, 2)}
                      </div>
                    )}
                    {slot && slot.count > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold text-amber-300 drop-shadow">
                        {slot.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Held Item attached to mouse cursor */}
      {heldItem && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-stone-900/90 border-2 border-amber-400 rounded p-1 shadow-2xl scale-110"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
        >
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shadow"
            style={{ backgroundColor: ITEMS[heldItem.itemId]?.iconColor || '#777' }}
          >
            {ITEMS[heldItem.itemId]?.name.substring(0, 2)}
          </div>
          {heldItem.count > 1 && (
            <span className="absolute -bottom-1 -right-1 bg-black/90 text-amber-300 px-1 rounded text-[10px] font-mono font-extrabold border border-amber-500/50">
              {heldItem.count}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
