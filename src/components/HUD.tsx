import React, { useState, useEffect } from 'react';
import { BLOCKS, ITEMS } from '../game/blockData';
import { PlayerState } from '../types/game';
import { Heart, Flame, Shield, Compass, Sparkles, Terminal } from 'lucide-react';

interface HUDProps {
  player: PlayerState;
  fps: number;
  targetedBlockName: string;
  targetedBlockPos: { x: number; y: number; z: number } | null;
  miningProgress?: number;
  showF3: boolean;
  onExecuteCommand: (cmd: string) => void;
  onSelectHotbar: (index: number) => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  fps,
  targetedBlockName,
  targetedBlockPos,
  miningProgress = 0,
  showF3,
  onExecuteCommand,
  onSelectHotbar,
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [, setTick] = useState(0);
  const [chatMessages, setChatMessages] = useState<string[]>([
    'Welcome to Minecraft Web Edition!',
    'Press WASD to move, Space to jump, Left Click to break, Right Click to place.',
    'Press E for Inventory, F3 for Debug, Slash (/) for Commands.',
  ]);

  // Periodic HUD update tick to refresh hotbar item counts & status in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyT' || e.code === 'Slash') {
        if (!chatOpen) {
          e.preventDefault();
          setChatOpen(true);
          if (e.code === 'Slash') setChatInput('/');
        }
      }
      if (e.code === 'Escape' && chatOpen) {
        setChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages((prev) => [...prev, `[Player] ${chatInput}`]);

    if (chatInput.startsWith('/')) {
      onExecuteCommand(chatInput);
    }

    setChatInput('');
    setChatOpen(false);
  };

  // Render Health Hearts
  const renderHearts = () => {
    const hearts = [];
    const fullHearts = Math.floor(player.health / 2);
    const hasHalfHeart = player.health % 2 === 1;

    for (let i = 0; i < 10; i++) {
      if (i < fullHearts) {
        hearts.push(<Heart key={i} className="w-4 h-4 fill-red-600 text-red-700 drop-shadow" />);
      } else if (i === fullHearts && hasHalfHeart) {
        hearts.push(
          <div key={i} className="relative w-4 h-4 overflow-hidden">
            <Heart className="w-4 h-4 text-gray-800 drop-shadow" />
            <Heart className="w-4 h-4 fill-red-600 text-red-700 absolute top-0 left-0 clip-path-half" />
          </div>
        );
      } else {
        hearts.push(<Heart key={i} className="w-4 h-4 text-gray-800 drop-shadow" />);
      }
    }
    return hearts;
  };

  // Render Hunger Drumsticks
  const renderHunger = () => {
    const drumsticks = [];
    const full = Math.floor(player.hunger / 2);

    for (let i = 0; i < 10; i++) {
      drumsticks.push(
        <Flame
          key={i}
          className={`w-4 h-4 ${i < full ? 'fill-amber-700 text-amber-800' : 'text-gray-800'} drop-shadow`}
        />
      );
    }
    return drumsticks;
  };

  // Render Oxygen Air Bubbles (10 bubbles = 20 points)
  const renderOxygen = () => {
    const bubbles = [];
    const currentOxygen = Math.max(0, Math.min(20, player.oxygen ?? 20));
    const numFullBubbles = Math.floor(currentOxygen / 2);
    const hasHalfBubble = currentOxygen % 2 >= 1;

    for (let i = 0; i < 10; i++) {
      let bubbleState: 'full' | 'half' | 'empty' = 'empty';
      if (i < numFullBubbles) {
        bubbleState = 'full';
      } else if (i === numFullBubbles && hasHalfBubble) {
        bubbleState = 'half';
      }

      bubbles.push(
        <div key={i} className="relative w-4 h-4 flex items-center justify-center">
          {bubbleState === 'full' && (
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-blue-900 shadow-[0_0_6px_rgba(34,211,238,0.9)] animate-pulse flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white absolute top-0.5 left-0.5" />
            </div>
          )}
          {bubbleState === 'half' && (
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-600/70 border border-blue-900 flex items-center justify-center overflow-hidden">
              <div className="w-1.5 h-3.5 bg-cyan-300 absolute left-0" />
            </div>
          )}
          {bubbleState === 'empty' && (
            <div className="w-3 h-3 rounded-full border border-cyan-800/60 bg-black/40" />
          )}
        </div>
      );
    }
    return bubbles;
  };

  const isUnderwater = (player.oxygen ?? 20) < 20;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4">
      {/* Underwater Tint & Vignette Effect */}
      {isUnderwater && (
        <div className="absolute inset-0 bg-blue-900/25 pointer-events-none backdrop-blur-[0.5px] border-[16px] border-blue-900/20" />
      )}
      {/* Top Left Debug F3 Overlay */}
      {showF3 && (
        <div className="bg-black/60 backdrop-blur-xs text-green-400 font-mono text-xs p-3 rounded-md w-fit border border-green-500/30">
          <div>Minecraft 1.20 Web Edition (Three.js Engine)</div>
          <div>FPS: {fps}</div>
          <div>
            XYZ: {player.x.toFixed(2)} / {player.y.toFixed(2)} / {player.z.toFixed(2)}
          </div>
          <div>
            Chunk: {Math.floor(player.x / 16)}, {Math.floor(player.z / 16)}
          </div>
          <div>Gamemode: {player.mode.toUpperCase()}</div>
          {targetedBlockPos && (
            <div>
              Target: {targetedBlockName} at ({targetedBlockPos.x}, {targetedBlockPos.y}, {targetedBlockPos.z})
            </div>
          )}
        </div>
      )}

      {/* Crosshair Center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        <div className="relative">
          <div className="w-4 h-0.5 bg-white/80 shadow-md"></div>
          <div className="h-4 w-0.5 bg-white/80 shadow-md -mt-2.25 ml-1.75"></div>
        </div>

        {miningProgress > 0 && (
          <div className="mt-5 w-14 h-2 bg-black/70 rounded border border-white/50 p-0.5 shadow-lg overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-xs transition-all duration-75"
              style={{ width: `${Math.min(100, miningProgress * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Held Item Hand Swing Animation */}
      <div
        className="absolute bottom-0 right-12 transition-transform duration-75"
        style={{
          transform: `rotate(${-20 + player.heldItemSwing * 40}deg) translateY(${player.heldItemSwing * 20}px)`,
        }}
      >
        <div className="w-16 h-32 bg-amber-200/90 border-2 border-amber-400 rounded-t-lg shadow-xl flex items-center justify-center">
          {player.inventory[player.selectedHotbarIndex] && (
            <div className="w-10 h-10 rounded bg-white/20 p-1 font-bold text-xs text-white text-center">
              {player.inventory[player.selectedHotbarIndex]?.itemId}
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages & Console */}
      <div className="flex flex-col gap-1 max-w-md pointer-events-auto">
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto p-2 bg-black/40 rounded text-xs text-white font-mono">
          {chatMessages.map((msg, i) => (
            <div key={i} className="drop-shadow">
              {msg}
            </div>
          ))}
        </div>

        {chatOpen && (
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message or /command..."
              className="flex-1 bg-black/80 text-white font-mono text-xs px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-green-500"
            />
            <button type="submit" className="bg-green-700 text-white px-3 py-1 text-xs rounded font-bold hover:bg-green-600">
              Send
            </button>
          </form>
        )}
      </div>

      {/* Bottom Center Hotbar & Status Bars */}
      <div className="self-center flex flex-col items-center gap-1">
        {/* Status Bars (Hearts, Hunger, and Air Bubbles) */}
        {player.mode === 'survival' && (
          <div className="flex flex-col gap-1 w-96 px-2 mb-1">
            {/* Underwater Air / Oxygen Bubbles Bar */}
            {(player.oxygen ?? 20) < 20 && (
              <div className="flex justify-end items-center gap-1.5 px-1">
                <span className="text-[10px] font-mono font-bold text-cyan-300 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.9)] tracking-wider">
                  O₂ AIR
                </span>
                <div className="flex gap-0.5 items-center">{renderOxygen()}</div>
              </div>
            )}
            <div className="flex justify-between w-full">
              <div className="flex gap-0.5">{renderHearts()}</div>
              <div className="flex gap-0.5">{renderHunger()}</div>
            </div>
          </div>
        )}

        {/* Hotbar Slots */}
        <div className="flex bg-black/70 p-1.5 rounded-lg border-2 border-gray-600 gap-1 shadow-2xl pointer-events-auto">
          {Array.from({ length: 9 }).map((_, idx) => {
            const item = player.inventory[idx];
            const itemMeta = item ? ITEMS[item.itemId] : null;
            const isSelected = player.selectedHotbarIndex === idx;

            return (
              <button
                key={idx}
                onClick={() => onSelectHotbar(idx)}
                className={`relative w-11 h-11 bg-gray-800/80 rounded border-2 transition-all flex items-center justify-center ${
                  isSelected ? 'border-yellow-400 bg-gray-700/90 scale-105 shadow-md shadow-yellow-500/30' : 'border-gray-600 hover:border-gray-400'
                }`}
              >
                <span className="absolute top-0.5 left-1 text-[10px] text-gray-400 font-mono font-bold">
                  {idx + 1}
                </span>

                {itemMeta && (
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shadow-inner"
                    style={{ backgroundColor: itemMeta.iconColor || '#888888' }}
                  >
                    {itemMeta.name.substring(0, 2)}
                  </div>
                )}

                {item && item.count > 1 && (
                  <span className="absolute bottom-0.5 right-1 text-xs font-mono font-extrabold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
