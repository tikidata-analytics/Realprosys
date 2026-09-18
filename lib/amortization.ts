export interface AmortizationRow {
  month: number;
  date: string;
  totalPayment: number;
  principalPayment: number;
  interestPayment: number;
  remainingPrincipal: number;
  installmentNumber: number;
}

export interface AmortizationResult {
  housePrice: number;
  downPayment: number;
  loanAmount: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  tenorYears: number;
  tenorMonths: number;
  rows: AmortizationRow[];
}

export function calculateAmortization(
  housePrice: number,
  downPaymentPct: number,
  tenorYears: number,
  annualInterestRate: number,
  startDate: Date = new Date()
): AmortizationResult {
  const downPayment = housePrice * (downPaymentPct / 100);
  const loanAmount = housePrice - downPayment;
  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = tenorYears * 12;

  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = loanAmount / numPayments;
  } else {
    monthlyPayment =
      (loanAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  const rows: AmortizationRow[] = [];
  let remainingPrincipal = loanAmount;
  let totalInterest = 0;

  for (let i = 1; i <= numPayments; i++) {
    const interestPayment = remainingPrincipal * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingPrincipal -= principalPayment;
    totalInterest += interestPayment;

    // Calculate date for this month
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    rows.push({
      month: i,
      date: paymentDate.toISOString().split("T")[0],
      totalPayment: Math.round(monthlyPayment * 100) / 100,
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      remainingPrincipal: Math.max(0, Math.round(remainingPrincipal * 100) / 100),
      installmentNumber: i,
    });
  }

  return {
    housePrice,
    downPayment: Math.round(downPayment * 100) / 100,
    loanAmount: Math.round(loanAmount * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round((monthlyPayment * numPayments) * 100) / 100,
    tenorYears,
    tenorMonths: numPayments,
    rows,
  };
}
