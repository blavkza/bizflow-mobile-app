// types/auth.ts

// ============================================================================
// 1. STATISTICS & CONTEXT
// ============================================================================

export interface ProfileStatistics {
  attendance: number;
  tasksCompleted: number;
  totalTasks: number;
  taskCompletionRate: number;
  totalHoursThisMonth: number;
  overtimeHours: number;
  activeProjects: number;
  totalProjects: number;
  remainingLeaveDays: number;
  usedLeaveDays: number;
  performanceScore: number;

  // Internal Metrics
  productivityScore: number;
  teamworkScore: number;
  projectContributionScore: number;
}

export interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  userType: UserType | null;
  isLoading: boolean;
  isRefreshing?: boolean;
  lastError?: string | null;
  lastRefreshTime?: number;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError?: () => void;
}

// ============================================================================
// 2. ENUMS
// ============================================================================

export enum UserRole {
  CHIEF_EXECUTIVE_OFFICER = 'CHIEF_EXECUTIVE_OFFICER',
  ADMIN_MANAGER = 'ADMIN_MANAGER',
  GENERAL_MANAGER = 'GENERAL_MANAGER',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER',
  EMPLOYEE = 'EMPLOYEE',
  EDITOR = 'EDITOR',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum UserType {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  OFF_DUTY = 'OFF_DUTY',
  PROBATION = 'PROBATION',
}

export enum SalaryType {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  HOURLY = 'HOURLY',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  STUDY = 'STUDY',
  UNPAID = 'UNPAID',
  COMPASSIONATE = 'COMPASSIONATE',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  SICK_LEAVE = 'SICK_LEAVE',
  ANNUAL_LEAVE = 'ANNUAL_LEAVE',
  UNPAID_LEAVE = 'UNPAID_LEAVE',
  MATERNITY_LEAVE = 'MATERNITY_LEAVE',
  PATERNITY_LEAVE = 'PATERNITY_LEAVE',
  STUDY_LEAVE = 'STUDY_LEAVE',
}

export enum CheckInMethod {
  GPS = 'GPS',
  MANUAL = 'MANUAL',
  BARCODE = 'BARCODE',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
}

export enum DocumentType {
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  ID_COPY = 'ID_COPY',
  CERTIFICATE = 'CERTIFICATE',
  BANK_STATEMENT = 'BANK_STATEMENT',
  TAX_DOCUMENT = 'TAX_DOCUMENT',
  PAYSLIP = 'PAYSLIP',
  LEAVE_FORM = 'LEAVE_FORM',
  PERFORMANCE_REVIEW = 'PERFORMANCE_REVIEW',
  OTHER = 'OTHER',
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PROSPECT = 'PROSPECT',
}

export enum ClientType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
  GOVERNMENT = 'GOVERNMENT',
  NON_PROFIT = 'NON_PROFIT',
}

export enum DepartmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RESTRUCTURING = 'RESTRUCTURING',
}

export enum ProjectType {
  NEW_PROJECT = 'NEW_PROJECT',
  RETURN_JOB = 'RETURN_JOB',
  MAINTENANCE = 'MAINTENANCE',
  FAULT_FINDING = 'FAULT_FINDING',
}

export enum BillingType {
  INVOICED = 'INVOICED',
  MAINTENANCE_CONTRACT = 'MAINTENANCE_CONTRACT',
}

// ============================================================================
// 3. ENTITY INTERFACES
// ============================================================================

export interface User {
  id: string;
  userId: string;
  email: string;
  name: string;
  userName: string;
  phone?: string | null;
  avatar?: string | null;
  role: UserRole;
  status: UserStatus;
  userType: UserType;
  employeeId?: string | null;
  lastLogin?: string | Date | null;
  timezone: string;
  language: string;
  preferences?: any;

  employee?: Employee | null;
  timeEntries?: TimeEntry[];
  Project?: Project[];
  projectTeams?: ProjectTeam[];
  projects?: Project[];
  statistics?: ProfileStatistics;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  position: string;
  departmentId?: string | null;
  salaryType: SalaryType;
  dailySalary: number | string;
  monthlySalary: number | string;
  overtimeHourRate: number;

  currency: string;
  hireDate: string | Date;
  status: EmployeeStatus;

  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country: string;

  scheduledKnockIn?: string | null;
  scheduledKnockOut?: string | null;
  workingDays: string[];

  annualLeaveDays: number;
  sickLeaveDays: number;
  studyLeaveDays: number;
  maternityLeaveDays: number;
  paternityLeaveDays: number;
  unpaidLeaveDays: number;

  department?: Department | null;
  assignedTasks?: Task[];
  leaveRequests?: LeaveRequest[];
  AttendanceRecord?: AttendanceRecord[];
  payments?: any[];
}

export interface Department {
  id: string;
  name: string;
  managerId?: string | null;
  manager?: {
    name: string;
  };
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  archived: boolean;
  projectType?: string;
  description?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  client?: any;
  manager?: {
    name: string;
  };
}

export interface ProjectTeam {
  id: string;
  projectId: string;
  userId: string;
  project?: Project;
}

// --- TASK AND RELATED INTERFACES ---

export interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description?: string | null;
  projectId: string;
  status: TaskStatus;
  priority: Priority;
  noteId?: string | null;
  isAIGenerated: boolean;

  dueDate?: string | Date | null;
  completedAt?: string | Date | null;

  estimatedHours?: number | string | null;
  actualHours?: number | string | null;

  createdAt: string | Date;
  updatedAt: string | Date;

  project?: Project;
  timeEntries?: TimeEntry[];

  // Fully typed relations matching your schema
  documents?: Document[];
  subtask?: Subtask[];
  comment?: Comment[];
}

export interface Document {
  id: string;
  name: string;
  url: string;
  mimeType?: string | null;
  type?: DocumentType;
}

export interface Subtask {
  id: string;
  title: string;
  status: TaskStatus;
  order: number;
}

export interface Comment {
  id: string;
  content: string;
  commenterName: string;
  createdAt: string | Date;
}

export interface TimeEntry {
  id: string;
  hours: number | string;
  date: string | Date;
}

export interface AttendanceRecord {
  id: string;
  date: string | Date;
  status: AttendanceStatus;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  overtimeHours?: number | string | null;
}

export interface LeaveRequest {
  id: string;
  days: number;
  status: LeaveStatus;
  startDate: string | Date;
  endDate: string | Date;
}
