import React, { useState } from 'react';
import { WorldSettings } from '../types/game';
import { Settings, Save, Download, Upload, Volume2, Eye, Key, RotateCcw, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: WorldSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: WorldSettings) => void;
  onSaveWorld: (slot: number) => void;
  onLoadWorld: (slot: number) => void;
  onExportWorld: () => void;
  onImportWorld: (jsonStr: string) => void;
  onResetWorld: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onSaveWorld,
  onLoadWorld,
  onExportWorld,
  onImportWorld,
  onResetWorld,
}) => {
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'game' | 'world' | 'controls'>('game');

  if (!isOpen) return null;

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (importText.trim()) {
      onImportWorld(importText);
      setImportText('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-stone-800 text-stone-100 border-4 border-stone-600 rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 p-3 flex justify-between items-center border-b-2 border-stone-700">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('game')}
              className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition ${
                activeTab === 'game' ? 'bg-stone-700 text-amber-400 border border-amber-500' : 'bg-stone-800 hover:bg-stone-700'
              }`}
            >
              <Settings className="w-4 h-4" /> Graphics & Audio
            </button>
            <button
              onClick={() => setActiveTab('world')}
              className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition ${
                activeTab === 'world' ? 'bg-stone-700 text-amber-400 border border-amber-500' : 'bg-stone-800 hover:bg-stone-700'
              }`}
            >
              <Save className="w-4 h-4" /> World Saves
            </button>
            <button
              onClick={() => setActiveTab('controls')}
              className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition ${
                activeTab === 'controls' ? 'bg-stone-700 text-amber-400 border border-amber-500' : 'bg-stone-800 hover:bg-stone-700'
              }`}
            >
              <Key className="w-4 h-4" /> Keybinds
            </button>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-stone-700 rounded text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {activeTab === 'game' && (
            <div className="flex flex-col gap-4">
              {/* Render Distance */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-stone-300">
                  <span>Render Distance</span>
                  <span>{settings.renderDistance} Chunks</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="6"
                  step="1"
                  value={settings.renderDistance}
                  onChange={(e) => onUpdateSettings({ ...settings, renderDistance: parseInt(e.target.value) })}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* FOV */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-stone-300">
                  <span>Field of View (FOV)</span>
                  <span>{settings.fov}</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="110"
                  step="1"
                  value={settings.fov}
                  onChange={(e) => onUpdateSettings({ ...settings, fov: parseInt(e.target.value) })}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Sensitivity */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-stone-300">
                  <span>Mouse Sensitivity</span>
                  <span>{Math.round(settings.sensitivity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={settings.sensitivity}
                  onChange={(e) => onUpdateSettings({ ...settings, sensitivity: parseFloat(e.target.value) })}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Sound Volume */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-stone-300">
                  <span>Sound Effects Volume</span>
                  <span>{Math.round(settings.soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={(e) => onUpdateSettings({ ...settings, soundVolume: parseFloat(e.target.value) })}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Music Volume */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-stone-300">
                  <span>Music Volume</span>
                  <span>{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => onUpdateSettings({ ...settings, musicVolume: parseFloat(e.target.value) })}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'world' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((slot) => (
                  <div key={slot} className="bg-stone-900 p-3 rounded border border-stone-700 flex flex-col gap-2 text-center">
                    <span className="text-xs font-bold text-amber-400">Save Slot {slot}</span>
                    <button
                      onClick={() => onSaveWorld(slot)}
                      className="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-bold transition"
                    >
                      Save Slot {slot}
                    </button>
                    <button
                      onClick={() => onLoadWorld(slot)}
                      className="bg-amber-700 hover:bg-amber-600 text-white px-2 py-1 rounded text-xs font-bold transition"
                    >
                      Load Slot {slot}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onExportWorld}
                  className="flex-1 bg-stone-700 hover:bg-stone-600 text-stone-200 px-3 py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 border border-stone-600"
                >
                  <Download className="w-4 h-4 text-green-400" /> Export Save JSON
                </button>
                <button
                  onClick={onResetWorld}
                  className="bg-red-800 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 border border-red-600"
                >
                  <RotateCcw className="w-4 h-4" /> Reset World
                </button>
              </div>

              <form onSubmit={handleImport} className="flex flex-col gap-2">
                <span className="text-xs font-bold text-stone-400">Import Save Data</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste exported world JSON string..."
                    className="flex-1 bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="bg-stone-700 hover:bg-stone-600 text-white px-3 py-1.5 text-xs rounded font-bold"
                  >
                    Import
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-stone-900 p-3 rounded border border-stone-700">
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">WASD</span>
                <span>Move</span>
              </div>
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">Space</span>
                <span>Jump / Fly UP</span>
              </div>
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">Shift</span>
                <span>Sneak / Fly Down</span>
              </div>
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">Left Click</span>
                <span>Mine / Break Block</span>
              </div>
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">Right Click</span>
                <span>Place Block / Open</span>
              </div>
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">Key E</span>
                <span>Open Inventory</span>
              </div>
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">Key F3</span>
                <span>Toggle Debug Overlay</span>
              </div>
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">Slash (/)</span>
                <span>Open Chat / Commands</span>
              </div>
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">1 - 9</span>
                <span>Select Hotbar Slot</span>
              </div>
              <div className="flex justify-between p-1 bg-stone-800/50 rounded">
                <span className="text-amber-400">ESC</span>
                <span>Pause / Unlock Cursor</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
