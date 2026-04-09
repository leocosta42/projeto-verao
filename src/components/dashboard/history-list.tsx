'use client';

import { Calendar, Trash2, TrendingDown, TrendingUp } from 'lucide-react';

interface HistoryItem {
  id: string;
  date: string;
  weight: number;
  difference?: number;
}

interface Props {
  items: HistoryItem[];
  onDelete?: (id: string) => void;
}

export function HistoryList({ items, onDelete }: Props) {
  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 dark:text-white">Registros Recentes</h3>
        <button className="text-xs text-indigo-500 font-bold hover:underline">Ver tudo</button>
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-900">
        {items.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Calendar className="mx-auto mb-2 opacity-20" size={40} />
            <p>Nenhum registro ainda</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <span className="text-xs font-bold leading-none text-center">
                    {item.date.split('/')[0]}<br/>{item.date.split('/')[1]}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{item.weight} kg</p>
                  <div className="flex items-center gap-1 text-[10px]">
                    {item.difference && item.difference < 0 ? (
                      <span className="text-emerald-500 flex items-center gap-0.5">
                        <TrendingDown size={10} /> {item.difference}kg
                      </span>
                    ) : (
                      <span className="text-slate-400">Estável</span>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => onDelete?.(item.id)}
                className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
