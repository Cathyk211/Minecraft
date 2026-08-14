import React from 'react';
import { RotateCcw, Home, Skull } from 'lucide-react';

interface DeathScreenProps {
  deathReason: string;
  score?: number;
  onRespawn: () => void;
  onTitleScreen: () => void;
}

export const DeathScreen: React.FC<DeathScreenProps> = ({
  deathReason,
  score = 0,
  onRespawn,
  onTitleScreen,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-950/85 backdrop-blur-md text-white animate-fade-in p-4 select-none">
      {/* Animated subtle glow */}
      <div className="absolute inset-0 bg-radial from-red-600/20 via-transparent to-black/80 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full bg-neutral-900/90 border border-red-900/60 p-8 rounded-2xl shadow-2xl shadow-red-950/80">
        <div className="w-16 h-16 rounded-full bg-red-950/90 border-2 border-red-600/80 flex items-center justify-center mb-4 shadow-lg shadow-red-600/30 animate-pulse">
          <Skull className="w-9 h-9 text-red-500" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-red-500 tracking-wider mb-2 drop-shadow-[0_4px_16px_rgba(220,38,38,0.7)] font-mono uppercase">
          You Died!
        </h1>

        <p className="text-lg text-neutral-300 font-medium mb-6 italic">
          "{deathReason || 'You ran out of health'}"
        </p>

        {score !== undefined && (
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg px-4 py-2 mb-8 text-sm font-mono text-neutral-400">
            Score: <span className="text-amber-400 font-bold">{score}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={onRespawn}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-red-900/50 hover:shadow-red-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Respawn</span>
          </button>

          <button
            onClick={onTitleScreen}
            className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-semibold py-3 px-5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Home className="w-5 h-5" />
            <span>Title Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
