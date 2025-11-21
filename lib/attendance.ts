import { User, AttendanceRecord } from '@/types/auth';
import {
  CheckInStatus,
  WeeklyStats,
  AttendancePayload,
} from '@/types/attendance';
import {
  isSameDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from 'date-fns';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://necs-engineers-bizflow.vercel.app/api';

/**
 * Gets the attendance status for the current day
 */
export const getTodayStatus = (user: User | null): CheckInStatus => {
  const today = new Date();
  const records = user?.employee?.AttendanceRecord || [];

  // Find record for today
  const todayRecord = records.find((record: any) =>
    isSameDay(new Date(record.date), today)
  );

  if (!todayRecord) {
    return { checkedIn: false };
  }

  // Logic: If checked in but not checked out, user is currently "Checked In"
  const isCheckedIn = !!todayRecord.checkIn && !todayRecord.checkOut;

  return {
    checkedIn: isCheckedIn,
    recordId: todayRecord.id,
    checkInTime: todayRecord.checkIn ? new Date(todayRecord.checkIn) : null,
    checkOutTime: todayRecord.checkOut ? new Date(todayRecord.checkOut) : null,
    location: (todayRecord as any).checkInAddress || 'Unknown Location',
    coordinates:
      (todayRecord as any).checkInLat && (todayRecord as any).checkInLng
        ? {
            latitude: Number((todayRecord as any).checkInLat),
            longitude: Number((todayRecord as any).checkInLng),
          }
        : undefined,
  };
};

/**
 * Calculates stats for the current week
 */
export const getWeeklyStats = (user: User | null): WeeklyStats => {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
  const end = endOfWeek(today, { weekStartsOn: 1 });

  const records = user?.employee?.AttendanceRecord || [];

  const weeklyRecords = records.filter((record: any) =>
    isWithinInterval(new Date(record.date), { start, end })
  );

  // 1. Calculate Regular Hours
  const regular = weeklyRecords.reduce((acc: number, curr: any) => {
    return acc + (Number((curr as any).regularHours) || 0);
  }, 0);

  // 2. Calculate Overtime
  const overtime = weeklyRecords.reduce((acc: number, curr: any) => {
    return acc + (Number(curr.overtimeHours) || 0);
  }, 0);

  // 3. Total Hours = Regular + Overtime
  const totalHours = regular + overtime;

  const daysPresent = weeklyRecords.filter(
    (r: any) => r.status === 'PRESENT'
  ).length;

  // 4. Calculate expected working days
  const workingDaysConfig = user?.employee?.workingDays;
  const totalDays =
    workingDaysConfig && workingDaysConfig.length > 0
      ? workingDaysConfig.length
      : 5; // Default to 5

  return {
    hoursWorked: Number(totalHours.toFixed(1)),
    overtime: Number(overtime.toFixed(1)),
    daysPresent,
    totalDays,
  };
};

/**
 * Calculates live working hours for the active session
 */
export const calculateCurrentSessionHours = (
  checkInTime?: Date | null
): number => {
  if (!checkInTime) return 0;
  const now = new Date();
  const diffMs = now.getTime() - checkInTime.getTime();
  return Math.max(0, Number((diffMs / (1000 * 60 * 60)).toFixed(1)));
};

/**
 * API: Perform Check In
 */
export const checkInUser = async (payload: AttendancePayload) => {
  const response = await fetch(`${API_BASE_URL}/attendance/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Check-in failed');
  }
  return await response.json();
};

/**
 * API: Perform Check Out
 */
export const checkOutUser = async (
  recordId: string,
  payload: Partial<AttendancePayload>
) => {
  const response = await fetch(
    `${API_BASE_URL}/attendance/check-out/${recordId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Check-out failed');
  }
  return await response.json();
};
