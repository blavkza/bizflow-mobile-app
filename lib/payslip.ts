import { User } from '@/types/auth';
import { Payment, Payslip, PayslipSummary } from '@/types/payslip';
import { format } from 'date-fns';

export const getPayslipsFromUser = (user: User | null): Payslip[] => {
  const rawPayments: Payment[] =
    user?.employee?.payments || (user?.employee as any)?.Payments || [];

  if (!rawPayments || rawPayments.length === 0) return [];

  const payslips = rawPayments.map((payment) => {
    const netPay = Number(payment.amount) || 0;
    const basePay = Number(payment.baseAmount) || 0;
    const overtimePay = Number(payment.overtimeAmount) || 0;

    const grossPay = basePay + overtimePay;
    const deductions = Math.max(0, grossPay - netPay);

    const date = new Date(payment.payDate);

    return {
      id: payment.id,
      month: format(date, 'MMMM'),
      year: date.getFullYear(),
      grossPay: grossPay,
      netPay: netPay,
      deductions: deductions,
      overtime: overtimePay,
      status: mapPaymentStatus(payment.status),
      downloadUrl: undefined, // Backend would provide this URL
      rawDate: date,
    };
  });

  // 3. Sort by date descending (newest first)
  return payslips.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
};

export const getPayslipSummary = (payslips: Payslip[]): PayslipSummary => {
  return payslips.reduce(
    (acc, curr) => ({
      totalEarnings: acc.totalEarnings + curr.netPay,
      totalOvertime: acc.totalOvertime + curr.overtime,
      count: acc.count + 1,
    }),
    { totalEarnings: 0, totalOvertime: 0, count: 0 }
  );
};

// Helper to map Database Status to UI Status
const mapPaymentStatus = (status: string): Payslip['status'] => {
  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return 'Available';
    case 'PROCESSING':
    case 'PENDING':
      return 'Processing';
    default:
      return 'Pending';
  }
};
