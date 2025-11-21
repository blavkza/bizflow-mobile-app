import { LeaveStatus, LeaveType } from './auth';

export interface LeaveRequest {
  id: string;
  leaveType: LeaveType;
  startDate: string | Date;
  endDate: string | Date;
  days: number;
  reason: string;
  status: LeaveStatus;
  requestedDate: string | Date;
  approvedBy?: string | null;
  comments?: string | null;
}

// Shape for Leave Balance calculations
export interface LeaveBalance {
  annual: {
    total: number;
    used: number;
    remaining: number;
  };
  sick: {
    total: number;
    used: number;
    remaining: number;
  };
  study: {
    total: number;
    used: number;
    remaining: number;
  };
  maternity: {
    total: number;
    used: number;
    remaining: number;
  };
  paternity: {
    total: number;
    used: number;
    remaining: number;
  };
  unpaid: {
    total: number;
    used: number;
    remaining: number;
  };
}
