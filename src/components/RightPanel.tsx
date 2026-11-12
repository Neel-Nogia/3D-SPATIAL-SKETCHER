/**
 * RightPanel — Hosts the "Properties" and "Layers" tab panels.
 */
import { useState } from 'react';
import { PropertiesPanel } from './PropertiesPanel';
import { LayersPanel } from './LayersPanel';
import { Sliders, Layers } from 'lucide-react';

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<'properties' | 'layers'>('properties');

  return (
    <div
      className="h-full flex flex-col border-l shrink-0"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        width: '260px',
      }}
    >
      {/* Tab Switcher */}
      <div
        className="flex items-center border-b shrink-0 text-xs font-medium"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'properties'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders size={13} />
          <span>Properties</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'layers'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={13} />
          <span>Layers</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'properties' ? <PropertiesPanel /> : <LayersPanel />}
      </div>
    </div>
  );
}
