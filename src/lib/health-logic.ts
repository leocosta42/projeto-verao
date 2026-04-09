export type InjectionSite = 
  | "Abdômen (Superior Dir.)" 
  | "Abdômen (Superior Esq.)" 
  | "Abdômen (Inferior Dir.)" 
  | "Abdômen (Inferior Esq.)" 
  | "Coxa Direita" 
  | "Coxa Esquerda" 
  | "Braço Direito" 
  | "Braço Esquerdo";

export const INJECTION_SITES: InjectionSite[] = [
  "Abdômen (Superior Dir.)",
  "Braço Esquerdo",
  "Abdômen (Inferior Esq.)",
  "Coxa Direita",
  "Abdômen (Superior Esq.)",
  "Braço Direito",
  "Abdômen (Inferior Dir.)",
  "Coxa Esquerda"
];

export function calculateBMI(weightKg: number, heightCm: number): { value: number; label: string; color: string } {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  
  if (bmi < 18.5) return { value: bmi, label: "Abaixo do peso", color: "#facc15" };
  if (bmi < 25) return { value: bmi, label: "Peso Normal", color: "#10b981" };
  if (bmi < 30) return { value: bmi, label: "Sobrepeso", color: "#f97316" };
  if (bmi < 35) return { value: bmi, label: "Obesidade Grau I", color: "#ef4444" };
  if (bmi < 40) return { value: bmi, label: "Obesidade Grau II", color: "#dc2626" };
  return { value: bmi, label: "Obesidade Grau III", color: "#991b1b" };
}

export function getNextInjectionSite(lastSiteName: string | null): InjectionSite {
  if (!lastSiteName) return INJECTION_SITES[0];
  const currentIndex = INJECTION_SITES.indexOf(lastSiteName as InjectionSite);
  const nextIndex = (currentIndex + 1) % INJECTION_SITES.length;
  return INJECTION_SITES[nextIndex];
}

export function calculateWeightLossStats(initialWeight: number, currentWeight: number, targetWeight: number) {
  const lost = initialWeight - currentWeight;
  const remaining = currentWeight - targetWeight;
  const progressPercent = (lost / (initialWeight - targetWeight)) * 100;
  const totalPercentageLost = (lost / initialWeight) * 100;
  
  return {
    lost: parseFloat(lost.toFixed(1)),
    remaining: parseFloat(remaining.toFixed(1)),
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    totalPercentageLost,
    isMilestoneReached: totalPercentageLost >= 5
  };
}
