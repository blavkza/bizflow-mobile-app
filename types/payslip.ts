import { PaymentStatus } from './auth';

export interface Payment {
  id: string;
  amount: number | string;
  baseAmount: number | string;
  overtimeAmount: number | string;
  overtimeHours?: number | string;
  deductions?: number | string;
  payDate: string | Date;
  status: PaymentStatus;
  description?: string;
}

// The shape of the data used by the UI
export interface Payslip {
  id: string;
  month: string;
  year: number;
  grossPay: number;
  netPay: number;
  deductions: number;
  overtime: number;
  status: 'Available' | 'Processing' | 'Pending';
  downloadUrl?: string; // Placeholder for future PDF link
  rawDate: Date; // Used for sorting
}

export interface PayslipSummary {
  totalEarnings: number;
  totalOvertime: number;
  count: number;
}
