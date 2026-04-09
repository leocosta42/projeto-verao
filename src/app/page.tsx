'use client';

import { useState, useEffect } from 'react';
import { 
  Droplet, 
  Target, 
  Trophy,
  Plus,
  Settings,
  X,
  Home,
  BarChart2,
  Calendar,
  Activity,
  DownloadCloud,
  Trash2,
  Clock,
  Info,
  Syringe,
  Ruler,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateBMI, calculateWeightLossStats, getNextInjectionSite } from '@/lib/health-logic';
import { supabase } from '@/lib/supabase';



function calculateTimeMetrics(logs: any[], initialWeight: number) {
  if (!logs || logs.length === 0) return { week1: 0, week2: 0, month1: 0, month3: 0, streak: 0 };
  
  const parseDate = (ddmm: string) => {
    const [d, m] = ddmm.split('/');
    return new Date(new Date().getFullYear(), parseInt(m) - 1, parseInt(d)).getTime();
  };

  const sorted = [...logs].sort((a,b) => parseDate(b.date) - parseDate(a.date));
  const currentW = sorted[0].weight;
  const currentT = parseDate(sorted[0].date);
  
  const getDiff = (days: number) => {
    const target = currentT - (days * 86400000);
    let pastLog = sorted.find(l => parseDate(l.date) <= target + (2 * 86400000));
    let pastW = pastLog ? pastLog.weight : initialWeight;
    return currentW - pastW; 
  };

  let streak = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].weight <= sorted[i+1].weight) streak++;
    else break;
  }
  if (streak === 0 && logs.length > 0) streak = 1;

  return {
    week1: getDiff(7),
    week2: getDiff(14),
    month1: getDiff(30),
    month3: getDiff(90),
    streak: streak
  };
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [mounted, setMounted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [helpInfo, setHelpInfo] = useState<{title: string, text: string} | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<{id: string, date: string, weight: number}[]>([]);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [lastInjectionSite, setLastInjectionSite] = useState("Coxa Direita");
  
  const [userProfile, setUserProfile] = useState({
    height: 175,
    initialWeight: 90,
    targetWeight: 75,
    dosage: 2.5
  });

  const [waterCups, setWaterCups] = useState(0);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Body measurements state
  const [measurements, setMeasurements] = useState<{id: string, date: string, cintura: number, busto: number, quadril: number, coxa: number}[]>([]);
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [measureDate, setMeasureDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [measureInputs, setMeasureInputs] = useState({ cintura: '', busto: '', quadril: '', coxa: '' });
  const [measureGoals, setMeasureGoals] = useState({ meta_cintura: 0, meta_busto: 0, meta_quadril: 0, meta_coxa: 0 });

  const bmi = calculateBMI(currentWeight, userProfile.height);
  const stats = calculateWeightLossStats(userProfile.initialWeight, currentWeight, userProfile.targetWeight);
  const nextSite = getNextInjectionSite(lastInjectionSite);
  const timeStats = calculateTimeMetrics(logs, userProfile.initialWeight);

  useEffect(() => {
    setMounted(true);

    const loadCloudData = async () => {
      try {
        const { data: profile, error: pError } = await supabase.from('user_profile').select('*').limit(1).single();
        if (pError) console.error("Erro ao carregar perfil:", pError);

        if (profile) {
          setProfileId(profile.id);
          setUserProfile({
            height: profile.height,
            initialWeight: profile.initial_weight,
            targetWeight: profile.target_weight,
            dosage: profile.dosage
          });
          if (profile.last_injection_site) setLastInjectionSite(profile.last_injection_site);
          setMeasureGoals({
            meta_cintura: profile.meta_cintura || 0,
            meta_busto: profile.meta_busto || 0,
            meta_quadril: profile.meta_quadril || 0,
            meta_coxa: profile.meta_coxa || 0
          });
          
          const today = new Date().toISOString().split('T')[0];
          if (profile.water_date === today) {
            setWaterCups(profile.water_cups || 0);
          } else {
            setWaterCups(0);
          }
        }
        
        const { data: cloudLogs, error: lError } = await supabase.from('weight_logs').select('*').order('created_at', { ascending: false });
        if (lError) console.error("Erro ao carregar logs:", lError);
        
        if (cloudLogs && cloudLogs.length > 0) {
          setLogs(cloudLogs.map((l: any) => ({
            id: l.id,
            date: l.date,
            weight: parseFloat(l.weight)
          })));
          setCurrentWeight(parseFloat(cloudLogs[0].weight));
        }

        // 3. Pull body measurements
        const { data: cloudMeasures, error: mError } = await supabase.from('body_measurements').select('*').order('created_at', { ascending: false });
        if (mError) console.error("Erro ao carregar medidas:", mError);
        if (cloudMeasures && cloudMeasures.length > 0) {
          setMeasurements(cloudMeasures.map((m: any) => ({
            id: m.id,
            date: m.date,
            cintura: parseFloat(m.cintura || 0),
            busto: parseFloat(m.busto || 0),
            quadril: parseFloat(m.quadril || 0),
            coxa: parseFloat(m.coxa || 0)
          })));
        }
      } catch (err) {
        console.error("Falha na conexão com Supabase:", err);
      }
    };

    loadCloudData();
  }, []);

  const handleWaterClick = async (cups: number) => {
    setWaterCups(cups);
    if (!profileId) return;
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('user_profile').update({ 
      water_cups: cups, 
      water_date: today 
    }).eq('id', profileId);
    if (error) console.error("Erro ao salvar água:", error);
  };

  const handleSaveSettings = async () => {
    setIsSettingsOpen(false);
    if (!profileId) return;
    const { error } = await supabase.from('user_profile').update({
       height: userProfile.height,
       initial_weight: userProfile.initialWeight,
       target_weight: userProfile.targetWeight,
       dosage: userProfile.dosage,
       meta_cintura: measureGoals.meta_cintura,
       meta_busto: measureGoals.meta_busto,
       meta_quadril: measureGoals.meta_quadril,
       meta_coxa: measureGoals.meta_coxa
    }).eq('id', profileId);
    if (error) console.error("Erro ao salvar perfil:", error);
  };

  const handleConfirmInjection = async () => {
    setLastInjectionSite(nextSite);
    if (!profileId) return;
    const { error } = await supabase.from('user_profile').update({ 
      last_injection_site: nextSite 
    }).eq('id', profileId);
    if (error) {
       console.error("Erro ao salvar injeção:", error);
    } else {
      alert("Aplicação registrada com sucesso na nuvem!");
    }
  };

  const openWeightModal = () => {
    setWeightInput(currentWeight.toString());
    setDateInput(new Date().toISOString().split('T')[0]);
    setIsWeightModalOpen(true);
  };

  const handleSaveWeight = async () => {
    const weightVal = parseFloat(weightInput.replace(',', '.'));
    if (!isNaN(weightVal)) {
      const dateParts = dateInput.split('-');
      const formattedDate = `${dateParts[2]}/${dateParts[1]}`;
      const newLog = {
        id: Date.now().toString(),
        date: formattedDate,
        weight: weightVal
      };
      
      const updatedLogs = [newLog, ...logs];
      updatedLogs.sort((a, b) => {
        const [dayA, monthA] = a.date.split('/');
        const [dayB, monthB] = b.date.split('/');
        return (parseInt(monthB)*30 + parseInt(dayB)) - (parseInt(monthA)*30 + parseInt(dayA));
      });

      setLogs(updatedLogs);
      setCurrentWeight(weightVal);
      setIsWeightModalOpen(false);

      const { data, error } = await supabase.from('weight_logs').insert({ date: formattedDate, weight: weightVal }).select().single();
      if (error) {
        console.error("Erro ao salvar peso:", error);
      } else if (data) {
        // Atualiza o log local com o ID real do banco
        setLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, id: data.id } : l));
      }
    }
  };

  const deleteLog = async (id: string) => {
    if (confirm("Deseja realmente excluir este registro?")) {
      const filtered = logs.filter(l => l.id !== id);
      setLogs(filtered);
      if (filtered.length > 0) {
        setCurrentWeight(filtered[0].weight);
      }
      
      // Sempre tenta deletar do banco de dados
      const { error } = await supabase.from('weight_logs').delete().eq('id', id);
      if (error) console.error("Erro ao deletar do banco:", error);
    }
  };

  // Body measurements handlers
  const handleSaveMeasurement = async () => {
    const dateParts = measureDate.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}`;
    const newMeasure = {
      id: Date.now().toString(),
      date: formattedDate,
      cintura: parseFloat(measureInputs.cintura || '0'),
      busto: parseFloat(measureInputs.busto || '0'),
      quadril: parseFloat(measureInputs.quadril || '0'),
      coxa: parseFloat(measureInputs.coxa || '0')
    };
    setMeasurements(prev => [newMeasure, ...prev]);
    setIsMeasureModalOpen(false);
    setMeasureInputs({ cintura: '', busto: '', quadril: '', coxa: '' });

    const { data, error } = await supabase.from('body_measurements').insert({
      date: formattedDate,
      cintura: newMeasure.cintura,
      busto: newMeasure.busto,
      quadril: newMeasure.quadril,
      coxa: newMeasure.coxa
    }).select().single();
    if (error) console.error("Erro ao salvar medida:", error);
    if (data) setMeasurements(prev => prev.map(m => m.id === newMeasure.id ? { ...m, id: data.id } : m));
  };

  const deleteMeasurement = async (id: string) => {
    if (confirm("Deseja excluir esta medida?")) {
      setMeasurements(prev => prev.filter(m => m.id !== id));
      const { error } = await supabase.from('body_measurements').delete().eq('id', id);
      if (error) console.error("Erro ao deletar medida:", error);
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    const paddingStart = Array.from({ length: firstDay }, (_, i) => ({
      day: prevMonthDays - firstDay + i + 1,
      isCurrentMonth: false,
      dateStr: `${prevMonthDays - firstDay + i + 1}/${month === 0 ? 12 : month}`
    }));

    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      isCurrentMonth: true,
      dateStr: `${(i + 1).toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}`
    }));

    return [...paddingStart, ...currentMonthDays];
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#eef2f6] min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-[420px] bg-[#f8fafc] min-h-screen relative shadow-2xl overflow-x-hidden pb-32">
        
        {/* HEADER */}
        <header className="px-6 pt-12 pb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-bold mb-1">
              {activeTab === 'home' && 'Visão Geral'}
              {activeTab === 'schedule' && 'Tratamento'}
              {activeTab === 'calendar' && 'Calendário de Evolução'}
              {activeTab === 'data' && 'Histórico'}
              {activeTab === 'measures' && 'Antropometria'}
            </p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'home' && 'Saúde'}
              {activeTab === 'schedule' && 'Ciclos'}
              {activeTab === 'calendar' && 'Registro Diário'}
              {activeTab === 'data' && 'Dados Clínicos'}
              {activeTab === 'measures' && 'Medidas'}
            </h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 hover:scale-105 transition-transform"
          >
            <Settings size={20} className="text-slate-500" />
          </button>
        </header>

        {/* --- TAB: HOME --- */}
        {activeTab === 'home' && (
          <motion.main 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="px-5 space-y-5"
          >
            {/* METRICS DASHBOARD */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 relative overflow-hidden flex flex-col gap-6">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-60" />
              
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Massa Atual</p>
                    <button onClick={() => setHelpInfo({title: 'Massa Atual', text: 'Seu peso bruto registrado. Número mestre que baseia sua Tendência.'})}><Info size={12} className="text-slate-300 hover:text-indigo-400 transition-colors" /></button>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <h2 className="text-[64px] font-black tracking-tighter text-slate-900 leading-none">{currentWeight}</h2>
                    <span className="text-xl font-bold text-slate-400">kg</span>
                  </div>
                </div>
                <div className="px-4 py-2 bg-emerald-50 bg-opacity-70 rounded-xl flex flex-col items-center shadow-sm relative pt-4">
                  <button className="absolute top-1 right-1" onClick={() => setHelpInfo({title: 'Índice de Massa Corporal', text: 'Cálculo internacional (Peso / Altura²). Indica a classificação clínica de Obesidade/Sobrepeso.'})}><Info size={10} className="text-emerald-300" /></button>
                  <span className="text-[9px] uppercase font-bold text-emerald-600 mb-0.5">IMC</span>
                  <span className="font-black text-emerald-900 text-lg leading-none">{bmi.value.toFixed(1)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-amber-500 rounded-lg"><Target size={18} strokeWidth={2}/></div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Meta Físico</p>
                      <button onClick={() => setHelpInfo({title: 'Meta Físico', text: 'O peso alvo que você deseja atingir. Base de cálculo para todas as barras de avanço. Altere isto na Roda Dentada se necessário.'})}><Info size={10} className="text-slate-300 hover:text-amber-400 transition-colors" /></button>
                    </div>
                    <p className="text-sm font-black text-slate-900">{userProfile.targetWeight} kg</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg"><Trophy size={18} strokeWidth={2}/></div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Eliminado</p>
                      <button onClick={() => setHelpInfo({title: 'Peso Eliminado', text: 'Diferença matemática absoluta entre seu "Peso de Partida" e hoje.'})}><Info size={10} className="text-slate-300 hover:text-indigo-400 transition-colors" /></button>
                    </div>
                    <p className="text-sm font-black text-emerald-600">-{stats.lost} kg</p>
                  </div>
                </div>
              </div>
              
              {/* WEIGHT PROGRESS BAR */}
              <div className="border-t border-slate-50 pt-4 relative z-10">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Progresso da Meta</p>
                    <p className="text-xs font-bold text-slate-600">
                      {currentWeight > userProfile.targetWeight 
                        ? `Faltam ${(currentWeight - userProfile.targetWeight).toFixed(1)} kg`
                        : "Meta alcançada! 🎉"}
                    </p>
                  </div>
                  <span className="text-xl font-black text-indigo-600">{stats.progressPercent.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.progressPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* COMPACT WATER TRACKER */}
            <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Droplet size={14} className="text-cyan-500" />
                  <h3 className="font-bold text-slate-700 text-sm">Hidratação (Hoje)</h3>
                  <button onClick={() => setHelpInfo({title: 'Hidratação (Water Tracker)', text: 'Agonistas GLP-1 pausam a digestão e o sinal de sede. Hidratação agressiva previne náuseas.'})}><Info size={12} className="text-slate-300 hover:text-cyan-400" /></button>
                </div>
                <p className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-1 rounded-md">{waterCups * 250}ml ({waterCups}/10)</p>
              </div>
              <div className="flex justify-between items-center gap-1">
                {[...Array(10)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 h-6 rounded-md cursor-pointer transition-all duration-300 ${i < waterCups ? 'bg-cyan-500 shadow-[0_4px_8px_rgba(6,182,212,0.4)] scale-100' : 'bg-slate-100 hover:bg-slate-200 scale-95'}`} 
                    onClick={() => handleWaterClick(i === waterCups - 1 ? i : i + 1)} 
                  />
                ))}
              </div>
            </div>

            {/* CHART OVERVIEW */}
             <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 text-base">Tendência</h3>
                    <button onClick={() => setHelpInfo({title: 'Gráfico de Tendência', text: 'Curva visual que cruza a linha de corte (em verde) da sua Meta. Observe a inclinação: gráficos em "platô" sem movimento por várias semanas sugerem conversar com seu médico sobre ajustes em mg (titulação da dose).'})}><Info size={14} className="text-slate-300 hover:text-indigo-400 transition-colors" /></button>
                  </div>
                  <p className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full">{stats.progressPercent.toFixed(0)}% Concluído</p>
                </div>
                <div className="h-[180px] w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...logs].reverse()} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                        dy={10} 
                        minTickGap={20}
                      />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                          fontWeight: 'bold',
                          color: '#0f172a'
                        }}
                        itemStyle={{ color: '#4f46e5' }}
                        labelStyle={{ color: '#64748b', fontSize: '12px' }}
                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      {/* Linha Verde Tracejada da Meta */}
                      <ReferenceLine y={userProfile.targetWeight} stroke="#10b981" strokeDasharray="4 4" strokeWidth={2} />
                      <Area 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#4f46e5" 
                        strokeWidth={4} 
                        fill="url(#colorWeight)"
                        activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 3, cursor: 'pointer' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>

            {/* DESEMPENHO TEMPORAL (Gamificação Retrospectiva) */}
            <div className="bg-slate-900 rounded-[32px] p-6 shadow-[0_12px_40px_rgb(0,0,0,0.15)] text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-20" />
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-slate-100 text-base">Desempenho no Tempo</h3>
                  <button onClick={() => setHelpInfo({title: 'Desempenho', text: 'Nesta seção calculamos matematicamente quanto você perdeu voltando no tempo exato (7 dias, 30 dias). Tendência atual mede quantas pesagens seguidas você manteve ou perdeu peso.'})}><Info size={14} className="text-slate-500 hover:text-indigo-400 transition-colors" /></button>
                </div>
                <Activity size={18} className="text-emerald-400" />
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[12px] uppercase tracking-widest font-bold text-slate-400">Tendência Atual (Queda)</span>
                  <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <span className="text-emerald-400 font-black">✓</span>
                    <span className="font-bold text-emerald-400 text-sm">{timeStats.streak} Seq. de Registros</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-800/30 p-4 rounded-2xl">
                     <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1">Últ. Semana</p>
                     <p className={`text-2xl font-black ${timeStats.week1 <= 0 ? 'text-white' : 'text-rose-400'}`}>
                       {timeStats.week1 > 0 ? '+' : ''}{timeStats.week1 <= 0 && timeStats.week1 !== 0 ? '-' : ''}{Math.abs(timeStats.week1).toFixed(1)} <span className="text-sm font-bold text-slate-500">kg</span>
                     </p>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-2xl">
                     <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1">Últ. Mês</p>
                     <p className={`text-2xl font-black ${timeStats.month1 <= 0 ? 'text-white' : 'text-rose-400'}`}>
                       {timeStats.month1 > 0 ? '+' : ''}{timeStats.month1 <= 0 && timeStats.month1 !== 0 ? '-' : ''}{Math.abs(timeStats.month1).toFixed(1)} <span className="text-sm font-bold text-slate-500">kg</span>
                     </p>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-2xl border border-indigo-500/20">
                     <p className="text-indigo-400 text-[10px] uppercase tracking-widest font-bold mb-1">Trimestre</p>
                     <p className={`text-2xl font-black ${timeStats.month3 <= 0 ? 'text-white' : 'text-rose-400'}`}>
                       {timeStats.month3 > 0 ? '+' : ''}{timeStats.month3 <= 0 && timeStats.month3 !== 0 ? '-' : ''}{Math.abs(timeStats.month3).toFixed(1)} <span className="text-sm font-bold text-indigo-200">kg</span>
                     </p>
                  </div>
                  <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                     <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold mb-1">Balanço Total</p>
                     <p className="text-2xl font-black text-emerald-400">
                       -{stats.lost} <span className="text-sm font-bold text-emerald-200">kg</span>
                     </p>
                  </div>
                </div>
              </div>
            </div>

          </motion.main>
        )}

        {/* --- TAB: SCHEDULE (CYCLES) --- */}
        {activeTab === 'schedule' && (
          <motion.main 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-5 space-y-5"
          >
            {/* PROTOCOL CARD */}
            <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-50 relative overflow-hidden">
               <div className="absolute left-0 top-0 w-1.5 h-full bg-indigo-500" />
               <div className="p-6">
                 <div className="flex items-center justify-between mb-5">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Syringe size={18} strokeWidth={2} /></div>
                     <div className="flex items-center gap-2">
                       <h3 className="font-bold text-slate-900 text-base">Mounjaro</h3>
                       <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">{userProfile.dosage} mg</span>
                     </div>
                   </div>
                   <span className="text-[9px] uppercase font-bold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full">Próxima Aplicação</span>
                 </div>
                 
                 <div className="bg-slate-50 rounded-[20px] p-5 flex flex-col items-center text-center gap-3 outline outline-1 outline-slate-100">
                   <div>
                     <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Local Indicado e Seguro</p>
                     <p className="font-black text-slate-800 text-2xl leading-tight">{nextSite}</p>
                     <p className="text-[10px] font-bold text-slate-400 mt-2">Última aplicação feita na: {lastInjectionSite}</p>
                   </div>
                   <button 
                     onClick={handleConfirmInjection}
                     className="w-full mt-2 h-12 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-colors"
                   >
                     Confirmar Aplicação Agora
                   </button>
                 </div>
               </div>
            </div>

            <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-50">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-700 text-sm">Cronograma Estimado</h3>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((week) => (
                  <div key={week} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">W{week}</div>
                      <div>
                        <p className="font-bold text-sm text-slate-700">Dose {week}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{getNextInjectionSite(nextSite)} (Previsão)</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Em {week * 7} dias</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.main>
        )}

        {/* --- TAB: CALENDAR --- */}
        {activeTab === 'calendar' && (
          <motion.main 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-5 space-y-4"
          >
            <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={24}/></button>
                <div className="text-center">
                  <h3 className="text-white font-black text-lg capitalize">
                    {currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                  </h3>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ChevronRight size={24}/></button>
              </div>

              <div className="grid grid-cols-7 gap-y-6 text-center">
                {['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'].map(d => (
                  <span key={d} className="text-[10px] font-bold text-slate-500 uppercase">{d}</span>
                ))}
                
                {getDaysInMonth(currentMonth).map((item, idx) => {
                  const log = logs.find(l => l.date === item.dateStr);
                  
                  // Calcular tendência comparando com o log anterior cronológico
                  const sortedLogs = [...logs].sort((a,b) => {
                    const [da, ma] = a.date.split('/');
                    const [db, mb] = b.date.split('/');
                    return (parseInt(ma)*30 + parseInt(da)) - (parseInt(mb)*30 + parseInt(db));
                  });
                  const logIndex = sortedLogs.findIndex(l => l.date === item.dateStr);
                  const prevLog = logIndex > 0 ? sortedLogs[logIndex - 1] : null;
                  const trend = log && prevLog ? (log.weight < prevLog.weight ? 'down' : log.weight > prevLog.weight ? 'up' : 'neutral') : null;

                  return (
                    <div key={idx} className={`flex flex-col items-center gap-1 ${!item.isCurrentMonth ? 'opacity-20' : ''}`}>
                      <span className={`text-sm font-bold ${log ? 'text-white' : 'text-slate-600'}`}>
                        {item.day}
                      </span>
                      {log && (
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-black text-indigo-400 leading-none">{log.weight}</span>
                          {trend === 'down' && <span className="text-emerald-500 text-[10px] leading-none">▾</span>}
                          {trend === 'up' && <span className="text-rose-500 text-[10px] leading-none">▴</span>}
                          {trend === 'neutral' && <span className="text-slate-500 text-[10px] leading-none">•</span>}
                        </div>
                      )}
                      {!log && item.isCurrentMonth && (
                        <div className="w-1 h-1 rounded-full bg-slate-800 mt-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100">
               <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Activity size={16}/></div>
                  <h4 className="font-bold text-slate-800 text-sm">Resumo da Constância</h4>
               </div>
               <p className="text-[11px] text-slate-400 font-medium ml-11">
                  Você registrou peso em <span className="text-indigo-600 font-bold">{logs.filter(l => l.date.includes(`/${(currentMonth.getMonth()+1).toString().padStart(2, '0')}`)).length} dias</span> este mês.
               </p>
            </div>
          </motion.main>
        )}

        {/* --- TAB: DATA (CLINICAL DATA) --- */}
        {activeTab === 'data' && (
          <motion.main 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="px-5 space-y-5"
          >
            <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-indigo-500" />
                  <h3 className="font-bold text-slate-900 text-base">Registros</h3>
                </div>
                <button 
                  onClick={() => alert("Gerador de PDF será conectado ao Supabase/Backend na fase 2!")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] uppercase font-bold shadow-md hover:bg-slate-800"
                >
                  <DownloadCloud size={12} /> Exportar
                </button>
              </div>

              <div className="space-y-3">
                {logs.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4">Nenhum dado registrado.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 group">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-lg">{log.weight}</span>
                          <span className="text-[10px] font-bold text-slate-400">kg</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <span className="text-sm font-bold text-slate-500">{log.date}</span>
                      </div>
                      <button 
                        onClick={() => deleteLog(log.id)}
                        className="p-2 text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.main>
        )}

        {/* --- TAB: MEASURES --- */}
        {activeTab === 'measures' && (
          <motion.main 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="px-5 space-y-5"
          >
            {/* Goals Summary */}
            {measurements.length > 0 && (
              <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-50">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={16} className="text-amber-500" />
                  <h3 className="font-bold text-slate-700 text-sm">Progresso das Metas</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Cintura', current: measurements[0]?.cintura, goal: measureGoals.meta_cintura, color: 'indigo', help: 'Medida na altura do umbigo. Importante para acompanhar a gordura visceral.' },
                    { label: 'Busto', current: measurements[0]?.busto, goal: measureGoals.meta_busto, color: 'emerald', help: 'Circunferência na altura dos mamilos.' },
                    { label: 'Quadril', current: measurements[0]?.quadril, goal: measureGoals.meta_quadril, color: 'amber', help: 'Medida na parte mais larga dos glúteos.' },
                    { label: 'Coxa', current: measurements[0]?.coxa, goal: measureGoals.meta_coxa, color: 'cyan', help: 'Medida na parte média da coxa (um palmo acima do joelho).' },
                  ].map(item => {
                    const diff = item.goal > 0 ? item.current - item.goal : 0;
                    const progress = item.goal > 0 && item.current > 0 ? Math.min(100, Math.max(0, ((item.current - item.goal) / item.current) * 100)) : 0;
                    const progressInverse = 100 - progress;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-14">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</span>
                          <button onClick={() => setHelpInfo({title: item.label, text: item.help})}><Info size={8} className="text-slate-300"/></button>
                        </div>
                        <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              item.color === 'indigo' ? 'bg-indigo-500' :
                              item.color === 'emerald' ? 'bg-emerald-500' :
                              item.color === 'amber' ? 'bg-amber-500' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${item.goal > 0 ? progressInverse : 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold min-w-[60px] text-right">
                          {item.goal > 0 ? (
                            <span className={diff > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                              {diff > 0 ? `-${diff.toFixed(1)}cm` : '✓ Meta!'}
                            </span>
                          ) : (
                            <span className="text-slate-300">Sem meta</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Measurements History */}
            <div className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-50">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Ruler size={16} className="text-indigo-500" />
                  <h3 className="font-bold text-slate-700 text-sm">Histórico de Medidas</h3>
                </div>
                <button 
                  onClick={() => setIsMeasureModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] uppercase font-bold shadow-md hover:bg-indigo-700"
                >
                  <Plus size={12} /> Adicionar
                </button>
              </div>
              
              {measurements.length === 0 ? (
                <div className="text-center py-8">
                  <Ruler size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Nenhuma medida registrada</p>
                  <p className="text-[10px] text-slate-300 mt-1">Clique em "Adicionar" para começar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {measurements.map(m => (
                    <div key={m.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mb-2">{m.date}</p>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-bold">Cintura</p>
                            <p className="text-sm font-black text-slate-800">{m.cintura}<span className="text-[8px] text-slate-400">cm</span></p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-bold">Busto</p>
                            <p className="text-sm font-black text-slate-800">{m.busto}<span className="text-[8px] text-slate-400">cm</span></p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-bold">Quadril</p>
                            <p className="text-sm font-black text-slate-800">{m.quadril}<span className="text-[8px] text-slate-400">cm</span></p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase font-bold">Coxa</p>
                            <p className="text-sm font-black text-slate-800">{m.coxa}<span className="text-[8px] text-slate-400">cm</span></p>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteMeasurement(m.id)} className="ml-3 text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.main>
        )}

        {/* FLOATING ACTION BUTTON */}
        <AnimatePresence>
          {activeTab === 'home' && (
            <motion.button 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openWeightModal}
              className="absolute bottom-28 right-6 w-[60px] h-[60px] bg-indigo-600 text-white rounded-2xl shadow-[0_12px_25px_rgba(79,70,229,0.4)] flex items-center justify-center z-50 hover:bg-indigo-700 transition-colors"
            >
              <Plus size={28} strokeWidth={2.5} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* FLOATING GLASS BOTTOM NAV */}
        <div className="absolute bottom-6 left-0 w-full px-6 z-40">
          <nav className="bg-white/90 backdrop-blur-xl border border-white rounded-[32px] flex justify-between px-2 py-2 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
            <button 
              onClick={() => setActiveTab('home')} 
              className={`flex flex-col items-center gap-1 min-w-[56px] py-2 rounded-[24px] transition-all ${activeTab === 'home' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Home size={20} strokeWidth={activeTab === 'home' ? 2 : 1.5} />
              <span className="text-[9px] font-bold">Início</span>
            </button>
            <button 
              onClick={() => setActiveTab('calendar')} 
              className={`flex flex-col items-center gap-1 min-w-[50px] py-1.5 rounded-[20px] transition-all ${activeTab === 'calendar' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Calendar size={18} strokeWidth={activeTab === 'calendar' ? 2 : 1.5} />
              <span className="text-[8px] font-bold text-center">Agenda</span>
            </button>
            <button 
              onClick={() => setActiveTab('schedule')} 
              className={`flex flex-col items-center gap-1 min-w-[50px] py-1.5 rounded-[20px] transition-all ${activeTab === 'schedule' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Syringe size={18} strokeWidth={activeTab === 'schedule' ? 2 : 1.5} />
              <span className="text-[8px] font-bold text-center">Tratamento</span>
            </button>
            <button 
              onClick={() => setActiveTab('data')} 
              className={`flex flex-col items-center gap-1 min-w-[50px] py-1.5 rounded-[20px] transition-all ${activeTab === 'data' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Activity size={18} strokeWidth={activeTab === 'data' ? 2 : 1.5} />
              <span className="text-[8px] font-bold text-center">Dados</span>
            </button>
            <button 
              onClick={() => setActiveTab('measures')} 
              className={`flex flex-col items-center gap-1 min-w-[50px] py-1.5 rounded-[20px] transition-all ${activeTab === 'measures' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Ruler size={18} strokeWidth={activeTab === 'measures' ? 2 : 1.5} />
              <span className="text-[8px] font-bold text-center">Medidas</span>
            </button>
          </nav>
        </div>

        {/* SETTINGS MODAL */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-[200] p-6 flex flex-col justify-end pb-8"
              onClick={() => setIsSettingsOpen(false)}
            >
              <div 
                className="bg-white w-full rounded-[36px] p-8 shadow-2xl flex flex-col gap-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Ajustes</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={20}/></button>
                </div>
                
                <div className="space-y-4 pt-4">
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 focus-within:ring-2 ring-indigo-100 transition-shadow">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Altura (cm)</label>
                    <input type="number" value={userProfile.height} onChange={(e) => setUserProfile({...userProfile, height: parseInt(e.target.value)})} className="w-full bg-transparent font-black text-2xl text-slate-900 outline-none" />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 focus-within:ring-2 ring-indigo-100 transition-shadow">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Peso Partida (kg)</label>
                    <input type="number" value={userProfile.initialWeight} onChange={(e) => setUserProfile({...userProfile, initialWeight: parseFloat(e.target.value)})} className="w-full bg-transparent font-black text-2xl text-slate-900 outline-none" />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 focus-within:ring-2 ring-indigo-100 transition-shadow">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Meta Desejada (kg)</label>
                    <input type="number" value={userProfile.targetWeight} onChange={(e) => setUserProfile({...userProfile, targetWeight: parseFloat(e.target.value)})} className="w-full bg-transparent font-black text-2xl text-slate-900 outline-none border-none focus:ring-0" />
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 focus-within:ring-2 ring-indigo-300 transition-shadow">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 block mb-1">Dose Atual Mounjaro (mg)</label>
                    <select 
                      value={userProfile.dosage} 
                      onChange={(e) => setUserProfile({...userProfile, dosage: parseFloat(e.target.value)})} 
                      className="w-full bg-transparent font-black text-2xl text-indigo-900 outline-none cursor-pointer"
                    >
                      <option value={2.5}>2.5 mg</option>
                      <option value={5.0}>5.0 mg</option>
                      <option value={7.5}>7.5 mg</option>
                      <option value={10}>10.0 mg</option>
                      <option value={12.5}>12.5 mg</option>
                      <option value={15}>15.0 mg</option>
                    </select>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-amber-500 mb-3">Metas de Medidas (cm)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Cintura', key: 'meta_cintura' as const },
                        { label: 'Busto', key: 'meta_busto' as const },
                        { label: 'Quadril', key: 'meta_quadril' as const },
                        { label: 'Coxa', key: 'meta_coxa' as const },
                      ].map(field => (
                        <div key={field.key} className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
                          <label className="text-[9px] uppercase font-bold tracking-widest text-amber-600 block mb-1">{field.label}</label>
                          <input 
                            type="number" step="0.1"
                            value={measureGoals[field.key] || ''} 
                            onChange={(e) => setMeasureGoals(prev => ({...prev, [field.key]: parseFloat(e.target.value) || 0}))}
                            className="w-full bg-transparent font-black text-lg text-amber-900 outline-none" 
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveSettings} 
                    className="w-full mt-4 h-14 bg-slate-900 text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(15,23,42,0.3)] hover:scale-[1.02] transition-transform"
                  >
                    Salvar Perfil
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WEIGHT REGISTER MODAL */}
        <AnimatePresence>
          {isWeightModalOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[210] p-6 flex flex-col justify-end pb-8"
              onClick={() => setIsWeightModalOpen(false)}
            >
              <div 
                className="bg-white w-full rounded-[36px] p-8 shadow-2xl flex flex-col gap-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Registrar Peso</h2>
                  <button onClick={() => setIsWeightModalOpen(false)} className="p-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={20}/></button>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 focus-within:ring-2 ring-indigo-100 transition-shadow">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Data da Medição</label>
                    <input 
                      type="date" 
                      value={dateInput} 
                      onChange={(e) => setDateInput(e.target.value)} 
                      className="w-full bg-transparent font-black text-lg text-slate-900 outline-none cursor-pointer" 
                    />
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 focus-within:ring-2 ring-indigo-300 transition-shadow">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 block mb-1">Peso Físico (kg)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={weightInput} 
                      onChange={(e) => setWeightInput(e.target.value)} 
                      className="w-full bg-transparent font-black text-4xl tracking-tighter text-indigo-900 outline-none" 
                      autoFocus
                    />
                  </div>
                  <button 
                    onClick={handleSaveWeight} 
                    className="w-full mt-4 h-14 bg-indigo-600 text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-colors"
                  >
                    Salvar Registro
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MEASUREMENTS REGISTER MODAL */}
        <AnimatePresence>
          {isMeasureModalOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[210] p-6 flex flex-col justify-end pb-8"
              onClick={() => setIsMeasureModalOpen(false)}
            >
              <div 
                className="bg-white w-full rounded-[36px] p-8 shadow-2xl flex flex-col gap-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Nova Medida</h2>
                  <button onClick={() => setIsMeasureModalOpen(false)} className="p-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={20}/></button>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Data</label>
                  <input 
                    type="date" 
                    value={measureDate} 
                    onChange={(e) => setMeasureDate(e.target.value)} 
                    className="w-full bg-transparent font-black text-lg text-slate-900 outline-none cursor-pointer" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Cintura (cm)', key: 'cintura' as const, color: 'indigo', help: 'Passe a fita na menor parte da cintura ou na altura do umbigo.' },
                    { label: 'Busto (cm)', key: 'busto' as const, color: 'emerald', help: 'Passe a fita sobre a protuberância mamária.' },
                    { label: 'Quadril (cm)', key: 'quadril' as const, color: 'amber', help: 'Contorne a maior parte dos glúteos com a fita.' },
                    { label: 'Coxa (cm)', key: 'coxa' as const, color: 'cyan', help: 'Meça a maior parte da coxa, geralmente na metade entre quadril e joelho.' },
                  ].map(field => (
                    <div key={field.key} className={`p-4 rounded-3xl border ${
                      field.color === 'indigo' ? 'bg-indigo-50 border-indigo-100' :
                      field.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                      field.color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-cyan-50 border-cyan-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-[9px] uppercase font-bold tracking-widest block ${
                          field.color === 'indigo' ? 'text-indigo-500' :
                          field.color === 'emerald' ? 'text-emerald-500' :
                          field.color === 'amber' ? 'text-amber-500' : 'text-cyan-500'
                        }`}>{field.label}</label>
                        <button onClick={() => setHelpInfo({title: field.label.split(' ')[0], text: field.help})}><Info size={10} className="opacity-40 hover:opacity-100 transition-opacity"/></button>
                      </div>
                      <input 
                        type="number" step="0.1"
                        value={measureInputs[field.key]} 
                        onChange={(e) => setMeasureInputs(prev => ({...prev, [field.key]: e.target.value}))}
                        className="w-full bg-transparent font-black text-2xl text-slate-900 outline-none" 
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleSaveMeasurement} 
                  className="w-full h-14 bg-indigo-600 text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-colors"
                >
                  Salvar Medidas
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* INFO/HELP MODAL */}
        <AnimatePresence>
          {helpInfo && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-md z-[300] p-6 flex flex-col justify-center items-center"
              onClick={() => setHelpInfo(null)}
            >
              <div 
                className="bg-white w-full max-w-[320px] rounded-[32px] p-8 shadow-2xl flex flex-col gap-4 border border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-full"><Info size={24} strokeWidth={2.5}/></div>
                  <h3 className="text-xl font-black text-slate-900">{helpInfo.title}</h3>
                </div>
                <p className="text-slate-500 leading-relaxed font-medium">
                  {helpInfo.text}
                </p>
                <button 
                  onClick={() => setHelpInfo(null)} 
                  className="w-full mt-4 h-12 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
