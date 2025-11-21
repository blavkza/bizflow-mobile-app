import { User, LeaveType, LeaveStatus } from '@/types/auth';
import { LeaveRequest, LeaveBalance } from '@/types/leave';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://necs-engineers-bizflow.vercel.app/api';

/**
 * Extracts and formats leave requests from the user object
 */
export const getLeaveRequestsFromUser = (user: User | null): LeaveRequest[] => {
  const rawRequests = user?.employee?.leaveRequests || [];

  return rawRequests
    .map((req: any) => ({
      id: req.id,
      leaveType: req.leaveType as LeaveType,
      startDate: new Date(req.startDate),
      endDate: new Date(req.endDate),
      days: req.days,
      reason: req.reason,
      status: req.status as LeaveStatus,
      requestedDate: new Date(req.requestedDate),
      approvedBy: req.approvedBy,
      comments: req.comments,
    }))
    .sort((a, b) => b.requestedDate.getTime() - a.requestedDate.getTime());
};

/**
 * Calculates leave balances based on employee settings and approved requests
 */
export const calculateLeaveBalance = (user: User | null): LeaveBalance => {
  const employee = user?.employee;

  const defaultBalance = { total: 0, used: 0, remaining: 0 };
  const balance: LeaveBalance = {
    annual: { ...defaultBalance },
    sick: { ...defaultBalance },
    study: { ...defaultBalance },
    maternity: { ...defaultBalance },
    paternity: { ...defaultBalance },
    unpaid: { ...defaultBalance },
  };

  if (!employee) return balance;

  // 1. Set Totals
  balance.annual.total = employee.annualLeaveDays || 21;
  balance.sick.total = employee.sickLeaveDays || 30;
  balance.study.total = employee.studyLeaveDays || 5;
  balance.maternity.total = employee.maternityLeaveDays || 120;
  balance.paternity.total = employee.paternityLeaveDays || 10;
  balance.unpaid.total = employee.unpaidLeaveDays || 0;

  // 2. Calculate Used Days
  const requests = employee.leaveRequests || [];

  requests.forEach((req: any) => {
    if (req.status === 'APPROVED') {
      const days = req.days || 0;
      // Normalize leave type string to match object keys if needed, usually direct match works if enums align
      const typeKey = req.leaveType.toLowerCase();
      if (balance[typeKey as keyof LeaveBalance]) {
        balance[typeKey as keyof LeaveBalance].used += days;
      }
    }
  });

  // 3. Calculate Remaining
  (Object.keys(balance) as Array<keyof LeaveBalance>).forEach((key) => {
    balance[key].remaining = Math.max(
      0,
      balance[key].total - balance[key].used
    );
  });

  return balance;
};

/**
 * Submits a new leave request to the API
 */
export const createLeaveRequest = async (
  user: User | null,
  data: {
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    days: number;
    reason: string;
    contactInfo?: string;
  }
) => {
  if (!user?.employee?.employeeNumber) {
    throw new Error('Employee information not found');
  }

  const payload = {
    employeeId: user.employee.employeeNumber, // API expects employeeNumber here
    leaveType: data.leaveType,
    startDate: data.startDate.toISOString(),
    endDate: data.endDate.toISOString(),
    days: data.days,
    reason: data.reason,
    contactInfo: data.contactInfo || '',
  };

  const response = await fetch(`${API_BASE_URL}/leaves`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit leave request');
  }

  return await response.json();
};
