'use client';

import { Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';

interface Dose {
  id: string;
  date: Date;
  isCompleted: boolean;
  isNext?: boolean;
}

export function DoseScheduler({ lastDoseDate }: { lastDoseDate: Date }) {
  // Gera as próximas 4 doses (ciclo de 7 dias)
  const doses: Dose[] = Array.from({ length: 4 }).map((_, i) => {
    const doseDate = new Date(lastDoseDate);
    doseDate.setDate(lastDoseDate.getDate() + (i + 1) * 7);
    return {
      id: i.toString(),
      date: doseDate,
      isCompleted: false,
      isNext: i === 0
    };
  });

  return (
    <div className="glass-card rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <CalendarIcon className="text-indigo-500" size={20} />
        <h3 className="font-bold">Ciclo de Aplicações</h3>
      </div>

      <div className="space-y-4">
        {doses.map((dose) => (
          <div 
            key={dose.id} 
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
              dose.isNext 
              ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' 
              : 'border-slate-100 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dose.isNext ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <Clock size={16} />
              </div>
              <div>
                <p className="font-bold text-sm">
                  {dose.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </p>
                <p className="text-[10px] text-slate-400 uppercase font-bold">
                  {dose.isNext ? 'Próxima Dose' : 'Planejada'}
                </p>
              </div>
            </div>
            {dose.isCompleted ? (
              <CheckCircle2 className="text-emerald-500" size={20} />
            ) : (
              <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-700 rounded-full"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
