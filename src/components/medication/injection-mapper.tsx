'use client';

import { Droplet } from 'lucide-react';
import { INJECTION_SITES, type InjectionSite } from '@/lib/health-logic';

interface Props {
  lastSite: string | null;
  suggestedSite: string;
  onSelect?: (site: string) => void;
}

export function InjectionMapper({ lastSite, suggestedSite, onSelect }: Props) {
  return (
    <div className="flex flex-col items-center bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
      <div className="text-center mb-6">
        <h4 className="font-bold text-slate-800 dark:text-white">Mapa de Aplicação</h4>
        <p className="text-xs text-slate-400">Clique na área que deseja registrar</p>
      </div>

      <div className="relative w-full max-w-[300px] h-[350px] bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 flex justify-center">
        {/* Representação simplificada do tronco/corpo via grid e formas */}
        <div className="relative w-full h-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-2 gap-4 p-4">
          
          {INJECTION_SITES.map((site) => {
            const isSuggested = site === suggestedSite;
            const isLast = site === lastSite;

            return (
              <button
                key={site}
                onClick={() => onSelect?.(site)}
                className={`
                  relative group flex items-center justify-center p-3 rounded-xl border transition-all
                  ${isSuggested ? 'bg-emerald-50 border-emerald-500 text-emerald-600 scale-105 shadow-md z-10' : ''}
                  ${isLast ? 'bg-indigo-50 border-indigo-500 text-indigo-600 opacity-60' : ''}
                  ${!isSuggested && !isLast ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300' : ''}
                `}
              >
                <div className="flex flex-col items-center gap-1">
                  <Droplet size={14} className={isSuggested ? 'animate-bounce' : ''} />
                  <span className="text-[9px] font-bold leading-tight uppercase text-center">{site}</span>
                </div>
                
                {isSuggested && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-slate-500 uppercase font-bold">Sugestão</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-indigo-500 rounded-full opacity-60"></div>
          <span className="text-slate-500 uppercase font-bold">Anterior</span>
        </div>
      </div>
    </div>
  );
}
