/**
 * Shared KPR/DP schedule calculator.
 * Used by both schemes/new (create) and schemes/[id] (update plan).
 */

export interface Stage {
  stage_type: string;
  stage_order: number;
  amount_type: string;
  stage_value: number;
  interval_months: number;
  reduces_dp: boolean;
}

export interface ScheduleResult {
  housePrice: number;
  customerName: string;
  productName: string;
  projectName: string;
  stages: any[];
  kprAmount: number;
  kprPct: number;
  kprMonthly: number;
  kprRate: number;
  kprTenor: number;
  totalKprInterest: number;
  kprSchedule: any[];
}

export function calculateSchedule(params: {
  housePrice: number;
  customerName: string;
  productName: string;
  projectName: string;
  bookingDate: string;
  stages: Stage[];
}): ScheduleResult {
  const { housePrice, customerName, productName, projectName, bookingDate, stages } = params;

  let otherTotal = 0;
  let kprRate = 0;
  let kprTenor = 0;
  const previewStages: any[] = [];
  let currentDate = new Date(bookingDate);

  let paidBeforeStage = 0;
  const sorted = [...stages].sort((a, b) => a.stage_order - b.stage_order);

  for (const stage of sorted) {
    if ((stage.stage_type || "").toUpperCase() === "KPR") {
      kprRate = Number(stage.stage_value || 0);
      kprTenor = Number(stage.interval_months || 0);
      continue;
    }

    let amount = 0;
    if ((stage.amount_type || "").toUpperCase() === "PERCENTAGE") {
      amount = housePrice * Number(stage.stage_value || 0) / 100;
    } else {
      amount = Number(stage.stage_value || 0);
    }

    const reducesDp = !!stage.reduces_dp;
    if (!reducesDp) {
      otherTotal += amount;
    }

    if (Number(stage.interval_months) > 0) {
      currentDate = new Date(currentDate);
      currentDate.setMonth(currentDate.getMonth() + Number(stage.interval_months));
    }

    const unpaidBefore = Math.round((housePrice - paidBeforeStage) * 100) / 100;
    paidBeforeStage += amount;
    const unpaidAfter = Math.round((housePrice - paidBeforeStage) * 100) / 100;

    previewStages.push({
      ...stage,
      amount,
      sebelum_pengurangan: unpaidBefore,
      setelah_pengurangan: unpaidAfter,
      due_date: currentDate.toISOString().split("T")[0],
    });
  }

  const kprAmount = Math.max(0, housePrice - otherTotal);
  let kprMonthly = 0;
  const kprSchedule: any[] = [];

  if (kprAmount > 0 && kprTenor > 0 && kprRate > 0) {
    const mr = kprRate / 100 / 12;
    const np = kprTenor * 12;
    kprMonthly = (kprAmount * (mr * Math.pow(1 + mr, np))) / (Math.pow(1 + mr, np) - 1);
    const kprStartDate = new Date(currentDate);
    kprStartDate.setMonth(kprStartDate.getMonth() + 1);
    let runningBalance = kprAmount;
    for (let i = 1; i <= np; i++) {
      const dueDate = new Date(kprStartDate);
      dueDate.setMonth(dueDate.getMonth() + i - 1);
      const sebelum = Math.round(runningBalance * 100) / 100;
      const interestPayment = runningBalance * mr;
      const principalPayment = kprMonthly - interestPayment;
      runningBalance -= principalPayment;
      const setelah = Math.max(0, Math.round(runningBalance * 100) / 100);
      kprSchedule.push({
        due_date: dueDate.toISOString().split("T")[0],
        amount: Math.round(kprMonthly * 100) / 100,
        principal: Math.round(principalPayment * 100) / 100,
        interest: Math.round(interestPayment * 100) / 100,
        sebelum_pengurangan: sebelum,
        setelah_pengurangan: setelah,
      });
    }
  } else if (kprAmount > 0 && kprTenor > 0) {
    kprMonthly = kprAmount / (kprTenor * 12);
    const kprStartDate = new Date(currentDate);
    kprStartDate.setMonth(kprStartDate.getMonth() + 1);
    let runningBalance = kprAmount;
    for (let i = 1; i <= kprTenor * 12; i++) {
      const dueDate = new Date(kprStartDate);
      dueDate.setMonth(dueDate.getMonth() + i - 1);
      const sebelum = Math.round(runningBalance * 100) / 100;
      const principalPayment = kprMonthly;
      runningBalance -= principalPayment;
      const setelah = Math.max(0, Math.round(runningBalance * 100) / 100);
      kprSchedule.push({
        due_date: dueDate.toISOString().split("T")[0],
        amount: Math.round(kprMonthly * 100) / 100,
        principal: Math.round(principalPayment * 100) / 100,
        interest: 0,
        sebelum_pengurangan: sebelum,
        setelah_pengurangan: setelah,
      });
    }
  }

  const totalKprPrincipal = kprSchedule.reduce((sum, r) => sum + r.principal, 0);
  const totalKprInterest = kprSchedule.reduce((sum, r) => sum + r.interest, 0);
  const kprPct = housePrice > 0 ? Math.round(kprAmount / housePrice * 100 * 100) / 100 : 0;

  return {
    housePrice,
    customerName,
    productName,
    projectName,
    stages: previewStages,
    kprAmount,
    kprPct,
    kprMonthly,
    kprRate,
    kprTenor,
    totalKprInterest,
    kprSchedule,
  };
}
