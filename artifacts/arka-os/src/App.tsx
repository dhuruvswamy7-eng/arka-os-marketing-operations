import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import {
  AlertCircle, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, Coffee, Command, Copy, Download, Edit2, ExternalLink, FileSpreadsheet, FileText, Flag, FolderOpen,
  Home, Image, Inbox, KanbanSquare, LayoutDashboard, ListFilter, Lock, LogOut, Menu,
  MessageSquare, Plus, Search, Settings2, Shield, ShieldAlert, Sparkles, Timer, Trash2, UserPlus, UserRound, Users, Utensils, Video, X, Zap
} from 'lucide-react';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import { ChatWidget } from './components/ChatWidget';
import { DocumentHub } from './components/DocumentHub';

const queryClient = new QueryClient();
const TODAY = new Date().toISOString().slice(0, 10);
const LOGO_SRC = `${import.meta.env.BASE_URL}assets/arkamedia-logo.png`;
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? (
  typeof window !== 'undefined'
    ? (window.location.hostname.includes('arkadigitalmedia.com')
        ? 'https://arka-api-w9o0.onrender.com/api'
        : (window.location.port === '5173'
            ? `${window.location.protocol}//${window.location.hostname}:5000/api`
            : '/api'))
    : 'http://localhost:5000/api'
);

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('arka_token') || sessionStorage.getItem('arka_token');
}

function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    try { localStorage.setItem('arka_token', token); } catch {}
    try { sessionStorage.setItem('arka_token', token); } catch {}
  } else {
    try { localStorage.removeItem('arka_token'); } catch {}
    try { sessionStorage.removeItem('arka_token'); } catch {}
  }
}

let isSupersededAlertShown = false;
function handleAuthFailure(status: number, data: any) {
  if (status === 401 && data?.code === 'SESSION_SUPERSEDED') {
    setStoredToken(null);
    if (!isSupersededAlertShown) {
      isSupersededAlertShown = true;
      alert("Session Expired: Your account was logged in from another device or browser.");
      window.location.reload();
    }
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    try {
      const errData = await response.clone().json();
      handleAuthFailure(response.status, errData);
    } catch {}
    const err = new Error(`API ${path} responded with ${response.status}`);
    (err as any).status = response.status;
    throw err;
  }
  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: any): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    try {
      const errData = await response.clone().json();
      handleAuthFailure(response.status, errData);
    } catch {}
    throw new Error(`API ${path} responded with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function apiPatch<T>(path: string, body: any): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    try {
      const errData = await response.clone().json();
      handleAuthFailure(response.status, errData);
    } catch {}
    throw new Error(`API ${path} responded with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function apiDelete<T>(path: string): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    try {
      const errData = await response.clone().json();
      handleAuthFailure(response.status, errData);
    } catch {}
    throw new Error(`API ${path} responded with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function hydrateFromApi(
  setPeople: (people: Person[]) => void, 
  setWork: (work: WorkItem[]) => void, 
  setTasks: (tasks: WorkTask[]) => void,
  setActivities: (activities: Activity[]) => void,
  setComments: (comments: Comment[]) => void,
  setReports: (reports: ManagerReport[]) => void,
  setLeaves: (leaves: LeaveRequest[]) => void,
  setSessions?: (sessions: SessionRecord[]) => void,
  setBreakLogs?: (logs: BreakLog[]) => void
) {
  try {
    const [peoplePayload, workPayload, taskPayload, actPayload, commentPayload, reportPayload, leavePayload, sessionPayload, breakLogPayload] = await Promise.all([
      apiGet<{ items: Person[] }>('/people'),
      apiGet<{ items: WorkItem[] }>('/work'),
      apiGet<{ items: WorkTask[] }>('/tasks'),
      apiGet<{ items: Activity[] }>('/activities'),
      apiGet<{ items: Comment[] }>('/comments'),
      apiGet<{ items: ManagerReport[] }>('/reports'),
      apiGet<{ items: LeaveRequest[] }>('/leaves'),
      apiGet<{ items: SessionRecord[] }>('/sessions').catch(() => ({ items: [] as SessionRecord[] })),
      apiGet<{ items: BreakLog[] }>('/break-logs').catch(() => ({ items: [] as BreakLog[] })),
    ]);

    if (Array.isArray(peoplePayload.items)) setPeople(peoplePayload.items);
    if (Array.isArray(workPayload.items)) setWork(workPayload.items);
    if (Array.isArray(taskPayload.items)) setTasks(taskPayload.items);
    if (Array.isArray(actPayload.items)) setActivities(actPayload.items);
    if (Array.isArray(commentPayload.items)) setComments(commentPayload.items);
    if (Array.isArray(reportPayload.items)) setReports(reportPayload.items);
    if (Array.isArray(leavePayload.items)) setLeaves(leavePayload.items);
    if (setSessions && Array.isArray(sessionPayload.items)) setSessions(sessionPayload.items);
    if (setBreakLogs && Array.isArray(breakLogPayload.items)) setBreakLogs(breakLogPayload.items);
  } catch {
    // Keep the existing mock in-memory UI data if the API is unreachable.
  }
}

export type BreakLog = {
  id: string;
  userId: string;
  date: string;
  type: 'Break' | 'Lunch';
  startAt: string;
  endAt?: string | null;
  durationMinutes: number;
};

export type Role = 'Founder' | 'Manager' | 'Team member' | 'HR Manager';
export type Stage = 'Planning' | 'Assigned' | 'In Progress' | 'Review' | 'Revision' | 'Approved' | 'Completed' | 'Blocked';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type WorkType = 'Website' | 'SEO' | 'Graphic Design' | 'Internal' | 'Other';
export type Presence = 'Online' | 'Break' | 'Lunch' | 'Idle' | 'Offline';

export type Person = {
  id: string; name: string; email?: string; password?: string; role: Role; title: string; managerId: string | null;
  presence: Presence; lastActiveAt: string; loginAt?: string | null; logoutAt?: string | null; sessionMinutes: number; taskMinutes: number;
};

export type WorkItem = {
  id: string; title: string; description: string; client?: string; workType: WorkType; priority: Priority; dueDate: string;
  founderId: string; managerId?: string | null; directAssigneeId?: string | null; stage: Stage; progress: number; createdAt: string;
};

export type WorkTask = {
  id: string; workId: string; title: string; instructions: string; assigneeId: string; dueDate: string; priority: Priority;
  stage: Stage; progress: number; timeMinutes: number; estimatedMinutes: number; submittedAt?: string | null; revisionNote?: string | null;
};

export type Activity = { id: string; workId: string; actorId: string; message: string; createdAt: string; tone?: 'normal' | 'warning' | 'success'; };
export type Comment = { id: string; workId: string; authorId: string; message: string; createdAt: string; };
export type ReportStatus = 'Draft' | 'Submitted' | 'Reviewed' | 'Needs revision';
export type ManagerReport = {
  id: string; managerId: string; period: string; completed: string; inProgress: string; blockers: string; decisions: string;
  status: ReportStatus; createdAt: string;
};
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type LeaveType = 'Casual' | 'Sick' | 'Personal' | 'Work From Home' | 'Early Logout' | 'Early Login' | 'Other';
export type LeaveRequest = {
  id: string; userId: string; leaveType: LeaveType; startDate: string; endDate: string; reason: string; note?: string | null;
  status: LeaveStatus; approvedBy?: string | null; createdAt: string;
};
export type SessionRecord = {
  id: string; userId: string; date: string; loginAt: string; logoutAt?: string; durationMinutes: number;
};

export interface ContentCalendarItem {
  id: string;
  client: string;
  date: string;
  day: string;
  format: string;
  contentTheme: string;
  scriptDescription?: string;
  updateStatus: 'Posted' | 'Yet to Design' | 'In Progress' | 'Ready to Post' | 'Review';
  references?: string;
  shootDate?: string;
  shootStatus: 'Shoot Completed' | 'Shoot Pending' | 'No Shoot Needed';
  driveLink?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export const INITIAL_CLIENTS: string[] = [
  'Animal Gym',
  'FMA',
  'Iron Revolution',
  'Sutra Fitness',
  'Bluecaps',
  'Nailco',
  'Nail Stories',
  'Earlyschool House',
  'Sri Ram',
  'Pilates HSR',
  'Pilates Bellandur',
  'Pilates Koramangala',
  'Pilates Equipments',
  'Aura Unisex Salon',
  'Velvet and Mirror',
  'Smartlook Unisex Salon',
  'Raagi',
  'Just Bakes',
  'Ashva',
  'HSR Fitness World',
  'Aspire Tennis',
  'Kick and Hit',
  'Ahana',
  'Clarus',
  'The Border Bells',
  'DNS Party Hall',
  'Rocks Fitness Panathur',
  'Rocks Fitness Balagere',
  'Gravity Fitness TC Palya',
  'Bespoke Odyssey',
  'Paripoorna',
];

const initialPeople: Person[] = [
  { id: 'usr_founder', name: 'Monika S', email: 'monika@arkadigitalmedia.com', password: 'admin1234', role: 'Founder', title: 'Founder / CEO', managerId: null, presence: 'Offline', lastActiveAt: 'Just now', sessionMinutes: 0, taskMinutes: 0 },
  { id: 'usr_founder_eshwar', name: 'Eshwar SP', email: 'eshwar@arkadigitalmedia.com', password: 'admin1234', role: 'Founder', title: 'Co-Founder & COO', managerId: null, presence: 'Offline', lastActiveAt: 'Just now', sessionMinutes: 0, taskMinutes: 0 },
  { id: 'usr_hr', name: 'HR Manager', email: 'hr@arka.com', password: '1234', role: 'HR Manager', title: 'Head of People & HR Operations', managerId: null, presence: 'Offline', lastActiveAt: 'Just now', sessionMinutes: 0, taskMinutes: 0 },
];

let runtimePeople = initialPeople;

const initialWork: WorkItem[] = [];
const initialTasks: WorkTask[] = [];
const initialActivities: Activity[] = [];
const initialComments: Comment[] = [];
const initialReports: ManagerReport[] = [];
const initialLeaves: LeaveRequest[] = [];
const initialSessions: SessionRecord[] = [];
const initialBreakLogs: BreakLog[] = [];

export interface CompanyHoliday {
  id: string;
  date: string;
  day: string;
  name: string;
  type: 'National Holiday' | 'Gazetted Holiday' | 'Festival Holiday' | 'Restricted / Optional';
  description: string;
}

export const OFFICIAL_HOLIDAYS_2026: CompanyHoliday[] = [
  { id: 'h-1', date: '2026-01-01', day: 'Thursday', name: "New Year's Day", type: 'Festival Holiday', description: 'Celebration of the New Year across the organization.' },
  { id: 'h-2', date: '2026-01-14', day: 'Wednesday', name: 'Pongal / Makar Sankranti', type: 'Festival Holiday', description: 'Harvest festival celebrated with great joy and thanksgiving.' },
  { id: 'h-3', date: '2026-01-15', day: 'Thursday', name: 'Thiruvalluvar Day / Mattu Pongal', type: 'Gazetted Holiday', description: 'Honoring the great Tamil sage poet Thiruvalluvar and agrarian cattle.' },
  { id: 'h-4', date: '2026-01-26', day: 'Monday', name: 'Republic Day', type: 'National Holiday', description: 'National holiday commemorating the adoption of the Constitution of India.' },
  { id: 'h-5', date: '2026-03-19', day: 'Thursday', name: 'Ugadi / Telugu New Year', type: 'Festival Holiday', description: 'New Year celebration according to the Hindu lunisolar calendar.' },
  { id: 'h-6', date: '2026-03-20', day: 'Friday', name: 'Id-ul-Fitr (Ramzan)', type: 'Gazetted Holiday', description: 'Islamic festival marking the culmination of the holy month of Ramadan.' },
  { id: 'h-7', date: '2026-04-03', day: 'Friday', name: 'Good Friday', type: 'Gazetted Holiday', description: 'Christian holiday commemorating the passion and crucifixion of Jesus.' },
  { id: 'h-8', date: '2026-04-14', day: 'Tuesday', name: 'Tamil New Year / Dr. Ambedkar Jayanti', type: 'Gazetted Holiday', description: 'Puthandu celebration and honoring the architect of the Indian Constitution.' },
  { id: 'h-9', date: '2026-05-01', day: 'Friday', name: 'May Day / Labour Day', type: 'National Holiday', description: 'International Workers Day celebrating the contributions of working professionals.' },
  { id: 'h-10', date: '2026-05-27', day: 'Wednesday', name: 'Bakrid / Eid-ul-Adha', type: 'Gazetted Holiday', description: 'Feast of the Sacrifice commemorating Ibrahim obedience to God.' },
  { id: 'h-11', date: '2026-08-15', day: 'Saturday', name: 'Independence Day', type: 'National Holiday', description: 'National holiday commemorating India independence from British rule.' },
  { id: 'h-12', date: '2026-08-26', day: 'Wednesday', name: 'Milad-un-Nabi', type: 'Gazetted Holiday', description: 'Observance of the birth of Islamic prophet Muhammad.' },
  { id: 'h-13', date: '2026-09-04', day: 'Friday', name: 'Krishna Jayanthi / Gokulashtami', type: 'Festival Holiday', description: 'Celebration of the birth of Lord Krishna.' },
  { id: 'h-14', date: '2026-09-14', day: 'Monday', name: 'Vinayaka Chaturthi / Ganesh Chaturthi', type: 'Festival Holiday', description: 'Grand festival celebrating the birth of Lord Ganesha.' },
  { id: 'h-15', date: '2026-10-02', day: 'Friday', name: 'Mahatma Gandhi Jayanti', type: 'National Holiday', description: 'National holiday honoring the birth of the Father of the Nation.' },
  { id: 'h-16', date: '2026-10-20', day: 'Tuesday', name: 'Ayudha Pooja / Maha Navami', type: 'Festival Holiday', description: 'Worship of tools, computers, vehicles and craft instruments.' },
  { id: 'h-17', date: '2026-10-21', day: 'Wednesday', name: 'Vijaya Dashami (Dussehra)', type: 'Gazetted Holiday', description: 'Celebration of the victory of good over evil.' },
  { id: 'h-18', date: '2026-11-08', day: 'Sunday', name: 'Deepavali / Diwali', type: 'Festival Holiday', description: 'Festival of lights celebrating prosperity and victory of light over darkness.' },
  { id: 'h-19', date: '2026-12-25', day: 'Friday', name: 'Christmas Day', type: 'Gazetted Holiday', description: 'Celebration of the birth of Jesus Christ.' },
];

const stageTone: Record<Stage, string> = {
  Planning: 'border-slate-200 bg-slate-50 text-slate-700', Assigned: 'border-blue-200 bg-blue-50 text-blue-700',
  'In Progress': 'border-amber-200 bg-amber-50 text-amber-700', Review: 'border-violet-200 bg-violet-50 text-violet-700',
  Revision: 'border-rose-200 bg-rose-50 text-rose-700', Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700', Blocked: 'border-red-200 bg-red-50 text-red-700',
};

const priorityTone: Record<Priority, string> = {
  Low: 'text-slate-500', Medium: 'text-slate-700', High: 'text-amber-700', Urgent: 'text-red-700',
};

const roleNavigation: Record<Role, { label: string; path: string; icon: typeof Command }[]> = {
  Founder: [
    { label: 'Command Center', path: '/dashboard', icon: Command },
    { label: 'Company Work', path: '/work', icon: Inbox },
    { label: 'Content Calendar', path: '/content-calendar', icon: CalendarDays },
    { label: 'People', path: '/people', icon: UserPlus },
    { label: 'Team Presence', path: '/team', icon: Users },
    { label: 'Attendance & Time', path: '/attendance', icon: CalendarDays },
    { label: 'Leave', path: '/leave', icon: CalendarDays },
    { label: 'Company Calendar', path: '/calendar', icon: CalendarDays },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Approvals', path: '/approvals', icon: CheckCircle2 },
    { label: 'Time & Effort', path: '/time', icon: Clock3 },
    { label: 'Insights', path: '/insights', icon: Zap },
    { label: 'Settings', path: '/settings', icon: Settings2 },
  ],
  'HR Manager': [
    { label: 'HR Command Center', path: '/dashboard', icon: Command },
    { label: 'Attendance & Time', path: '/attendance', icon: CalendarDays },
    { label: 'Leave Management', path: '/leave', icon: CalendarDays },
    { label: 'Company Calendar', path: '/calendar', icon: CalendarDays },
    { label: 'Company Workflow', path: '/work', icon: Inbox },
    { label: 'Team Presence', path: '/team', icon: Users },
    { label: 'People Directory', path: '/people', icon: UserPlus },
    { label: 'Time & Effort', path: '/time', icon: Clock3 },
    { label: 'Settings', path: '/settings', icon: Settings2 },
  ],
  Manager: [
    { label: 'My Dashboard', path: '/dashboard', icon: Command },
    { label: 'Content Calendar', path: '/content-calendar', icon: CalendarDays },
    { label: 'Founder Assignments', path: '/assignments', icon: Flag },
    { label: 'Team Tasks', path: '/team-tasks', icon: KanbanSquare },
    { label: 'My Team', path: '/team', icon: Users },
    { label: 'Team Attendance', path: '/attendance', icon: CalendarDays },
    { label: 'Team Leave', path: '/leave', icon: CalendarDays },
    { label: 'Company Calendar', path: '/calendar', icon: CalendarDays },
    { label: 'Reviews', path: '/reviews', icon: CheckCircle2 },
    { label: 'Report to Founder', path: '/reports', icon: FileText },
    { label: 'Time & Workload', path: '/time', icon: Clock3 },
    { label: 'Settings', path: '/settings', icon: Settings2 },
  ],
  'Team member': [
    { label: 'My Work', path: '/my-work', icon: Command },
    { label: 'Today', path: '/today', icon: Flag },
    { label: 'My Time', path: '/time', icon: Clock3 },
    { label: 'My Attendance', path: '/attendance', icon: CalendarDays },
    { label: 'My Leave', path: '/leave', icon: CalendarDays },
    { label: 'Company Calendar', path: '/calendar', icon: CalendarDays },
    { label: 'My Reports', path: '/reports', icon: FileText },
    { label: 'My Submissions', path: '/submissions', icon: CheckCircle2 },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Profile', path: '/profile', icon: UserRound },
  ],
};

function person(id: string) { return runtimePeople.find((item) => item.id === id) || runtimePeople[0]; }
function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    const d = new Date(`${value}T12:00:00`);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}
function isOverdue(value?: string | null) { return Boolean(value && value < TODAY); }
function hours(minutes: number) { return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function formatTimestamp(isoString?: string | null) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Today at ${timeStr}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch {
    return isoString;
  }
}

export function getVisiblePeopleForRole(actor: Pick<Person, 'id' | 'role'>, people: Person[]) {
  if (actor.role === 'Founder' || actor.role === 'HR Manager') return people;
  if (actor.role === 'Manager') return people.filter((item) => item.id === actor.id || item.managerId === actor.id);
  return people.filter((item) => item.id === actor.id);
}

export function getAttendanceScope(actor: Pick<Person, 'id' | 'role'>, people: Person[]) {
  const visiblePeople = getVisiblePeopleForRole(actor, people);
  if (actor.role === 'Founder' || actor.role === 'HR Manager') {
    return visiblePeople.filter((item) => item.role !== 'Founder');
  }
  return visiblePeople.filter((item) => item.id !== actor.id || actor.role === 'Team member');
}

export function getAssignablePeople(people: Person[], role?: Role) {
  return people.filter((item) => item.role !== 'Founder' && (!role || item.role === role));
}

export function isTaskManagedByManager(task: WorkTask, workList: WorkItem[]): boolean {
  const parentWork = workList.find((w) => w.id === task.workId);
  const assignee = person(task.assigneeId);
  const managerId = parentWork?.managerId || assignee?.managerId;
  if (!managerId) return false;
  const m = person(managerId);
  return m?.role === 'Manager';
}

export function getTaskManager(task: WorkTask, workList: WorkItem[]): Person | null {
  const parentWork = workList.find((w) => w.id === task.workId);
  const assignee = person(task.assigneeId);
  const mId = parentWork?.managerId || assignee?.managerId;
  if (!mId) return null;
  const m = person(mId);
  return m?.role === 'Manager' ? m : null;
}

export function isTaskPendingManagerReview(task: WorkTask, workList: WorkItem[], managerId?: string): boolean {
  if (task.stage !== 'Review') return false;
  if (!isTaskManagedByManager(task, workList)) return false;
  if (task.submittedAt?.startsWith('Manager Approved')) return false;
  if (managerId) {
    const parentWork = workList.find((w) => w.id === task.workId);
    const assignee = person(task.assigneeId);
    const mId = parentWork?.managerId || assignee?.managerId;
    return mId === managerId;
  }
  return true;
}

export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
}

export function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }
}

export const TOTAL_DAILY_BREAK_MINUTES = 75; // 1 hour 15 minutes total daily break allowance

export function formatTime(isoString?: string | null) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function getDailyBreakMinutes(
  userId: string,
  date: string,
  breakLogs: BreakLog[] = []
): { totalUsedMinutes: number; remainingPoolMinutes: number; logs: BreakLog[] } {
  const dayLogs = breakLogs.filter((b) => b.userId === userId && b.date === date);
  const totalUsed = dayLogs.reduce((sum, b) => {
    if (b.durationMinutes && b.durationMinutes > 0) return sum + b.durationMinutes;
    if (b.startAt) {
      const endMs = b.endAt ? new Date(b.endAt).getTime() : Date.now();
      return sum + Math.max(0, Math.round((endMs - new Date(b.startAt).getTime()) / 60000));
    }
    return sum;
  }, 0);

  const remaining = Math.max(0, TOTAL_DAILY_BREAK_MINUTES - totalUsed);
  return { totalUsedMinutes: totalUsed, remainingPoolMinutes: remaining, logs: dayLogs };
}

export function getDailyBreakUsage(userId: string): { breaks: number; lunches: number } {
  try {
    const raw = localStorage.getItem(`arka_break_counts_${userId}_${TODAY}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { breaks: 0, lunches: 0 };
}

export function recordBreakUsage(userId: string, type: 'Break' | 'Lunch'): { breaks: number; lunches: number } {
  const current = getDailyBreakUsage(userId);
  if (type === 'Break') current.breaks = (current.breaks || 0) + 1;
  if (type === 'Lunch') current.lunches = (current.lunches || 0) + 1;
  try {
    localStorage.setItem(`arka_break_counts_${userId}_${TODAY}`, JSON.stringify(current));
  } catch {}
  return current;
}

export function isTaskPendingFounderReview(task: WorkTask, workList: WorkItem[]): boolean {
  if (task.stage !== 'Review') return false;
  if (!isTaskManagedByManager(task, workList)) {
    return true;
  }
  return Boolean(task.submittedAt?.startsWith('Manager Approved'));
}

export function isApprovedLeaveActiveOnDate(leave: LeaveRequest, date: string) {
  return leave.status === 'Approved' && leave.startDate <= date && leave.endDate >= date;
}

export function updateLeaveStatus(leaves: LeaveRequest[], id: string, status: LeaveStatus, actor: Pick<Person, 'role' | 'id'>) {
  if ((actor.role !== 'Founder' && actor.role !== 'HR Manager') || (status !== 'Approved' && status !== 'Rejected')) return leaves;
  return leaves.map((leave) => leave.id === id && leave.status === 'Pending'
    ? { ...leave, status, approvedBy: status === 'Approved' ? actor.id : leave.approvedBy }
    : leave);
}

export function authenticateDemoUser(email: string, pass: string) {
  const normEmail = email.toLowerCase().trim();
  if ((normEmail === 'monika@arkadigitalmedia.com' || normEmail === 'monika@arka.com' || normEmail === 'admin@arka.com' || normEmail === 'arka@founder') && (pass === 'admin1234' || pass === '1234')) {
    return { id: 'usr_founder', role: 'Founder' as const, name: 'Monika S' };
  }
  if ((normEmail === 'eshwar@arkadigitalmedia.com' || normEmail === 'eshwar@arka.com' || normEmail === 'eshwarsp@arka.com') && (pass === 'admin1234' || pass === '1234')) {
    return { id: 'usr_founder_eshwar', role: 'Founder' as const, name: 'Eshwar SP' };
  }
  if (normEmail === 'hr@arka.com' && pass === '1234') {
    return { id: 'usr_hr', role: 'HR Manager' as const, name: 'HR Manager' };
  }
  return null;
}

function Button({ children, variant = 'primary', onClick, type = 'button', disabled = false }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  const styles = {
    primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-105',
    secondary: 'border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
    ghost: 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}>{children}</button>;
}

function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${className}`}>{children}</span>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[hsl(var(--border))] bg-white shadow-[0_10px_30px_rgba(20,20,20,0.03)] ${className}`}>{children}</section>;
}

function SectionTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex items-end justify-between gap-4"><div>{eyebrow && <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">{eyebrow}</div>}<h1 className="text-2xl font-black tracking-[-0.04em] md:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</div>;
}

