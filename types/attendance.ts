import { AttendanceStatus, CheckInMethod } from './auth';

export interface CheckInStatus {
  checkedIn: boolean;
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  recordId?: string;
}

export interface WeeklyStats {
  hoursWorked: number;
  overtime: number;
  daysPresent: number;
  totalDays: number;
}

export interface AttendancePayload {
  employeeId: string;
  date: string;
  timestamp: string;
  lat?: number;
  lng?: number;
  address?: string;
  photoUrl?: string;
  method: CheckInMethod;
}