function BreakLunchFreezeOverlay({
  presence,
  secondsRemaining,
  remainingPoolMinutes,
  onResumeWork,
}: {
  presence: 'Break' | 'Lunch';
  secondsRemaining: number | null;
  remainingPoolMinutes?: number;
  onResumeWork: () => void;
}) {
  const isBreak = presence === 'Break';
  const totalSeconds = isBreak ? 15 * 60 : 60 * 60;
  const currentSecs = Math.max(0, secondsRemaining ?? totalSeconds);
  const minutes = Math.floor(currentSecs / 60);
  const seconds = currentSecs % 60;
  const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - currentSecs) / totalSeconds) * 100));

  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0d0d]/95 backdrop-blur-2xl text-white p-6 select-none animate-in fade-in duration-200">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        {/* Animated Badge */}
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-widest ${
          isBreak 
            ? 'border-amber-400/40 bg-amber-400/10 text-amber-300 ring-2 ring-amber-400/20' 
            : 'border-blue-400/40 bg-blue-400/10 text-blue-300 ring-2 ring-blue-400/20'
        }`}>
          {isBreak ? <Coffee className="size-4 animate-bounce" /> : <Utensils className="size-4 animate-bounce" />}
          <span>{isBreak ? 'Break in Progress' : 'Lunch in Progress'}</span>
        </div>

        {/* Title */}
        <h1 className="mt-6 text-3xl sm:text-4xl font-black tracking-tight">
          Workspace Frozen
        </h1>
        <p className="mt-2 text-sm text-white/65 max-w-md">
          {isBreak
            ? 'Your break timer is running. Relax, recharge, and step away from the desk.'
            : 'Your lunch timer is running. Enjoy your meal away from work!'}
          <span className="block mt-1 text-xs text-amber-300/80 font-medium">
            Daily Allowance: 1h 15m (75 mins total). Unused time carries over to your breaks!
          </span>
        </p>

        {/* Big Countdown Timer Card */}
        <div className="mt-8 w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            Time Remaining in this Session
          </div>
          <div className="mt-3 text-7xl sm:text-8xl font-black font-mono tracking-tight text-[#f8c329] drop-shadow-[0_0_35px_rgba(248,195,41,0.25)]">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          {/* Progress Bar */}
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f8c329] to-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Pool balance notification */}
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-left text-xs text-amber-200/90">
            <span className="text-base leading-none">🍱</span>
            <div>
              <strong>Daily Flexi-Pool Balance:</strong>{' '}
              <span>
                {remainingPoolMinutes !== undefined ? `${remainingPoolMinutes}m available` : '75m total allowance'} today. Ending early carries your unused time over to your next break!
              </span>
            </div>
          </div>
        </div>

        {/* Action Button: End Break & Resume Work */}
        <div className="mt-8 flex flex-col items-center gap-3 w-full">
          <button
            type="button"
            onClick={onResumeWork}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#f8c329] px-8 py-4 text-base font-extrabold text-black shadow-xl hover:brightness-110 active:scale-[0.99] transition cursor-pointer"
          >
            <span>{isBreak ? 'End Break & Resume Work' : 'End Lunch & Resume Work'}</span>
            <ArrowRight className="size-5" />
          </button>
          <span className="text-xs text-white/40">
            Returning early unfreezes your screen and automatically carries over remaining time into your break pool.
          </span>
        </div>
      </div>
    </div>
  );
}

function EarlyLogoutModal({
  actor,
  shiftInfo,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  leaves,
  onRequestEarlyLogout,
  allPeople,
}: {
  actor: Person;
  shiftInfo: {
    loginTimeStr: string;
    targetTimeStr: string;
    totalMinutes: number;
    remainingMinutes: number;
  } | null;
  reason: string;
  onReasonChange: (val: string) => void;
  onConfirm: (options?: { isEmergency?: boolean; isApproved?: boolean }) => void;
  onClose: () => void;
  leaves: LeaveRequest[];
  onRequestEarlyLogout: (data: { plannedTime: string; reason: string; note?: string }) => Promise<void>;
  allPeople?: Person[];
}) {
  const workedHours = shiftInfo ? Math.floor(shiftInfo.totalMinutes / 60) : 0;
  const workedMins = shiftInfo ? shiftInfo.totalMinutes % 60 : 0;
  const remainHours = shiftInfo ? Math.floor(shiftInfo.remainingMinutes / 60) : 0;
  const remainMins = shiftInfo ? shiftInfo.remainingMinutes % 60 : 0;

  const localToday = new Date().toLocaleDateString('en-CA');
  const todayEarlyLeave = leaves.find(
    (l) => l.userId === actor.id &&
           l.leaveType === 'Early Logout' &&
           (l.startDate === TODAY || l.startDate === localToday || (l.startDate <= TODAY && l.endDate >= TODAY))
  );

  const isApproved = todayEarlyLeave?.status === 'Approved';
  const isPending = todayEarlyLeave?.status === 'Pending';
  const isRejected = todayEarlyLeave?.status === 'Rejected';
  const approver = todayEarlyLeave?.approvedBy ? allPeople?.find((p) => p.id === todayEarlyLeave.approvedBy)?.name : null;

  const [plannedTime, setPlannedTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [requestReason, setRequestReason] = useState(reason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onRequestEarlyLogout({ plannedTime, reason: requestReason.trim() });
      setSubmittedSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header based on status */}
        {isApproved ? (
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-4 ring-emerald-500/10">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Founder / HR Authorized</div>
              <h2 className="text-xl font-black text-slate-900">Early Logout Approved</h2>
            </div>
          </div>
        ) : isPending || submittedSuccess ? (
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-4 ring-amber-500/10">
              <Clock3 className="size-6" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-700">Awaiting Founder or HR Review</div>
              <h2 className="text-xl font-black text-slate-900">Request Pending Approval</h2>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-4 ring-amber-500/10">
              <ShieldAlert className="size-6" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-700">9-Hour Workday Incomplete</div>
              <h2 className="text-xl font-black text-slate-900">Approval Required to Log Out</h2>
            </div>
          </div>
        )}

        {/* Shift metrics */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Shift Started</span>
            <div className="font-bold text-slate-800">{shiftInfo?.loginTimeStr || 'Today'}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Target 9h End</span>
            <div className="font-bold text-slate-800">{shiftInfo?.targetTimeStr || 'Today'}</div>
          </div>
          <div className="border-t border-slate-200/80 pt-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Worked Today</span>
            <div className="font-extrabold text-emerald-700">{workedHours}h {workedMins}m</div>
          </div>
          <div className="border-t border-slate-200/80 pt-2">
            <span className="text-[10px] uppercase font-bold text-amber-600">Remaining</span>
            <div className="font-extrabold text-amber-700">{remainHours}h {remainMins}m left</div>
          </div>
        </div>

        {/* Status Body */}
        {isApproved ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-sm">
                <Check className="size-4 text-emerald-600" />
                <span>Approved by {approver || 'Founder / HR Manager'}</span>
              </div>
              <p className="mt-1.5 text-slate-600">
                <strong>Reason:</strong> {todayEarlyLeave.reason}
              </p>
              {todayEarlyLeave.note && (
                <p className="mt-1 text-slate-500">
                  <strong>Details:</strong> {todayEarlyLeave.note}
                </p>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Your early logout request has been granted. Click below to safely complete your checkout for the day.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Continue Working
              </button>
              <button
                type="button"
                onClick={() => onConfirm({ isApproved: true })}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer shadow-sm shadow-emerald-600/20"
              >
                Proceed & Log Out
              </button>
            </div>
          </div>
        ) : isPending || submittedSuccess ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 text-sm">
                <Clock3 className="size-4 text-amber-600 animate-pulse" />
                <span>Pending Founder / HR Approval</span>
              </div>
              <p className="mt-1.5 text-slate-600">
                <strong>Reason:</strong> {todayEarlyLeave?.reason || requestReason}
              </p>
              <p className="mt-1 text-slate-500">
                <strong>Departure:</strong> {todayEarlyLeave?.note || `Planned Time: ${plannedTime}`}
              </p>
              <p className="mt-2 text-[11px] text-amber-700">
                Please wait for the Founder or HR to approve your request. You can continue working in the meantime.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-black transition cursor-pointer shadow-sm"
              >
                Continue Working
              </button>
            </div>

            {/* Emergency override trigger */}
            <div className="pt-2 text-center">
              {!showEmergency ? (
                <button
                  type="button"
                  onClick={() => setShowEmergency(true)}
                  className="text-[11px] text-rose-500 hover:text-rose-700 underline font-medium cursor-pointer"
                >
                  Unforeseen emergency? Need to leave immediately without waiting
                </button>
              ) : (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left">
                  <div className="text-xs font-bold text-rose-800">⚠️ Unapproved Emergency Checkout</div>
                  <p className="mt-1 text-[11px] text-rose-600 leading-normal">
                    Logging out before 9 hours without Founder/HR approval will be recorded as an unapproved departure and flagged to management.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmergency(false)}
                      className="flex-1 rounded-xl bg-white border border-slate-200 py-2 text-xs font-bold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => onConfirm({ isEmergency: true })}
                      className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      Confirm Unapproved Exit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {isRejected && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <span className="font-bold">Notice:</span> A previous early departure request for today was rejected by management. Please consult with the Founder or HR.
              </div>
            )}
            <p className="text-xs text-slate-600 leading-relaxed">
              Company policy requires <strong>Founder or HR approval</strong> to check out before completing your 9-hour workday. Apply below for immediate review:
            </p>

            <form onSubmit={handleSubmitRequest} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    disabled
                    value={TODAY}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2 text-xs text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Planned Logout Time</label>
                  <input
                    type="time"
                    required
                    value={plannedTime}
                    onChange={(e) => setPlannedTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reason for Early Departure <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={requestReason}
                  onChange={(e) => {
                    setRequestReason(e.target.value);
                    onReasonChange(e.target.value);
                  }}
                  placeholder="e.g. Doctor's appointment, urgent family matter, approved by Founder..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !requestReason.trim()}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 py-2.5 text-xs font-bold text-white transition cursor-pointer shadow-sm shadow-amber-500/20"
              >
                {isSubmitting ? 'Submitting to Founder & HR...' : 'Submit Request to Founder & HR'}
              </button>
            </form>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-black transition cursor-pointer shadow-sm"
              >
                Continue Working (9h Shift)
              </button>
            </div>

            {/* Emergency override trigger */}
            <div className="pt-1 text-center">
              {!showEmergency ? (
                <button
                  type="button"
                  onClick={() => setShowEmergency(true)}
                  className="text-[11px] text-rose-500 hover:text-rose-700 underline font-medium cursor-pointer"
                >
                  Medical / Urgent emergency? Force logout without approval
                </button>
              ) : (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left">
                  <div className="text-xs font-bold text-rose-800">⚠️ Unapproved Emergency Checkout</div>
                  <p className="mt-1 text-[11px] text-rose-600 leading-normal">
                    Logging out before 9 hours without Founder/HR approval will be recorded as an unapproved departure and flagged to management.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmergency(false)}
                      className="flex-1 rounded-xl bg-white border border-slate-200 py-2 text-xs font-bold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => onConfirm({ isEmergency: true })}
                      className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      Confirm Unapproved Exit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Shell({ 
  actor, 
  onLogout, 
  onUpdatePresence, 
  timerSecondsRemaining,
  shiftTargetInfo,
  breakCounts,
  remainingBreakPoolMinutes,
  allPeople,
  children 
}: { 
  actor: Person; 
  onLogout: () => void; 
  onUpdatePresence: (p: Presence) => void; 
  timerSecondsRemaining?: number | null;
  shiftTargetInfo?: {
    loginTimeStr: string;
    targetTimeStr: string;
    totalMinutes: number;
    isCompleted: boolean;
    remainingMinutes: number;
    progressPercent: number;
  } | null;
  breakCounts?: { breaks: number; lunches: number };
  remainingBreakPoolMinutes?: number;
  allPeople?: Person[];
  children: ReactNode 
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = roleNavigation[actor.role];
  const poolLeft = remainingBreakPoolMinutes ?? 75;

  return <div className="min-h-screen bg-[#f7f7f5] text-[hsl(var(--foreground))]">
    {/* Full-Screen Freeze Overlay when on Break or Lunch */}
    {(actor.presence === 'Break' || actor.presence === 'Lunch') && (
      <BreakLunchFreezeOverlay
        presence={actor.presence}
        secondsRemaining={timerSecondsRemaining ?? null}
        remainingPoolMinutes={poolLeft}
        onResumeWork={() => onUpdatePresence('Online')}
      />
    )}
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[hsl(var(--border))] bg-[#101010] p-5 text-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 px-2"><img src={LOGO_SRC} alt="Arka Media" className="h-12 w-auto max-w-[190px] object-contain object-left" /></div>
      <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] uppercase tracking-[0.18em] text-[#f8c329]">{actor.role} workspace</div><div className="mt-1 text-sm font-bold">{actor.name}</div><div className="mt-1 text-xs text-white/45">{actor.title}</div></div>
      <nav className="mt-7 flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
        {nav.map(({ label, path, icon: Icon }) => (
          <Link key={path} href={path} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${location === path || (path === '/work' && location.startsWith('/work/')) ? 'bg-[#f8c329] text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
            <Icon className="size-4" />{label}
          </Link>
        ))}
        <Link href="/documents" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${location === '/documents' ? 'bg-[#f8c329] text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
          <FileText className="size-4" />Documents
        </Link>
      </nav>
      <button onClick={onLogout} className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/55 hover:bg-white/10 hover:text-white"><LogOut className="size-4" />Log out</button><div className="mt-3 border-t border-white/10 pt-3 text-[10px] uppercase tracking-[0.12em] text-white/35">Designed and developed by Dhuruv</div>
    </aside>
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
    <main className="min-h-screen lg:pl-[260px]">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[hsl(var(--border))] bg-[#f7f7f5]/90 px-5 backdrop-blur md:px-8">
        <button className="rounded-lg p-2 hover:bg-white lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></button>
        <div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] md:flex">
          <span className="size-2 rounded-full bg-emerald-500" /> Workspace <span className="text-black/20">/</span> {actor.role}
        </div>
        <div className="ml-auto flex items-center gap-3 md:gap-4">
          
          {/* 9-Hour Shift Tracker Pill */}
          {shiftTargetInfo && (
            <div 
              className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs ${
                shiftTargetInfo.isCompleted
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
              title={`First login today: ${shiftTargetInfo.loginTimeStr}. Target 9h logout: ${shiftTargetInfo.targetTimeStr}. Total today: ${hours(shiftTargetInfo.totalMinutes)}.`}
            >
              <Clock3 className={`size-3.5 ${shiftTargetInfo.isCompleted ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>
                {shiftTargetInfo.isCompleted ? (
                  <span className="font-bold text-emerald-700">✓ 9h Shift Done ({hours(shiftTargetInfo.totalMinutes)})</span>
                ) : (
                  <span>
                    <strong className="text-black">{hours(shiftTargetInfo.totalMinutes)}</strong> / 9h · Out by <strong className="text-black">{shiftTargetInfo.targetTimeStr}</strong>
                    <span className="ml-1 text-[10px] text-slate-500">({hours(shiftTargetInfo.remainingMinutes)} left)</span>
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Unified Daily Break Pool Indicator with Carryover */}
          <div 
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs cursor-default"
            title="Total daily break quota: 75 mins (1h 15m). Unused lunch minutes roll over to your breaks!"
          >
            <Coffee className="size-3.5 text-amber-700" />
            <span>
              Break Pool: <strong className={poolLeft <= 15 ? 'text-rose-700 font-extrabold' : 'text-amber-950 font-extrabold'}>{poolLeft}m</strong> / 75m left
            </span>
          </div>

          {/* Active Countdown Badge for Break and Lunch with Strict Auto-Logout Warning */}
          {(actor.presence === 'Break' || actor.presence === 'Lunch') && timerSecondsRemaining !== null && timerSecondsRemaining !== undefined && (
            <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
              timerSecondsRemaining <= 0 
                ? 'bg-red-100 border border-red-400 text-red-900 animate-pulse' 
                : 'bg-amber-50 border border-amber-300 text-amber-900 animate-pulse'
            }`}>
              <Clock3 className={`size-3.5 ${timerSecondsRemaining <= 0 ? 'text-red-600' : 'text-amber-600 animate-spin'}`} style={{ animationDuration: '4s' }} />
              <span>
                {timerSecondsRemaining <= 0 ? (
                  <span className="text-red-700 font-extrabold">
                    ⚠️ OVERDUE {actor.presence.toUpperCase()}! Auto-logout in {Math.max(0, 60 + timerSecondsRemaining)}s
                  </span>
                ) : (
                  <span>
                    {actor.presence === 'Break' ? '☕ Break' : '🍱 Lunch'}: {Math.floor(timerSecondsRemaining / 60)}:{String(timerSecondsRemaining % 60).padStart(2, '0')}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onUpdatePresence('Online')}
                className={`ml-1 rounded-full font-bold text-[10px] px-2 py-0.5 transition shadow-sm cursor-pointer ${
                  timerSecondsRemaining <= 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
                title="End break and return to Online"
              >
                End early
              </button>
            </div>
          )}

          {/* Presence Dropdown */}
          <div className="flex items-center gap-2 rounded-full bg-white border border-[hsl(var(--border))] px-3 py-1 shadow-sm">
            <span className={`size-2 rounded-full ${actor.presence === 'Online' ? 'bg-emerald-400' : actor.presence === 'Break' || actor.presence === 'Lunch' ? 'bg-amber-400' : 'bg-slate-400'}`} /> 
            <select 
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-[hsl(var(--foreground))]"
              value={actor.presence}
              onChange={(e) => onUpdatePresence(e.target.value as Presence)}
            >
              <option value="Online">Online</option>
              <option 
                value="Break" 
                disabled={actor.presence !== 'Break' && poolLeft <= 0}
              >
                On Break (15m)
              </option>
              <option 
                value="Lunch" 
                disabled={actor.presence !== 'Lunch' && poolLeft <= 0}
              >
                At Lunch (60m)
              </option>
              <option value="Idle">Idle</option>
            </select>
          </div>

          <button className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-white" title="Search"><Search className="size-4" /></button>
          
          {/* Notification Button */}
          <button 
            onClick={() => {
              if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  toast({ title: 'Notifications Active', description: 'You will receive popups and sound when new tasks are assigned.' });
                } else {
                  Notification.requestPermission().then((perm) => {
                    if (perm === 'granted') {
                      toast({ title: 'Notifications Enabled', description: 'Task assignment alerts are now active.' });
                    } else {
                      toast({ title: 'Notifications Blocked', description: 'Please enable notifications in browser settings for alerts.' });
                    }
                  });
                }
              }
            }}
            className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-white" 
            title="Notification alerts"
          >
            <Bell className="size-4" />
          </button>

          <div className="grid size-8 place-items-center rounded-full bg-[#111] text-xs font-bold text-[#f8c329]">{actor.name.split(' ').map((part) => part[0]).join('')}</div>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] p-5 md:p-8">{children}</div>
    </main>
    {allPeople && <ChatWidget currentUser={actor} allPeople={allPeople} />}
  </div>;
}

function Metric({ label, value, detail, tone = 'default', onClick }: { label: string; value: string | number; detail: string; tone?: 'default' | 'warning' | 'danger' | 'success'; onClick?: () => void }) {
  const color = tone === 'danger' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : tone === 'success' ? 'text-emerald-700' : 'text-[hsl(var(--foreground))]';
  return <button onClick={onClick} className={`rounded-2xl border border-[hsl(var(--border))] bg-white p-5 text-left shadow-[0_10px_30px_rgba(20,20,20,0.03)] transition hover:-translate-y-0.5 hover:shadow-md ${onClick ? 'cursor-pointer' : 'cursor-default'}`}><div className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">{label}</div><div className={`mt-3 text-3xl font-black tracking-[-0.06em] ${color}`}>{value}</div><div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{detail}</div></button>;
}

function PersonRow({ item, currentWork, onOpen, onDelete }: { item: Person; currentWork?: WorkItem; onOpen?: (id: string) => void; onDelete?: () => void }) {
  return <div className="flex flex-wrap items-center gap-4 border-b border-[hsl(var(--border))] px-5 py-4 last:border-0"><div className={`size-2.5 rounded-full ${item.presence === 'Online' ? 'bg-emerald-500' : item.presence === 'Break' || item.presence === 'Lunch' ? 'bg-amber-400' : item.presence === 'Idle' ? 'bg-yellow-300' : 'bg-slate-300'}`} /><div className="min-w-[160px] flex-1"><div className="font-bold">{item.name}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{item.title}</div></div><div className="w-20 text-xs font-semibold">{item.presence}</div><div className="w-40 text-xs text-[hsl(var(--muted-foreground))]">{item.presence === 'Online' ? (item.loginAt ? `In: ${formatTimestamp(item.loginAt)}` : 'Online') : (item.logoutAt ? `Out: ${formatTimestamp(item.logoutAt)}` : item.loginAt ? `Last: ${formatTimestamp(item.loginAt)}` : 'No session')}</div><div className="min-w-[180px] flex-1 text-sm">{currentWork ? <button className="text-left font-semibold hover:text-[hsl(var(--primary))]" onClick={() => onOpen?.(currentWork.id)}>{currentWork.title}<div className="mt-0.5 text-xs font-normal text-[hsl(var(--muted-foreground))]">{currentWork.stage}</div></button> : <span className="text-[hsl(var(--muted-foreground))]">No current work</span>}</div>{onDelete && item.role !== 'Founder' && <button type="button" title={`Delete ${item.name}`} onClick={onDelete} className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700 transition"><Trash2 className="size-4" /></button>}</div>;
}

function WorkRow({ item, tasks, onOpen }: { item: WorkItem; tasks: WorkTask[]; onOpen: (id: string) => void }) {
  return <button onClick={() => onOpen(item.id)} className="group grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-[hsl(var(--border))] px-5 py-4 text-left last:border-0 hover:bg-[#fafaf8] md:grid-cols-[1.4fr_0.6fr_0.65fr_0.7fr_auto]"><div><div className="font-bold group-hover:text-[hsl(var(--primary))]">{item.title}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.client || 'Internal'} · {tasks.length} task{tasks.length === 1 ? '' : 's'}</div></div><div className="hidden text-sm md:block">{item.managerId ? person(item.managerId).name : item.directAssigneeId ? person(item.directAssigneeId).name : 'Unassigned'}</div><div className={`hidden text-sm font-bold md:block ${priorityTone[item.priority]}`}>{item.priority}</div><div className="hidden text-sm text-[hsl(var(--muted-foreground))] md:block">{formatDate(item.dueDate)}</div><Badge className={stageTone[item.stage]}>{item.stage}</Badge></button>;
}

function Dashboard({ actor, work, tasks, peopleInScope, reports, leaves = [], onDecision, onOpen, onCreate, onNavigate, onDeletePerson }: { actor: Person; work: WorkItem[]; tasks: WorkTask[]; peopleInScope: Person[]; reports: ManagerReport[]; leaves?: LeaveRequest[]; onDecision?: (id: string, status: LeaveStatus) => void; onOpen: (id: string) => void; onCreate: () => void; onNavigate: (path: string) => void; onDeletePerson?: (id: string) => Promise<void> | void }) {
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const active = work.filter((item) => item.stage !== 'Completed');
  const dueToday = active.filter((item) => item.dueDate === TODAY);
  const overdue = active.filter((item) => isOverdue(item.dueDate));
  const blocked = active.filter((item) => item.stage === 'Blocked');
  const reviews = actor.role === 'Manager'
    ? tasks.filter((task) => isTaskPendingManagerReview(task, work))
    : tasks.filter((task) => isTaskPendingFounderReview(task, work));
  if (actor.role === 'HR Manager') {
    const onlineEmployees = peopleInScope.filter((p) => p.presence === 'Online');
    const onLeaveEmployees = peopleInScope.filter((p) => leaves.some((l) => l.userId === p.id && isApprovedLeaveActiveOnDate(l, TODAY)));
    const pendingLeaves = leaves.filter((l) => l.status === 'Pending');

    return (
      <>
        <SectionTitle
          eyebrow="HR Executive Command Center"
          title={`Good morning, ${actor.name.split(' ')[0]}.`}
          description="Executive HR oversight — monitor company-wide attendance, review and approve leaves, and observe team workflow."
          action={<Button onClick={onCreate}><Plus className="size-4" />Add my task</Button>}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Total employees"
            value={peopleInScope.length}
            detail="Company roster"
            onClick={() => onNavigate('/people')}
          />
          <Metric
            label="Active now"
            value={onlineEmployees.length}
            detail="Currently online"
            tone="success"
            onClick={() => onNavigate('/attendance')}
          />
          <Metric
            label="On leave today"
            value={onLeaveEmployees.length}
            detail="Approved leave"
            tone={onLeaveEmployees.length > 0 ? 'warning' : 'default'}
            onClick={() => onNavigate('/leave')}
          />
          <Metric
            label="Pending leaves"
            value={pendingLeaves.length}
            detail="Requires decision"
            tone={pendingLeaves.length > 0 ? 'warning' : 'default'}
            onClick={() => onNavigate('/leave')}
          />
          <Metric
            label="Active workflow"
            value={active.length}
            detail="Initiatives in progress"
            onClick={() => onNavigate('/work')}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Daily Presence</div>
                <h2 className="mt-1 text-lg font-black">Team Attendance & Availability</h2>
              </div>
              <Button variant="ghost" onClick={() => onNavigate('/attendance')}>
                View attendance <ArrowRight className="size-4" />
              </Button>
            </div>
            {peopleInScope.map((item) => (
              <PersonRow
                key={item.id}
                item={item}
                currentWork={work.find((entry) => entry.managerId === item.id || entry.directAssigneeId === item.id)}
                onOpen={onOpen}
                onDelete={onDeletePerson && item.role !== 'Founder' ? () => setDeleteTarget(item) : undefined}
              />
            ))}
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Leave Requests</div>
                  <h2 className="mt-1 text-lg font-black">Pending Approval</h2>
                </div>
                <Button variant="ghost" onClick={() => onNavigate('/leave')}>
                  All leaves <ArrowRight className="size-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {pendingLeaves.slice(0, 5).map((leave) => {
                  const emp = person(leave.userId);
                  return (
                    <div key={leave.id} className="rounded-xl border border-[hsl(var(--border))] p-3.5 bg-[#fafaf8]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold">{emp.name}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{emp.role} · {leave.leaveType}</div>
                          <div className="mt-1 text-xs text-slate-600">{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</div>
                          <div className="mt-1 text-xs italic text-[hsl(var(--muted-foreground))]">"{leave.reason}"</div>
                        </div>
                      </div>
                      {onDecision && (
                        <div className="mt-3 flex gap-2 border-t border-[hsl(var(--border))] pt-2">
                          <button
                            type="button"
                            onClick={() => onDecision(leave.id, 'Approved')}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            <Check className="size-3" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onDecision(leave.id, 'Rejected')}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {pendingLeaves.length === 0 && (
                  <p className="py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    No pending leave requests to approve.
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Workflow</div>
                  <h2 className="mt-1 text-lg font-black">Active Initiatives</h2>
                </div>
                <Button variant="ghost" onClick={() => onNavigate('/work')}>
                  View all <ArrowRight className="size-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {active.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onOpen(item.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-[hsl(var(--border))] p-3 text-left hover:bg-[#fafaf8] transition"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-semibold text-sm truncate">{item.title}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">{item.workType} · {item.progress}% done</div>
                    </div>
                    <Badge className={stageTone[item.stage]}>{item.stage}</Badge>
                  </button>
                ))}
                {active.length === 0 && (
                  <p className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">No active work.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }
  if (actor.role === 'Founder') return <><SectionTitle eyebrow="Founder command center" title={`Good morning, ${actor.name.split(' ')[0]}.`} description="Here's the current state of Arka. Exception-focused visibility for decisions, not employee surveillance." action={<Button onClick={onCreate}><Plus className="size-4" />Assign work</Button>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Active work" value={active.length} detail="Across the operation" onClick={() => onNavigate('/work')} /><Metric label="Due today" value={dueToday.length} detail="Needs a decision" tone="warning" /><Metric label="Overdue" value={overdue.length} detail="Requires intervention" tone="danger" onClick={() => onNavigate('/work')} /><Metric label="Blocked" value={blocked.length} detail="Waiting on a path forward" tone="danger" /><Metric label="Waiting approval" value={reviews.length} detail="Ready for final sign-off" tone="warning" onClick={() => onNavigate('/approvals')} /></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><Card><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><div><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Where is everyone?</div><h2 className="mt-1 text-lg font-black">Team presence</h2></div><Button variant="ghost" onClick={() => onNavigate('/people')}>Manage people <ArrowRight className="size-4" /></Button></div>{peopleInScope.map((item) => <PersonRow key={item.id} item={item} currentWork={work.find((entry) => entry.managerId === item.id || entry.directAssigneeId === item.id)} onOpen={onOpen} onDelete={onDeletePerson && item.role !== 'Founder' ? () => setDeleteTarget(item) : undefined} />)}</Card><Card className="p-5"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Attention required</div><h2 className="mt-1 text-lg font-black">Founder decisions</h2><div className="mt-5 space-y-3">{[...overdue.slice(0, 2).map((item) => ({ label: 'Overdue work', item })), ...blocked.slice(0, 2).map((item) => ({ label: 'Blocked work', item }))].map(({ label, item }) => <button key={item.id} onClick={() => onOpen(item.id)} className="flex w-full items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-3 text-left hover:bg-[#fafaf8]"><ShieldAlert className="mt-0.5 size-4 text-red-600" /><span><span className="block text-xs font-bold uppercase tracking-wide text-red-700">{label}</span><span className="mt-1 block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{item.managerId ? `Manager: ${person(item.managerId).name}` : 'Direct assignment'}</span></span></button>)}{reports.filter((report) => report.status === 'Submitted').map((report) => <button key={report.id} onClick={() => onNavigate('/reports')} className="flex w-full items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-3 text-left hover:bg-[#fafaf8]"><FileText className="mt-0.5 size-4 text-[hsl(var(--primary))]" /><span><span className="block text-xs font-bold uppercase tracking-wide text-[hsl(var(--primary))]">Manager report</span><span className="mt-1 block text-sm font-semibold">{report.period} is ready to review</span></span></button>)}{overdue.length + blocked.length + reports.filter((report) => report.status === 'Submitted').length === 0 && <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No founder intervention required.</p>}</div></Card></div>{deleteTarget && <ConfirmDeleteModal targetPerson={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (onDeletePerson) await onDeletePerson(deleteTarget.id); }} />}</>;
  if (actor.role === 'Manager') return <><SectionTitle eyebrow="Manager command center" title={`Good morning, ${actor.name.split(' ')[0]}.`} description="What does your team need to execute today?" action={<Button onClick={onCreate}><Plus className="size-4" />Assign task</Button>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Founder assignments" value={work.filter((item) => item.managerId === actor.id && item.stage === 'Planning').length} detail="Waiting to be planned" onClick={() => onNavigate('/assignments')} /><Metric label="Team work" value={tasks.filter((task) => person(task.assigneeId).managerId === actor.id && task.stage !== 'Completed').length} detail="Active team tasks" /><Metric label="Due today" value={dueToday.length} detail="Deadline today" tone="warning" /><Metric label="Blocked" value={blocked.length} detail="Needs resolution" tone="danger" /><Metric label="My reviews" value={reviews.length} detail="Waiting for your review" tone="warning" onClick={() => onNavigate('/reviews')} /></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Manager attention</div><h2 className="mt-1 text-lg font-black">Keep execution moving</h2></div><div className="p-5 space-y-3">{[...reviews.map((task) => ({ label: 'Waiting for review', title: task.title, detail: `${person(task.assigneeId).name} submitted this task`, id: task.workId })), ...blocked.map((item) => ({ label: 'Blocked', title: item.title, detail: 'Resolve or escalate the blocker', id: item.id }))].map((item) => <button key={`${item.label}-${item.id}`} onClick={() => onOpen(item.id)} className="flex w-full items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-4 text-left hover:bg-[#fafaf8]"><Flag className="mt-0.5 size-4 text-amber-600" /><span><span className="block text-xs font-bold uppercase tracking-wide text-amber-700">{item.label}</span><span className="mt-1 block font-bold">{item.title}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</span></span></button>)}{reviews.length + blocked.length === 0 && <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Your team is clear.</p>}</div></Card><TeamWorkload peopleInScope={peopleInScope} tasks={tasks} /></div></>;
  const ownTasks = tasks.filter((task) => task.assigneeId === actor.id);
  const today = ownTasks.filter((task) => task.dueDate === TODAY);
  const next = ownTasks.filter((task) => task.dueDate > TODAY && task.stage !== 'Completed');
  const blockedMine = ownTasks.filter((task) => task.stage === 'Blocked');
  return <><SectionTitle eyebrow="Team member workspace" title={`Good morning, ${actor.name.split(' ')[0]}.`} description="Here is the work that needs your attention. Focus on execution, progress, and clear handoffs." action={<Button onClick={onCreate}><Plus className="size-4" />Add my task</Button>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Now" value={ownTasks.filter((task) => task.stage === 'In Progress').length} detail="Currently in progress" /><Metric label="Due today" value={today.length} detail="Finish or update today" tone="warning" /><Metric label="Blocked" value={blockedMine.length} detail="Needs a reason" tone="danger" /><Metric label="Waiting review" value={ownTasks.filter((task) => task.stage === 'Review').length} detail="Submitted to manager" tone="success" /></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><TaskColumn title="Today's work" tasks={today} work={work} onOpen={onOpen} empty="Nothing due today." /><TaskColumn title="Next" tasks={next} work={work} onOpen={onOpen} empty="No upcoming work." /></div></>;
}

function TeamWorkload({ peopleInScope, tasks }: { peopleInScope: Person[]; tasks: WorkTask[] }) {
  return <Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">My team</div><h2 className="mt-1 text-lg font-black">Workload and availability</h2></div><div className="divide-y divide-[hsl(var(--border))]">{peopleInScope.filter((item) => item.role === 'Team member').map((member) => { const count = tasks.filter((task) => task.assigneeId === member.id && task.stage !== 'Completed').length; return <div key={member.id} className="flex items-center gap-3 px-5 py-4"><div className={`size-2 rounded-full ${member.presence === 'Online' ? 'bg-emerald-500' : 'bg-slate-300'}`} /><div className="min-w-0 flex-1"><div className="font-bold">{member.name}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{member.presence} · {count} active task{count === 1 ? '' : 's'}</div></div><Badge className={count >= 3 ? 'border-red-200 bg-red-50 text-red-700' : count === 0 ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>{count >= 3 ? 'High' : count === 0 ? 'Available' : 'Normal'}</Badge></div>; })}</div></Card>;
}

function TaskColumn({ title, tasks, work, onOpen, empty }: { title: string; tasks: WorkTask[]; work: WorkItem[]; onOpen: (id: string) => void; empty: string }) {
  return <Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><h2 className="text-lg font-black">{title}</h2></div><div>{tasks.map((task) => <button key={task.id} onClick={() => onOpen(task.workId)} className="flex w-full items-start gap-3 border-b border-[hsl(var(--border))] px-5 py-4 text-left last:border-0 hover:bg-[#fafaf8]"><div className="mt-1 size-2 rounded-full bg-[#f8c329]" /><span className="min-w-0 flex-1"><span className="block font-bold">{task.title}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{work.find((item) => item.id === task.workId)?.title} · due {formatDate(task.dueDate)}</span></span><Badge className={stageTone[task.stage]}>{task.stage}</Badge></button>)}{tasks.length === 0 && <p className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">{empty}</p>}</div></Card>;
}

function MemberTasksModal({ 
  member, 
  tasks, 
  work, 
  onClose, 
  onOpen 
}: { 
  member: Person; 
  tasks: WorkTask[]; 
  work: WorkItem[]; 
  onClose: () => void; 
  onOpen: (workId: string) => void; 
}) {
  const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
  
  // Day-wise / Date-wise grouping
  const todayTasks = memberTasks.filter((t) => t.dueDate === TODAY && t.stage !== 'Completed' && t.stage !== 'Approved');
  const upcomingTasks = memberTasks.filter((t) => t.dueDate > TODAY && t.stage !== 'Completed' && t.stage !== 'Approved');
  const overdueTasks = memberTasks.filter((t) => t.dueDate < TODAY && t.stage !== 'Completed' && t.stage !== 'Approved');
  const completedTasks = memberTasks.filter((t) => t.stage === 'Completed' || t.stage === 'Approved');

  const renderTaskCard = (task: WorkTask) => {
    const parentWork = work.find((w) => w.id === task.workId);
    return (
      <div key={task.id} className="rounded-xl border border-[hsl(var(--border))] bg-white p-4 shadow-xs hover:border-[hsl(var(--primary))] transition">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-[hsl(var(--foreground))]">{task.title}</h4>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Initiative: <strong className="text-slate-700">{parentWork?.title || 'General Task'}</strong>
              {parentWork?.client ? ` · Client: ${parentWork.client}` : ''}
            </div>
            {task.instructions && (
              <p className="mt-2 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-md">
                {task.instructions}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <Badge className={priorityTone[task.priority] + ' text-[10px]'}>{task.priority}</Badge>
              <Badge className={stageTone[task.stage] + ' text-[10px]'}>{task.stage}</Badge>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <CalendarDays className="size-3 text-slate-400" />
              <span>Due: {formatDate(task.dueDate)}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[hsl(var(--border))] pt-2.5 text-xs text-[hsl(var(--muted-foreground))]">
          <span>Time logged: <strong className="text-slate-700">{hours(task.timeMinutes)}</strong></span>
          <Button variant="ghost" onClick={() => { onClose(); onOpen(task.workId); }}>
            Open Task <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal title={`Tasks — ${member.name}`} onClose={onClose}>
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
        {/* Member Header Banner */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-[hsl(var(--border))] p-3">
          <div>
            <div className="font-bold text-sm">{member.name}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{member.role} · {member.title}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${member.presence === 'Online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="text-xs font-semibold">{member.presence}</span>
            <Badge className="ml-2 text-xs">{memberTasks.length} Total Tasks</Badge>
          </div>
        </div>

        {memberTasks.length === 0 ? (
          <p className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No tasks currently assigned to {member.name}.
          </p>
        ) : (
          <div className="space-y-5">
            {todayTasks.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                  <CalendarDays className="size-4" />
                  <span>Today's Tasks ({todayTasks.length}) — {formatDate(TODAY)}</span>
                </div>
                <div className="space-y-2.5">
                  {todayTasks.map(renderTaskCard)}
                </div>
              </div>
            )}

            {overdueTasks.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700">
                  <Flag className="size-4" />
                  <span>Overdue Tasks ({overdueTasks.length})</span>
                </div>
                <div className="space-y-2.5">
                  {overdueTasks.map(renderTaskCard)}
                </div>
              </div>
            )}

            {upcomingTasks.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
                  <Clock3 className="size-4" />
                  <span>Upcoming Tasks ({upcomingTasks.length})</span>
                </div>
                <div className="space-y-2.5">
                  {upcomingTasks.map(renderTaskCard)}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  <span>Completed & Approved ({completedTasks.length})</span>
                </div>
                <div className="space-y-2.5">
                  {completedTasks.map(renderTaskCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function WorkListPage({ 
  title, 
  description, 
  work, 
  tasks, 
  onOpen, 
  onCreate, 
  createButtonLabel = 'Assign work', 
  filter 
}: { 
  title: string; 
  description: string; 
  work: WorkItem[]; 
  tasks: WorkTask[]; 
  onOpen: (id: string) => void; 
  onCreate?: () => void; 
  createButtonLabel?: string; 
  filter?: (item: WorkItem) => boolean 
}) {
  const [query, setQuery] = useState('');
  const isMemberWork = createButtonLabel === 'Add my task';
  const [viewMode, setViewMode] = useState<'tasks' | 'work'>(isMemberWork ? 'tasks' : 'work');

  const visibleWork = work.filter(filter || (() => true)).filter((item) => `${item.title} ${item.client || ''}`.toLowerCase().includes(query.toLowerCase()));
  const visibleTasks = tasks.filter((t) => `${t.title} ${t.instructions || ''}`.toLowerCase().includes(query.toLowerCase()));

  // Date-wise task categories
  const todayTasks = visibleTasks.filter((t) => t.dueDate === TODAY && t.stage !== 'Completed' && t.stage !== 'Approved');
  const upcomingTasks = visibleTasks.filter((t) => t.dueDate > TODAY && t.stage !== 'Completed' && t.stage !== 'Approved');
  const overdueTasks = visibleTasks.filter((t) => t.dueDate < TODAY && t.stage !== 'Completed' && t.stage !== 'Approved');
  const completedTasks = visibleTasks.filter((t) => t.stage === 'Completed' || t.stage === 'Approved');

  const renderTaskRow = (task: WorkTask) => {
    const parentWork = work.find((w) => w.id === task.workId);
    return (
      <div key={task.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-[hsl(var(--border))] px-5 py-4 last:border-0 hover:bg-[#fafaf8] transition">
        <div className="min-w-[240px] flex-1">
          <button onClick={() => onOpen(task.workId)} className="text-left font-bold hover:text-[hsl(var(--primary))] transition">
            {task.title}
          </button>
          <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Initiative: <strong className="text-slate-700">{parentWork?.title || 'General'}</strong>
            {parentWork?.client ? ` · Client: ${parentWork.client}` : ''}
          </div>
          {task.instructions && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-1">{task.instructions}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge className={priorityTone[task.priority] + ' text-[10px]'}>{task.priority}</Badge>
          <Badge className={stageTone[task.stage] + ' text-[10px]'}>{task.stage}</Badge>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 min-w-[90px]">
            <CalendarDays className="size-3.5 text-slate-400" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
          <Button variant="ghost" onClick={() => onOpen(task.workId)}>
            Open <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <SectionTitle 
        eyebrow="Work" 
        title={title} 
        description={description} 
        action={onCreate && <Button onClick={onCreate}><Plus className="size-4" />{createButtonLabel}</Button>} 
      />

      {/* View Switcher Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-[hsl(var(--border))] bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('tasks')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              viewMode === 'tasks' ? 'bg-[#f8c329] text-black shadow-xs' : 'text-slate-600 hover:text-black'
            }`}
          >
            📅 Date-wise Tasks ({visibleTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('work')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              viewMode === 'work' ? 'bg-[#f8c329] text-black shadow-xs' : 'text-slate-600 hover:text-black'
            }`}
          >
            📁 Initiatives / Projects ({visibleWork.length})
          </button>
        </div>

        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input 
            value={query} 
            onChange={(event) => setQuery(event.target.value)} 
            placeholder={viewMode === 'tasks' ? "Search tasks..." : "Search work..."} 
            className="w-full rounded-lg border border-[hsl(var(--input))] bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--primary))]" 
          />
        </div>
      </div>

      {viewMode === 'tasks' ? (
        <div className="space-y-5">
          {/* Today */}
          <Card>
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-amber-50/50 px-5 py-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                <CalendarDays className="size-4 text-amber-600" />
                <span>Today's Tasks ({todayTasks.length}) — {formatDate(TODAY)}</span>
              </div>
            </div>
            {todayTasks.map(renderTaskRow)}
            {todayTasks.length === 0 && <p className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">No active tasks due today.</p>}
          </Card>

          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <Card>
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-red-50/50 px-5 py-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-900">
                  <Flag className="size-4 text-red-600" />
                  <span>Overdue Tasks ({overdueTasks.length})</span>
                </div>
              </div>
              {overdueTasks.map(renderTaskRow)}
            </Card>
          )}

          {/* Upcoming */}
          <Card>
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-blue-50/50 px-5 py-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
                <Clock3 className="size-4 text-blue-600" />
                <span>Upcoming Tasks ({upcomingTasks.length})</span>
              </div>
            </div>
            {upcomingTasks.map(renderTaskRow)}
            {upcomingTasks.length === 0 && <p className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">No upcoming tasks scheduled.</p>}
          </Card>

          {/* Completed */}
          {completedTasks.length > 0 && (
            <Card>
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-emerald-50/50 px-5 py-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Completed & Approved Tasks ({completedTasks.length})</span>
                </div>
              </div>
              {completedTasks.slice(0, 10).map(renderTaskRow)}
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <div className="grid grid-cols-[1.4fr_0.6fr_0.65fr_0.7fr_auto] border-b border-[hsl(var(--border))] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
            <span>Work</span><span>Owner</span><span>Priority</span><span>Deadline</span><span>Stage</span>
          </div>
          {visibleWork.map((item) => (
            <WorkRow key={item.id} item={item} tasks={tasks.filter((task) => task.workId === item.id)} onOpen={onOpen} />
          ))}
          {visibleWork.length === 0 && <p className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No work matches this view.</p>}
        </Card>
      )}
    </>
  );
}

function TeamPage({ actor, work, tasks, onOpen }: { actor: Person; work: WorkItem[]; tasks: WorkTask[]; onOpen: (id: string) => void }) {
  const isExec = actor.role === 'Founder' || actor.role === 'HR Manager';
  const scope = isExec ? runtimePeople : runtimePeople.filter((item) => item.managerId === actor.id || item.id === actor.id);
  const [selectedMember, setSelectedMember] = useState<Person | null>(null);

  return (
    <>
      <SectionTitle 
        eyebrow={isExec ? 'Operational view' : 'My team'} 
        title={isExec ? 'Where is everyone?' : 'Team execution'} 
        description="Presence and task allocation across your team. Click any member to inspect their day-wise task breakdown." 
      />
      <Card>
        <div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_1.2fr_0.9fr] border-b border-[hsl(var(--border))] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
          <span>Person (Click to view tasks)</span><span>Presence</span><span>Login Timestamp</span><span>Current work</span><span>Workload</span>
        </div>
        {scope.map((member) => { 
          const currentTask = tasks.find((task) => task.assigneeId === member.id && task.stage !== 'Completed'); 
          const currentWork = currentTask ? work.find((item) => item.id === currentTask.workId) : work.find((item) => item.managerId === member.id && item.stage !== 'Completed'); 
          const memberTaskList = tasks.filter((task) => task.assigneeId === member.id && task.stage !== 'Completed');
          const count = memberTaskList.length; 
          return (
            <div 
              key={member.id} 
              onClick={() => setSelectedMember(member)}
              className="grid grid-cols-[1.2fr_0.7fr_0.8fr_1.2fr_0.9fr] items-center border-b border-[hsl(var(--border))] px-5 py-4 text-sm last:border-0 hover:bg-[#fafaf8] cursor-pointer transition"
            >
              <div>
                <div className="font-bold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] flex items-center gap-1.5">
                  {member.name}
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2 font-semibold">
                    View Tasks
                  </span>
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{member.role} · {member.title}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${member.presence === 'Online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                {member.presence}
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">{formatTimestamp(member.loginAt) || (member.logoutAt ? `Out: ${formatTimestamp(member.logoutAt)}` : '—')}</div>
              <div>
                {currentWork ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onOpen(currentWork.id); }} 
                    className="text-left font-semibold hover:text-[hsl(var(--primary))]"
                  >
                    {currentTask?.title || currentWork.title}
                    <div className="text-xs font-normal text-[hsl(var(--muted-foreground))]">{currentWork.stage}</div>
                  </button>
                ) : (
                  <span className="text-[hsl(var(--muted-foreground))]">No current work</span>
                )}
              </div>
              <div>
                <Badge className={count >= 3 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>
                  {count >= 3 ? 'High' : `${count} active`}
                </Badge>
              </div>
            </div>
          ); 
        })}
      </Card>

      {selectedMember && (
        <MemberTasksModal 
          member={selectedMember} 
          tasks={tasks} 
          work={work} 
          onClose={() => setSelectedMember(null)} 
          onOpen={(id) => { setSelectedMember(null); onOpen(id); }} 
        />
      )}
    </>
  );
}

function WorkDetail({ actor, item, tasks, activities, comments, onBack, onOpen, onUpdateTask, onAddTask, onComment, onStartTimer, onDeleteTask, onDeleteWork }: { actor: Person; item: WorkItem; tasks: WorkTask[]; activities: Activity[]; comments: Comment[]; onBack: () => void; onOpen: (id: string) => void; onUpdateTask: (taskId: string, patch: Partial<WorkTask>, message: string) => void; onAddTask: (task: Omit<WorkTask, 'id' | 'stage' | 'progress' | 'timeMinutes'>) => void; onComment: (message: string) => void; onStartTimer: (taskId: string) => void; onDeleteTask?: (taskId: string) => void; onDeleteWork?: (workId: string) => void }) {
  const [comment, setComment] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  const relatedTasks = tasks.filter((task) => task.workId === item.id && (actor.role !== 'Team member' || task.assigneeId === actor.id));
  const canManage = actor.role === 'Founder' || actor.role === 'Manager' || item.directAssigneeId === actor.id || item.managerId === actor.id || item.founderId === actor.id || actor.role === 'HR Manager' || !actor.managerId || actor.role === 'Team member';
  return <><div className="mb-5 flex items-center justify-between"><button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"><ArrowLeft className="size-4" />Back</button>{actor.role === 'Founder' && onDeleteWork && <button type="button" onClick={() => { if (window.confirm(`Are you sure you want to permanently delete "${item.title}" and all its tasks?`)) onDeleteWork(item.id); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition"><Trash2 className="size-3.5" />Delete Work Initiative</button>}</div><SectionTitle eyebrow="Work detail" title={item.title} description={item.description} action={<Badge className={stageTone[item.stage]}>{item.stage}</Badge>} /><div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]"><div className="space-y-6"><Card><div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4"><Info label="Client" value={item.client || 'Internal'} /><Info label="Work type" value={item.workType} /><Info label="Deadline" value={formatDate(item.dueDate)} valueClass={isOverdue(item.dueDate) ? 'text-red-700' : ''} /><Info label="Manager" value={item.managerId ? person(item.managerId).name : item.directAssigneeId ? `Direct · ${person(item.directAssigneeId).name}` : 'Unassigned'} /></div><div className="border-t border-[hsl(var(--border))] px-5 py-4"><div className="mb-2 flex justify-between text-xs font-bold"><span>Overall progress</span><span>{item.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#f8c329]" style={{ width: `${item.progress}%` }} /></div></div></Card><Card><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><div><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Work hierarchy</div><h2 className="mt-1 text-lg font-black">Tasks and execution</h2></div>{canManage && <Button onClick={() => setTaskOpen(true)}><Plus className="size-4" />{actor.role === 'Team member' ? 'Add my task' : 'Assign task'}</Button>}</div><div>{relatedTasks.map((task) => <TaskRow key={task.id} actor={actor} task={task} parentWork={item} onOpen={() => onOpen(item.id)} onUpdate={onUpdateTask} onStartTimer={onStartTimer} onDelete={onDeleteTask} />)}{relatedTasks.length === 0 && <p className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No tasks assigned to you for this work item.</p>}</div></Card><Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Conversation</div><h2 className="mt-1 text-lg font-black">Comments</h2></div><div className="divide-y divide-[hsl(var(--border))]">{comments.filter((entry) => entry.workId === item.id).map((entry) => <div key={entry.id} className="px-5 py-4"><div className="text-sm font-bold">{person(entry.authorId).name} <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">{entry.createdAt}</span></div><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{entry.message}</p></div>)}<form onSubmit={(event) => { event.preventDefault(); if (comment.trim()) { onComment(comment.trim()); setComment(''); } }} className="flex gap-2 p-5"><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add an operational comment..." className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--input))] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none" /><Button type="submit" disabled={!comment.trim()}>Comment</Button></form></div></Card></div><div className="space-y-6"><Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Activity</div><h2 className="mt-1 text-lg font-black">History</h2></div><div className="p-5 space-y-4">{activities.filter((entry) => entry.workId === item.id).map((entry) => <div key={entry.id} className="flex gap-3"><div className={`mt-1 size-2 rounded-full ${entry.tone === 'warning' ? 'bg-red-500' : entry.tone === 'success' ? 'bg-emerald-500' : 'bg-[#f8c329]'}`} /><div><div className="text-sm"><span className="font-bold">{person(entry.actorId).name}</span> {entry.message}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{entry.createdAt}</div></div></div>)}</div></Card><Card className="p-5"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Responsibility chain</div><div className="mt-4 space-y-3 text-sm"><Chain label="Founder" value={person(item.founderId).name} /><Chain label="Manager" value={item.managerId ? person(item.managerId).name : 'Direct assignment'} /><Chain label="Team tasks" value={actor.role === 'Team member' ? `${relatedTasks.length} assigned to you` : `${relatedTasks.length} assigned`} /><Chain label="Time logged" value={hours(relatedTasks.reduce((sum, task) => sum + task.timeMinutes, 0))} /></div></Card></div></div>{taskOpen && <CreateTaskModal currentUser={actor} workId={item.id} onClose={() => setTaskOpen(false)} onCreate={(task) => { onAddTask(task); setTaskOpen(false); }} />}</>;
}

function TaskRow({ actor, task, parentWork, onOpen, onUpdate, onStartTimer, onDelete }: { actor: Person; task: WorkTask; parentWork?: WorkItem; onOpen: () => void; onUpdate: (taskId: string, patch: Partial<WorkTask>, message: string) => void; onStartTimer: (taskId: string) => void; onDelete?: (taskId: string) => void }) {
  const assignee = person(task.assigneeId);
  const isOwner = actor.id === task.assigneeId;
  const canDelete = actor.role === 'Founder' || actor.role === 'Manager';
  const isManagerApproved = Boolean(task.submittedAt?.startsWith('Manager Approved'));
  const hasManager = isTaskManagedByManager(task, parentWork ? [parentWork] : []);
  const isDirectUnderFounder = !hasManager;
  const isMyManagedTask = Boolean((parentWork?.managerId && parentWork.managerId === actor.id) || (assignee.managerId && assignee.managerId === actor.id));

  return (
    <div className="border-b border-[hsl(var(--border))] p-5 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{task.title}</h3>
            <Badge className={stageTone[task.stage]}>{task.stage}</Badge>
            {task.stage === 'Review' && isManagerApproved && (
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">✓ Manager Approved · Waiting Founder Sign-off</Badge>
            )}
            {task.stage === 'Review' && !isManagerApproved && hasManager && (
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">Awaiting Manager Review</Badge>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{task.instructions}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
            <span>Assigned to <strong className="text-[hsl(var(--foreground))]">{assignee.name}</strong></span>
            <span>Due {formatDate(task.dueDate)}</span>
            <span>{hours(task.timeMinutes)} logged</span>
            {task.submittedAt && <span className="italic text-slate-500">{task.submittedAt}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwner && task.stage !== 'Completed' && (
            <>
              <Button variant="secondary" onClick={() => onStartTimer(task.id)}>
                <Timer className="size-4" />Start timer
              </Button>
              {task.stage === 'Assigned' && (
                <Button onClick={() => onUpdate(task.id, { stage: 'In Progress', progress: 10 }, 'started work')}>
                  Start work
                </Button>
              )}
              {task.stage === 'In Progress' && (
                <Button onClick={() => onUpdate(task.id, { stage: 'Review', progress: 100, submittedAt: 'Submitted today' }, hasManager ? 'submitted work for manager review' : 'submitted work for founder approval')}>
                  Submit for review
                </Button>
              )}
              {task.stage === 'Revision' && (
                <Button onClick={() => onUpdate(task.id, { stage: 'Review', progress: 100, submittedAt: 'Resubmitted today' }, hasManager ? 'resubmitted work after revision for manager review' : 'resubmitted work for founder approval')}>
                  Resubmit
                </Button>
              )}
            </>
          )}

          {canDelete && onDelete && (
            <button type="button" onClick={() => { if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) onDelete(task.id); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition" title="Delete task">
              <Trash2 className="size-3.5" />Delete
            </button>
          )}
        </div>
      </div>

      {task.revisionNote && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <strong>Revision required:</strong> {task.revisionNote}
        </div>
      )}

      {/* Level 1: Manager Review Action Buttons */}
      {actor.role === 'Manager' && isMyManagedTask && task.stage === 'Review' && !isManagerApproved && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[hsl(var(--border))] pt-4">
          <Button onClick={() => onUpdate(task.id, { submittedAt: `Manager Approved (${actor.name})` }, 'approved task and forwarded to Founder for final sign-off')}>
            <Check className="size-4" />Approve & Send to Founder
          </Button>
          <Button variant="secondary" onClick={() => {
            const note = window.prompt("Enter revision instructions for team member:") || "Please update and revise this deliverable.";
            onUpdate(task.id, { stage: 'Revision', progress: 70, revisionNote: note }, 'requested a revision');
          }}>
            Request revision
          </Button>
        </div>
      )}

      {/* Level 2: Founder Approval Action Buttons */}
      {actor.role === 'Founder' && task.stage === 'Review' && (isManagerApproved || isDirectUnderFounder) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[hsl(var(--border))] pt-4">
          <Button onClick={() => onUpdate(task.id, { stage: 'Approved', progress: 100, submittedAt: `Approved by Founder (${actor.name})` }, 'approved the submission with final sign-off')}>
            <Check className="size-4" />Final Approve
          </Button>
          <Button variant="secondary" onClick={() => {
            const note = window.prompt("Enter revision instructions:") || "Revision requested by Founder.";
            onUpdate(task.id, { stage: 'Revision', progress: 70, revisionNote: note }, 'requested a revision');
          }}>
            Request revision
          </Button>
        </div>
      )}
    </div>
  );
}

function ReportsPage({ actor, reports, work, onSubmit, onReview }: { actor: Person; reports: ManagerReport[]; work: WorkItem[]; onSubmit: (report: Omit<ManagerReport, 'id' | 'managerId' | 'status' | 'createdAt'>) => void; onReview: (id: string, status: ManagerReport['status']) => void }) {
  const [open, setOpen] = useState(false);
  const ownReports = actor.role === 'Founder' ? reports : reports.filter((report) => report.managerId === actor.id);
  return <><SectionTitle eyebrow={actor.role === 'Founder' ? 'Founder reports' : actor.role === 'Manager' ? 'Reporting to founder' : 'My progress reports'} title={actor.role === 'Founder' ? 'Reports and decisions' : actor.role === 'Manager' ? 'Report to Founder' : 'My reports'} description={actor.role === 'Founder' ? 'Read consolidated manager reporting and turn operational context into decisions.' : 'Keep the next level informed with clear progress, blockers, and decisions needed.'} action={actor.role === 'Manager' && <Button onClick={() => setOpen(true)}><Plus className="size-4" />Create report</Button>} /><div className="grid gap-5">{ownReports.map((report) => <Card key={report.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">{report.period}</div><h2 className="mt-1 text-lg font-black">Report from {person(report.managerId).name}</h2></div><Badge className={report.status === 'Submitted' ? 'border-amber-200 bg-amber-50 text-amber-700' : report.status === 'Reviewed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'}>{report.status}</Badge></div><div className="mt-5 grid gap-4 text-sm md:grid-cols-2"><ReportBlock title="Completed" value={report.completed} /><ReportBlock title="In progress" value={report.inProgress} /><ReportBlock title="Blockers" value={report.blockers} /><ReportBlock title="Founder decisions" value={report.decisions} /></div>{actor.role === 'Founder' && report.status === 'Submitted' && <div className="mt-5 flex gap-2 border-t border-[hsl(var(--border))] pt-4"><Button onClick={() => onReview(report.id, 'Reviewed')}><Check className="size-4" />Mark reviewed</Button><Button variant="secondary" onClick={() => onReview(report.id, 'Needs revision')}>Request revision</Button></div>}</Card>)}{ownReports.length === 0 && <Card className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No reports yet.</Card>}</div>{open && <ReportModal onClose={() => setOpen(false)} onCreate={(report) => { onSubmit(report); setOpen(false); }} />}</>;
}

function ApprovalsPage({ actor, tasks, work, onOpen, onUpdate }: { actor: Person; tasks: WorkTask[]; work: WorkItem[]; onOpen: (id: string) => void; onUpdate?: (taskId: string, patch: Partial<WorkTask>, message: string) => void }) {
  const isManager = actor.role === 'Manager';
  const isFounderOrHR = actor.role === 'Founder' || actor.role === 'HR Manager';
  const managers = runtimePeople.filter((p) => p.role === 'Manager');

  // Filter tab for Founder/HR: 'all' | 'direct' | managerId
  const [selectedManagerTab, setSelectedManagerTab] = useState<string>('all');

  const pending = tasks.filter((task) => {
    if (isManager) return isTaskPendingManagerReview(task, work, actor.id);

    // Founder / HR view
    if (!isTaskPendingFounderReview(task, work)) return false;
    if (selectedManagerTab === 'all') return true;

    const parentWork = work.find((item) => item.id === task.workId);
    const assignee = person(task.assigneeId);
    const mId = parentWork?.managerId || assignee?.managerId;

    if (selectedManagerTab === 'direct') {
      return !mId || person(mId).role === 'Founder' || person(mId).role !== 'Manager';
    }
    return mId === selectedManagerTab;
  });

  return (
    <>
      <SectionTitle
        eyebrow={isManager ? "Manager review center" : "Founder approval center"}
        title={isManager ? "Team Task Reviews" : "Approvals & Sign-offs"}
        description={isManager ? `Review completed work from your team. Approving a task verifies execution and forwards it to Founder for final sign-off.` : "Final executive sign-off for manager-verified deliverables and direct report initiatives."}
      />

      {/* Separate Manager Tabs for Founder / HR */}
      {isFounderOrHR && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button 
            variant={selectedManagerTab === 'all' ? 'primary' : 'secondary'} 
            onClick={() => setSelectedManagerTab('all')}
          >
            All Reviews ({tasks.filter(t => isTaskPendingFounderReview(t, work)).length})
          </Button>

          {managers.map((m) => {
            const mCount = tasks.filter((t) => {
              if (!isTaskPendingFounderReview(t, work)) return false;
              const parentWork = work.find((w) => w.id === t.workId);
              const assignee = person(t.assigneeId);
              const mId = parentWork?.managerId || assignee?.managerId;
              return mId === m.id;
            }).length;

            return (
              <Button 
                key={m.id} 
                variant={selectedManagerTab === m.id ? 'primary' : 'secondary'} 
                onClick={() => setSelectedManagerTab(m.id)}
              >
                {m.name}'s Team ({mCount})
              </Button>
            );
          })}

          {(() => {
            const directCount = tasks.filter((t) => {
              if (!isTaskPendingFounderReview(t, work)) return false;
              const parentWork = work.find((w) => w.id === t.workId);
              const assignee = person(t.assigneeId);
              const mId = parentWork?.managerId || assignee?.managerId;
              return !mId || person(mId).role === 'Founder' || person(mId).role !== 'Manager';
            }).length;

            return (
              <Button 
                variant={selectedManagerTab === 'direct' ? 'primary' : 'secondary'} 
                onClick={() => setSelectedManagerTab('direct')}
              >
                Direct / Founder Team ({directCount})
              </Button>
            );
          })()}
        </div>
      )}

      <Card>
        {pending.map((task) => {
          const parentWork = work.find((item) => item.id === task.workId);
          const assignee = person(task.assigneeId);
          const isManagerApproved = Boolean(task.submittedAt?.startsWith('Manager Approved'));

          return (
            <div key={task.id} className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-[hsl(var(--border))] px-5 py-5 last:border-0 hover:bg-[#fafaf8]">
              <button onClick={() => onOpen(task.workId)} className="flex items-center gap-4 text-left min-w-[240px] flex-1">
                <div className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <div className="font-bold hover:text-[hsl(var(--primary))]">{task.title}</div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {parentWork?.title || 'Project'} · Submitted by <strong className="text-[hsl(var(--foreground))]">{assignee.name}</strong> ({assignee.role})
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {isManagerApproved ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                        ✓ {task.submittedAt}
                      </Badge>
                    ) : (
                      <Badge className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">
                        {isManager ? 'Awaiting Your Review' : 'Direct Report Submission'}
                      </Badge>
                    )}
                    <span className="text-[11px] text-slate-500 font-medium">Due: {formatDate(task.dueDate)}</span>
                  </div>
                </div>
              </button>

              {onUpdate && (
                <div className="flex items-center gap-2">
                  {isManager ? (
                    <Button onClick={() => onUpdate(task.id, { submittedAt: `Manager Approved (${actor.name})` }, 'approved task and forwarded to Founder')}>
                      <Check className="size-4" />Approve & Send to Founder
                    </Button>
                  ) : (
                    <Button onClick={() => onUpdate(task.id, { stage: 'Approved', progress: 100, submittedAt: `Approved by Founder (${actor.name})` }, 'approved deliverable')}>
                      <Check className="size-4" />Final Approve
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => {
                    const note = window.prompt("Enter revision instructions:") || "Please update and revise.";
                    onUpdate(task.id, { stage: 'Revision', progress: 70, revisionNote: note }, 'requested revision');
                  }}>
                    Revision
                  </Button>
                  <Button variant="ghost" onClick={() => onOpen(task.workId)}>
                    View <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {pending.length === 0 && (
          <p className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
            {isManager ? 'Your team is clear. No tasks waiting for your review.' : 'Nothing is waiting for approval in this view.'}
          </p>
        )}
      </Card>
    </>
  );
}

function TimePage({ actor, tasks }: { actor: Person; tasks: WorkTask[] }) {
  const visible = (actor.role === 'Founder' || actor.role === 'HR Manager') ? tasks : actor.role === 'Manager' ? tasks.filter((task) => person(task.assigneeId).managerId === actor.id) : tasks.filter((task) => task.assigneeId === actor.id);
  const total = visible.reduce((sum, task) => sum + task.timeMinutes, 0);
  return <><SectionTitle eyebrow="Time and effort" title={actor.role === 'Team member' ? 'My time' : 'Time & workload'} description="Understand where operational effort is going; do not treat hours as a simplistic measure of productivity." /><div className="grid gap-3 sm:grid-cols-3"><Metric label="Logged time" value={hours(total)} detail="Across visible work" /><Metric label="Active tasks" value={visible.filter((task) => task.stage !== 'Completed').length} detail="Tasks with open work" /><Metric label="Review time" value={hours(visible.filter((task) => task.stage === 'Review').reduce((sum, task) => sum + task.timeMinutes, 0))} detail="Submitted work" /></div><Card className="mt-6"><div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr] border-b border-[hsl(var(--border))] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]"><span>Task</span><span>Person</span><span>Stage</span><span>Time</span></div>{visible.map((task) => <div key={task.id} className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr] items-center border-b border-[hsl(var(--border))] px-5 py-4 text-sm last:border-0"><span className="font-bold">{task.title}</span><span>{person(task.assigneeId).name}</span><Badge className={stageTone[task.stage]}>{task.stage}</Badge><span className="font-semibold">{hours(task.timeMinutes)}</span></div>)}</Card></>;
}

function InsightsPage({ work, tasks }: { work: WorkItem[]; tasks: WorkTask[] }) {
  const revision = tasks.filter((task) => task.stage === 'Revision').length;
  const review = tasks.filter((task) => task.stage === 'Review').length;
  return <><SectionTitle eyebrow="Operational insights" title="Where is the team stuck?" description="Minimal, decision-oriented signals from work state, review flow, deadlines, and effort." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Completion rate" value={`${Math.round((work.filter((item) => item.stage === 'Completed').length / Math.max(work.length, 1)) * 100)}%`} detail="Work items completed" tone="success" /><Metric label="In review" value={review} detail="Time waiting for review" tone="warning" /><Metric label="In revision" value={revision} detail="Revision loop active" tone="danger" /><Metric label="Overdue work" value={work.filter((item) => isOverdue(item.dueDate) && item.stage !== 'Completed').length} detail="Deadline has passed" tone="danger" /></div><Card className="mt-6 p-5"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Stage flow</div><div className="mt-5 space-y-4">{(['Planning', 'Assigned', 'In Progress', 'Review', 'Revision', 'Approved', 'Completed', 'Blocked'] as Stage[]).map((stage) => { const count = work.filter((item) => item.stage === stage).length + tasks.filter((task) => task.stage === stage).length; return <div key={stage} className="flex items-center gap-3"><div className="w-28 text-sm font-semibold">{stage}</div><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#f8c329]" style={{ width: `${Math.min(100, count * 18)}%` }} /></div><div className="w-8 text-right text-sm font-bold">{count}</div></div>; })}</div></Card></>;
}

function Login({ onEnter }: { onEnter: (email: string, password: string) => Promise<boolean> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isWakingServer, setIsWakingServer] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const wakingTimer = setTimeout(() => setIsWakingServer(true), 2500);
    try {
      const ok = await onEnter(email, password);
      if (!ok) setError('Invalid email or password.');
    } catch {
      setError('Connection failed. Server might be waking up, please retry in a few seconds.');
    } finally {
      clearTimeout(wakingTimer);
      setIsWakingServer(false);
      setLoading(false);
    }
  };

  return <div className="min-h-screen bg-[#101010] text-white"><div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]"><div className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col"><div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '32px 32px' }} /><div className="relative flex items-center gap-3"><img src={LOGO_SRC} alt="Arka Media" className="h-16 w-auto max-w-[280px] object-contain object-left" /></div><div className="relative my-auto max-w-xl"><Badge className="border-white/20 bg-white/5 text-white/60">INTERNAL OPERATING SYSTEM</Badge><h1 className="mt-7 text-6xl font-black leading-[0.96] tracking-[-0.07em]">See the work.<br /><span className="text-[#f8c329]">Move Arka forward.</span></h1><p className="mt-8 max-w-lg text-lg leading-8 text-white/55">A role-based operating view of ownership, deadlines, effort, workload, review, and what needs attention.</p></div><div className="relative flex justify-between text-[10px] uppercase tracking-[0.12em] text-white/35"><span>Arka Digital Media</span><span>Designed and developed by Dhuruv</span></div></div><div className="flex items-center bg-[#f7f7f5] p-6 text-[#111] md:p-12"><div className="mx-auto w-full max-w-md"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b48a00]">Welcome to ARKA OS</div><h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.06em]">Enter your workspace.</h2><form className="mt-9 space-y-4" onSubmit={submit}><label className="block text-xs font-bold uppercase tracking-wide text-black/55">Email<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#c99f18]" placeholder="you@arkadigitalmedia.com" required /></label><label className="block text-xs font-bold uppercase tracking-wide text-black/55">Password<input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#c99f18]" placeholder="••••••••" required /></label>{isWakingServer && <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 animate-pulse"><span className="size-2 rounded-full bg-amber-500" />Connecting to secure server (waking up, please wait)...</div>}{error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}<Button type="submit" disabled={loading}><span>{loading ? 'Entering...' : 'Enter ARKA OS'}</span><ArrowRight className="size-4" /></Button></form></div></div></div></div>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><h2 className="font-black">{title}</h2><button onClick={onClose} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><X className="size-4" /></button></div><div className="p-5">{children}</div></div></div>;
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-[hsl(var(--input))] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]" /></label>;
}

function AssignWorkModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description?: string;
    client?: string;
    workType?: WorkType;
    priority: Priority;
    dueDate?: string;
    assigneeId: string;
  }) => void;
}) {
  const managers = runtimePeople.filter((p) => p.role === 'Manager');
  const directUnderFounder = runtimePeople.filter((p) =>
    p.role !== 'Founder' && p.role !== 'Manager' && (!p.managerId || person(p.managerId).role === 'Founder')
  );
  const targetAssignees = [...managers, ...directUnderFounder].length > 0
    ? [...managers, ...directUnderFounder]
    : getAssignablePeople(runtimePeople);

  const [workClientName, setWorkClientName] = useState('');
  const [managerId, setManagerId] = useState(() => targetAssignees[0]?.id || '');
  const [priority, setPriority] = useState<Priority>('Medium');

  useEffect(() => {
    if (!managerId && targetAssignees.length > 0) {
      setManagerId(targetAssignees[0].id);
    }
  }, [targetAssignees, managerId]);

  return (
    <Modal title="Assign work" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!workClientName.trim() || !managerId) return;
          const assigned = person(managerId);
          onCreate({
            title: workClientName.trim(),
            client: workClientName.trim(),
            description: `Work assigned to ${assigned?.name || 'Assignee'}`,
            workType: 'Other',
            priority,
            dueDate: new Date().toISOString().slice(0, 10),
            assigneeId: managerId,
          });
        }}
        className="space-y-4"
      >
        <Field
          label="Work / Client name"
          value={workClientName}
          onChange={setWorkClientName}
          placeholder="e.g. Acme Corp Campaign / Project"
          required
        />

        {targetAssignees.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>No managers or team members found:</strong> Please add members in the People directory first.
          </div>
        ) : (
          <SelectField
            label="Under which Manager / Direct Report"
            value={managerId}
            onChange={setManagerId}
            options={targetAssignees.map((item) => item.id)}
            labels={Object.fromEntries(
              targetAssignees.map((item) => [
                item.id,
                `${item.name}${item.title ? ` — ${item.title}` : ''} (${item.role === 'Manager' ? 'Manager' : 'Direct under Founder'})`
              ])
            )}
          />
        )}

        <SelectField
          label="Priority"
          value={priority}
          onChange={(value) => setPriority(value as Priority)}
          options={['Low', 'Medium', 'High', 'Urgent']}
        />

        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!workClientName.trim() || !managerId}>Assign work</Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateTaskModal({ workId: initialWorkId, workList = [], currentUser, onClose, onCreate }: { workId?: string; workList?: WorkItem[]; currentUser?: Person; onClose: () => void; onCreate: (task: Omit<WorkTask, 'id' | 'stage' | 'progress' | 'timeMinutes'>) => void }) {
  const [workId, setWorkId] = useState(initialWorkId || workList[0]?.id || '');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const assignable = getAssignablePeople(runtimePeople);
  const isSelfAssign = currentUser && (currentUser.role === 'Team member' || currentUser.role === 'HR Manager');
  const [assigneeId, setAssigneeId] = useState(() => (isSelfAssign ? currentUser.id : (assignable[0]?.id || '')));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<Priority>('Medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState('240');

  useEffect(() => {
    if (isSelfAssign && currentUser) {
      setAssigneeId(currentUser.id);
    } else if (!assigneeId && assignable.length > 0) {
      setAssigneeId(assignable[0].id);
    }
    if (!workId && workList.length > 0) setWorkId(workList[0].id);
  }, [assignable, assigneeId, workId, workList, isSelfAssign, currentUser]);

  return (
    <Modal title={isSelfAssign ? "Create your task" : "Assign task to team member"} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!workId || !assigneeId) return;
          onCreate({ workId, title, instructions, assigneeId, dueDate, priority, estimatedMinutes: Number(estimatedMinutes) || 0 });
          onClose();
        }}
        className="space-y-4"
      >
        {!initialWorkId && workList.length > 0 && (
          <SelectField
            label="Work Item / Project"
            value={workId}
            onChange={setWorkId}
            options={workList.map((w) => w.id)}
            labels={Object.fromEntries(workList.map((w) => [w.id, `${w.title} (${w.workType})`]))}
          />
        )}
        {!initialWorkId && workList.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>No active work projects:</strong> Create a work assignment first from Company Work / Dashboard before assigning tasks.
          </div>
        )}
        <Field label="Task title" value={title} onChange={setTitle} placeholder="e.g. Client outreach / Review campaign draft" required />
        <Field label="Instructions / Notes" value={instructions} onChange={setInstructions} placeholder="What is the deliverable or execution goal?" />
        <div className="grid gap-3 sm:grid-cols-2">
          {isSelfAssign && currentUser ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Assignee</span>
              <div className="rounded-lg border border-[hsl(var(--input))] bg-[#f0f0ee] px-3 py-2.5 text-sm font-semibold text-slate-800">
                {currentUser.name} ({currentUser.role})
              </div>
            </label>
          ) : assignable.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              No team members available. Add a team member in the People directory first.
            </div>
          ) : (
            <SelectField
              label="Team member"
              value={assigneeId}
              onChange={setAssigneeId}
              options={assignable.map((item) => item.id)}
              labels={Object.fromEntries(assignable.map((item) => [item.id, `${item.name} (${item.role})`]))}
            />
          )}
          <Field label="Deadline" type="date" value={dueDate} onChange={setDueDate} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Priority" value={priority} onChange={(value) => setPriority(value as Priority)} options={['Low', 'Medium', 'High', 'Urgent']} />
          <Field label="Estimated minutes" type="number" value={estimatedMinutes} onChange={setEstimatedMinutes} />
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!title.trim() || !assigneeId || !workId}>
            {isSelfAssign ? "Create task" : "Assign task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReportModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: Omit<ManagerReport, 'id' | 'managerId' | 'status' | 'createdAt'>) => void }) {
  const [period, setPeriod] = useState('Week of Sep 15'); const [completed, setCompleted] = useState(''); const [inProgress, setInProgress] = useState(''); const [blockers, setBlockers] = useState('None'); const [decisions, setDecisions] = useState('');
  return <Modal title="Report to Founder" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onCreate({ period, completed, inProgress, blockers, decisions }); }} className="space-y-4"><Field label="Reporting period" value={period} onChange={setPeriod} required /><Field label="Completed work" value={completed} onChange={setCompleted} placeholder="What shipped?" /><Field label="In progress" value={inProgress} onChange={setInProgress} placeholder="What is moving?" /><Field label="Blockers" value={blockers} onChange={setBlockers} placeholder="What is stuck?" /><Field label="Founder decisions required" value={decisions} onChange={setDecisions} placeholder="What needs a decision?" /><div className="flex justify-end gap-2 pt-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Submit report to Founder</Button></div></form></Modal>;
}

function SelectField({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[hsl(var(--input))] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]">{options.map((option) => <option key={option} value={option}>{labels[option] || option}</option>)}</select></label>;
}

function Info({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) { return <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">{label}</div><div className={`mt-1 text-sm font-bold ${valueClass}`}>{value}</div></div>; }
function Chain({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3 last:border-0 last:pb-0"><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label}</span><span className="text-right text-sm font-bold">{value}</span></div>; }
function ReportBlock({ title, value }: { title: string; value: string }) { return <div className="rounded-xl bg-[#fafaf8] p-4"><div className="text-xs font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{title}</div><p className="mt-2 text-sm leading-6">{value || 'Not provided'}</p></div>; }

function ChangePasswordModal({ targetPerson, onClose, onSave }: { targetPerson: Person; onClose: () => void; onSave: (newPassword: string) => void }) {
  const [newPassword, setNewPassword] = useState('');
  return (
    <Modal title={`Set Password for ${targetPerson.name}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (newPassword.trim()) { onSave(newPassword.trim()); onClose(); } }} className="space-y-4">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafaf8] p-3 text-xs text-[hsl(var(--muted-foreground))]">
          <strong>Employee:</strong> {targetPerson.name} ({targetPerson.email || targetPerson.id})
        </div>
        <Field label="New Login Password" value={newPassword} onChange={setNewPassword} placeholder="Enter new password (e.g. employee123)" required />
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!newPassword.trim()}>Save Password</Button>
        </div>
      </form>
    </Modal>
  );
}

function ChangeRoleModal({ targetPerson, onClose, onSave }: { targetPerson: Person; onClose: () => void; onSave: (newRole: Role) => void }) {
  const [selectedRole, setSelectedRole] = useState<Role>(targetPerson.role);
  return (
    <Modal title={`Set Role for ${targetPerson.name}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(selectedRole); onClose(); }} className="space-y-4">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafaf8] p-3 text-xs text-[hsl(var(--muted-foreground))]">
          <strong>Employee:</strong> {targetPerson.name} ({targetPerson.email || targetPerson.id})
          <div className="mt-1"><strong>Current Role:</strong> {targetPerson.role}</div>
        </div>
        <SelectField
          label="Assigned Role"
          value={selectedRole}
          onChange={(val) => setSelectedRole(val as Role)}
          options={['Manager', 'Team member', 'HR Manager']}
        />
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Role</Button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDeleteModal({ targetPerson, onClose, onConfirm }: { targetPerson: Person; onClose: () => void; onConfirm: () => Promise<void> | void }) {
  const [loading, setLoading] = useState(false);
  return (
    <Modal title={`Delete Employee: ${targetPerson.name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Are you sure you want to permanently delete <strong className="text-[hsl(var(--foreground))]">{targetPerson.name}</strong> ({targetPerson.email || targetPerson.id})?
        </p>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 leading-relaxed">
          <strong>Database Removal:</strong> This employee's user record, login access, attendance sessions, and task assignments will be deleted from the database.
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
            onClick={async () => {
              setLoading(true);
              await onConfirm();
              setLoading(false);
              onClose();
            }}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Employee'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PeoplePage({ actor, people, onAdd, onUpdatePassword, onUpdateRole, onDeletePerson }: { actor: Person; people: Person[]; onAdd: (data: { name: string; email: string; password?: string; role: Role; managerId: string | null; department: string }) => void; onUpdatePassword: (personId: string, newPass: string) => void; onUpdateRole?: (personId: string, newRole: Role) => void; onDeletePerson?: (personId: string) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<Person | null>(null);
  const [roleTarget, setRoleTarget] = useState<Person | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const isFounder = actor.role === 'Founder';

  return (
    <>
      <SectionTitle
        eyebrow={isFounder ? "Team / people management" : "Organization directory"}
        title="People"
        description={isFounder ? "The Founder manages the organization directory, reporting relationships, employee login credentials, and removals." : "Company-wide directory of all team members, roles, and presence."}
        action={isFounder ? <Button onClick={() => setOpen(true)}><UserPlus className="size-4" />Add employee</Button> : undefined}
      />
      <Card>
        <div className={`grid ${isFounder ? 'grid-cols-[1.1fr_0.6fr_0.6fr_0.9fr_0.5fr_1.3fr]' : 'grid-cols-[1.2fr_0.7fr_0.7fr_1fr_0.6fr]'} border-b border-[hsl(var(--border))] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]`}>
          <span>Person / Email</span>
          <span>Role</span>
          <span>Manager</span>
          <span>Last Login</span>
          <span>Presence</span>
          {isFounder && <span className="text-right">Action</span>}
        </div>
        {people.map((item) => (
          <div key={item.id} className={`grid ${isFounder ? 'grid-cols-[1.1fr_0.6fr_0.6fr_0.9fr_0.5fr_1.3fr]' : 'grid-cols-[1.2fr_0.7fr_0.7fr_1fr_0.6fr]'} items-center border-b border-[hsl(var(--border))] px-5 py-4 text-sm last:border-0`}>
            <div>
              <div className="font-bold">{item.name}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{item.email || item.id}</div>
            </div>
            <span><Badge className={item.role === 'Founder' ? 'border-amber-200 bg-amber-50 text-amber-800' : item.role === 'HR Manager' ? 'border-purple-200 bg-purple-50 text-purple-800' : item.role === 'Manager' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-700'}>{item.role}</Badge></span>
            <span>{item.managerId ? person(item.managerId).name : (item.role === 'Founder' ? 'Head of Organization' : item.role === 'HR Manager' ? 'HR Leadership' : 'Organization')}</span>
            <div>
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">{formatTimestamp(item.loginAt)}</div>
              {item.logoutAt && <div className="text-[10px] text-[hsl(var(--muted-foreground))]">Out: {formatTimestamp(item.logoutAt)}</div>}
            </div>
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${item.presence === 'Online' ? 'bg-emerald-500' : item.presence === 'Break' || item.presence === 'Lunch' ? 'bg-amber-400' : 'bg-slate-300'}`} />
              {item.presence}
            </span>
            {isFounder && (
              <div className="flex justify-end items-center gap-2">
                {onUpdateRole && item.role !== 'Founder' && (
                  <Button variant="secondary" onClick={() => setRoleTarget(item)}>
                    <Shield className="size-3.5 text-purple-600" />
                    Role
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setPasswordTarget(item)}>
                  <Lock className="size-3.5" />
                  Password
                </Button>
                {item.role !== 'Founder' && onDeletePerson && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition"
                    title="Delete employee from database"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </Card>
      {roleTarget && onUpdateRole && (
        <ChangeRoleModal
          targetPerson={roleTarget}
          onClose={() => setRoleTarget(null)}
          onSave={(newRole) => onUpdateRole(roleTarget.id, newRole)}
        />
      )}
      {open && <EmployeeModal people={people} onClose={() => setOpen(false)} onCreate={(data) => { onAdd(data); setOpen(false); }} />}
      {passwordTarget && <ChangePasswordModal targetPerson={passwordTarget} onClose={() => setPasswordTarget(null)} onSave={(newPass) => onUpdatePassword(passwordTarget.id, newPass)} />}
      {deleteTarget && (
        <ConfirmDeleteModal
          targetPerson={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (onDeletePerson) await onDeletePerson(deleteTarget.id);
          }}
        />
      )}
    </>
  );
}

function AttendancePage({ actor, people, tasks, leaves, sessions = [], breakLogs = [], onRefresh }: { actor: Person; people: Person[]; tasks: WorkTask[]; leaves: LeaveRequest[]; sessions?: SessionRecord[]; breakLogs?: BreakLog[]; onRefresh?: () => void }) {
  const [period, setPeriod] = useState('Today');
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [roleFilter, setRoleFilter] = useState<'All' | 'Manager' | 'Team member' | 'HR Manager'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markLeaveTarget, setMarkLeaveTarget] = useState<Person | null>(null);
  const [leaveModalType, setLeaveModalType] = useState<LeaveType>('Casual');
  const [leaveModalReason, setLeaveModalReason] = useState('Absent / No login');
  const [isSavingLeave, setIsSavingLeave] = useState(false);

  const navigateDate = (dir: -1 | 1) => { const d = new Date(`${selectedDate}T12:00:00`); d.setDate(d.getDate() + dir); setSelectedDate(d.toISOString().slice(0, 10)); setPeriod('Custom date'); setExpandedId(null); };
  const scope = getAttendanceScope(actor, people);
  const filteredPeople = scope.filter((item) => roleFilter === 'All' || item.role === roleFilter);
  const sessionsFor = (userId: string) => sessions.filter((session) => session.userId === userId && session.date === selectedDate);
  const leaveFor = (userId: string) => leaves.find((leave) => leave.userId === userId && isApprovedLeaveActiveOnDate(leave, selectedDate));
  const taskMinutesFor = (item: Person) => { const taskRows = tasks.filter((task) => task.assigneeId === item.id); return taskRows.length ? taskRows.reduce((sum, task) => sum + task.timeMinutes, 0) : item.taskMinutes || 0; };
  const rows = filteredPeople.map((item) => { 
    const sess = sessionsFor(item.id); 
    const leave = leaveFor(item.id); 
    const total = sess.reduce((sum, s) => sum + s.durationMinutes, 0); 
    const open = sess.some((s) => !s.logoutAt); 
    const breakStats = getDailyBreakMinutes(item.id, selectedDate, breakLogs);
    
    // 9-Hour Shift calculation
    const firstLogin = sess[0]?.loginAt;
    let targetLogoutStr: string | null = null;
    if (firstLogin) {
      try {
        const remainingMinutes = Math.max(0, 540 - total);
        const t = open && remainingMinutes > 0
          ? new Date(Date.now() + remainingMinutes * 60000)
          : new Date(new Date(firstLogin).getTime() + 9 * 60 * 60 * 1000);
        targetLogoutStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {}
    }

    const isWfh = leave?.leaveType === 'Work From Home';
    const isApprovedEarlyLogout = leave?.leaveType === 'Early Logout';
    const isApprovedEarlyLogin = leave?.leaveType === 'Early Login';
    const isFullDayAbsence = leave && leave.leaveType !== 'Work From Home' && leave.leaveType !== 'Early Logout' && leave.leaveType !== 'Early Login';

    // Status logic: Anyone who logged in worked! They are NEVER marked as ON LEAVE.
    let status = 'NO LOGIN';
    if (sess.length > 0) {
      if (open) {
        status = isWfh ? 'WORK FROM HOME (ACTIVE)' : 'ACTIVE';
      } else if (total >= 540) {
        status = isWfh ? 'WORK FROM HOME (COMPLETED)' : 'PRESENT';
      } else if (isApprovedEarlyLogout) {
        status = 'EARLY LOGOUT (APPROVED)';
      } else if (total < 540) {
        status = 'PRESENT (EARLY LOGOUT)';
      } else {
        status = isWfh ? 'WORK FROM HOME' : 'PRESENT';
      }
    } else {
      if (isWfh) {
        status = 'WORK FROM HOME (NO LOGIN)';
      } else if (isFullDayAbsence) {
        status = 'ON LEAVE';
      } else {
        status = 'NO LOGIN';
      }
    }

    return { 
      item, 
      sessions: sess, 
      leave, 
      total, 
      firstLogin,
      targetLogoutStr,
      taskMinutes: taskMinutesFor(item), 
      breakStats,
      status,
      isWfh
    }; 
  });
  const totalSession = rows.reduce((sum, row) => sum + row.total, 0);
  const totalTask = rows.reduce((sum, row) => sum + row.taskMinutes, 0);
  const exportCsv = () => { const header = 'Date,Employee,Role,First Login,9h Target Out,Last Logout,Total Session Time,Task Time,Break Used (mins),Break Pool Remaining (mins),Attendance,Leave'; const body = rows.map((row) => `${selectedDate},${row.item.name},${row.item.role},${row.sessions[0]?.loginAt || ''},${row.targetLogoutStr || ''},${row.sessions.at(-1)?.logoutAt || ''},${row.total},${row.taskMinutes},${row.breakStats.totalUsedMinutes},${row.breakStats.remainingPoolMinutes},${row.status},${row.leave?.status || ''}`).join('\n'); const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `arka-attendance-${selectedDate}.csv`; link.click(); URL.revokeObjectURL(url); };
  const changePeriod = (value: string) => { 
    setPeriod(value); 
    if (value === 'Yesterday') {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setSelectedDate(y);
    } else {
      setSelectedDate(TODAY);
    }
  };

  const holidayToday = OFFICIAL_HOLIDAYS_2026.find((h) => h.date === selectedDate);

  return (
    <>
      <SectionTitle
        eyebrow={actor.role === 'Founder' ? 'Founder attendance & work time' : actor.role === 'HR Manager' ? 'HR attendance & work time' : actor.role === 'Manager' ? 'My team attendance' : 'My attendance'}
        title={`Attendance — ${formatDate(selectedDate)}`}
        description="Shift duration goal is 9 hours from first login. Work From Home and approved leaves are tracked distinctly from absences."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigateDate(-1)} className="rounded-lg border border-[hsl(var(--input))] bg-white p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition"><ArrowLeft className="size-4" /></button>
            <button onClick={() => navigateDate(1)} className="rounded-lg border border-[hsl(var(--input))] bg-white p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition"><ArrowRight className="size-4" /></button>
            <select value={period} onChange={(event) => changePeriod(event.target.value)} className="rounded-lg border border-[hsl(var(--input))] bg-white px-3 py-2.5 text-sm font-semibold outline-none"><option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option><option>Custom date</option></select>
            {period === 'Custom date' && <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-lg border border-[hsl(var(--input))] bg-white px-3 py-2.5 text-sm outline-none" />}
            <Link href="/calendar" className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition shadow-xs">
              <CalendarDays className="size-4 text-amber-600" /> Company Calendar
            </Link>
            <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
            <Button variant="secondary" onClick={() => window.print()}>Print</Button>
          </div>
        }
      />
      {holidayToday && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-amber-950 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/20 text-xl font-bold">
              {holidayToday.type === 'National Holiday' ? '🇮🇳' : holidayToday.type === 'Festival Holiday' ? '🎉' : '🏛️'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-base">{holidayToday.name}</span>
                <Badge className="border-amber-400 bg-amber-100 text-amber-900 font-bold text-[10px]">{holidayToday.type}</Badge>
                <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]">Paid Company Holiday</Badge>
              </div>
              <div className="mt-0.5 text-xs text-amber-800">{holidayToday.description}</div>
            </div>
          </div>
          <Link href="/calendar" className="text-xs font-bold text-amber-900 underline hover:text-amber-700 whitespace-nowrap">
            View Company Calendar →
          </Link>
        </div>
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total employees" value={rows.length} detail="Complete visible scope" />
        <Metric label="Logged in" value={rows.filter((row) => row.sessions.length > 0).length} detail="Have a session record" />
        <Metric label="Work From Home" value={rows.filter((row) => row.isWfh).length} detail="Approved remote workday" tone="success" />
        <Metric label="On leave" value={rows.filter((row) => row.status === 'ON LEAVE').length} detail="Approved leave" tone="warning" />
        <Metric label="9h Compliance" value={`${rows.filter((row) => row.total >= 540).length} / ${rows.filter((row) => row.sessions.length > 0).length}`} detail="Met 9h shift requirement" tone="success" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={roleFilter === 'All' ? 'primary' : 'secondary'} onClick={() => setRoleFilter('All')}>All</Button>
        <Button variant={roleFilter === 'Manager' ? 'primary' : 'secondary'} onClick={() => setRoleFilter('Manager')}>Managers</Button>
        <Button variant={roleFilter === 'Team member' ? 'primary' : 'secondary'} onClick={() => setRoleFilter('Team member')}>Team Members</Button>
        <Button variant={roleFilter === 'HR Manager' ? 'primary' : 'secondary'} onClick={() => setRoleFilter('HR Manager')}>HR</Button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="hidden grid-cols-[1.2fr_0.6fr_0.75fr_0.75fr_0.6fr_0.6fr_0.75fr_1fr] border-b border-[hsl(var(--border))] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))] md:grid">
              <span>Employee</span><span>Role</span><span>First login</span><span>9h Target Out</span><span>Session</span><span>Task time</span><span>Break pool</span><span>Status & Shift</span>
            </div>
            {rows.map((row) => (
              <div key={row.item.id} className="border-b border-[hsl(var(--border))] last:border-0">
                <button onClick={() => setExpandedId(expandedId === row.item.id ? null : row.item.id)} className="grid w-full grid-cols-2 items-center gap-3 px-5 py-4 text-left hover:bg-[#fafaf8] md:grid-cols-[1.2fr_0.6fr_0.75fr_0.75fr_0.6fr_0.6fr_0.75fr_1fr]">
                  <div>
                    <div className="font-bold">{row.item.name}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{row.item.lastActiveAt}</div>
                  </div>
                  <span className="text-sm">{row.item.role}</span>
                  <span className="text-sm">{row.sessions.length > 0 ? formatTimestamp(row.sessions[0]?.loginAt) : (row.status === 'ON LEAVE' ? '—' : 'No Login')}</span>
                  <span className="text-sm font-semibold text-slate-700">{row.targetLogoutStr ? row.targetLogoutStr : '—'}</span>
                  <span className="text-sm font-bold text-slate-900">{row.sessions.length > 0 ? hours(row.total) : '0h'}</span>
                  <span className="text-sm">{hours(row.taskMinutes)}</span>
                  <span className="text-sm">
                    {row.breakStats.totalUsedMinutes > 0 ? (
                      <span className={`inline-flex items-center gap-1 font-semibold rounded-md px-2 py-0.5 text-xs ${
                        row.breakStats.totalUsedMinutes > TOTAL_DAILY_BREAK_MINUTES
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}>
                        ☕ {row.breakStats.totalUsedMinutes}m / 75m
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">0m / 75m</span>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.isWfh ? (
                      <Badge className="border-indigo-300 bg-indigo-50 text-indigo-700">
                        🏠 WFH (Approved)
                      </Badge>
                    ) : (
                      <Badge className={
                        row.status === 'ON LEAVE' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                        row.status.includes('ACTIVE') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                        row.status.includes('EARLY LOGOUT') ? 'border-amber-300 bg-amber-50 text-amber-800' :
                        row.status === 'NO LOGIN' ? 'border-slate-200 bg-slate-50 text-slate-600' :
                        'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }>
                        {row.status}
                      </Badge>
                    )}

                    {row.sessions.length > 0 && (
                      <Badge className={row.total >= 540 ? 'border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]' : row.status.includes('ACTIVE') ? 'border-blue-200 bg-blue-50 text-blue-700 text-[10px]' : 'border-amber-200 bg-amber-50 text-amber-700 text-[10px]'}>
                        {row.total >= 540 ? '✓ 9h Complete' : row.status.includes('ACTIVE') ? `In Progress (${hours(row.total)})` : `${hours(row.total)} / 9h`}
                      </Badge>
                    )}

                    {(actor.role === 'Founder' || actor.role === 'HR Manager') && row.sessions.length === 0 && row.status !== 'ON LEAVE' && !row.isWfh && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMarkLeaveTarget(row.item);
                          setLeaveModalReason(`Absent / No login on ${formatDate(selectedDate)}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            setMarkLeaveTarget(row.item);
                          }
                        }}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition shadow-xs"
                        title="Mark this employee as On Leave for this date"
                      >
                        <CalendarDays className="size-3" />
                        Mark Leave
                      </span>
                    )}
                  </div>
                </button>
                {expandedId === row.item.id && (
                  <AttendanceDetail item={row.item} sessions={row.sessions} tasks={tasks.filter((task) => task.assigneeId === row.item.id)} leave={row.leave} selectedDate={selectedDate} total={row.total} taskMinutes={row.taskMinutes} targetLogoutStr={row.targetLogoutStr} breakStats={row.breakStats} />
                )}
              </div>
            ))}
            {rows.length === 0 && <p className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No employees in this scope.</p>}
          </div>
        </div>
      </Card>
      <WeeklyAttendanceGrid filteredPeople={filteredPeople} onSelectDate={(d: string) => { setSelectedDate(d); setPeriod('Custom date'); setExpandedId(null); }} leaves={leaves} sessions={sessions} />

      {markLeaveTarget && (
        <Modal title={`Mark Leave — ${markLeaveTarget.name}`} onClose={() => setMarkLeaveTarget(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsSavingLeave(true);
            try {
              await apiPost('/leaves', {
                userId: markLeaveTarget.id,
                leaveType: leaveModalType,
                startDate: selectedDate,
                endDate: selectedDate,
                reason: leaveModalReason.trim() || `Marked by ${actor.role}`,
                status: 'Approved',
                approvedBy: actor.id
              });
              setMarkLeaveTarget(null);
              if (onRefresh) onRefresh();
            } catch (err) {
              alert('Failed to mark leave');
            } finally {
              setIsSavingLeave(false);
            }
          }} className="space-y-4">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[#fafaf8] p-3 text-xs">
              <div className="font-bold text-slate-800">Employee: {markLeaveTarget.name}</div>
              <div className="text-[hsl(var(--muted-foreground))]">Role: {markLeaveTarget.role} · Date: {formatDate(selectedDate)}</div>
            </div>
            <SelectField
              label="Leave type"
              value={leaveModalType}
              onChange={(value) => setLeaveModalType(value as LeaveType)}
              options={['Casual', 'Sick', 'Personal', 'Work From Home', 'Other']}
            />
            <Field
              label="Reason"
              value={leaveModalReason}
              onChange={setLeaveModalReason}
              placeholder="e.g. Absent / Called in sick / Emergency / Remote"
              required
            />
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setMarkLeaveTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isSavingLeave || !leaveModalReason.trim()}>
                {isSavingLeave ? 'Saving...' : 'Confirm & Mark Approved Leave'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function AttendanceDetail({ item, sessions, tasks, leave, selectedDate, total, taskMinutes, targetLogoutStr, breakStats }: { item: Person; sessions: SessionRecord[]; tasks: WorkTask[]; leave?: LeaveRequest; selectedDate: string; total: number; taskMinutes: number; targetLogoutStr?: string | null; breakStats?: { totalUsedMinutes: number; remainingPoolMinutes: number; logs: BreakLog[] } }) {
  const breaks = breakStats?.logs || [];
  const breakUsed = breakStats?.totalUsedMinutes ?? 0;
  const breakPoolLeft = breakStats?.remainingPoolMinutes ?? TOTAL_DAILY_BREAK_MINUTES;

  return (
    <div className="grid gap-5 border-t border-[hsl(var(--border))] bg-[#fafaf8] p-5 lg:grid-cols-4 sm:grid-cols-2 grid-cols-1">
      {/* 1. Session history */}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">Session history</div>
        <div className="mt-3 space-y-2">
          {sessions.length ? (
            sessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-sm">
                <div className="flex justify-between gap-3 font-semibold">
                  <span>
                    {formatTimestamp(session.loginAt)} → {session.logoutAt ? formatTimestamp(session.logoutAt) : <span className="text-emerald-600 font-bold">Active</span>}
                  </span>
                  <span>{hours(session.durationMinutes)}</span>
                </div>
                <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{selectedDate}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No login record for this date.</p>
          )}
        </div>
        <div className="mt-3 text-sm font-bold">Total session time: {hours(total)}</div>
      </div>

      {/* 2. Lunch & Break Timestamps */}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">Lunch & Break Timestamps</div>
          <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 border ${
            breakUsed > TOTAL_DAILY_BREAK_MINUTES 
              ? 'bg-rose-100 text-rose-800 border-rose-300' 
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}>
            {breakUsed}m / 75m used
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {breaks.length ? (
            breaks.map((b) => {
              const dur = b.durationMinutes || (b.endAt && b.startAt ? Math.max(1, Math.round((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60000)) : 0);
              return (
                <div key={b.id} className="rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-sm shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 font-bold text-xs rounded-md px-2 py-0.5 border ${
                      b.type === 'Lunch' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      {b.type === 'Lunch' ? '🍱 Lunch' : '☕ Break'}
                    </span>
                    <span className="font-bold text-xs text-slate-800">
                      {dur} min
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                    <span>Out: <strong className="text-slate-900">{formatTime(b.startAt)}</strong></span>
                    <span>Back: <strong className="text-slate-900">{b.endAt ? formatTime(b.endAt) : <span className="text-amber-600 font-bold">Currently Out</span>}</strong></span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No breaks taken on this date.</p>
          )}
        </div>
        <div className="mt-3 text-xs font-semibold text-slate-600">
          Remaining Break Pool: <span className="font-bold text-emerald-700">{breakPoolLeft} min</span>
        </div>
      </div>

      {/* 3. Task / work time */}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">Task / work time</div>
        <div className="mt-3 space-y-2">
          {tasks.length ? (
            tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-[hsl(var(--border))] bg-white p-3">
                <div className="text-sm font-semibold">{task.title}</div>
                <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {task.stage} · {hours(task.timeMinutes)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No task time recorded.</p>
          )}
        </div>
        <div className="mt-3 text-sm font-bold">Total task time: {hours(taskMinutes)}</div>
      </div>

      {/* 4. Daily shift summary */}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">Daily shift summary</div>
        <div className="mt-3 space-y-3">
          <Chain label="Employee" value={item.name} />
          <Chain label="Role" value={item.role} />
          <Chain label="Leave / WFH" value={leave ? `${leave.status} · ${leave.leaveType}` : 'Normal'} />
          <Chain label="9h Target Out" value={targetLogoutStr || '—'} />
          <Chain label="9h Compliance" value={total >= 540 ? '✓ Completed (9h)' : `${hours(total)} / 9h (${hours(Math.max(0, 540 - total))} left)`} />
          <Chain label="Break Pool" value={`${breakUsed}m / 75m (${breakPoolLeft}m left)`} />
          <Chain label="Last activity" value={item.lastActiveAt} />
        </div>
      </div>
    </div>
  );
}

function WeeklyAttendanceGrid({ filteredPeople, onSelectDate, leaves, sessions = [] }: { filteredPeople: Person[]; onSelectDate: (date: string) => void; leaves: LeaveRequest[]; sessions?: SessionRecord[] }) {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekStart = (() => { const d = new Date(`${TODAY}T12:00:00`); const dow = d.getDay(); d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); return d; })();
  const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d.toISOString().slice(0, 10); });
  return <Card className="mt-6">
    <div className="border-b border-[hsl(var(--border))] px-5 py-4">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Weekly breakdown</div>
      <h2 className="mt-1 text-lg font-black">Daily Time Log — Week of {formatDate(dates[0])}</h2>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Click any cell to view that day's detailed attendance. Each session login → logout is shown.</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))]">
            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]">Employee</th>
            {dates.map((d) => { const dt = new Date(`${d}T12:00:00`); const isCurrent = d === TODAY; return <th key={d} onClick={() => onSelectDate(d)} className={`px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer hover:text-[hsl(var(--primary))] transition ${isCurrent ? 'bg-amber-50 text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}><div>{dayLabels[dt.getDay()]}</div><div className="mt-0.5 text-xs font-black">{dt.getDate()}</div></th>; })}
            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--primary))]">Week Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[hsl(var(--border))]">
          {filteredPeople.map((p) => { let weekTotal = 0; return <tr key={p.id} className="hover:bg-[#fafaf8]">
            <td className="px-4 py-3"><div className="font-bold">{p.name}</div><div className="text-[10px] text-[hsl(var(--muted-foreground))]">{p.role}</div></td>
            {dates.map((d) => { 
              const daySessions = sessions.filter((s) => s.userId === p.id && s.date === d); 
              const dayTotal = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0); 
              weekTotal += dayTotal; 
              const leave = leaves.find((l) => l.userId === p.id && isApprovedLeaveActiveOnDate(l, d)); 
              const isSunday = new Date(`${d}T12:00:00`).getDay() === 0; 
              const isCurrent = d === TODAY; 
              const isFullDayLeave = leave && leave.leaveType !== 'Work From Home' && leave.leaveType !== 'Early Logout' && leave.leaveType !== 'Early Login';

              return (
                <td key={d} onClick={() => onSelectDate(d)} className={`px-2 py-2 text-center cursor-pointer transition hover:bg-amber-50/60 ${isCurrent ? 'bg-amber-50/40' : ''}`}>
                  {dayTotal > 0 ? (
                    <div>
                      <div className="text-sm font-black text-slate-800">{hours(dayTotal)}</div>
                      {leave?.leaveType === 'Early Logout' && (
                        <span className="inline-block mt-0.5 rounded bg-amber-100 text-amber-800 px-1 py-0.2 text-[9px] font-bold">
                          Early Out
                        </span>
                      )}
                      <div className="mt-1 space-y-0.5">
                        {daySessions.map((s) => (
                          <div key={s.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                            {formatTimestamp(s.loginAt)} → {s.logoutAt ? formatTimestamp(s.logoutAt) : <span className="text-emerald-600 font-bold">Active</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : isFullDayLeave ? (
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      {leave.leaveType}
                    </span>
                  ) : leave?.leaveType === 'Work From Home' ? (
                    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      WFH
                    </span>
                  ) : isSunday ? (
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Sunday Off</span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-400">No Login</span>
                  )}
                </td>
              );
            })}
            <td className="px-4 py-3 text-center"><div className="text-lg font-black text-[hsl(var(--primary))]">{hours(weekTotal)}</div><div className="text-[10px] text-[hsl(var(--muted-foreground))]">{Math.round(weekTotal / 60 * 10) / 10} hrs</div></td>
          </tr>; })}
        </tbody>
      </table>
    </div>
  </Card>;
}

function LeaveDetailModal({
  leave,
  applicant,
  canDecide,
  onDecision,
  onClose
}: {
  leave: LeaveRequest;
  applicant: Person;
  canDecide: boolean;
  onDecision: (id: string, status: LeaveStatus) => void;
  onClose: () => void;
}) {
  const isWfh = leave.leaveType === 'Work From Home';
  const isEarlyLogout = leave.leaveType === 'Early Logout';
  const isEarlyLogin = leave.leaveType === 'Early Login';
  const modalTitle = isWfh
    ? "Work From Home Request"
    : isEarlyLogout
    ? "Early Logout Permission Request"
    : isEarlyLogin
    ? "Early Login Permission Request"
    : "Leave Application Details";

  return (
    <Modal title={modalTitle} onClose={onClose}>
      <div className="space-y-4">
        {/* Applicant Header */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-[hsl(var(--border))] p-4">
          <div>
            <div className="font-bold text-base">{applicant.name}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{applicant.role} · {applicant.title}</div>
          </div>
          <Badge className={
            isWfh ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-bold' :
            isEarlyLogout ? 'border-amber-300 bg-amber-50 text-amber-800 font-bold' :
            isEarlyLogin ? 'border-sky-300 bg-sky-50 text-sky-800 font-bold' :
            'border-blue-200 bg-blue-50 text-blue-700 font-bold'
          }>
            {isWfh ? '🏠 Work From Home' : isEarlyLogout ? '⏰ Early Logout' : isEarlyLogin ? '🌅 Early Login' : leave.leaveType}
          </Badge>
        </div>

        {/* Date Details */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-[hsl(var(--border))] p-3 text-xs">
          <div>
            <span className="text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-wider block">Duration / Date</span>
            <span className="text-sm font-semibold mt-0.5 block">
              {leave.startDate === leave.endDate ? formatDate(leave.startDate) : `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}`}
            </span>
          </div>
          <div>
            <span className="text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-wider block">Status</span>
            <span className="mt-0.5 inline-block">
              <Badge className={leave.status === 'Approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : leave.status === 'Rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                {leave.status}
              </Badge>
            </span>
          </div>
        </div>

        {/* Full Reason Box */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block mb-1">
            Submitted Reason
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm font-medium leading-relaxed text-slate-800 whitespace-pre-wrap">
            {leave.reason || 'No reason provided.'}
          </div>
        </div>

        {/* Optional Notes */}
        {leave.note && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block mb-1">
              Additional Details / Target Time
            </label>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700">
              {leave.note}
            </div>
          </div>
        )}

        {/* Decision Actions */}
        <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-4">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {canDecide && leave.status === 'Pending' && (
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                onClick={() => { onDecision(leave.id, 'Approved'); onClose(); }}
              >
                <Check className="size-4" />
                {isWfh ? 'Approve WFH' : isEarlyLogout ? 'Approve Early Logout' : isEarlyLogin ? 'Approve Early Login' : 'Approve Leave'}
              </Button>
              <Button 
                variant="danger" 
                onClick={() => { onDecision(leave.id, 'Rejected'); onClose(); }}
              >
                Reject Request
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function LeavePage({ actor, people, leaves, onApply, onDecision, onRefresh }: { actor: Person; people: Person[]; leaves: LeaveRequest[]; onApply: (data: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'approvedBy' | 'createdAt'>) => void; onDecision: (id: string, status: LeaveStatus) => void; onRefresh?: () => void }) {
  const [open, setOpen] = useState(false);
  const [founderRecordOpen, setFounderRecordOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [targetUserId, setTargetUserId] = useState(() => people.find(p => p.role !== 'Founder')?.id || people[0]?.id || '');
  const [founderLeaveType, setFounderLeaveType] = useState<LeaveType>('Casual');
  const [founderStartDate, setFounderStartDate] = useState(TODAY);
  const [founderEndDate, setFounderEndDate] = useState(TODAY);
  const [founderTime, setFounderTime] = useState('16:30');
  const [founderReason, setFounderReason] = useState('Approved by Management');
  const [founderNote, setFounderNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const visiblePeople = getVisiblePeopleForRole(actor, people);
  const visible = leaves.filter((leave) => visiblePeople.some((item) => item.id === leave.userId));
  const pending = visible.filter((leave) => leave.status === 'Pending').length;
  const isManagement = actor.role === 'Founder' || actor.role === 'HR Manager';

  return (
    <>
      <SectionTitle
        eyebrow={isManagement ? 'Leave, Remote & Shift Management' : actor.role === 'Manager' ? 'Team leave & shifts' : 'My leave & shifts'}
        title={isManagement ? 'Leave, WFH & Shift Approvals' : actor.role === 'Manager' ? 'Team leave & shifts' : 'My leave, WFH & shift requests'}
        description="Submit and review leave applications, Work From Home days, early logouts, and early login requests. Approved early logouts grant checkout permission."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/calendar" className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition shadow-xs">
              <Sparkles className="size-4 text-amber-600" />
              2026 Company Calendar
            </Link>
            {isManagement ? (
              <Button onClick={() => setFounderRecordOpen(true)}><Plus className="size-4" />Record Employee Leave/Shift</Button>
            ) : (
              <Button onClick={() => setOpen(true)}><Plus className="size-4" />Apply for leave / shift flex</Button>
            )}
          </div>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Pending" value={pending} detail={isManagement ? "Awaiting your decision" : "Awaiting approval"} tone={pending ? 'warning' : 'default'} />
        <Metric label="Approved" value={visible.filter((leave) => leave.status === 'Approved').length} detail="Recognized by attendance" tone="success" />
        <Metric label="Work From Home" value={visible.filter((leave) => leave.leaveType === 'Work From Home' && leave.status === 'Approved').length} detail="Approved remote days" tone="success" />
        <Metric label="Early Logouts" value={visible.filter((leave) => leave.leaveType === 'Early Logout' && leave.status === 'Approved').length} detail="Approved early departures" />
      </div>
      <Card>
        {visible.map((leave) => {
          const employee = person(leave.userId);
          const isWfh = leave.leaveType === 'Work From Home';
          const isEarlyLogout = leave.leaveType === 'Early Logout';
          const isEarlyLogin = leave.leaveType === 'Early Login';
          const canDecide = isManagement || (actor.role === 'Manager' && employee.managerId === actor.id);

          return (
            <div 
              key={leave.id} 
              onClick={() => setSelectedLeave(leave)}
              className="flex flex-wrap items-center gap-4 border-b border-[hsl(var(--border))] px-5 py-5 last:border-0 hover:bg-[#fafaf8] cursor-pointer transition"
            >
              <div className={`grid size-10 place-items-center rounded-xl ${
                isWfh ? 'bg-indigo-50 text-indigo-700' :
                isEarlyLogout ? 'bg-amber-50 text-amber-700' :
                isEarlyLogin ? 'bg-sky-50 text-sky-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                {isWfh ? <Home className="size-5" /> : isEarlyLogout ? <Clock3 className="size-5" /> : isEarlyLogin ? <Zap className="size-5" /> : <CalendarDays className="size-5" />}
              </div>
              <div className="min-w-[200px] flex-1">
                <div className="font-bold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] flex items-center gap-2">
                  {employee.name}
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.2 font-semibold">
                    View Details
                  </span>
                </div>
                <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {employee.role} · {leave.startDate === leave.endDate ? formatDate(leave.startDate) : `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}`}
                </div>
              </div>
              <div className="min-w-[180px] flex-1 text-sm text-[hsl(var(--foreground))] line-clamp-1 italic">
                "{leave.reason}"
              </div>
              <Badge className={
                isWfh ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-bold' :
                isEarlyLogout ? 'border-amber-300 bg-amber-50 text-amber-800 font-bold' :
                isEarlyLogin ? 'border-sky-300 bg-sky-50 text-sky-800 font-bold' :
                'border-slate-200 bg-slate-50 text-slate-700 font-bold'
              }>
                {isWfh ? '🏠 WFH' : isEarlyLogout ? '⏰ Early Out' : isEarlyLogin ? '🌅 Early In' : leave.leaveType}
              </Badge>
              <Badge className={leave.status === 'Approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : leave.status === 'Rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                {leave.status}
              </Badge>
              {canDecide && leave.status === 'Pending' && (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button onClick={() => onDecision(leave.id, 'Approved')}><Check className="size-4" />Approve</Button>
                  <Button variant="secondary" onClick={() => onDecision(leave.id, 'Rejected')}>Reject</Button>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && <p className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No leave or WFH applications in this scope.</p>}
      </Card>

      {selectedLeave && (
        <LeaveDetailModal
          leave={selectedLeave}
          applicant={person(selectedLeave.userId)}
          canDecide={isManagement || (actor.role === 'Manager' && person(selectedLeave.userId).managerId === actor.id)}
          onDecision={onDecision}
          onClose={() => setSelectedLeave(null)}
        />
      )}

      {open && <LeaveModal onClose={() => setOpen(false)} onCreate={(data) => { onApply(data); setOpen(false); }} />}

      {founderRecordOpen && (
        <Modal title={`Record Employee Leave / Shift (${actor.role === 'Founder' ? 'Founder' : 'HR'} Approved)`} onClose={() => setFounderRecordOpen(false)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsSaving(true);
            try {
              const isTiming = founderLeaveType === 'Early Logout' || founderLeaveType === 'Early Login';
              const finalEndDate = isTiming ? founderStartDate : founderEndDate;
              const finalNote = isTiming && founderTime
                ? `Planned Time: ${founderTime}${founderNote.trim() ? ` | ${founderNote.trim()}` : ''}`
                : (founderNote.trim() || null);
              await apiPost('/leaves', {
                userId: targetUserId,
                leaveType: founderLeaveType,
                startDate: founderStartDate,
                endDate: finalEndDate,
                reason: founderReason.trim() || `Approved by ${actor.role}`,
                note: finalNote,
                status: 'Approved',
                approvedBy: actor.id
              });
              setFounderRecordOpen(false);
              if (onRefresh) onRefresh();
            } catch (err) {
              alert('Failed to record leave');
            } finally {
              setIsSaving(false);
            }
          }} className="space-y-4">
            <SelectField
              label="Select Employee"
              value={targetUserId}
              onChange={setTargetUserId}
              options={people.map((p) => p.id)}
              labels={Object.fromEntries(people.map((p) => [p.id, `${p.name} (${p.role})`]))}
            />
            <SelectField
              label="Leave or Shift Request Type"
              value={founderLeaveType}
              onChange={(value) => {
                const nextType = value as LeaveType;
                setFounderLeaveType(nextType);
                if (nextType === 'Early Logout') setFounderTime('16:30');
                if (nextType === 'Early Login') setFounderTime('08:30');
              }}
              options={['Casual', 'Sick', 'Personal', 'Work From Home', 'Early Logout', 'Early Login', 'Other']}
              labels={{
                'Casual': 'Casual Leave',
                'Sick': 'Sick Leave',
                'Personal': 'Personal Leave',
                'Work From Home': '🏠 Work From Home (WFH)',
                'Early Logout': '⏰ Early Logout (Approved Departure)',
                'Early Login': '🌅 Early Login (Approved Flex Start)',
                'Other': 'Other'
              }}
            />
            {founderLeaveType === 'Early Logout' || founderLeaveType === 'Early Login' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={founderLeaveType === 'Early Logout' ? 'Date of Early Logout' : 'Date of Early Login'}
                  type="date"
                  value={founderStartDate}
                  onChange={(v) => { setFounderStartDate(v); setFounderEndDate(v); }}
                  required
                />
                <Field
                  label={founderLeaveType === 'Early Logout' ? 'Approved Logout Time' : 'Approved Login Time'}
                  type="time"
                  value={founderTime}
                  onChange={setFounderTime}
                  required
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start date" type="date" value={founderStartDate} onChange={setFounderStartDate} required />
                <Field label="End date" type="date" value={founderEndDate} onChange={setFounderEndDate} required />
              </div>
            )}
            <Field label="Reason / Justification" value={founderReason} onChange={setFounderReason} placeholder="e.g. Early departure approved, personal matter, WFH" required />
            <Field label="Optional note" value={founderNote} onChange={setFounderNote} placeholder="Additional notes or context" />
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setFounderRecordOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving || !founderReason.trim()}>
                {isSaving ? 'Saving...' : 'Record Approved Request'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function EmployeeModal({ people, onClose, onCreate }: { people: Person[]; onClose: () => void; onCreate: (data: { name: string; email: string; password?: string; role: Role; managerId: string | null; department: string }) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Team member');
  const [managerId, setManagerId] = useState(() => people.find((item) => item.role === 'Manager')?.id || people.find((item) => item.role === 'Founder')?.id || '');
  const [department, setDepartment] = useState('');

  return (
    <Modal title="Add employee" onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        onCreate({ name, email, password: password.trim() || '1234', role, managerId: role === 'Team member' ? (managerId || null) : null, department });
      }} className="space-y-4">
        <Field label="Full name" value={name} onChange={setName} placeholder="Employee name (e.g. Dhuruv)" required />
        <Field label="Email (Login ID)" value={email} onChange={setEmail} type="email" placeholder="name@arkamedia.com" required />
        <Field label="Login Password" value={password} onChange={setPassword} placeholder="Set login password for this employee" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Role" value={role} onChange={(value) => setRole(value as Role)} options={['Manager', 'Team member', 'HR Manager']} />
          <Field label="Department / Title" value={department} onChange={setDepartment} placeholder={role === 'HR Manager' ? "e.g. Head of People & HR Operations" : "e.g. Design, Operations"} />
        </div>
        {role === 'Team member' && (
          <SelectField
            label="Manager"
            value={managerId}
            onChange={setManagerId}
            options={people.filter((item) => item.role === 'Manager' || item.role === 'Founder').map((item) => item.id)}
            labels={Object.fromEntries(people.map((item) => [item.id, `${item.name} (${item.role})`]))}
          />
        )}
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim() || !email.trim() || !password.trim()}>Add employee</Button>
        </div>
      </form>
    </Modal>
  );
}

function LeaveModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'approvedBy' | 'createdAt'>) => void }) {
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual');
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);
  const [targetTime, setTargetTime] = useState('16:30');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const isTimingRequest = leaveType === 'Early Logout' || leaveType === 'Early Login';

  useEffect(() => {
    if (leaveType === 'Early Logout') {
      setTargetTime('16:30');
    } else if (leaveType === 'Early Login') {
      setTargetTime('08:30');
    }
  }, [leaveType]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const finalEndDate = isTimingRequest ? startDate : endDate;
    const finalNote = isTimingRequest
      ? `Planned Time: ${targetTime}${note.trim() ? ` | ${note.trim()}` : ''}`
      : note.trim();
    onCreate({
      leaveType,
      startDate,
      endDate: finalEndDate,
      reason: reason.trim(),
      note: finalNote
    });
  };

  const modalTitle = leaveType === 'Early Logout'
    ? 'Apply for Early Logout'
    : leaveType === 'Early Login'
      ? 'Apply for Early Login / Flex Shift'
      : leaveType === 'Work From Home'
        ? 'Request Work From Home'
        : 'Apply for Leave';

  return (
    <Modal title={modalTitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Request type"
          value={leaveType}
          onChange={(value) => setLeaveType(value as LeaveType)}
          options={['Casual', 'Sick', 'Personal', 'Work From Home', 'Early Logout', 'Early Login', 'Other']}
          labels={{
            'Casual': 'Casual Leave',
            'Sick': 'Sick Leave',
            'Personal': 'Personal Leave',
            'Work From Home': '🏠 Work From Home (WFH)',
            'Early Logout': '⏰ Early Logout (Before 9h Shift End)',
            'Early Login': '🌅 Early Login (Flex / Morning Shift)',
            'Other': 'Other'
          }}
        />

        {isTimingRequest ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={leaveType === 'Early Logout' ? 'Date of Early Logout' : 'Date of Early Login'}
              type="date"
              value={startDate}
              onChange={setStartDate}
              required
            />
            <Field
              label={leaveType === 'Early Logout' ? 'Planned Logout Time' : 'Planned Login Time'}
              type="time"
              value={targetTime}
              onChange={setTargetTime}
              required
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start date" type="date" value={startDate} onChange={setStartDate} required />
            <Field label="End date" type="date" value={endDate} onChange={setEndDate} required />
          </div>
        )}

        <Field
          label="Reason"
          value={reason}
          onChange={setReason}
          placeholder={
            leaveType === 'Early Logout'
              ? 'Why do you need to leave early today or on this date?'
              : leaveType === 'Early Login'
                ? 'Why are you starting early on this date?'
                : 'Why are you requesting leave or remote work?'
          }
          required
        />
        <Field
          label="Optional note"
          value={note}
          onChange={setNote}
          placeholder="Additional context or handover note"
        />

        {isTimingRequest && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
            <span className="font-bold">Notice:</span> Early Logout and Early Login requests are sent to the <strong>Founder and HR Manager</strong> for official review and approval.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!reason.trim()}>Submit request</Button>
        </div>
      </form>
    </Modal>
  );
}

function getDayOfWeekName(dateStr: string): string {
  if (!dateStr) return 'Monday';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()] || 'Monday';
  }
  return 'Monday';
}

function getFormatBadge(format: string) {
  switch (format) {
    case 'Reel':
      return <span className="inline-flex items-center gap-1 rounded-md border border-pink-200 bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-700"><Video className="size-3" /> Reel</span>;
    case 'Static Post':
    case 'Post':
      return <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700"><Image className="size-3" /> Post</span>;
    case 'Carousel':
      return <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700"><FileSpreadsheet className="size-3" /> Carousel</span>;
    case 'Story':
      return <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700"><Sparkles className="size-3" /> Story</span>;
    case 'LinkedIn Post':
      return <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">💼 LinkedIn</span>;
    case 'Quora Blog':
      return <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">✍️ Quora</span>;
    case 'YouTube Video':
      return <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">▶️ YouTube</span>;
    default:
      return <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700">{format}</span>;
  }
}

function AddClientModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <Modal title="Add New Client" onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          onAdd(name.trim());
          onClose();
        }
      }} className="space-y-4">
        <Field label="Client Name" value={name} onChange={setName} placeholder="e.g. Acme Fitness / Luxe Salon" required />
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim()}>Add Client</Button>
        </div>
      </form>
    </Modal>
  );
}

function ReadScriptModal({ item, onClose, onEdit }: { item: ContentCalendarItem; onClose: () => void; onEdit: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (item.scriptDescription) {
      navigator.clipboard.writeText(item.scriptDescription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied', description: 'Script copied to clipboard' });
    }
  };

  return (
    <Modal title={`${item.client} — Script & Creative Brief`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.day}, {formatDate(item.date)}</div>
            <h3 className="mt-1 text-base font-black text-slate-900">{item.contentTheme}</h3>
          </div>
          <div className="flex items-center gap-2">
            {getFormatBadge(item.format)}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${
              item.updateStatus === 'Posted' ? 'bg-emerald-600' :
              item.updateStatus === 'Yet to Design' ? 'bg-rose-600' :
              item.updateStatus === 'In Progress' ? 'bg-amber-500' :
              item.updateStatus === 'Ready to Post' ? 'bg-purple-600' :
              'bg-blue-600'
            }`}>
              {item.updateStatus}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Script / Caption / Copy:</span>
            {item.scriptDescription && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
              >
                <Copy className="size-3.5" />
                {copied ? 'Copied!' : 'Copy Script'}
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-normal leading-relaxed text-slate-800 custom-scrollbar">
            {item.scriptDescription || <span className="italic text-slate-400">No script or description provided yet.</span>}
          </div>
        </div>

        {item.references && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <span className="font-bold text-slate-500 block mb-1">References / Inspiration:</span>
            {item.references.startsWith('http') ? (
              <a href={item.references} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline">
                {item.references} <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="text-slate-700">{item.references}</span>
            )}
          </div>
        )}

        {item.driveLink && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-blue-900 block">Creative Assets & Google Drive</span>
              <span className="text-[11px] text-blue-700 truncate max-w-sm block">{item.driveLink}</span>
            </div>
            <a
              href={item.driveLink.startsWith('http') ? item.driveLink : `https://${item.driveLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
            >
              <FolderOpen className="size-3.5" /> Open Drive <ExternalLink className="size-3" />
            </a>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={() => { onClose(); onEdit(); }}>Edit Deliverable</Button>
        </div>
      </div>
    </Modal>
  );
}

function ContentCalendarModal({
  initialItem,
  defaultClient,
  defaultDate,
  allClients,
  allPeople,
  onClose,
  onSave
}: {
  initialItem?: ContentCalendarItem | null;
  defaultClient: string;
  defaultDate?: string;
  allClients: string[];
  allPeople: Person[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [client, setClient] = useState(initialItem?.client || defaultClient);
  const [date, setDate] = useState(initialItem?.date || defaultDate || TODAY);
  const [format, setFormat] = useState(initialItem?.format || 'Reel');
  const [contentTheme, setContentTheme] = useState(initialItem?.contentTheme || '');
  const [scriptDescription, setScriptDescription] = useState(initialItem?.scriptDescription || '');
  const [updateStatus, setUpdateStatus] = useState<ContentCalendarItem['updateStatus']>(initialItem?.updateStatus || 'Yet to Design');
  const [references, setReferences] = useState(initialItem?.references || '');
  const [shootDate, setShootDate] = useState(initialItem?.shootDate || '');
  const [shootStatus, setShootStatus] = useState<ContentCalendarItem['shootStatus']>(initialItem?.shootStatus || 'No Shoot Needed');
  const [driveLink, setDriveLink] = useState(initialItem?.driveLink || '');
  const [assignedTo, setAssignedTo] = useState(initialItem?.assignedTo || '');
  const [isSaving, setIsSaving] = useState(false);

  const day = getDayOfWeekName(date);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTheme.trim() || !client.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        ...(initialItem?.id ? { id: initialItem.id } : {}),
        client: client.trim(),
        date,
        day,
        format,
        contentTheme: contentTheme.trim(),
        scriptDescription: scriptDescription.trim(),
        updateStatus,
        references: references.trim(),
        shootDate: shootDate || null,
        shootStatus,
        driveLink: driveLink.trim(),
        assignedTo: assignedTo || null
      });
      onClose();
    } catch {
      alert('Failed to save deliverable');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title={initialItem ? `Edit Deliverable — ${client}` : `Schedule Deliverable — ${client}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Client</span>
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]"
              required
            >
              {allClients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <SelectField
            label="Format"
            value={format}
            onChange={setFormat}
            options={['Reel', 'Static Post', 'Carousel', 'Story', 'LinkedIn Post', 'Quora Blog', 'YouTube Video', 'Other']}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Publish Date"
            type="date"
            value={date}
            onChange={setDate}
            required
          />
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Day (Auto-calculated)</span>
            <input
              type="text"
              value={day}
              readOnly
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none cursor-not-allowed"
            />
          </label>
        </div>

        <Field
          label="Content Theme / Topic / Hook"
          value={contentTheme}
          onChange={setContentTheme}
          placeholder="e.g. 5 Common Mistakes in Pilates / Weight Loss vs Fat Loss"
          required
        />

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Script / Caption / Description</span>
          <textarea
            value={scriptDescription}
            onChange={(e) => setScriptDescription(e.target.value)}
            placeholder="Paste hook, full script, copywriting caption, creator notes, and execution brief..."
            rows={4}
            className="w-full rounded-lg border border-[hsl(var(--input))] bg-[#fafaf8] px-3 py-2.5 text-xs outline-none focus:border-[hsl(var(--primary))] custom-scrollbar"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Update Status"
            value={updateStatus}
            onChange={(v) => setUpdateStatus(v as ContentCalendarItem['updateStatus'])}
            options={['Yet to Design', 'In Progress', 'Ready to Post', 'Review', 'Posted']}
          />

          <Field
            label="References / Inspiration Link"
            value={references}
            onChange={setReferences}
            placeholder="e.g. https://instagram.com/reel/... or style note"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Shoot Date (Optional)"
            type="date"
            value={shootDate}
            onChange={setShootDate}
          />

          <SelectField
            label="Shoot Status"
            value={shootStatus}
            onChange={(v) => setShootStatus(v as ContentCalendarItem['shootStatus'])}
            options={['No Shoot Needed', 'Shoot Pending', 'Shoot Completed']}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Google Drive Link"
            value={driveLink}
            onChange={setDriveLink}
            placeholder="https://drive.google.com/drive/folders/..."
          />

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Assigned Team Member</span>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]"
            >
              <option value="">None / Unassigned</option>
              {allPeople.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.role} — {p.title})</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSaving || !contentTheme.trim() || !client.trim()}>
            {isSaving ? 'Saving...' : (initialItem ? 'Save Changes' : 'Schedule Deliverable')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ContentCalendarPage({
  actor,
  allPeople,
  work
}: {
  actor: Person;
  allPeople: Person[];
  work: WorkItem[];
}) {
  const [items, setItems] = useState<ContentCalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [customClients, setCustomClients] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('arka_custom_clients');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const allClients = useMemo(() => {
    const set = new Set<string>();
    INITIAL_CLIENTS.forEach((c) => set.add(c.trim()));
    customClients.forEach((c) => set.add(c.trim()));
    work.forEach((w) => { if (w.client?.trim()) set.add(w.client.trim()); });
    items.forEach((i) => { if (i.client?.trim()) set.add(i.client.trim()); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customClients, work, items]);

  const [selectedClient, setSelectedClient] = useState<string>(() => {
    try {
      return localStorage.getItem('arka_selected_cal_client') || 'Animal Gym';
    } catch {
      return 'Animal Gym';
    }
  });

  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentCalendarItem | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [readingScriptItem, setReadingScriptItem] = useState<ContentCalendarItem | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<string>('');

  // Calendar View month navigation
  const [calDate, setCalDate] = useState<Date>(() => new Date());

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet<{ items: ContentCalendarItem[] }>('/content-calendar');
      if (res && Array.isArray(res.items)) {
        setItems(res.items);
      }
    } catch (err) {
      console.error('Failed to load content calendar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  const handleSelectClient = (c: string) => {
    setSelectedClient(c);
    try {
      localStorage.setItem('arka_selected_cal_client', c);
    } catch {}
    setIsClientDropdownOpen(false);
    setClientSearch('');
  };

  const handleAddCustomClient = (newClient: string) => {
    const trimmed = newClient.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([...customClients, trimmed]));
    setCustomClients(updated);
    try {
      localStorage.setItem('arka_custom_clients', JSON.stringify(updated));
    } catch {}
    handleSelectClient(trimmed);
    toast({ title: 'Client Added', description: `${trimmed} added to Content Calendar.` });
  };

  // Filter items for current selected client
  const clientItems = useMemo(() => {
    return items.filter((i) => i.client.toLowerCase() === selectedClient.toLowerCase());
  }, [items, selectedClient]);

  // Months available for selected client
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    clientItems.forEach((item) => {
      if (item.date && item.date.length >= 7) {
        set.add(item.date.slice(0, 7));
      }
    });
    // Ensure current month is an option
    set.add(TODAY.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [clientItems]);

  const filteredItems = useMemo(() => {
    return clientItems.filter((item) => {
      if (selectedMonth !== 'all' && !item.date.startsWith(selectedMonth)) {
        return false;
      }
      if (statusFilter !== 'all' && item.updateStatus !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.contentTheme.toLowerCase().includes(q) ||
          item.format.toLowerCase().includes(q) ||
          (item.scriptDescription && item.scriptDescription.toLowerCase().includes(q)) ||
          (item.references && item.references.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [clientItems, selectedMonth, statusFilter, searchQuery]);

  // Metrics
  const totalCount = clientItems.length;
  const postedCount = clientItems.filter((i) => i.updateStatus === 'Posted').length;
  const pendingDesignCount = clientItems.filter((i) => i.updateStatus === 'Yet to Design' || i.updateStatus === 'In Progress').length;
  const pendingShootCount = clientItems.filter((i) => i.shootStatus === 'Shoot Pending').length;

  const handleSaveItem = async (data: any) => {
    if (editingItem?.id) {
      // Optimistic update
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, ...data } : i)));
      await apiPatch(`/content-calendar/${editingItem.id}`, data);
      toast({ title: 'Deliverable Updated', description: `${data.contentTheme} has been updated.` });
    } else {
      const res = await apiPost<{ item: ContentCalendarItem }>('/content-calendar', data);
      if (res?.item) {
        setItems((prev) => [...prev, res.item]);
      } else {
        void fetchCalendar();
      }
      toast({ title: 'Deliverable Scheduled', description: `${data.contentTheme} scheduled for ${selectedClient}.` });
    }
  };

  const handleQuickStatusChange = async (item: ContentCalendarItem, newStatus: ContentCalendarItem['updateStatus']) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, updateStatus: newStatus } : i)));
    try {
      await apiPatch(`/content-calendar/${item.id}`, { updateStatus: newStatus });
      toast({ title: 'Status Updated', description: `${item.contentTheme} is now ${newStatus}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
      void fetchCalendar();
    }
  };

  const handleQuickShootStatusChange = async (item: ContentCalendarItem, newShootStatus: ContentCalendarItem['shootStatus']) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, shootStatus: newShootStatus } : i)));
    try {
      await apiPatch(`/content-calendar/${item.id}`, { shootStatus: newShootStatus });
      toast({ title: 'Shoot Status Updated', description: `${item.contentTheme} shoot is now ${newShootStatus}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update shoot status', variant: 'destructive' });
      void fetchCalendar();
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this content deliverable?')) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await apiDelete(`/content-calendar/${id}`);
      toast({ title: 'Deliverable Deleted', description: 'Item removed from content calendar.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
      void fetchCalendar();
    }
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Day', 'Format', 'Content Theme', 'Script / Description', 'Update', 'References', 'Shoot Dates', 'Shoot Status', 'Drive Link'];
    const rows = filteredItems.map((item) => [
      item.date,
      item.day,
      item.format,
      `"${(item.contentTheme || '').replace(/"/g, '""')}"`,
      `"${(item.scriptDescription || '').replace(/"/g, '""')}"`,
      item.updateStatus,
      item.references || '',
      item.shootDate || '',
      item.shootStatus,
      item.driveLink || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedClient.replace(/[^a-zA-Z0-9_-]/g, '_')}_Content_Calendar_${TODAY}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'CSV Exported', description: `Exported ${filteredItems.length} rows for ${selectedClient}.` });
  };

  // Calendar calculations
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday as 0

  const calMonthTitle = firstDayOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b48a00]">ARKA MEDIA CREATIVE PIPELINE</span>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Founder & Manager Access</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Client Content Calendar</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Manage scripts, shoot schedules, design deliverables, and Google Drive assets per client.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Client Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClientDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 shadow-xs hover:border-[#f8c329] focus:ring-2 focus:ring-[#f8c329]/20 transition cursor-pointer"
              >
                <span className="text-slate-400 font-normal">Active Client:</span>
                <span className="font-black text-black max-w-[150px] truncate">{selectedClient}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {clientItems.length}
                </span>
                <ChevronDown className="size-3.5 text-slate-400" />
              </button>

              {isClientDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search 31+ clients..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8.5 pr-3 text-xs outline-none focus:border-[#f8c329]"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                    {allClients
                      .filter((c) => c.toLowerCase().includes(clientSearch.toLowerCase()))
                      .map((c) => {
                        const count = items.filter((i) => i.client.toLowerCase() === c.toLowerCase()).length;
                        const isSel = c.toLowerCase() === selectedClient.toLowerCase();
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleSelectClient(c)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer ${
                              isSel ? 'bg-[#f8c329] text-black font-bold shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate pr-2">{c}</span>
                            {count > 0 && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isSel ? 'bg-black/15 text-black' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsClientDropdownOpen(false);
                        setIsAddClientOpen(true);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer"
                    >
                      <Plus className="size-3.5" /> Add New Client
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Export CSV Button */}
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download className="size-3.5" />
              <span>Export Sheet</span>
            </Button>

            {/* Schedule Deliverable Button */}
            <Button onClick={() => { setPreselectedDate(''); setIsCreateOpen(true); }}>
              <Plus className="size-4" />
              <span>Schedule Deliverable</span>
            </Button>
          </div>
        </div>

        {/* 4 Metric Counters */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-[#fafaf8] p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Scheduled</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{totalCount}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">For {selectedClient}</div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Posted</div>
            <div className="mt-1 text-2xl font-black text-emerald-700">{postedCount}</div>
            <div className="mt-0.5 text-[11px] text-emerald-600">Live on channels</div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">In Design / WIP</div>
            <div className="mt-1 text-2xl font-black text-amber-700">{pendingDesignCount}</div>
            <div className="mt-0.5 text-[11px] text-amber-600">Pending post</div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Shoot Pending</div>
            <div className="mt-1 text-2xl font-black text-rose-700">{pendingShootCount}</div>
            <div className="mt-0.5 text-[11px] text-rose-600">Production needed</div>
          </div>
        </div>
      </Card>

      {/* Control & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View Switcher: Table View vs Calendar Grid */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              viewMode === 'table' ? 'bg-[#f8c329] text-black shadow-xs' : 'text-slate-600 hover:text-black'
            }`}
          >
            <FileSpreadsheet className="size-3.5" />
            <span>Spreadsheet View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              viewMode === 'calendar' ? 'bg-[#f8c329] text-black shadow-xs' : 'text-slate-600 hover:text-black'
            }`}
          >
            <CalendarDays className="size-3.5" />
            <span>Monthly Calendar</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none shadow-xs cursor-pointer focus:border-[#f8c329]"
          >
            <option value="all">All Months</option>
            {availableMonths.map((m) => {
              const [y, mn] = m.split('-');
              const d = new Date(Number(y), Number(mn) - 1, 1);
              const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
              return <option key={m} value={m}>{label}</option>;
            })}
          </select>

          {/* Status filter pills */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none shadow-xs cursor-pointer focus:border-[#f8c329]"
          >
            <option value="all">All Statuses</option>
            <option value="Posted">Posted</option>
            <option value="Yet to Design">Yet to Design</option>
            <option value="In Progress">In Progress</option>
            <option value="Ready to Post">Ready to Post</option>
            <option value="Review">Review</option>
          </select>

          {/* Search bar */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter theme, format, script..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8.5 pr-3 text-xs outline-none shadow-xs focus:border-[#f8c329]"
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: SPREADSHEET TABLE VIEW (Matches Google Sheets) */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#f9f9f8] text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 pl-5 pr-3">Date</th>
                  <th className="px-3 py-3.5">Day</th>
                  <th className="px-3 py-3.5">Format</th>
                  <th className="px-3 py-3.5 min-w-[200px]">Content Theme</th>
                  <th className="px-3 py-3.5 min-w-[240px]">Script / Description</th>
                  <th className="px-3 py-3.5">Update</th>
                  <th className="px-3 py-3.5">References</th>
                  <th className="px-3 py-3.5">Shoot Dates</th>
                  <th className="px-3 py-3.5">Shoot Status</th>
                  <th className="px-3 py-3.5">Drive Link</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    {/* Date */}
                    <td className="py-3.5 pl-5 pr-3 font-bold text-slate-900 whitespace-nowrap">
                      {formatDate(item.date)}
                    </td>

                    {/* Day */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {item.day}
                      </span>
                    </td>

                    {/* Format */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {getFormatBadge(item.format)}
                    </td>

                    {/* Content Theme */}
                    <td className="px-3 py-3.5">
                      <div className="font-bold text-slate-900 text-xs leading-snug">
                        {item.contentTheme}
                      </div>
                    </td>

                    {/* Script / Description */}
                    <td className="px-3 py-3.5">
                      {item.scriptDescription ? (
                        <div className="max-w-[260px]">
                          <p className="line-clamp-2 text-xs text-slate-600 leading-relaxed font-normal">
                            {item.scriptDescription}
                          </p>
                          <button
                            type="button"
                            onClick={() => setReadingScriptItem(item)}
                            className="mt-1 text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            Read full script →
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        >
                          + Add script
                        </button>
                      )}
                    </td>

                    {/* Update (Status) - Quick Dropdown */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <select
                        value={item.updateStatus}
                        onChange={(e) => handleQuickStatusChange(item, e.target.value as ContentCalendarItem['updateStatus'])}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black outline-none cursor-pointer shadow-xs transition ${
                          item.updateStatus === 'Posted' ? 'bg-emerald-600 text-white' :
                          item.updateStatus === 'Yet to Design' ? 'bg-rose-600 text-white' :
                          item.updateStatus === 'In Progress' ? 'bg-amber-500 text-white' :
                          item.updateStatus === 'Ready to Post' ? 'bg-purple-600 text-white' :
                          'bg-blue-600 text-white'
                        }`}
                      >
                        <option value="Yet to Design" className="bg-white text-slate-900">Yet to Design</option>
                        <option value="In Progress" className="bg-white text-slate-900">In Progress</option>
                        <option value="Ready to Post" className="bg-white text-slate-900">Ready to Post</option>
                        <option value="Review" className="bg-white text-slate-900">Review</option>
                        <option value="Posted" className="bg-white text-slate-900">Posted</option>
                      </select>
                    </td>

                    {/* References */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {item.references ? (
                        item.references.startsWith('http') ? (
                          <a
                            href={item.references}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition"
                          >
                            <span>Ref</span>
                            <ExternalLink className="size-2.5" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-600 truncate max-w-[120px] block" title={item.references}>
                            {item.references}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Shoot Dates */}
                    <td className="px-3 py-3.5 whitespace-nowrap text-slate-700 font-semibold">
                      {item.shootDate ? formatDate(item.shootDate) : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Shoot Status - Quick Dropdown */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <select
                        value={item.shootStatus}
                        onChange={(e) => handleQuickShootStatusChange(item, e.target.value as ContentCalendarItem['shootStatus'])}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold outline-none cursor-pointer shadow-xs transition ${
                          item.shootStatus === 'Shoot Completed' ? 'border-emerald-300 bg-emerald-100 text-emerald-800' :
                          item.shootStatus === 'Shoot Pending' ? 'border-rose-300 bg-rose-100 text-rose-800' :
                          'border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                      >
                        <option value="No Shoot Needed" className="bg-white text-slate-900">No Shoot Needed</option>
                        <option value="Shoot Pending" className="bg-white text-slate-900">Shoot Pending</option>
                        <option value="Shoot Completed" className="bg-white text-slate-900">Shoot Completed</option>
                      </select>
                    </td>

                    {/* Drive Link */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {item.driveLink ? (
                        <a
                          href={item.driveLink.startsWith('http') ? item.driveLink : `https://${item.driveLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition shadow-xs"
                          title={item.driveLink}
                        >
                          <FolderOpen className="size-3 text-blue-600" />
                          <span>Drive</span>
                          <ExternalLink className="size-2.5 opacity-70" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        >
                          + Add Drive
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-black transition cursor-pointer"
                          title="Edit deliverable"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                          title="Delete deliverable"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                      <div className="mx-auto max-w-sm space-y-2">
                        <FileSpreadsheet className="mx-auto size-8 text-slate-300" />
                        <div className="font-bold text-slate-700">No deliverables found for {selectedClient}</div>
                        <p className="text-xs text-slate-400">
                          Click below to schedule your first post, reel, or story for this client.
                        </p>
                        <div className="mt-2">
                          <Button onClick={() => { setPreselectedDate(''); setIsCreateOpen(true); }}>
                            <Plus className="size-3.5" /> Schedule Deliverable
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 2: MONTHLY CALENDAR GRID VIEW */}
      {viewMode === 'calendar' && (
        <Card className="p-5">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-slate-900">{calMonthTitle}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {selectedClient}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCalDate(new Date(year, month - 1, 1))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalDate(new Date())}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCalDate(new Date(year, month + 1, 1))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels (Mon - Sun) */}
          <div className="mt-4 grid grid-cols-7 gap-px border-b border-slate-200 pb-2 text-center text-xs font-black uppercase tracking-wider text-slate-500">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Days Grid */}
          <div className="mt-2 grid grid-cols-7 gap-2">
            {/* Blank leading days */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[110px] rounded-xl bg-slate-50/40 p-2" />
            ))}

            {/* Actual month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === TODAY;
              const dayDeliverables = clientItems.filter((item) => item.date === dateStr);

              return (
                <div
                  key={dateStr}
                  className={`group relative flex flex-col justify-between min-h-[110px] rounded-xl border p-2 transition ${
                    isToday
                      ? 'border-[#f8c329] bg-[#f8c329]/5 ring-2 ring-[#f8c329]/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${
                      isToday ? 'rounded-full bg-[#f8c329] px-1.5 py-0.2 text-black' : 'text-slate-800'
                    }`}>
                      {dayNum}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreselectedDate(dateStr);
                        setIsCreateOpen(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-black transition cursor-pointer"
                      title="Add deliverable on this day"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Deliverables on this day */}
                  <div className="mt-1.5 flex-1 space-y-1 overflow-y-auto max-h-24 custom-scrollbar">
                    {dayDeliverables.map((del) => (
                      <button
                        key={del.id}
                        type="button"
                        onClick={() => setEditingItem(del)}
                        className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] font-bold shadow-2xs transition cursor-pointer ${
                          del.updateStatus === 'Posted' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          del.updateStatus === 'Yet to Design' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                          del.updateStatus === 'In Progress' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          del.updateStatus === 'Ready to Post' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                          'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                        title={`${del.format}: ${del.contentTheme} (${del.updateStatus})`}
                      >
                        <span className={`size-1.5 rounded-full shrink-0 ${
                          del.updateStatus === 'Posted' ? 'bg-emerald-500' :
                          del.updateStatus === 'Yet to Design' ? 'bg-rose-500' :
                          del.updateStatus === 'In Progress' ? 'bg-amber-500' :
                          del.updateStatus === 'Ready to Post' ? 'bg-purple-500' :
                          'bg-blue-500'
                        }`} />
                        <span className="truncate flex-1">{del.contentTheme}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* MODAL 1: SCHEDULE / EDIT DELIVERABLE */}
      {(isCreateOpen || editingItem) && (
        <ContentCalendarModal
          initialItem={editingItem}
          defaultClient={selectedClient}
          defaultDate={preselectedDate || TODAY}
          allClients={allClients}
          allPeople={allPeople}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingItem(null);
            setPreselectedDate('');
          }}
          onSave={handleSaveItem}
        />
      )}

      {/* MODAL 2: ADD NEW CLIENT */}
      {isAddClientOpen && (
        <AddClientModal
          onClose={() => setIsAddClientOpen(false)}
          onAdd={handleAddCustomClient}
        />
      )}

      {/* MODAL 3: READ FULL SCRIPT / CREATIVE BRIEF */}
      {readingScriptItem && (
        <ReadScriptModal
          item={readingScriptItem}
          onClose={() => setReadingScriptItem(null)}
          onEdit={() => {
            const itm = readingScriptItem;
            setReadingScriptItem(null);
            setEditingItem(itm);
          }}
        />
      )}
    </div>
  );
}


function HolidayCalendarPage({ actor }: { actor: Person }) {
  const [viewMode, setViewMode] = useState<'month' | 'daily' | 'list'>('month');
  
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const d = new Date(`${TODAY}T12:00:00`);
    return isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const d = new Date(`${TODAY}T12:00:00`);
    return isNaN(d.getMonth()) ? 9 : d.getMonth();
  });

  const [selectedDay, setSelectedDay] = useState<string>(TODAY);

  const [filterType, setFilterType] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const d = new Date(`${TODAY}T12:00:00`);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    setSelectedDay(TODAY);
  };

  const stepDay = (delta: -1 | 1) => {
    const d = new Date(`${selectedDay}T12:00:00`);
    d.setDate(d.getDate() + delta);
    const newDayStr = d.toISOString().slice(0, 10);
    setSelectedDay(newDayStr);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  };

  const holidayMap = useMemo(() => {
    const map = new Map<string, CompanyHoliday>();
    for (const h of OFFICIAL_HOLIDAYS_2026) {
      map.set(h.date, h);
    }
    return map;
  }, []);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      dayOfWeek: number;
      isWeekend: boolean;
      isSunday: boolean;
      isSaturday: boolean;
      isToday: boolean;
      holiday?: CompanyHoliday;
    }[] = [];

    // Preceding month filler days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const prevMonthStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevDayStr = String(dayNum).padStart(2, '0');
      const dateStr = `${prevDate.getFullYear()}-${prevMonthStr}-${prevDayStr}`;
      const dow = prevDate.getDay();
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        dayOfWeek: dow,
        isWeekend: dow === 0,
        isSunday: dow === 0,
        isSaturday: dow === 6,
        isToday: dateStr === TODAY,
        holiday: holidayMap.get(dateStr),
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      const d = new Date(currentYear, currentMonth, day);
      const dow = d.getDay();
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        dayOfWeek: dow,
        isWeekend: dow === 0,
        isSunday: dow === 0,
        isSaturday: dow === 6,
        isToday: dateStr === TODAY,
        holiday: holidayMap.get(dateStr),
      });
    }

    // Trailing month filler days
    const totalRemaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= totalRemaining; day++) {
      const nextDate = new Date(currentYear, currentMonth + 1, day);
      const nextMonthStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nextDayStr = String(day).padStart(2, '0');
      const dateStr = `${nextDate.getFullYear()}-${nextMonthStr}-${nextDayStr}`;
      const dow = nextDate.getDay();
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        dayOfWeek: dow,
        isWeekend: dow === 0,
        isSunday: dow === 0,
        isSaturday: dow === 6,
        isToday: dateStr === TODAY,
        holiday: holidayMap.get(dateStr),
      });
    }

    return cells;
  }, [currentYear, currentMonth, holidayMap]);

  const currentMonthHolidays = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return OFFICIAL_HOLIDAYS_2026.filter((h) => h.date.startsWith(monthPrefix));
  }, [currentYear, currentMonth]);

  const selectedDayObj = useMemo(() => {
    const d = new Date(`${selectedDay}T12:00:00`);
    const dow = isNaN(d.getDay()) ? 0 : d.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow];
    const isSunday = dow === 0;
    const isSaturday = dow === 6;
    const isWeekend = isSunday; // ONLY Sunday is weekend! Saturday is an office working day!
    const holiday = holidayMap.get(selectedDay);
    return {
      dateStr: selectedDay,
      dayName,
      dow,
      isSunday,
      isSaturday,
      isWeekend,
      isToday: selectedDay === TODAY,
      holiday
    };
  }, [selectedDay, holidayMap]);

  const filteredHolidays = useMemo(() => {
    return OFFICIAL_HOLIDAYS_2026.filter((h) => {
      const matchType = filterType === 'All' || h.type === filterType;
      const matchSearch =
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.description.toLowerCase().includes(search.toLowerCase()) ||
        h.date.includes(search) ||
        h.day.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [filterType, search]);

  const nationalCount = OFFICIAL_HOLIDAYS_2026.filter((h) => h.type === 'National Holiday').length;
  const festivalCount = OFFICIAL_HOLIDAYS_2026.filter((h) => h.type === 'Festival Holiday').length;
  const gazettedCount = OFFICIAL_HOLIDAYS_2026.filter((h) => h.type === 'Gazetted Holiday').length;

  const nextHoliday = useMemo(() => {
    return OFFICIAL_HOLIDAYS_2026.find((h) => h.date >= TODAY) || OFFICIAL_HOLIDAYS_2026[0];
  }, []);

  const exportHolidaysCsv = () => {
    const header = 'Date,Day,Holiday Name,Type,Description';
    const body = OFFICIAL_HOLIDAYS_2026.map(
      (h) => `"${h.date}","${h.day}","${h.name}","${h.type}","${h.description.replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arka-company-holidays-2026.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SectionTitle
        eyebrow="Company Schedule & Observances"
        title="Official Company Calendar (2026)"
        description="Interactive monthly and daily company calendar for 2026. Standard working days are Monday through Saturday (9-hour shift, 75-minute flex break pool); Sunday is the official weekly off. All national holidays, gazetted government observances, and cultural festivals are clearly noted beside each date."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={exportHolidaysCsv}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Print Schedule
            </Button>
          </div>
        }
      />

      {/* Top View Mode Switcher Pills */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition shadow-xs cursor-pointer ${
              viewMode === 'month'
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                : 'bg-white border border-[hsl(var(--border))] text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="size-4" />
            Full Month Calendar Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition shadow-xs cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                : 'bg-white border border-[hsl(var(--border))] text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock3 className="size-4" />
            Daily Calendar (Day-by-Day)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition shadow-xs cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                : 'bg-white border border-[hsl(var(--border))] text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="size-4" />
            All 19 Holidays List
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Year: <strong className="text-slate-900">{currentYear}</strong> · Total Holidays: <strong className="text-emerald-700">19 Days</strong>
        </div>
      </div>

      {/* VIEW 1: FULL MONTH CALENDAR GRID */}
      {viewMode === 'month' && (
        <div className="space-y-4">
          {/* Month Controller Toolbar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={prevMonth} aria-label="Previous Month">
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(Number(e.target.value))}
                    className="rounded-xl border border-[hsl(var(--input))] bg-white px-3 py-2 text-sm font-bold outline-none cursor-pointer focus:border-amber-400"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={currentYear}
                    onChange={(e) => setCurrentYear(Number(e.target.value))}
                    className="rounded-xl border border-[hsl(var(--input))] bg-white px-3 py-2 text-sm font-bold outline-none cursor-pointer focus:border-amber-400"
                  >
                    {[2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <Button variant="secondary" onClick={nextMonth} aria-label="Next Month">
                  <ChevronRight className="size-4" />
                </Button>
                <Button variant="secondary" onClick={goToToday}>
                  Today
                </Button>
              </div>

              {/* Month Holiday Stats pill */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                  <Sparkles className="size-3.5 text-amber-600" />
                  {currentMonthHolidays.length} Holiday{currentMonthHolidays.length === 1 ? '' : 's'} in {MONTH_NAMES[currentMonth]}
                </span>
                <span className="text-xs text-slate-500">
                  (Click any date cell to view day details)
                </span>
              </div>
            </div>
          </Card>

          {/* 7-Column Calendar Grid */}
          <Card className="overflow-hidden p-3 sm:p-5">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-black uppercase tracking-wider">
              {DAY_LABELS.map((day, idx) => (
                <div
                  key={day}
                  className={`py-2 rounded-lg ${
                    idx === 0 
                      ? 'bg-rose-50/70 text-rose-700 font-extrabold' 
                      : idx === 6
                      ? 'bg-amber-50/70 text-amber-800 font-extrabold'
                      : 'bg-slate-100/70 text-slate-700'
                  }`}
                >
                  {idx === 0 ? `${day} (Off)` : idx === 6 ? `${day} (Office)` : day}
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
              {calendarCells.map((cell) => (
                <div
                  key={cell.dateStr}
                  onClick={() => {
                    setSelectedDay(cell.dateStr);
                    setViewMode('daily');
                  }}
                  className={`group min-h-[115px] sm:min-h-[135px] p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/50 border-slate-100 opacity-40 text-slate-400'
                      : cell.isToday
                      ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-400/30 shadow-xs'
                      : cell.holiday
                      ? cell.holiday.type === 'National Holiday'
                        ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-400 hover:shadow-sm'
                        : cell.holiday.type === 'Festival Holiday'
                        ? 'bg-purple-50/40 border-purple-300 hover:border-purple-400 hover:shadow-sm'
                        : 'bg-blue-50/40 border-blue-300 hover:border-blue-400 hover:shadow-sm'
                      : cell.isSunday
                      ? 'bg-rose-50/30 border-rose-200/70 hover:border-rose-300'
                      : cell.isSaturday
                      ? 'bg-amber-50/30 border-amber-200/70 hover:border-amber-300 hover:shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-xs'
                  }`}
                >
                  {/* Date number and quick indicators */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm sm:text-base font-extrabold ${
                        cell.isToday
                          ? 'flex size-7 items-center justify-center rounded-full bg-[#f8c329] text-black font-black shadow-xs'
                          : cell.holiday
                          ? 'text-slate-900 font-black'
                          : cell.isSunday
                          ? 'text-rose-600 font-bold'
                          : cell.isSaturday
                          ? 'text-amber-900 font-bold'
                          : 'text-slate-800'
                      }`}>
                        {cell.dayNumber}
                      </span>
                      {cell.isToday && (
                        <span className="hidden sm:inline-block text-[9px] font-black uppercase text-amber-800 bg-amber-100 rounded px-1.5 py-0.2">
                          Today
                        </span>
                      )}
                    </div>

                    {cell.holiday && (
                      <span className="text-xs" title={`${cell.holiday.name} (${cell.holiday.type})`}>
                        {cell.holiday.type === 'National Holiday' ? '🇮🇳' : cell.holiday.type === 'Festival Holiday' ? '🎉' : '🏛️'}
                      </span>
                    )}
                  </div>

                  {/* Holiday / Event Mentioned Beside the Date */}
                  <div className="mt-1 flex-1 flex flex-col justify-center">
                    {cell.holiday ? (
                      <div className={`rounded-lg p-1.5 border text-left shadow-2xs ${
                        cell.holiday.type === 'National Holiday'
                          ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950'
                          : cell.holiday.type === 'Festival Holiday'
                          ? 'bg-purple-100/80 border-purple-300 text-purple-950'
                          : 'bg-blue-100/80 border-blue-300 text-blue-950'
                      }`}>
                        <div className="text-[11px] sm:text-xs font-black leading-tight line-clamp-2">
                          {cell.holiday.name}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-1 text-[9px] font-bold uppercase tracking-wider opacity-85">
                          <span className="truncate">{cell.holiday.type.replace(' Holiday', '')}</span>
                          <span className="shrink-0 text-emerald-800 font-extrabold">Paid Off</span>
                        </div>
                      </div>
                    ) : cell.isSunday ? (
                      <div className="rounded-md bg-rose-100/70 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        Sunday Off
                      </div>
                    ) : cell.isSaturday ? (
                      <div className="rounded-md bg-amber-100/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                        Saturday Office (9h)
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 group-hover:text-amber-800 transition font-medium">
                        Workday (9h)
                      </div>
                    )}
                  </div>

                  {/* Micro Footer */}
                  <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                    <span className="font-semibold">{DAY_LABELS[cell.dayOfWeek]}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-700 font-bold transition">
                      View Day →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: DAILY CALENDAR (DAY-BY-DAY) */}
      {viewMode === 'daily' && (
        <div className="space-y-6">
          {/* Daily Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[hsl(var(--border))] bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => stepDay(-1)}>
                <ChevronLeft className="size-4" /> Previous Day
              </Button>
              <Button variant="secondary" onClick={goToToday}>
                Today
              </Button>
              <Button variant="secondary" onClick={() => stepDay(1)}>
                Next Day <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600">Jump to Date:</label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDay(e.target.value);
                    const d = new Date(`${e.target.value}T12:00:00`);
                    setCurrentYear(d.getFullYear());
                    setCurrentMonth(d.getMonth());
                  }
                }}
                className="rounded-xl border border-[hsl(var(--input))] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Detailed Daily Showcase Card */}
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-100 pb-6">
              <div className="flex items-start gap-5">
                {/* Big Date Number Box */}
                <div className="flex size-24 sm:size-28 flex-col items-center justify-center rounded-3xl border border-amber-300/40 bg-gradient-to-b from-amber-50 to-amber-100/60 font-black text-amber-950 shadow-md">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-amber-800">
                    {new Date(`${selectedDay}T12:00:00`).toLocaleDateString([], { month: 'short' })}
                  </span>
                  <span className="text-4xl sm:text-5xl font-black leading-none">
                    {new Date(`${selectedDay}T12:00:00`).getDate()}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700/80">
                    {selectedDayObj.dayName}
                  </span>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                      {formatDate(selectedDay)}
                    </h2>
                    {selectedDayObj.isToday && (
                      <Badge className="border-amber-400 bg-amber-100 text-amber-900 font-extrabold">
                        Today
                      </Badge>
                    )}
                  </div>

                  {selectedDayObj.holiday ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Badge className={`text-xs px-3 py-1 font-extrabold ${
                        selectedDayObj.holiday.type === 'National Holiday'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : selectedDayObj.holiday.type === 'Festival Holiday'
                          ? 'border-purple-300 bg-purple-50 text-purple-800'
                          : 'border-blue-300 bg-blue-50 text-blue-800'
                      }`}>
                        {selectedDayObj.holiday.type === 'National Holiday' ? '🇮🇳 ' : selectedDayObj.holiday.type === 'Festival Holiday' ? '🎉 ' : '🏛️ '}
                        {selectedDayObj.holiday.name}
                      </Badge>
                      <Badge className="border-amber-300 bg-amber-50 text-amber-900 font-bold">
                        {selectedDayObj.holiday.type}
                      </Badge>
                      <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">
                        Paid Company Off
                      </Badge>
                    </div>
                  ) : selectedDayObj.isSunday ? (
                    <div className="mt-2.5 flex items-center gap-2">
                      <Badge className="border-rose-300 bg-rose-50 text-rose-700 text-xs px-3 py-1 font-bold">
                        🌴 Sunday — Official Weekly Off
                      </Badge>
                    </div>
                  ) : selectedDayObj.isSaturday ? (
                    <div className="mt-2.5 flex items-center gap-2">
                      <Badge className="border-amber-400 bg-amber-50 text-amber-900 text-xs px-3 py-1 font-bold">
                        💼 Saturday Office Workday (Active 9-Hour Shift)
                      </Badge>
                    </div>
                  ) : (
                    <div className="mt-2.5 flex items-center gap-2">
                      <Badge className="border-indigo-300 bg-indigo-50 text-indigo-700 text-xs px-3 py-1 font-bold">
                        💼 Regular Office Workday (9-Hour Shift)
                      </Badge>
                    </div>
                  )}

                  <p className="mt-3 text-sm text-slate-600 max-w-xl">
                    {selectedDayObj.holiday
                      ? selectedDayObj.holiday.description
                      : selectedDayObj.isSunday
                      ? 'Official non-working weekly rest day for all team members. Relax and recharge!'
                      : selectedDayObj.isSaturday
                      ? 'Mandatory office workday. Full 9-hour shift requirement with unified 75-minute break pool.'
                      : 'Standard workday operations are active. Full 9-hour shift requirement with unified 75-minute break pool.'}
                  </p>
                </div>
              </div>

              {/* Quick Action Navigation */}
              <div className="flex flex-col gap-2 min-w-[170px]">
                <Link
                  href="/attendance"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                >
                  <Clock3 className="size-4 text-slate-500" /> View Attendance
                </Link>
                <Link
                  href="/leave"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-xs"
                >
                  <CalendarDays className="size-4 text-amber-600" /> Apply Leave / Flex
                </Link>
              </div>
            </div>

            {/* Daily Operational Parameters */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Day Classification</div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {selectedDayObj.holiday
                    ? selectedDayObj.holiday.type
                    : selectedDayObj.isSunday
                    ? 'Sunday Off'
                    : selectedDayObj.isSaturday
                    ? 'Saturday Office'
                    : 'Active Workday'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {selectedDayObj.holiday
                    ? 'Mandatory paid day off across all branches'
                    : selectedDayObj.isSunday
                    ? 'Official weekly rest day'
                    : selectedDayObj.isSaturday
                    ? 'Office shift & operations (Mon–Sat)'
                    : 'Client deliverables & marketing ops'}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Workday Shift Goal</div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {selectedDayObj.holiday || selectedDayObj.isSunday ? '0 Hours (Off)' : '9 Hours (540 mins)'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {selectedDayObj.holiday || selectedDayObj.isSunday ? 'Office closed' : '09:30 AM – 06:30 PM (or flexible 9h)'}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Daily Break Allowance</div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {selectedDayObj.holiday || selectedDayObj.isSunday ? '—' : '75 mins (1h 15m)'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {selectedDayObj.holiday || selectedDayObj.isSunday ? 'No shift active' : 'Unified flex pool with lunch carryover'}
                </div>
              </div>
            </div>

            {/* Other Holidays in this Month Ribbon */}
            {currentMonthHolidays.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                  All Holidays in {MONTH_NAMES[currentMonth]} {currentYear} ({currentMonthHolidays.length})
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {currentMonthHolidays.map((h) => {
                    const isSelected = h.date === selectedDay;
                    return (
                      <div
                        key={h.id}
                        onClick={() => setSelectedDay(h.date)}
                        className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20'
                            : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex size-11 flex-col items-center justify-center rounded-xl bg-amber-100/70 text-amber-900 font-black text-xs">
                          <span>{new Date(`${h.date}T12:00:00`).getDate()}</span>
                          <span className="text-[9px] uppercase font-bold text-amber-700">{h.day.slice(0, 3)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs truncate text-slate-900">{h.name}</div>
                          <div className="text-[10px] text-slate-500">{h.type}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VIEW 3: ALL 19 HOLIDAYS LIST / GRID */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Total Holidays" value={OFFICIAL_HOLIDAYS_2026.length} detail="Paid days off in 2026" tone="default" />
            <Metric label="National Holidays" value={nationalCount} detail="Republic, Independence, Gandhi" tone="success" />
            <Metric label="Festival Holidays" value={festivalCount} detail="Pongal, Diwali, Eid, Christmas" tone="warning" />
            <Metric
              label="Next Upcoming"
              value={nextHoliday ? nextHoliday.name.split('/')[0].trim() : 'None'}
              detail={nextHoliday ? `${formatDate(nextHoliday.date)} (${nextHoliday.day})` : ''}
              tone="default"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {['All', 'National Holiday', 'Festival Holiday', 'Gazetted Holiday'].map((t) => (
                <Button
                  key={t}
                  variant={filterType === t ? 'primary' : 'secondary'}
                  onClick={() => setFilterType(t)}
                >
                  {t === 'All' ? `All (${OFFICIAL_HOLIDAYS_2026.length})` : t}
                </Button>
              ))}
            </div>
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-3 size-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Search holiday name, month..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredHolidays.map((h) => {
              const isPassed = h.date < TODAY;
              const isToday = h.date === TODAY;
              const dateObj = new Date(`${h.date}T12:00:00`);
              const monthShort = dateObj.toLocaleDateString([], { month: 'short' }).toUpperCase();
              const dayNum = dateObj.getDate();

              return (
                <Card
                  key={h.id}
                  onClick={() => {
                    setSelectedDay(h.date);
                    setViewMode('daily');
                  }}
                  className={`p-5 transition hover:shadow-md cursor-pointer ${
                    isToday ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-14 flex-col items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-50 font-black text-amber-950 shadow-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          {monthShort}
                        </span>
                        <span className="text-xl leading-tight font-extrabold">{dayNum}</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{h.name}</h3>
                        <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                          {h.day} · {formatDate(h.date)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        h.type === 'National Holiday'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : h.type === 'Festival Holiday'
                          ? 'border-purple-300 bg-purple-50 text-purple-800'
                          : 'border-blue-300 bg-blue-50 text-blue-800'
                      }
                    >
                      {h.type === 'National Holiday' && '🇮🇳 '}
                      {h.type === 'Festival Holiday' && '🎉 '}
                      {h.type === 'Gazetted Holiday' && '🏛️ '}
                      {h.type}
                    </Badge>
                    {isToday && (
                      <Badge className="border-amber-400 bg-amber-100 text-amber-900 font-bold animate-pulse">
                        Today!
                      </Badge>
                    )}
                    {isPassed && (
                      <Badge className="border-slate-200 bg-slate-100 text-slate-500">
                        Passed
                      </Badge>
                    )}
                    {!isPassed && !isToday && (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                        Upcoming
                      </Badge>
                    )}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {h.description}
                  </p>
                </Card>
              );
            })}
          </div>
          {filteredHolidays.length === 0 && (
            <Card className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No holidays match your filter or search query.
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function AppRouter() {
  const [location, setLocation] = useLocation();
  const [signedIn, setSignedIn] = useState(false);
  const [actorId, setActorId] = useState('usr_founder');
  const [directory, setDirectory] = useState(initialPeople);
  const [work, setWork] = useState(initialWork);
  const [tasks, setTasks] = useState(initialTasks);
  const [activities, setActivities] = useState(initialActivities);
  const [comments, setComments] = useState(initialComments);
  const [reports, setReports] = useState(initialReports);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [sessions, setSessions] = useState<SessionRecord[]>(initialSessions);
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>(initialBreakLogs);
  const [createOpen, setCreateOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [earlyLogoutModalOpen, setEarlyLogoutModalOpen] = useState(false);
  const [earlyLogoutReason, setEarlyLogoutReason] = useState('');
  const knownTaskIdsRef = useRef<Set<string> | null>(null);

  const [breakCounts, setBreakCounts] = useState<{ breaks: number; lunches: number }>(() => {
    return getDailyBreakUsage(actorId);
  });
  useEffect(() => {
    if (actorId) setBreakCounts(getDailyBreakUsage(actorId));
  }, [actorId]);

  const actorBreakStats = useMemo(() => {
    return getDailyBreakMinutes(actorId, TODAY, breakLogs);
  }, [actorId, breakLogs]);
  const actorBreakPoolRemaining = actorBreakStats.remainingPoolMinutes;

  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem('arka_presence_timer');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.expiresAt) {
          const diff = Math.ceil((parsed.expiresAt - Date.now()) / 1000);
          return diff;
        }
      }
    } catch {}
    return null;
  });

  const refresh = useCallback(() => {
    return hydrateFromApi(setDirectory, setWork, setTasks, setActivities, setComments, setReports, setLeaves, setSessions, setBreakLogs);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 5000);
    const heartbeatTimer = setInterval(() => { if (signedIn) apiPost('/auth/heartbeat', {}).catch(() => {}); }, 25000);
    return () => { clearInterval(timer); clearInterval(heartbeatTimer); };
  }, [signedIn, refresh]);

  runtimePeople = directory;
  const actor = person(actorId) || directory[0] || initialPeople[0];

  const handleLogout = useCallback(async (customAlert?: string) => {
    try { 
      await apiPost('/auth/logout', {}); 
    } catch(e){} 
    setStoredToken(null); 
    localStorage.removeItem('arka_presence_timer'); 
    setSignedIn(false); 
    if (customAlert) {
      alert(customAlert);
    }
    setLocation('/'); 
  }, [setLocation]);

  // Request browser notification permissions on sign-in
  useEffect(() => {
    if (signedIn) {
      requestNotificationPermission();
    }
  }, [signedIn]);

  // Route guard: strictly restrict /content-calendar to Founder and Manager
  useEffect(() => {
    if (location === '/content-calendar' && actor.role !== 'Founder' && actor.role !== 'Manager') {
      setLocation('/dashboard');
    }
  }, [location, actor.role, setLocation]);

  // Dynamic 9-Hour Workday Shift Calculation
  const todaySessions = useMemo(() => {
    if (!actor) return [];
    return sessions
      .filter((s) => s.userId === actor.id && s.date === TODAY)
      .sort((a, b) => (a.loginAt || '').localeCompare(b.loginAt || ''));
  }, [sessions, actor?.id]);

  const firstLoginToday = todaySessions[0]?.loginAt || actor?.loginAt || null;

  const shiftTargetInfo = useMemo(() => {
    if (!firstLoginToday) return null;
    try {
      const loginD = new Date(firstLoginToday);
      if (isNaN(loginD.getTime())) return null;

      // Cumulative calculation across all sessions today:
      // Preserves earlier sessions and adds live session progress
      const totalMinutes = todaySessions.reduce((sum, s) => {
        if (!s.logoutAt) {
          const live = Math.max(0, Math.floor((Date.now() - new Date(s.loginAt).getTime()) / 60000));
          return sum + live;
        }
        return sum + s.durationMinutes;
      }, 0);

      const isCompleted = totalMinutes >= 540;
      const remainingMinutes = Math.max(0, 540 - totalMinutes);
      const progressPercent = Math.min(100, Math.round((totalMinutes / 540) * 100));

      // Calculate Target Logout time:
      // If user is actively online, dynamic target is Now + remainingMinutes needed!
      // Otherwise, original login + 9 hours.
      const hasActiveSession = todaySessions.some((s) => !s.logoutAt);
      const targetD = hasActiveSession && remainingMinutes > 0
        ? new Date(Date.now() + remainingMinutes * 60000)
        : new Date(loginD.getTime() + 9 * 60 * 60 * 1000);
      const targetTimeStr = targetD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        loginTimeStr: loginD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        targetTimeStr,
        totalMinutes,
        isCompleted,
        remainingMinutes,
        progressPercent
      };
    } catch {
      return null;
    }
  }, [firstLoginToday, todaySessions]);

  const triggerLogout = useCallback(() => {
    // If user is not Founder and their 9-hour shift is not completed yet, show Early Logout confirmation
    if (actor && actor.role !== 'Founder' && shiftTargetInfo && !shiftTargetInfo.isCompleted && shiftTargetInfo.remainingMinutes > 0) {
      setEarlyLogoutModalOpen(true);
      return;
    }
    void handleLogout();
  }, [actor, shiftTargetInfo, handleLogout]);

  const confirmEarlyLogout = useCallback(async (options?: { isEmergency?: boolean; isApproved?: boolean }) => {
    setEarlyLogoutModalOpen(false);
    const workedStr = shiftTargetInfo ? `${Math.floor(shiftTargetInfo.totalMinutes / 60)}h ${shiftTargetInfo.totalMinutes % 60}m` : 'partial shift';
    const reasonText = earlyLogoutReason.trim() ? `Reason: ${earlyLogoutReason.trim()}` : 'No reason provided';
    const isApproved = options?.isApproved;
    const isEmergency = options?.isEmergency;

    let activityMsg = '';
    let tone: 'default' | 'warning' | 'danger' = 'warning';

    if (isApproved) {
      activityMsg = `Logged out early with APPROVED authorization from Founder/HR (${workedStr} worked). ${reasonText}`;
      tone = 'default';
    } else if (isEmergency) {
      activityMsg = `EMERGENCY EARLY LOGOUT (UNAPPROVED by Founder/HR) (${workedStr} worked). ${reasonText}`;
      tone = 'danger';
    } else {
      activityMsg = `Logged out early (${workedStr} worked). ${reasonText}`;
      tone = 'warning';
    }

    await apiPost('/activities', {
      workId: 'system',
      actorId: actor.id,
      message: activityMsg,
      tone
    }).catch(() => {});
    await apiPatch(`/people/${actor.id}/presence`, { presence: 'Offline' }).catch(() => {});
    setEarlyLogoutReason('');
    void handleLogout(isApproved ? `Approved Early Logout: You worked ${workedStr} today. Have a good rest!` : `Early Logout Recorded (${workedStr} worked).`);
  }, [actor?.id, shiftTargetInfo, earlyLogoutReason, handleLogout]);

  // Dynamic 9-Hour Workday Shift Auto-Logout Watchdog (runs every 5 seconds)
  useEffect(() => {
    if (!signedIn || !actor || actor.role === 'Founder') return;
    if (!firstLoginToday) return;

    const check9hShift = () => {
      try {
        if (!shiftTargetInfo) return;

        // Auto-logout only when actual cumulative workday minutes reaches 540 (9 hours)
        if (shiftTargetInfo.isCompleted || shiftTargetInfo.totalMinutes >= 540) {
          const shiftEndMsg = '🎉 9-Hour Workday Shift Completed!\n\nYou have completed your full 9-hour workday (540 minutes). You have been automatically logged out. Great job today!';
          void apiPost('/activities', {
            workId: 'system',
            actorId: actor.id,
            message: 'Completed full 9-hour shift. Automatically logged out for the day.',
            tone: 'success'
          }).catch(() => {});
          void apiPatch(`/people/${actor.id}/presence`, { presence: 'Offline' }).catch(() => {});
          void handleLogout(shiftEndMsg);
        }
      } catch (err) {
        console.error('9h shift check error:', err);
      }
    };

    check9hShift();
    const interval = setInterval(check9hShift, 5000);
    return () => clearInterval(interval);
  }, [signedIn, actor?.id, actor?.role, firstLoginToday, shiftTargetInfo, handleLogout]);


  // New Task Assignment Background Notification & Chime
  useEffect(() => {
    if (!signedIn || !actor) return;
    const myCurrentTasks = tasks.filter((t) => t.assigneeId === actor.id);

    if (knownTaskIdsRef.current !== null) {
      const newTasks = myCurrentTasks.filter((t) => !knownTaskIdsRef.current!.has(t.id));
      if (newTasks.length > 0) {
        newTasks.forEach((task) => {
          playNotificationChime();
          toast({
            title: '🔔 New Task Assigned!',
            description: `"${task.title}" — Due: ${formatDate(task.dueDate)}`,
          });

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const notif = new Notification('ARKA OS — New Task Assigned', {
                body: `"${task.title}" has been assigned to you.\nDue: ${task.dueDate || 'Today'}`,
                icon: LOGO_SRC,
                tag: `task-${task.id}`
              });
              notif.onclick = () => {
                window.focus();
                setLocation(actor.role === 'Team member' ? '/my-work' : `/work/${task.workId}`);
              };
            } catch (err) {
              console.warn('Desktop notification error:', err);
            }
          }
        });
      }
    }
    knownTaskIdsRef.current = new Set(myCurrentTasks.map((t) => t.id));
  }, [tasks, signedIn, actor?.id, setLocation]);

  const selectedId = location.startsWith('/work/') ? location.split('/')[2] : null;
  const selected = selectedId ? work.find((item) => item.id === selectedId) : null;
  const scopeWork = useMemo(() => {
    if (!actor) return work;
    if (actor.role === 'Founder' || actor.role === 'HR Manager') return work;
    return actor.role === 'Manager' ? work.filter((item) => item.managerId === actor.id || tasks.some((task) => task.workId === item.id && person(task.assigneeId).managerId === actor.id)) : work.filter((item) => tasks.some((task) => task.workId === item.id && task.assigneeId === actor.id) || item.directAssigneeId === actor.id);
  }, [actor, work, tasks]);
  const scopePeople = !actor ? runtimePeople : (actor.role === 'Founder' || actor.role === 'HR Manager') ? runtimePeople : actor.role === 'Manager' ? runtimePeople.filter((item) => item.id === actor.id || item.managerId === actor.id) : [actor];
  const scopeTasks = useMemo(() => {
    if (!actor) return tasks;
    if (actor.role === 'Founder' || actor.role === 'HR Manager') return tasks;
    if (actor.role === 'Manager') {
      return tasks.filter((task) => {
        const assignee = person(task.assigneeId);
        const parentWork = work.find((w) => w.id === task.workId);
        return (
          task.assigneeId === actor.id ||
          assignee.managerId === actor.id ||
          parentWork?.managerId === actor.id
        );
      });
    }
    // Team member strictly only sees tasks assigned to themselves
    return tasks.filter((task) => task.assigneeId === actor.id);
  }, [actor, tasks, work]);

  const updatePresence = async (presence: Presence, isAuto = false) => {
    if (!actor) return;
    try {
      const prevPresence = actor.presence;

      if (presence === 'Break' || presence === 'Lunch') {
        const stats = getDailyBreakMinutes(actor.id, TODAY, breakLogs);
        if (stats.remainingPoolMinutes <= 0) {
          toast({
            title: 'Daily Break Pool Exhausted',
            description: 'You have used all 1 hour 15 minutes (75m) of your daily break & lunch pool for today.',
            variant: 'destructive',
          });
          return;
        }

        // Slot limit: Break is max 15m, Lunch is max 60m. Both share the single 75m total pool.
        const slotLimit = presence === 'Break' ? 15 : 60;
        const sessionMaxMinutes = Math.min(slotLimit, stats.remainingPoolMinutes);
        const nowIso = new Date().toISOString();

        let createdLogId = `blk_${Date.now()}`;
        try {
          const res = await apiPost<{ item: BreakLog }>('/break-logs', {
            userId: actor.id,
            date: TODAY,
            type: presence,
            startAt: nowIso
          });
          if (res?.item?.id) {
            createdLogId = res.item.id;
            setBreakLogs((prev) => [res.item, ...prev.filter(b => b.id !== res.item.id)]);
          }
        } catch (e) {
          console.error('Failed to save break log:', e);
        }

        const expiresAt = Date.now() + sessionMaxMinutes * 60 * 1000;
        localStorage.setItem('arka_presence_timer', JSON.stringify({
          userId: actor.id,
          presence,
          breakLogId: createdLogId,
          startAt: nowIso,
          slotMinutes: sessionMaxMinutes,
          expiresAt
        }));

        setTimerSecondsRemaining(sessionMaxMinutes * 60);

        await apiPost('/activities', {
          workId: 'system',
          actorId: actor.id,
          message: `started ${presence} (${sessionMaxMinutes}m session, ${stats.remainingPoolMinutes}m total pool left)`,
          tone: 'warning'
        }).catch(() => {});

      } else {
        const rawTimer = localStorage.getItem('arka_presence_timer');
        if (rawTimer) {
          try {
            const parsed = JSON.parse(rawTimer);
            if (parsed.breakLogId && (prevPresence === 'Break' || prevPresence === 'Lunch')) {
              const nowIso = new Date().toISOString();
              const startMs = parsed.startAt ? new Date(parsed.startAt).getTime() : Date.now();
              const elapsedMinutes = Math.max(1, Math.round((Date.now() - startMs) / 60000));

              await apiPatch(`/break-logs/${parsed.breakLogId}`, {
                endAt: nowIso,
                durationMinutes: elapsedMinutes
              }).catch(() => {});

              setBreakLogs((prev) => prev.map((b) => b.id === parsed.breakLogId ? { ...b, endAt: nowIso, durationMinutes: elapsedMinutes } : b));

              const reason = isAuto 
                ? `returned from ${prevPresence} (${elapsedMinutes}m used)` 
                : `returned early from ${prevPresence} (${elapsedMinutes}m used)`;
              await apiPost('/activities', { workId: 'system', actorId: actor.id, message: reason, tone: 'success' }).catch(() => {});
            }
          } catch {}
        }

        localStorage.removeItem('arka_presence_timer');
        setTimerSecondsRemaining(null);
      }

      await apiPatch<{item: Person}>(`/people/${actor.id}/presence`, { presence });
      setDirectory((all) => all.map(p => p.id === actor.id ? { ...p, presence } : p));
      void refresh();
    } catch (err) {
      console.error("Update presence error", err);
    }
  };

  useEffect(() => {
    if (!signedIn || !actor) return () => {};

    if (actor.presence === 'Break' || actor.presence === 'Lunch') {
      const raw = localStorage.getItem('arka_presence_timer');
      let expiresAt: number;

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.userId === actor.id && parsed.presence === actor.presence && parsed.expiresAt) {
            expiresAt = parsed.expiresAt;
          } else {
            const stats = getDailyBreakMinutes(actor.id, TODAY, breakLogs);
            const slotLimit = actor.presence === 'Break' ? 15 : 60;
            const sessionMaxMinutes = Math.min(slotLimit, stats.remainingPoolMinutes);
            const durationMs = sessionMaxMinutes * 60 * 1000;
            expiresAt = Date.now() + durationMs;
            localStorage.setItem('arka_presence_timer', JSON.stringify({ userId: actor.id, presence: actor.presence, expiresAt }));
          }
        } catch {
          const stats = getDailyBreakMinutes(actor.id, TODAY, breakLogs);
          const slotLimit = actor.presence === 'Break' ? 15 : 60;
          const sessionMaxMinutes = Math.min(slotLimit, stats.remainingPoolMinutes);
          const durationMs = sessionMaxMinutes * 60 * 1000;
          expiresAt = Date.now() + durationMs;
          localStorage.setItem('arka_presence_timer', JSON.stringify({ userId: actor.id, presence: actor.presence, expiresAt }));
        }
      } else {
        const stats = getDailyBreakMinutes(actor.id, TODAY, breakLogs);
        const slotLimit = actor.presence === 'Break' ? 15 : 60;
        const sessionMaxMinutes = Math.min(slotLimit, stats.remainingPoolMinutes);
        const durationMs = sessionMaxMinutes * 60 * 1000;
        expiresAt = Date.now() + durationMs;
        localStorage.setItem('arka_presence_timer', JSON.stringify({ userId: actor.id, presence: actor.presence, expiresAt }));
      }

      const tick = () => {
        const diff = Math.ceil((expiresAt - Date.now()) / 1000);
        // Auto-logout immediately when countdown reaches 00:00 (diff <= 0)
        if (diff <= 0) {
          setTimerSecondsRemaining(0);
          
          try {
            const curRaw = localStorage.getItem('arka_presence_timer');
            if (curRaw) {
              const parsed = JSON.parse(curRaw);
              if (parsed.breakLogId) {
                const nowIso = new Date().toISOString();
                const startMs = parsed.startAt ? new Date(parsed.startAt).getTime() : Date.now();
                const elapsedMinutes = Math.max(1, Math.round((Date.now() - startMs) / 60000));
                void apiPatch(`/break-logs/${parsed.breakLogId}`, { endAt: nowIso, durationMinutes: elapsedMinutes }).catch(() => {});
              }
            }
          } catch {}

          localStorage.removeItem('arka_presence_timer');
          const p = actor.presence;
          const limitMsg = `Session ended: Your ${p} time and daily break pool (75 mins) has completed. You have been automatically logged out.`;
          
          void apiPost('/activities', { workId: 'system', actorId: actor.id, message: `Auto-logged out: ${p} pool completed`, tone: 'warning' }).catch(() => {});
          void apiPatch(`/people/${actor.id}/presence`, { presence: 'Offline' }).catch(() => {});
          void handleLogout(limitMsg);
        } else {
          setTimerSecondsRemaining(diff);
        }
      };

      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    } else {
      localStorage.removeItem('arka_presence_timer');
      setTimerSecondsRemaining(null);
      return () => {};
    }
  }, [signedIn, actor?.id, actor?.presence, breakLogs, handleLogout]);
  const addActivity = async (workId: string, message: string, tone: Activity['tone'] = 'normal') => { 
    try {
      const res = await apiPost<{item: Activity}>('/activities', { workId, actorId: actor.id, message, tone });
      setActivities((all) => [res.item, ...all]);
    } catch (err) { console.error(err); }
  };
  const openWork = (id: string) => setLocation(`/work/${id}`);
  const updateTask = async (taskId: string, patch: Partial<WorkTask>, message: string) => { 
    const existing = tasks.find((task) => task.id === taskId); 
    if (!existing) return; 
    setTasks((all) => all.map((task) => task.id === taskId ? { ...task, ...patch } : task)); 
    try {
      await apiPatch(`/tasks/${taskId}`, patch);
      await addActivity(existing.workId, `${message} on ${existing.title}`, patch.stage === 'Revision' ? 'warning' : patch.stage === 'Approved' ? 'success' : 'normal'); 
    } catch (err) { console.error(err); }
  };
  const addTask = async (data: Omit<WorkTask, 'id' | 'stage' | 'progress' | 'timeMinutes'>) => { 
    try {
      const res = await apiPost<{item: WorkTask}>('/tasks', data);
      setTasks((all) => [...all, res.item]); 
      await addActivity(data.workId, `assigned ${data.title} to ${person(data.assigneeId).name}`); 
      setTaskModalOpen(false);
    } catch (err) { console.error(err); }
  };
  const deleteTask = async (taskId: string) => {
    const existing = tasks.find((t) => t.id === taskId);
    setTasks((all) => all.filter((t) => t.id !== taskId));
    try {
      await apiDelete(`/tasks/${taskId}`);
      if (existing) {
        await addActivity(existing.workId, `deleted task "${existing.title}"`, 'warning');
      }
    } catch (err) {
      console.error("Error deleting task", err);
      alert("Failed to delete task from database.");
    }
  };
  const deleteWork = async (workId: string) => {
    setWork((all) => all.filter((w) => w.id !== workId));
    setTasks((all) => all.filter((t) => t.workId !== workId));
    setLocation(actor.role === 'Team member' ? '/my-work' : '/work');
    try {
      await apiDelete(`/work/${workId}`);
    } catch (err) {
      console.error("Error deleting work item", err);
      alert("Failed to delete work item from database.");
    }
  };
  const addComment = async (workId: string, message: string) => { 
    try {
      const res = await apiPost<{item: Comment}>('/comments', { workId, authorId: actor.id, message });
      setComments((all) => [...all, res.item]);
    } catch (err) { console.error(err); }
  };
  const createWork = async (data: { title: string; description?: string; client?: string; workType?: WorkType; priority: Priority; dueDate?: string; assigneeId: string }) => { 
    const assignee = person(data.assigneeId); 
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const isManager = assignee.role === 'Manager';
      const workRes = await apiPost<{item: WorkItem}>('/work', {
        title: data.title,
        description: data.description || `Work assigned to ${assignee.name}`,
        client: data.client || data.title,
        workType: data.workType || 'Other',
        priority: data.priority,
        dueDate: data.dueDate || todayIso,
        founderId: actor.id,
        managerId: isManager ? assignee.id : null,
        directAssigneeId: !isManager ? assignee.id : undefined,
        stage: isManager ? 'Planning' : 'Assigned',
        progress: 0,
        createdAt: todayIso
      });
      setWork((all) => [workRes.item, ...all]); 
      
      if (!isManager) {
        const taskRes = await apiPost<{item: WorkTask}>('/tasks', {
          workId: workRes.item.id,
          title: data.title,
          instructions: data.description || 'Complete the assigned work and submit it for review.',
          assigneeId: assignee.id,
          dueDate: data.dueDate || todayIso,
          priority: data.priority,
          stage: 'Assigned',
          progress: 0,
          timeMinutes: 0,
          estimatedMinutes: 240
        });
        setTasks((all) => [...all, taskRes.item]); 
      }
      setCreateOpen(false); 
      await addActivity(workRes.item.id, `assigned ${data.title} to ${assignee.name}`, 'success'); 
      openWork(workRes.item.id); 
    } catch (err) { console.error(err); }
  };
  const submitReport = async (data: Omit<ManagerReport, 'id' | 'managerId' | 'status' | 'createdAt'>) => { 
    try {
      const res = await apiPost<{item: ManagerReport}>('/reports', { ...data, managerId: actor.id });
      setReports((all) => [res.item, ...all]);
    } catch (err) { console.error(err); }
  };
  const addPerson = async (data: { name: string; email: string; password?: string; role: Role; managerId: string | null; department: string }) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/people`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password || '1234',
          role: data.role,
          title: data.department || (data.role === 'HR Manager' ? 'Head of People & HR Operations' : data.role === 'Manager' ? 'Manager' : 'Team member'),
          managerId: data.role === 'Team member' ? data.managerId : null
        })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.item) {
          setDirectory((all) => [...all, result.item]);
        }
      } else {
        console.error("Failed to create person", await res.text());
      }
    } catch (err) {
      console.error("Error creating person", err);
    }
  };
  const updatePersonPassword = async (personId: string, newPass: string) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/people/${personId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ password: newPass })
      });
      if (res.ok) {
        setDirectory((all) => all.map(p => p.id === personId ? { ...p, password: newPass } : p));
      } else {
        console.error("Failed to update password", await res.text());
      }
    } catch (err) {
      console.error("Error updating password", err);
    }
  };
  const updatePersonRole = async (personId: string, newRole: Role) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/people/${personId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setDirectory((all) => all.map(p => p.id === personId ? { ...p, role: newRole, title: newRole === 'HR Manager' ? 'Head of People & HR Operations' : p.title } : p));
      } else {
        console.error("Failed to update role", await res.text());
      }
    } catch (err) {
      console.error("Error updating role", err);
    }
  };
  const deletePerson = async (personId: string) => {
    try {
      await apiDelete(`/people/${personId}`);
      setDirectory((all) => all.filter((p) => p.id !== personId));
      setTasks((all) => all.filter((t) => t.assigneeId !== personId));
      setReports((all) => all.filter((r) => r.managerId !== personId));
    } catch (err) {
      console.error("Error deleting person", err);
      alert("Failed to delete employee from database.");
    }
  };
  const addLeave = async (data: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'approvedBy' | 'createdAt'>) => { 
    try {
      const res = await apiPost<{item: LeaveRequest}>('/leaves', { ...data, userId: actor.id });
      setLeaves((all) => [...all, res.item]);
    } catch (err) { console.error(err); }
  };
  const updateLeave = async (id: string, status: LeaveStatus) => { 
    try {
      const res = await apiPatch<{item: LeaveRequest}>(`/leaves/${id}`, { status, approvedBy: actor.id });
      setLeaves((all) => all.map(l => l.id === id ? res.item : l));
    } catch (err) { console.error(err); }
  };

  const handleQuickEarlyLogoutRequest = useCallback(async (data: { plannedTime: string; reason: string; note?: string }) => {
    if (!actor) return;
    const noteText = `Planned Logout Time: ${data.plannedTime}${data.note ? ` | ${data.note}` : ''}`;
    await addLeave({
      leaveType: 'Early Logout',
      startDate: TODAY,
      endDate: TODAY,
      reason: data.reason,
      note: noteText,
    });
    await apiPost('/activities', {
      workId: 'system',
      actorId: actor.id,
      message: `Submitted Early Logout request for today (${data.plannedTime}). Awaiting Founder / HR approval. Reason: ${data.reason}`,
      tone: 'warning'
    }).catch(() => {});
  }, [actor?.id, addLeave]);
  useEffect(() => {
    // Attempt auto-login with existing token
    const token = getStoredToken();
    if (token) {
      apiGet<{ item: Person }>('/auth/me')
        .then(res => {
          if (res.item) {
            setActorId(res.item.id);
            setSignedIn(true);
          }
        })
        .catch((err: any) => {
          // Only clear token if server explicitly returned 401 Unauthorized
          // Never wipe token on momentary tablet Wi-Fi drops, sleep wake-ups, or cold starts
          if (err?.status === 401) {
            setStoredToken(null);
          }
        });
    }
  }, []);

  if (!signedIn) return <Login onEnter={async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) return false;
      const data = await res.json();
      setStoredToken(data.item.token);
      setActorId(data.item.id);
      setSignedIn(true);
      
      // Update directory locally with the new session
      setDirectory(all => { 
        const existing = all.find(p => p.id === data.item.id); 
        return existing 
          ? all.map(p => p.id === data.item.id ? { ...existing, ...data.item } : p) 
          : [...all, { ...data.item, presence: 'Online', lastActiveAt: 'Just now' } as Person]; 
      });
      
      setLocation(data.item.role === 'Team member' ? '/my-work' : '/dashboard');
      return true;
    } catch {
      return false;
    }
  }} />;

  if (!actor) return null;
  if (selected) return (
    <Shell
      actor={actor}
      onLogout={triggerLogout}
      onUpdatePresence={updatePresence}
      timerSecondsRemaining={timerSecondsRemaining}
      shiftTargetInfo={shiftTargetInfo}
      breakCounts={breakCounts}
      remainingBreakPoolMinutes={actorBreakPoolRemaining}
      allPeople={runtimePeople}
    >
      <WorkDetail
        actor={actor}
        item={selected}
        tasks={scopeTasks}
        activities={activities}
        comments={comments}
        onBack={() => setLocation(actor.role === 'Team member' ? '/my-work' : '/work')}
        onOpen={openWork}
        onUpdateTask={updateTask}
        onAddTask={addTask}
        onDeleteTask={deleteTask}
        onDeleteWork={deleteWork}
        onComment={(message) => addComment(selected.id, message)}
        onStartTimer={(taskId) => {
          const task = scopeTasks.find((entry) => entry.id === taskId);
          if (task) updateTask(taskId, { timeMinutes: task.timeMinutes + 25 }, 'logged 25 minutes on');
        }}
      />
      {earlyLogoutModalOpen && (
        <EarlyLogoutModal
          actor={actor}
          shiftInfo={shiftTargetInfo}
          reason={earlyLogoutReason}
          onReasonChange={setEarlyLogoutReason}
          onConfirm={confirmEarlyLogout}
          onClose={() => setEarlyLogoutModalOpen(false)}
          leaves={leaves}
          onRequestEarlyLogout={handleQuickEarlyLogoutRequest}
          allPeople={runtimePeople}
        />
      )}
    </Shell>
  );

  const page = location === '/content-calendar' ? (
    actor.role === 'Founder' || actor.role === 'Manager' ? (
      <ContentCalendarPage actor={actor} allPeople={runtimePeople} work={scopeWork} />
    ) : (
      <Dashboard actor={actor} work={scopeWork} tasks={scopeTasks} peopleInScope={scopePeople} reports={reports} leaves={leaves} onDecision={updateLeave} onOpen={openWork} onCreate={() => setTaskModalOpen(true)} onNavigate={setLocation} onDeletePerson={undefined} />
    )
  ) : location === '/people' ? (
    <PeoplePage actor={actor} people={runtimePeople} onAdd={addPerson} onUpdatePassword={updatePersonPassword} onUpdateRole={updatePersonRole} onDeletePerson={deletePerson} />
  ) : location === '/attendance' ? (
    <AttendancePage actor={actor} people={runtimePeople} tasks={scopeTasks} leaves={leaves} sessions={sessions} breakLogs={breakLogs} onRefresh={refresh} />
  ) : location === '/leave' ? (
    <LeavePage actor={actor} people={runtimePeople} leaves={leaves} onApply={addLeave} onDecision={updateLeave} onRefresh={refresh} />
  ) : location === '/calendar' || location === '/holidays' ? (
    <HolidayCalendarPage actor={actor} />
  ) : location === '/team' ? (
    <TeamPage actor={actor} work={scopeWork} tasks={scopeTasks} onOpen={openWork} />
  ) : location === '/reports' ? (
    <ReportsPage actor={actor} reports={reports} work={scopeWork} onSubmit={submitReport} onReview={(id, status) => setReports((all) => all.map((report) => report.id === id ? { ...report, status } : report))} />
  ) : location === '/approvals' || location === '/reviews' ? (
    <ApprovalsPage actor={actor} tasks={scopeTasks} work={scopeWork} onOpen={openWork} onUpdate={updateTask} />
  ) : location === '/time' ? (
    <TimePage actor={actor} tasks={scopeTasks} />
  ) : location === '/insights' ? (
    <InsightsPage work={scopeWork} tasks={scopeTasks} />
  ) : location === '/documents' ? (
    <DocumentHub currentUser={actor} allPeople={runtimePeople} tasks={scopeTasks} />
  ) : location === '/work' ? (
    <WorkListPage title="Company work" description="Centralized pipeline of active client deliverables and internal initiatives." work={scopeWork} tasks={scopeTasks} onOpen={openWork} onCreate={actor.role === 'Founder' ? () => setCreateOpen(true) : undefined} />
  ) : location === '/assignments' ? (
    <WorkListPage title="Founder assignments" description="Work received from Founder that needs planning, decomposition, and distribution." work={scopeWork.filter((item) => item.managerId === actor.id)} tasks={scopeTasks} onOpen={openWork} onCreate={() => setTaskModalOpen(true)} createButtonLabel="Assign team task" />
  ) : location === '/team-tasks' ? (
    <WorkListPage title="Team tasks" description="Break manager work into clear assignments for your team." work={scopeWork} tasks={scopeTasks} onOpen={openWork} onCreate={() => setTaskModalOpen(true)} createButtonLabel="Assign team task" />
  ) : location === '/my-work' || location === '/today' || location === '/submissions' || location === '/notifications' || location === '/profile' ? (
    <WorkListPage title={location === '/today' ? "Today's work" : location === '/submissions' ? 'My submissions' : location === '/my-work' ? 'My work' : location.slice(1)} description="Your focused execution view. Open a work item to start, update, block, or submit it." work={scopeWork} tasks={scopeTasks.filter((task) => location !== '/submissions' || task.stage === 'Review' || task.stage === 'Approved')} onOpen={openWork} onCreate={() => setTaskModalOpen(true)} createButtonLabel="Add my task" />
  ) : (
    <Dashboard actor={actor} work={scopeWork} tasks={scopeTasks} peopleInScope={scopePeople} reports={reports} leaves={leaves} onDecision={updateLeave} onOpen={openWork} onCreate={actor.role === 'Founder' ? () => setCreateOpen(true) : () => setTaskModalOpen(true)} onNavigate={setLocation} onDeletePerson={actor.role === 'Founder' ? deletePerson : undefined} />
  );

  return (
    <Shell
      actor={actor}
      onLogout={triggerLogout}
      onUpdatePresence={updatePresence}
      timerSecondsRemaining={timerSecondsRemaining}
      shiftTargetInfo={shiftTargetInfo}
      breakCounts={breakCounts}
      remainingBreakPoolMinutes={actorBreakPoolRemaining}
      allPeople={runtimePeople}
    >
      {page}
      {createOpen && <AssignWorkModal onClose={() => setCreateOpen(false)} onCreate={createWork} />}
      {taskModalOpen && (
        <CreateTaskModal
          currentUser={actor}
          workList={work.length > 0 ? work : scopeWork}
          onClose={() => setTaskModalOpen(false)}
          onCreate={addTask}
        />
      )}
      {earlyLogoutModalOpen && (
        <EarlyLogoutModal
          actor={actor}
          shiftInfo={shiftTargetInfo}
          reason={earlyLogoutReason}
          onReasonChange={setEarlyLogoutReason}
          onConfirm={confirmEarlyLogout}
          onClose={() => setEarlyLogoutModalOpen(false)}
          leaves={leaves}
          onRequestEarlyLogout={handleQuickEarlyLogoutRequest}
          allPeople={runtimePeople}
        />
      )}
    </Shell>
  );
}

function App() {
  return <ErrorBoundary><QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter><AppRouter /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider></ErrorBoundary>;
}

export default App;