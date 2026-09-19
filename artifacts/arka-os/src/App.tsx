import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, Command,
  FileText, Flag, Inbox, KanbanSquare, LayoutDashboard, ListFilter, Lock, LogOut, Menu,
  MessageSquare, Plus, Search, Settings2, ShieldAlert, Timer, Trash2, UserPlus, UserRound, Users, X, Zap
} from 'lucide-react';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import { ChatWidget } from './components/ChatWidget';
import { DocumentHub } from './components/DocumentHub';

const queryClient = new QueryClient();
const TODAY = '2026-09-15';
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
  const sessionToken = sessionStorage.getItem('arka_token');
  if (sessionToken) return sessionToken;
  const localToken = localStorage.getItem('arka_token');
  if (localToken) {
    sessionStorage.setItem('arka_token', localToken);
    localStorage.removeItem('arka_token');
    return localToken;
  }
  return null;
}

function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    sessionStorage.setItem('arka_token', token);
  } else {
    sessionStorage.removeItem('arka_token');
  }
  localStorage.removeItem('arka_token');
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
    throw new Error(`API ${path} responded with ${response.status}`);
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
  setSessions?: (sessions: SessionRecord[]) => void
) {
  try {
    const [peoplePayload, workPayload, taskPayload, actPayload, commentPayload, reportPayload, leavePayload, sessionPayload] = await Promise.all([
      apiGet<{ items: Person[] }>('/people'),
      apiGet<{ items: WorkItem[] }>('/work'),
      apiGet<{ items: WorkTask[] }>('/tasks'),
      apiGet<{ items: Activity[] }>('/activities'),
      apiGet<{ items: Comment[] }>('/comments'),
      apiGet<{ items: ManagerReport[] }>('/reports'),
      apiGet<{ items: LeaveRequest[] }>('/leaves'),
      apiGet<{ items: SessionRecord[] }>('/sessions').catch(() => ({ items: [] as SessionRecord[] })),
    ]);

    if (Array.isArray(peoplePayload.items)) setPeople(peoplePayload.items);
    if (Array.isArray(workPayload.items)) setWork(workPayload.items);
    if (Array.isArray(taskPayload.items)) setTasks(taskPayload.items);
    if (Array.isArray(actPayload.items)) setActivities(actPayload.items);
    if (Array.isArray(commentPayload.items)) setComments(commentPayload.items);
    if (Array.isArray(reportPayload.items)) setReports(reportPayload.items);
    if (Array.isArray(leavePayload.items)) setLeaves(leavePayload.items);
    if (setSessions && Array.isArray(sessionPayload.items)) setSessions(sessionPayload.items);
  } catch {
    // Keep the existing mock in-memory UI data if the API is unreachable.
  }
}

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
export type LeaveType = 'Casual' | 'Sick' | 'Personal' | 'Other';
export type LeaveRequest = {
  id: string; userId: string; leaveType: LeaveType; startDate: string; endDate: string; reason: string; note?: string | null;
  status: LeaveStatus; approvedBy?: string | null; createdAt: string;
};
export type SessionRecord = {
  id: string; userId: string; date: string; loginAt: string; logoutAt?: string; durationMinutes: number;
};

const initialPeople: Person[] = [
  { id: 'usr_founder', name: 'Arka Founder', role: 'Founder', title: 'Founder / CEO', managerId: null, presence: 'Offline', lastActiveAt: 'Just now', sessionMinutes: 0, taskMinutes: 0 },
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
    { label: 'People', path: '/people', icon: UserPlus },
    { label: 'Team Presence', path: '/team', icon: Users },
    { label: 'Attendance & Time', path: '/attendance', icon: CalendarDays },
    { label: 'Leave', path: '/leave', icon: CalendarDays },
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
    { label: 'Company Workflow', path: '/work', icon: Inbox },
    { label: 'Team Presence', path: '/team', icon: Users },
    { label: 'People Directory', path: '/people', icon: UserPlus },
    { label: 'Time & Effort', path: '/time', icon: Clock3 },
    { label: 'Settings', path: '/settings', icon: Settings2 },
  ],
  Manager: [
    { label: 'My Dashboard', path: '/dashboard', icon: Command },
    { label: 'Founder Assignments', path: '/assignments', icon: Flag },
    { label: 'Team Tasks', path: '/team-tasks', icon: KanbanSquare },
    { label: 'My Team', path: '/team', icon: Users },
    { label: 'Team Attendance', path: '/attendance', icon: CalendarDays },
    { label: 'Team Leave', path: '/leave', icon: CalendarDays },
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
    { label: 'My Reports', path: '/reports', icon: FileText },
    { label: 'My Submissions', path: '/submissions', icon: CheckCircle2 },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Profile', path: '/profile', icon: UserRound },
  ],
};

function person(id: string) { return runtimePeople.find((item) => item.id === id) || runtimePeople[0]; }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
function isOverdue(value: string) { return value < TODAY; }
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
  return people.filter((item) => item.role !== 'Founder' && item.role !== 'HR Manager' && (!role || item.role === role));
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
  if (email === 'admin@arka.com' && pass === 'admin1234') {
    return { id: 'usr_founder', role: 'Founder' as const, name: 'Arka Founder' };
  }
  if (email === 'arka@founder' && pass === '1234') {
    return { id: 'usr_founder', role: 'Founder' as const, name: 'Founder' };
  }
  if (email === 'hr@arka.com' && pass === '1234') {
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

function Shell({ 
  actor, 
  onLogout, 
  onUpdatePresence, 
  timerSecondsRemaining,
  allPeople,
  children 
}: { 
  actor: Person; 
  onLogout: () => void; 
  onUpdatePresence: (p: Presence) => void; 
  timerSecondsRemaining?: number | null;
  allPeople?: Person[];
  children: ReactNode 
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = roleNavigation[actor.role];
  return <div className="min-h-screen bg-[#f7f7f5] text-[hsl(var(--foreground))]">
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
          
          {/* Active Countdown Badge for Break and Lunch */}
          {(actor.presence === 'Break' || actor.presence === 'Lunch') && timerSecondsRemaining !== null && timerSecondsRemaining !== undefined && (
            <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900 shadow-sm animate-pulse">
              <Clock3 className="size-3.5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
              <span>
                {actor.presence === 'Break' ? '☕ Break' : '🍱 Lunch'}: {Math.floor(timerSecondsRemaining / 60)}:{String(timerSecondsRemaining % 60).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => onUpdatePresence('Online')}
                className="ml-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2 py-0.5 transition shadow-sm cursor-pointer"
                title="End early and switch back to Online"
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
              <option value="Break">On Break (15m)</option>
              <option value="Lunch">At Lunch (1h)</option>
              <option value="Idle">Idle</option>
            </select>
          </div>

          <button className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-white"><Search className="size-4" /></button>
          <button className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-white"><Bell className="size-4" /></button>
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
  const reviews = tasks.filter((task) => task.stage === 'Review');
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
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Workflow Oversight</div>
                  <h2 className="mt-1 text-lg font-black">Active Initiatives</h2>
                </div>
                <Button variant="ghost" onClick={() => onNavigate('/work')}>
                  View all <ArrowRight className="size-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-2.5">
                {active.slice(0, 4).map((item) => (
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
  if (actor.role === 'Founder') return <><SectionTitle eyebrow="Founder command center" title={`Good morning, ${actor.name.split(' ')[0]}.`} description="Here's the current state of Arka. Exception-focused visibility for decisions, not employee surveillance." action={<Button onClick={onCreate}><Plus className="size-4" />Assign work</Button>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Active work" value={active.length} detail="Across the operation" onClick={() => onNavigate('/work')} /><Metric label="Due today" value={dueToday.length} detail="Needs a decision" tone="warning" /><Metric label="Overdue" value={overdue.length} detail="Requires intervention" tone="danger" onClick={() => onNavigate('/work')} /><Metric label="Blocked" value={blocked.length} detail="Waiting on a path forward" tone="danger" /><Metric label="Waiting approval" value={reviews.length} detail="Submitted for review" tone="warning" onClick={() => onNavigate('/approvals')} /></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><Card><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><div><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Where is everyone?</div><h2 className="mt-1 text-lg font-black">Team presence</h2></div><Button variant="ghost" onClick={() => onNavigate('/people')}>Manage people <ArrowRight className="size-4" /></Button></div>{peopleInScope.map((item) => <PersonRow key={item.id} item={item} currentWork={work.find((entry) => entry.managerId === item.id || entry.directAssigneeId === item.id)} onOpen={onOpen} onDelete={onDeletePerson && item.role !== 'Founder' ? () => setDeleteTarget(item) : undefined} />)}</Card><Card className="p-5"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Attention required</div><h2 className="mt-1 text-lg font-black">Founder decisions</h2><div className="mt-5 space-y-3">{[...overdue.slice(0, 2).map((item) => ({ label: 'Overdue work', item })), ...blocked.slice(0, 2).map((item) => ({ label: 'Blocked work', item }))].map(({ label, item }) => <button key={item.id} onClick={() => onOpen(item.id)} className="flex w-full items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-3 text-left hover:bg-[#fafaf8]"><ShieldAlert className="mt-0.5 size-4 text-red-600" /><span><span className="block text-xs font-bold uppercase tracking-wide text-red-700">{label}</span><span className="mt-1 block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{item.managerId ? `Manager: ${person(item.managerId).name}` : 'Direct assignment'}</span></span></button>)}{reports.filter((report) => report.status === 'Submitted').map((report) => <button key={report.id} onClick={() => onNavigate('/reports')} className="flex w-full items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-3 text-left hover:bg-[#fafaf8]"><FileText className="mt-0.5 size-4 text-[hsl(var(--primary))]" /><span><span className="block text-xs font-bold uppercase tracking-wide text-[hsl(var(--primary))]">Manager report</span><span className="mt-1 block text-sm font-semibold">{report.period} is ready to review</span></span></button>)}{overdue.length + blocked.length + reports.filter((report) => report.status === 'Submitted').length === 0 && <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No founder intervention required.</p>}</div></Card></div>{deleteTarget && <ConfirmDeleteModal targetPerson={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (onDeletePerson) await onDeletePerson(deleteTarget.id); }} />}</>;
  if (actor.role === 'Manager') return <><SectionTitle eyebrow="Manager command center" title={`Good morning, ${actor.name.split(' ')[0]}.`} description="What does your team need to execute today?" action={<Button onClick={onCreate}><Plus className="size-4" />Assign task</Button>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Founder assignments" value={work.filter((item) => item.managerId === actor.id && item.stage === 'Planning').length} detail="Waiting to be planned" onClick={() => onNavigate('/assignments')} /><Metric label="Team work" value={tasks.filter((task) => person(task.assigneeId).managerId === actor.id && task.stage !== 'Completed').length} detail="Active team tasks" /><Metric label="Due today" value={dueToday.length} detail="Deadline today" tone="warning" /><Metric label="Blocked" value={blocked.length} detail="Needs resolution" tone="danger" /><Metric label="My reviews" value={reviews.length} detail="Waiting for your review" tone="warning" onClick={() => onNavigate('/reviews')} /></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Manager attention</div><h2 className="mt-1 text-lg font-black">Keep execution moving</h2></div><div className="p-5 space-y-3">{[...reviews.map((task) => ({ label: 'Waiting for review', title: task.title, detail: `${person(task.assigneeId).name} submitted this task`, id: task.workId })), ...blocked.map((item) => ({ label: 'Blocked', title: item.title, detail: 'Resolve or escalate the blocker', id: item.id }))].map((item) => <button key={`${item.label}-${item.id}`} onClick={() => onOpen(item.id)} className="flex w-full items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-4 text-left hover:bg-[#fafaf8]"><Flag className="mt-0.5 size-4 text-amber-600" /><span><span className="block text-xs font-bold uppercase tracking-wide text-amber-700">{item.label}</span><span className="mt-1 block font-bold">{item.title}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</span></span></button>)}{reviews.length + blocked.length === 0 && <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Your team is clear.</p>}</div></Card><TeamWorkload peopleInScope={peopleInScope} tasks={tasks} /></div></>;
  const ownTasks = tasks.filter((task) => task.assigneeId === actor.id);
  const today = ownTasks.filter((task) => task.dueDate === TODAY);
  const next = ownTasks.filter((task) => task.dueDate > TODAY && task.stage !== 'Completed');
  const blockedMine = ownTasks.filter((task) => task.stage === 'Blocked');
  return <><SectionTitle eyebrow="Team member workspace" title={`Good morning, ${actor.name.split(' ')[0]}.`} description="Here is the work that needs your attention. Focus on execution, progress, and clear handoffs." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Now" value={ownTasks.filter((task) => task.stage === 'In Progress').length} detail="Currently in progress" /><Metric label="Due today" value={today.length} detail="Finish or update today" tone="warning" /><Metric label="Blocked" value={blockedMine.length} detail="Needs a reason" tone="danger" /><Metric label="Waiting review" value={ownTasks.filter((task) => task.stage === 'Review').length} detail="Submitted to manager" tone="success" /></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><TaskColumn title="Today's work" tasks={today} work={work} onOpen={onOpen} empty="Nothing due today." /><TaskColumn title="Next" tasks={next} work={work} onOpen={onOpen} empty="No upcoming work." /></div></>;
}

function TeamWorkload({ peopleInScope, tasks }: { peopleInScope: Person[]; tasks: WorkTask[] }) {
  return <Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">My team</div><h2 className="mt-1 text-lg font-black">Workload and availability</h2></div><div className="divide-y divide-[hsl(var(--border))]">{peopleInScope.filter((item) => item.role === 'Team member').map((member) => { const count = tasks.filter((task) => task.assigneeId === member.id && task.stage !== 'Completed').length; return <div key={member.id} className="flex items-center gap-3 px-5 py-4"><div className={`size-2 rounded-full ${member.presence === 'Online' ? 'bg-emerald-500' : 'bg-slate-300'}`} /><div className="min-w-0 flex-1"><div className="font-bold">{member.name}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{member.presence} · {count} active task{count === 1 ? '' : 's'}</div></div><Badge className={count >= 3 ? 'border-red-200 bg-red-50 text-red-700' : count === 0 ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>{count >= 3 ? 'High' : count === 0 ? 'Available' : 'Normal'}</Badge></div>; })}</div></Card>;
}

function TaskColumn({ title, tasks, work, onOpen, empty }: { title: string; tasks: WorkTask[]; work: WorkItem[]; onOpen: (id: string) => void; empty: string }) {
  return <Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><h2 className="text-lg font-black">{title}</h2></div><div>{tasks.map((task) => <button key={task.id} onClick={() => onOpen(task.workId)} className="flex w-full items-start gap-3 border-b border-[hsl(var(--border))] px-5 py-4 text-left last:border-0 hover:bg-[#fafaf8]"><div className="mt-1 size-2 rounded-full bg-[#f8c329]" /><span className="min-w-0 flex-1"><span className="block font-bold">{task.title}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{work.find((item) => item.id === task.workId)?.title} · due {formatDate(task.dueDate)}</span></span><Badge className={stageTone[task.stage]}>{task.stage}</Badge></button>)}{tasks.length === 0 && <p className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">{empty}</p>}</div></Card>;
}

function WorkListPage({ title, description, work, tasks, onOpen, onCreate, createButtonLabel = 'Assign work', filter }: { title: string; description: string; work: WorkItem[]; tasks: WorkTask[]; onOpen: (id: string) => void; onCreate?: () => void; createButtonLabel?: string; filter?: (item: WorkItem) => boolean }) {
  const [query, setQuery] = useState('');
  const visible = work.filter(filter || (() => true)).filter((item) => `${item.title} ${item.client || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <><SectionTitle eyebrow="Work" title={title} description={description} action={onCreate && <Button onClick={onCreate}><Plus className="size-4" />{createButtonLabel}</Button>} /><Card><div className="flex flex-wrap items-center gap-3 border-b border-[hsl(var(--border))] p-4"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search work..." className="w-full rounded-lg border border-[hsl(var(--input))] bg-[#fafaf8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[hsl(var(--primary))]" /></div><Button variant="secondary"><ListFilter className="size-4" />Filter</Button></div><div className="grid grid-cols-[1.4fr_0.6fr_0.65fr_0.7fr_auto] border-b border-[hsl(var(--border))] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]"><span>Work</span><span>Owner</span><span>Priority</span><span>Deadline</span><span>Stage</span></div>{visible.map((item) => <WorkRow key={item.id} item={item} tasks={tasks.filter((task) => task.workId === item.id)} onOpen={onOpen} />)}{visible.length === 0 && <p className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No work matches this view.</p>}</Card></>;
}

function TeamPage({ actor, work, tasks, onOpen }: { actor: Person; work: WorkItem[]; tasks: WorkTask[]; onOpen: (id: string) => void }) {
  const isExec = actor.role === 'Founder' || actor.role === 'HR Manager';
  const scope = isExec ? runtimePeople : runtimePeople.filter((item) => item.managerId === actor.id || item.id === actor.id);
  return <><SectionTitle eyebrow={isExec ? 'Operational view' : 'My team'} title={isExec ? 'Where is everyone?' : 'Team execution'} description="Presence exists to establish availability, work state, and operational visibility—not to judge productivity by hours." /><Card><div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_1.2fr_0.9fr] border-b border-[hsl(var(--border))] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]"><span>Person</span><span>Presence</span><span>Login Timestamp</span><span>Current work</span><span>Workload</span></div>{scope.map((member) => { const currentTask = tasks.find((task) => task.assigneeId === member.id && task.stage !== 'Completed'); const currentWork = currentTask ? work.find((item) => item.id === currentTask.workId) : work.find((item) => item.managerId === member.id && item.stage !== 'Completed'); const count = tasks.filter((task) => task.assigneeId === member.id && task.stage !== 'Completed').length; return <div key={member.id} className="grid grid-cols-[1.2fr_0.7fr_0.8fr_1.2fr_0.9fr] items-center border-b border-[hsl(var(--border))] px-5 py-4 text-sm last:border-0"><div><div className="font-bold">{member.name}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{member.role} · {member.title}</div></div><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${member.presence === 'Online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />{member.presence}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{formatTimestamp(member.loginAt) || (member.logoutAt ? `Out: ${formatTimestamp(member.logoutAt)}` : '—')}</div><div>{currentWork ? <button onClick={() => onOpen(currentWork.id)} className="text-left font-semibold hover:text-[hsl(var(--primary))]">{currentTask?.title || currentWork.title}<div className="text-xs font-normal text-[hsl(var(--muted-foreground))]">{currentWork.stage}</div></button> : <span className="text-[hsl(var(--muted-foreground))]">No current work</span>}</div><Badge className={count >= 3 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>{count >= 3 ? 'High' : `${count} active`}</Badge></div>; })}</Card></>;
}

function WorkDetail({ actor, item, tasks, activities, comments, onBack, onOpen, onUpdateTask, onAddTask, onComment, onStartTimer, onDeleteTask, onDeleteWork }: { actor: Person; item: WorkItem; tasks: WorkTask[]; activities: Activity[]; comments: Comment[]; onBack: () => void; onOpen: (id: string) => void; onUpdateTask: (taskId: string, patch: Partial<WorkTask>, message: string) => void; onAddTask: (task: Omit<WorkTask, 'id' | 'stage' | 'progress' | 'timeMinutes'>) => void; onComment: (message: string) => void; onStartTimer: (taskId: string) => void; onDeleteTask?: (taskId: string) => void; onDeleteWork?: (workId: string) => void }) {
  const [comment, setComment] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  const relatedTasks = tasks.filter((task) => task.workId === item.id && (actor.role !== 'Team member' || task.assigneeId === actor.id));
  const canManage = actor.role === 'Founder' || actor.role === 'Manager';
  return <><div className="mb-5 flex items-center justify-between"><button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"><ArrowLeft className="size-4" />Back</button>{actor.role === 'Founder' && onDeleteWork && <button type="button" onClick={() => { if (window.confirm(`Are you sure you want to permanently delete "${item.title}" and all its tasks?`)) onDeleteWork(item.id); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition"><Trash2 className="size-3.5" />Delete Work Initiative</button>}</div><SectionTitle eyebrow="Work detail" title={item.title} description={item.description} action={<Badge className={stageTone[item.stage]}>{item.stage}</Badge>} /><div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]"><div className="space-y-6"><Card><div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4"><Info label="Client" value={item.client || 'Internal'} /><Info label="Work type" value={item.workType} /><Info label="Deadline" value={formatDate(item.dueDate)} valueClass={isOverdue(item.dueDate) ? 'text-red-700' : ''} /><Info label="Manager" value={item.managerId ? person(item.managerId).name : item.directAssigneeId ? `Direct · ${person(item.directAssigneeId).name}` : 'Unassigned'} /></div><div className="border-t border-[hsl(var(--border))] px-5 py-4"><div className="mb-2 flex justify-between text-xs font-bold"><span>Overall progress</span><span>{item.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#f8c329]" style={{ width: `${item.progress}%` }} /></div></div></Card><Card><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><div><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Work hierarchy</div><h2 className="mt-1 text-lg font-black">Tasks and execution</h2></div>{canManage && <Button onClick={() => setTaskOpen(true)}><Plus className="size-4" />Assign task</Button>}</div><div>{relatedTasks.map((task) => <TaskRow key={task.id} actor={actor} task={task} onOpen={() => onOpen(item.id)} onUpdate={onUpdateTask} onStartTimer={onStartTimer} onDelete={onDeleteTask} />)}{relatedTasks.length === 0 && <p className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No tasks assigned to you for this work item.</p>}</div></Card><Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Conversation</div><h2 className="mt-1 text-lg font-black">Comments</h2></div><div className="divide-y divide-[hsl(var(--border))]">{comments.filter((entry) => entry.workId === item.id).map((entry) => <div key={entry.id} className="px-5 py-4"><div className="text-sm font-bold">{person(entry.authorId).name} <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">{entry.createdAt}</span></div><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{entry.message}</p></div>)}<form onSubmit={(event) => { event.preventDefault(); if (comment.trim()) { onComment(comment.trim()); setComment(''); } }} className="flex gap-2 p-5"><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add an operational comment..." className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--input))] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none" /><Button type="submit" disabled={!comment.trim()}>Comment</Button></form></div></Card></div><div className="space-y-6"><Card><div className="border-b border-[hsl(var(--border))] px-5 py-4"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Activity</div><h2 className="mt-1 text-lg font-black">History</h2></div><div className="p-5 space-y-4">{activities.filter((entry) => entry.workId === item.id).map((entry) => <div key={entry.id} className="flex gap-3"><div className={`mt-1 size-2 rounded-full ${entry.tone === 'warning' ? 'bg-red-500' : entry.tone === 'success' ? 'bg-emerald-500' : 'bg-[#f8c329]'}`} /><div><div className="text-sm"><span className="font-bold">{person(entry.actorId).name}</span> {entry.message}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{entry.createdAt}</div></div></div>)}</div></Card><Card className="p-5"><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Responsibility chain</div><div className="mt-4 space-y-3 text-sm"><Chain label="Founder" value={person(item.founderId).name} /><Chain label="Manager" value={item.managerId ? person(item.managerId).name : 'Direct assignment'} /><Chain label="Team tasks" value={actor.role === 'Team member' ? `${relatedTasks.length} assigned to you` : `${relatedTasks.length} assigned`} /><Chain label="Time logged" value={hours(relatedTasks.reduce((sum, task) => sum + task.timeMinutes, 0))} /></div></Card></div></div>{taskOpen && <CreateTaskModal workId={item.id} onClose={() => setTaskOpen(false)} onCreate={(task) => { onAddTask(task); setTaskOpen(false); }} />}</>;
}

function TaskRow({ actor, task, onUpdate, onStartTimer, onDelete }: { actor: Person; task: WorkTask; onOpen: () => void; onUpdate: (taskId: string, patch: Partial<WorkTask>, message: string) => void; onStartTimer: (taskId: string) => void; onDelete?: (taskId: string) => void }) {
  const assignee = person(task.assigneeId);
  const isOwner = actor.id === task.assigneeId;
  const canDelete = actor.role === 'Founder' || actor.role === 'Manager';
  return <div className="border-b border-[hsl(var(--border))] p-5 last:border-0"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{task.title}</h3><Badge className={stageTone[task.stage]}>{task.stage}</Badge></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{task.instructions}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]"><span>Assigned to <strong className="text-[hsl(var(--foreground))]">{assignee.name}</strong></span><span>Due {formatDate(task.dueDate)}</span><span>{hours(task.timeMinutes)} logged</span></div></div><div className="flex flex-wrap items-center gap-2">{isOwner && task.stage !== 'Completed' && <><Button variant="secondary" onClick={() => onStartTimer(task.id)}><Timer className="size-4" />Start timer</Button>{task.stage === 'Assigned' && <Button onClick={() => onUpdate(task.id, { stage: 'In Progress', progress: 10 }, 'started work')}>Start work</Button>}{task.stage === 'In Progress' && <Button onClick={() => onUpdate(task.id, { stage: 'Review', progress: 100, submittedAt: 'Just now' }, 'submitted work for manager review')}>Submit for review</Button>}{task.stage === 'Revision' && <Button onClick={() => onUpdate(task.id, { stage: 'Review', progress: 100, submittedAt: 'Just now' }, 'resubmitted work after revision')}>Resubmit</Button>}</>}{canDelete && onDelete && <button type="button" onClick={() => { if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) onDelete(task.id); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition" title="Delete task"><Trash2 className="size-3.5" />Delete</button>}</div></div>{task.revisionNote && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><strong>Revision required:</strong> {task.revisionNote}</div>}{(actor.role === 'Manager' || actor.role === 'Founder') && task.stage === 'Review' && <div className="mt-4 flex flex-wrap gap-2 border-t border-[hsl(var(--border))] pt-4"><Button onClick={() => onUpdate(task.id, { stage: 'Approved', progress: 100 }, 'approved the submission')}>Approve</Button><Button variant="secondary" onClick={() => onUpdate(task.id, { stage: 'Revision', progress: 70, revisionNote: 'Update the hero section and mobile spacing.' }, 'requested a revision')}>Request revision</Button></div>}</div>;
}

function ReportsPage({ actor, reports, work, onSubmit, onReview }: { actor: Person; reports: ManagerReport[]; work: WorkItem[]; onSubmit: (report: Omit<ManagerReport, 'id' | 'managerId' | 'status' | 'createdAt'>) => void; onReview: (id: string, status: ManagerReport['status']) => void }) {
  const [open, setOpen] = useState(false);
  const ownReports = actor.role === 'Founder' ? reports : reports.filter((report) => report.managerId === actor.id);
  return <><SectionTitle eyebrow={actor.role === 'Founder' ? 'Founder reports' : actor.role === 'Manager' ? 'Reporting to founder' : 'My progress reports'} title={actor.role === 'Founder' ? 'Reports and decisions' : actor.role === 'Manager' ? 'Report to Founder' : 'My reports'} description={actor.role === 'Founder' ? 'Read consolidated manager reporting and turn operational context into decisions.' : 'Keep the next level informed with clear progress, blockers, and decisions needed.'} action={actor.role === 'Manager' && <Button onClick={() => setOpen(true)}><Plus className="size-4" />Create report</Button>} /><div className="grid gap-5">{ownReports.map((report) => <Card key={report.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">{report.period}</div><h2 className="mt-1 text-lg font-black">Report from {person(report.managerId).name}</h2></div><Badge className={report.status === 'Submitted' ? 'border-amber-200 bg-amber-50 text-amber-700' : report.status === 'Reviewed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'}>{report.status}</Badge></div><div className="mt-5 grid gap-4 text-sm md:grid-cols-2"><ReportBlock title="Completed" value={report.completed} /><ReportBlock title="In progress" value={report.inProgress} /><ReportBlock title="Blockers" value={report.blockers} /><ReportBlock title="Founder decisions" value={report.decisions} /></div>{actor.role === 'Founder' && report.status === 'Submitted' && <div className="mt-5 flex gap-2 border-t border-[hsl(var(--border))] pt-4"><Button onClick={() => onReview(report.id, 'Reviewed')}><Check className="size-4" />Mark reviewed</Button><Button variant="secondary" onClick={() => onReview(report.id, 'Needs revision')}>Request revision</Button></div>}</Card>)}{ownReports.length === 0 && <Card className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No reports yet.</Card>}</div>{open && <ReportModal onClose={() => setOpen(false)} onCreate={(report) => { onSubmit(report); setOpen(false); }} />}</>;
}

function ApprovalsPage({ tasks, work, onOpen }: { tasks: WorkTask[]; work: WorkItem[]; onOpen: (id: string) => void }) {
  const pending = tasks.filter((task) => task.stage === 'Review');
  return <><SectionTitle eyebrow="Founder approval center" title="Approvals" description="Review work and reports at the management level. Small team tasks are normally approved by the Manager first." /><Card>{pending.map((task) => <button key={task.id} onClick={() => onOpen(task.workId)} className="flex w-full flex-wrap items-center gap-4 border-b border-[hsl(var(--border))] px-5 py-5 text-left last:border-0 hover:bg-[#fafaf8]"><div className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><CheckCircle2 className="size-5" /></div><div className="min-w-[220px] flex-1"><div className="font-bold">{task.title}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{work.find((item) => item.id === task.workId)?.title} · submitted by {person(task.assigneeId).name}</div></div><div className="text-sm text-[hsl(var(--muted-foreground))]">{task.submittedAt || 'Submitted today'}</div><ArrowRight className="size-4 text-[hsl(var(--muted-foreground))]" /></button>)}{pending.length === 0 && <p className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Nothing is waiting for approval.</p>}</Card></>;
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const ok = await onEnter(email, password);
    setLoading(false);
    if (!ok) setError('Invalid email or password.');
  };

  return <div className="min-h-screen bg-[#101010] text-white"><div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]"><div className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col"><div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '32px 32px' }} /><div className="relative flex items-center gap-3"><img src={LOGO_SRC} alt="Arka Media" className="h-16 w-auto max-w-[280px] object-contain object-left" /></div><div className="relative my-auto max-w-xl"><Badge className="border-white/20 bg-white/5 text-white/60">INTERNAL OPERATING SYSTEM</Badge><h1 className="mt-7 text-6xl font-black leading-[0.96] tracking-[-0.07em]">See the work.<br /><span className="text-[#f8c329]">Move Arka forward.</span></h1><p className="mt-8 max-w-lg text-lg leading-8 text-white/55">A role-based operating view of ownership, deadlines, effort, workload, review, and what needs attention.</p></div><div className="relative flex justify-between text-[10px] uppercase tracking-[0.12em] text-white/35"><span>Arka Digital Media</span><span>Designed and developed by Dhuruv</span></div></div><div className="flex items-center bg-[#f7f7f5] p-6 text-[#111] md:p-12"><div className="mx-auto w-full max-w-md"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b48a00]">Welcome to ARKA OS</div><h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.06em]">Enter your workspace.</h2><form className="mt-9 space-y-4" onSubmit={submit}><label className="block text-xs font-bold uppercase tracking-wide text-black/55">Email<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#c99f18]" placeholder="you@arkadigitalmedia.com" required /></label><label className="block text-xs font-bold uppercase tracking-wide text-black/55">Password<input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#c99f18]" placeholder="••••••••" required /></label>{error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}<Button type="submit" disabled={loading}><span>{loading ? 'Entering...' : 'Enter ARKA OS'}</span><ArrowRight className="size-4" /></Button></form></div></div></div></div>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><h2 className="font-black">{title}</h2><button onClick={onClose} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><X className="size-4" /></button></div><div className="p-5">{children}</div></div></div>;
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-[hsl(var(--input))] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]" /></label>;
}

function AssignWorkModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: { title: string; description: string; client: string; workType: WorkType; priority: Priority; dueDate: string; assigneeId: string }) => void }) {
  const assignable = getAssignablePeople(runtimePeople);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [client, setClient] = useState('');
  const [workType, setWorkType] = useState<WorkType>('Website');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [dueDate, setDueDate] = useState('2026-09-25');
  const [assigneeId, setAssigneeId] = useState(() => assignable[0]?.id || '');

  useEffect(() => {
    if (!assigneeId && assignable.length > 0) {
      setAssigneeId(assignable[0].id);
    }
  }, [assignable, assigneeId]);

  return (
    <Modal title="Assign new work (Founder)" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!assigneeId) return;
          onCreate({ title, description, client, workType, priority, dueDate, assigneeId });
        }}
        className="space-y-4"
      >
        <Field label="Work title" value={title} onChange={setTitle} placeholder="e.g. ABC Website Redesign" required />
        <Field label="Description" value={description} onChange={setDescription} placeholder="What outcome is needed?" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client (optional)" value={client} onChange={setClient} placeholder="Client name" />
          <Field label="Deadline" type="date" value={dueDate} onChange={setDueDate} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Work type" value={workType} onChange={(value) => setWorkType(value as WorkType)} options={['Website', 'SEO', 'Graphic Design', 'Internal', 'Other']} />
          <SelectField label="Priority" value={priority} onChange={(value) => setPriority(value as Priority)} options={['Low', 'Medium', 'High', 'Urgent']} />
        </div>
        {assignable.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>No employees found:</strong> Add a Manager or Team member in the People directory first.
          </div>
        ) : (
          <SelectField
            label="Assign to Manager or Team Member"
            value={assigneeId}
            onChange={setAssigneeId}
            options={assignable.map((item) => item.id)}
            labels={Object.fromEntries(assignable.map((item) => [item.id, `${item.name} (${item.role})`]))}
          />
        )}
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!title.trim() || !assigneeId}>Create assignment</Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateTaskModal({ workId: initialWorkId, workList = [], onClose, onCreate }: { workId?: string; workList?: WorkItem[]; onClose: () => void; onCreate: (task: Omit<WorkTask, 'id' | 'stage' | 'progress' | 'timeMinutes'>) => void }) {
  const [workId, setWorkId] = useState(initialWorkId || workList[0]?.id || '');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const assignable = getAssignablePeople(runtimePeople);
  const [assigneeId, setAssigneeId] = useState(() => assignable[0]?.id || '');
  const [dueDate, setDueDate] = useState('2026-09-20');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState('240');

  useEffect(() => {
    if (!assigneeId && assignable.length > 0) setAssigneeId(assignable[0].id);
    if (!workId && workList.length > 0) setWorkId(workList[0].id);
  }, [assignable, assigneeId, workId, workList]);

  return (
    <Modal title="Assign task to team member" onClose={onClose}>
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
        <Field label="Task title" value={title} onChange={setTitle} placeholder="e.g. Mobile optimization & CSS" required />
        <Field label="Instructions" value={instructions} onChange={setInstructions} placeholder="What should the team member deliver?" />
        <div className="grid gap-3 sm:grid-cols-2">
          {assignable.length === 0 ? (
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
          <Button type="submit" disabled={!title.trim() || !assigneeId || !workId}>Assign task</Button>
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

function AttendancePage({ actor, people, tasks, leaves, sessions = [], onRefresh }: { actor: Person; people: Person[]; tasks: WorkTask[]; leaves: LeaveRequest[]; sessions?: SessionRecord[]; onRefresh?: () => void }) {
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
  const rows = filteredPeople.map((item) => { const sess = sessionsFor(item.id); const leave = leaveFor(item.id); const total = sess.reduce((sum, s) => sum + s.durationMinutes, 0); const open = sess.some((s) => !s.logoutAt); return { item, sessions: sess, leave, total, taskMinutes: taskMinutesFor(item), status: leave ? 'ON LEAVE' : sess.length === 0 ? 'NO LOGIN' : open ? 'ACTIVE' : 'PRESENT' }; });
  const totalSession = rows.reduce((sum, row) => sum + row.total, 0);
  const totalTask = rows.reduce((sum, row) => sum + row.taskMinutes, 0);
  const exportCsv = () => { const header = 'Date,Employee,Role,First Login,Last Logout,Total Session Time,Task Time,Attendance,Leave'; const body = rows.map((row) => `${selectedDate},${row.item.name},${row.item.role},${row.sessions[0]?.loginAt || ''},${row.sessions.at(-1)?.logoutAt || ''},${row.total},${row.taskMinutes},${row.status},${row.leave?.status || ''}`).join('\n'); const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `arka-attendance-${selectedDate}.csv`; link.click(); URL.revokeObjectURL(url); };
  const changePeriod = (value: string) => { setPeriod(value); if (value === 'Yesterday') setSelectedDate('2026-09-14'); else setSelectedDate(TODAY); };

  return (
    <>
      <SectionTitle
        eyebrow={actor.role === 'Founder' ? 'Founder attendance & work time' : actor.role === 'HR Manager' ? 'HR attendance & work time' : actor.role === 'Manager' ? 'My team attendance' : 'My attendance'}
        title={`Attendance — ${formatDate(selectedDate)}`}
        description="Session presence and task time are separate signals. Every visible employee remains in the table, including no-login and approved leave records."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigateDate(-1)} className="rounded-lg border border-[hsl(var(--input))] bg-white p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition"><ArrowLeft className="size-4" /></button>
            <button onClick={() => navigateDate(1)} className="rounded-lg border border-[hsl(var(--input))] bg-white p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition"><ArrowRight className="size-4" /></button>
            <select value={period} onChange={(event) => changePeriod(event.target.value)} className="rounded-lg border border-[hsl(var(--input))] bg-white px-3 py-2.5 text-sm font-semibold outline-none"><option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option><option>Custom date</option></select>
            {period === 'Custom date' && <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-lg border border-[hsl(var(--input))] bg-white px-3 py-2.5 text-sm outline-none" />}
            <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
            <Button variant="secondary" onClick={() => window.print()}>Print</Button>
          </div>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total employees" value={rows.length} detail="Complete visible scope" />
        <Metric label="Logged in" value={rows.filter((row) => row.sessions.length > 0).length} detail="Have a session record" />
        <Metric label="Not logged in" value={rows.filter((row) => row.sessions.length === 0 && !row.leave).length} detail="Still represented in table" />
        <Metric label="On leave" value={rows.filter((row) => row.leave).length} detail="Approved leave" tone="warning" />
        <Metric label="Session / task time" value={`${hours(totalSession)} / ${hours(totalTask)}`} detail="Separate measurements" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={roleFilter === 'All' ? 'primary' : 'secondary'} onClick={() => setRoleFilter('All')}>All</Button>
        <Button variant={roleFilter === 'Manager' ? 'primary' : 'secondary'} onClick={() => setRoleFilter('Manager')}>Managers</Button>
        <Button variant={roleFilter === 'Team member' ? 'primary' : 'secondary'} onClick={() => setRoleFilter('Team member')}>Team Members</Button>
        <Button variant={roleFilter === 'HR Manager' ? 'primary' : 'secondary'} onClick={() => setRoleFilter('HR Manager')}>HR</Button>
      </div>
      <Card>
        <div className="hidden grid-cols-[1.3fr_0.7fr_0.85fr_0.85fr_0.8fr_0.8fr_0.8fr] border-b border-[hsl(var(--border))] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))] md:grid">
          <span>Employee</span><span>Role</span><span>First login</span><span>Last logout</span><span>Session</span><span>Task time</span><span>Status</span>
        </div>
        {rows.map((row) => (
          <div key={row.item.id} className="border-b border-[hsl(var(--border))] last:border-0">
            <button onClick={() => setExpandedId(expandedId === row.item.id ? null : row.item.id)} className="grid w-full grid-cols-2 items-center gap-3 px-5 py-4 text-left hover:bg-[#fafaf8] md:grid-cols-[1.3fr_0.7fr_0.85fr_0.85fr_0.8fr_0.8fr_0.8fr]">
              <div>
                <div className="font-bold">{row.item.name}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{row.item.lastActiveAt}</div>
              </div>
              <span className="text-sm">{row.item.role}</span>
              <span className="text-sm">{row.leave ? '—' : formatTimestamp(row.sessions[0]?.loginAt)}</span>
              <span className="text-sm">{row.leave ? '—' : formatTimestamp(row.sessions.at(-1)?.logoutAt)}</span>
              <span className="text-sm">{row.leave ? '0h' : hours(row.total)}</span>
              <span className="text-sm">{hours(row.taskMinutes)}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={row.status === 'ON LEAVE' ? 'border-blue-200 bg-blue-50 text-blue-700' : row.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.status === 'NO LOGIN' ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                  {row.status}
                </Badge>
                {(actor.role === 'Founder' || actor.role === 'HR Manager') && row.status !== 'ON LEAVE' && (
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
              <AttendanceDetail item={row.item} sessions={row.sessions} tasks={tasks.filter((task) => task.assigneeId === row.item.id)} leave={row.leave} selectedDate={selectedDate} total={row.total} taskMinutes={row.taskMinutes} />
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No employees in this scope.</p>}
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
                reason: leaveModalReason.trim() || `Marked by ${actor.role} (Absent)`,
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
              options={['Casual', 'Sick', 'Personal', 'Other']}
            />
            <Field
              label="Reason"
              value={leaveModalReason}
              onChange={setLeaveModalReason}
              placeholder="e.g. Absent / Called in sick / Emergency"
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

function AttendanceDetail({ item, sessions, tasks, leave, selectedDate, total, taskMinutes }: { item: Person; sessions: SessionRecord[]; tasks: WorkTask[]; leave?: LeaveRequest; selectedDate: string; total: number; taskMinutes: number }) {
  return <div className="grid gap-5 border-t border-[hsl(var(--border))] bg-[#fafaf8] p-5 lg:grid-cols-[1fr_1fr_0.8fr]"><div><div className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">Session history</div><div className="mt-3 space-y-2">{sessions.length ? sessions.map((session) => <div key={session.id} className="rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-sm"><div className="flex justify-between gap-3 font-semibold"><span>{formatTimestamp(session.loginAt)} → {session.logoutAt ? formatTimestamp(session.logoutAt) : <span className="text-emerald-600 font-bold">Active</span>}</span><span>{hours(session.durationMinutes)}</span></div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{selectedDate}</div></div>) : <p className="text-sm text-[hsl(var(--muted-foreground))]">No login record for this date.</p>}</div><div className="mt-3 text-sm font-bold">Total session time: {hours(total)}</div></div><div><div className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">Task / work time</div><div className="mt-3 space-y-2">{tasks.length ? tasks.map((task) => <div key={task.id} className="rounded-xl border border-[hsl(var(--border))] bg-white p-3"><div className="text-sm font-semibold">{task.title}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{task.stage} · {hours(task.timeMinutes)}</div></div>) : <p className="text-sm text-[hsl(var(--muted-foreground))]">No task time recorded.</p>}</div><div className="mt-3 text-sm font-bold">Total task time: {hours(taskMinutes)}</div></div><div><div className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--primary))]">Daily summary</div><div className="mt-3 space-y-3"><Chain label="Employee" value={item.name} /><Chain label="Role" value={item.role} /><Chain label="Leave" value={leave ? `${leave.status} · ${leave.leaveType}` : '—'} /><Chain label="Last activity" value={item.lastActiveAt} /></div></div></div>;
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
            {dates.map((d) => { const daySessions = sessions.filter((s) => s.userId === p.id && s.date === d); const dayTotal = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0); weekTotal += dayTotal; const leave = leaves.find((l) => l.userId === p.id && isApprovedLeaveActiveOnDate(l, d)); const isWeekend = [0, 6].includes(new Date(`${d}T12:00:00`).getDay()); const isCurrent = d === TODAY; return <td key={d} onClick={() => onSelectDate(d)} className={`px-2 py-2 text-center cursor-pointer transition hover:bg-amber-50/60 ${isCurrent ? 'bg-amber-50/40' : ''}`}>{leave ? <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Leave</span> : dayTotal > 0 ? <div><div className="text-sm font-black">{hours(dayTotal)}</div><div className="mt-1 space-y-0.5">{daySessions.map((s) => <div key={s.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">{formatTimestamp(s.loginAt)} → {s.logoutAt ? formatTimestamp(s.logoutAt) : <span className="text-emerald-600 font-bold">Active</span>}</div>)}</div></div> : isWeekend ? <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Weekend</span> : <span className="text-[10px] font-bold text-red-400">No Login</span>}</td>; })}
            <td className="px-4 py-3 text-center"><div className="text-lg font-black text-[hsl(var(--primary))]">{hours(weekTotal)}</div><div className="text-[10px] text-[hsl(var(--muted-foreground))]">{Math.round(weekTotal / 60 * 10) / 10} hrs</div></td>
          </tr>; })}
        </tbody>
      </table>
    </div>
  </Card>;
}

function LeavePage({ actor, people, leaves, onApply, onDecision, onRefresh }: { actor: Person; people: Person[]; leaves: LeaveRequest[]; onApply: (data: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'approvedBy' | 'createdAt'>) => void; onDecision: (id: string, status: LeaveStatus) => void; onRefresh?: () => void }) {
  const [open, setOpen] = useState(false);
  const [founderRecordOpen, setFounderRecordOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState(() => people.find(p => p.role !== 'Founder')?.id || people[0]?.id || '');
  const [founderLeaveType, setFounderLeaveType] = useState<LeaveType>('Casual');
  const [founderStartDate, setFounderStartDate] = useState(TODAY);
  const [founderEndDate, setFounderEndDate] = useState(TODAY);
  const [founderReason, setFounderReason] = useState('Approved by Founder');
  const [founderNote, setFounderNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const visiblePeople = getVisiblePeopleForRole(actor, people);
  const visible = leaves.filter((leave) => visiblePeople.some((item) => item.id === leave.userId));
  const pending = visible.filter((leave) => leave.status === 'Pending').length;

  const isManagement = actor.role === 'Founder' || actor.role === 'HR Manager';

  return (
    <>
      <SectionTitle
        eyebrow={isManagement ? 'Leave management' : actor.role === 'Manager' ? 'Team leave' : 'My leave'}
        title={isManagement ? 'Leave applications' : actor.role === 'Manager' ? 'Team leave' : 'My leave'}
        description={isManagement ? 'Approve or reject leave while keeping approved dates visible as On leave in attendance.' : actor.role === 'Manager' ? 'Plan your team around approved and pending leave. You can also apply for your own leave.' : 'Apply for leave and track pending, approved, rejected, and past requests.'}
        action={
          isManagement ? (
            <Button onClick={() => setFounderRecordOpen(true)}><Plus className="size-4" />Record Employee Leave</Button>
          ) : (
            <Button onClick={() => setOpen(true)}><Plus className="size-4" />Apply for leave</Button>
          )
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Pending" value={pending} detail={isManagement ? "Awaiting decision" : "Awaiting Founder decision"} tone={pending ? 'warning' : 'default'} />
        <Metric label="Approved" value={visible.filter((leave) => leave.status === 'Approved').length} detail="Recognized by attendance" tone="success" />
        <Metric label="Upcoming" value={visible.filter((leave) => leave.startDate > TODAY && leave.status === 'Approved').length} detail="Approved future leave" />
      </div>
      <Card>
        {visible.map((leave) => {
          const employee = person(leave.userId);
          return (
            <div key={leave.id} className="flex flex-wrap items-center gap-4 border-b border-[hsl(var(--border))] px-5 py-5 last:border-0">
              <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <CalendarDays className="size-5" />
              </div>
              <div className="min-w-[200px] flex-1">
                <div className="font-bold">{employee.name}</div>
                <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {employee.role} · {leave.leaveType} · {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                </div>
              </div>
              <div className="min-w-[180px] flex-1 text-sm text-[hsl(var(--muted-foreground))]">{leave.reason}</div>
              <Badge className={leave.status === 'Approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : leave.status === 'Rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                {leave.status}
              </Badge>
              {(isManagement || (actor.role === 'Manager' && person(leave.userId).managerId === actor.id)) && leave.status === 'Pending' && (
                <div className="flex gap-2">
                  <Button onClick={() => onDecision(leave.id, 'Approved')}><Check className="size-4" />Approve</Button>
                  <Button variant="secondary" onClick={() => onDecision(leave.id, 'Rejected')}>Reject</Button>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && <p className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No leave applications in this scope.</p>}
      </Card>
      {open && <LeaveModal onClose={() => setOpen(false)} onCreate={(data) => { onApply(data); setOpen(false); }} />}

      {founderRecordOpen && (
        <Modal title={`Record Employee Leave (${actor.role === 'Founder' ? 'Founder' : 'HR'} Approved)`} onClose={() => setFounderRecordOpen(false)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsSaving(true);
            try {
              await apiPost('/leaves', {
                userId: targetUserId,
                leaveType: founderLeaveType,
                startDate: founderStartDate,
                endDate: founderEndDate,
                reason: founderReason.trim() || `Approved by ${actor.role}`,
                note: founderNote.trim() || null,
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
              label="Leave type"
              value={founderLeaveType}
              onChange={(value) => setFounderLeaveType(value as LeaveType)}
              options={['Casual', 'Sick', 'Personal', 'Other']}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start date" type="date" value={founderStartDate} onChange={setFounderStartDate} required />
              <Field label="End date" type="date" value={founderEndDate} onChange={setFounderEndDate} required />
            </div>
            <Field label="Reason" value={founderReason} onChange={setFounderReason} placeholder="e.g. Absent / Vacation / Personal" required />
            <Field label="Optional note" value={founderNote} onChange={setFounderNote} placeholder="Additional notes or context" />
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setFounderRecordOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving || !founderReason.trim()}>
                {isSaving ? 'Saving...' : 'Record Approved Leave'}
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
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual'); const [startDate, setStartDate] = useState(TODAY); const [endDate, setEndDate] = useState(TODAY); const [reason, setReason] = useState(''); const [note, setNote] = useState('');
  return <Modal title="Apply for leave" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onCreate({ leaveType, startDate, endDate, reason, note }); }} className="space-y-4"><SelectField label="Leave type" value={leaveType} onChange={(value) => setLeaveType(value as LeaveType)} options={['Casual', 'Sick', 'Personal', 'Other']} /><div className="grid gap-3 sm:grid-cols-2"><Field label="Start date" type="date" value={startDate} onChange={setStartDate} required /><Field label="End date" type="date" value={endDate} onChange={setEndDate} required /></div><Field label="Reason" value={reason} onChange={setReason} placeholder="Why are you requesting leave?" required /><Field label="Optional note" value={note} onChange={setNote} placeholder="Additional context" /><div className="flex justify-end gap-2 pt-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!reason.trim()}>Submit leave request</Button></div></form></Modal>;
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
  const [createOpen, setCreateOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem('arka_presence_timer');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.expiresAt) {
          const diff = Math.ceil((parsed.expiresAt - Date.now()) / 1000);
          return diff > 0 ? diff : 0;
        }
      }
    } catch {}
    return null;
  });

  const refresh = useCallback(() => {
    return hydrateFromApi(setDirectory, setWork, setTasks, setActivities, setComments, setReports, setLeaves, setSessions);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 5000);
    const heartbeatTimer = setInterval(() => { if (signedIn) apiPost('/auth/heartbeat', {}).catch(() => {}); }, 25000);
    return () => { clearInterval(timer); clearInterval(heartbeatTimer); };
  }, [signedIn, refresh]);

  runtimePeople = directory;
  const actor = person(actorId) || directory[0] || initialPeople[0];
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
        return task.assigneeId === actor.id || assignee.managerId === actor.id;
      });
    }
    // Team member strictly only sees tasks assigned to themselves
    return tasks.filter((task) => task.assigneeId === actor.id);
  }, [actor, tasks]);

  const updatePresence = async (presence: Presence, isAuto = false) => {
    if (!actor) return;
    try {
      const prevPresence = actor.presence;

      if (presence === 'Break') {
        const expiresAt = Date.now() + 15 * 60 * 1000;
        localStorage.setItem('arka_presence_timer', JSON.stringify({ userId: actor.id, presence: 'Break', expiresAt }));
        setTimerSecondsRemaining(15 * 60);
        await apiPost('/activities', { workId: 'system', actorId: actor.id, message: 'started a 15-minute Break', tone: 'warning' });
      } else if (presence === 'Lunch') {
        const expiresAt = Date.now() + 60 * 60 * 1000;
        localStorage.setItem('arka_presence_timer', JSON.stringify({ userId: actor.id, presence: 'Lunch', expiresAt }));
        setTimerSecondsRemaining(60 * 60);
        await apiPost('/activities', { workId: 'system', actorId: actor.id, message: 'started a 1-hour Lunch', tone: 'warning' });
      } else {
        localStorage.removeItem('arka_presence_timer');
        setTimerSecondsRemaining(null);

        if (prevPresence === 'Break' || prevPresence === 'Lunch') {
          const reason = isAuto ? `automatically returned from ${prevPresence}` : `returned early from ${prevPresence}`;
          await apiPost('/activities', { workId: 'system', actorId: actor.id, message: reason, tone: 'success' });
        }
      }

      const res = await apiPatch<{item: Person}>(`/people/${actor.id}/presence`, { presence });
      setDirectory((all) => all.map(p => p.id === actor.id ? { ...p, presence } : p));
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
            const durationMs = actor.presence === 'Break' ? 15 * 60 * 1000 : 60 * 60 * 1000;
            expiresAt = Date.now() + durationMs;
            localStorage.setItem('arka_presence_timer', JSON.stringify({ userId: actor.id, presence: actor.presence, expiresAt }));
          }
        } catch {
          const durationMs = actor.presence === 'Break' ? 15 * 60 * 1000 : 60 * 60 * 1000;
          expiresAt = Date.now() + durationMs;
          localStorage.setItem('arka_presence_timer', JSON.stringify({ userId: actor.id, presence: actor.presence, expiresAt }));
        }
      } else {
        const durationMs = actor.presence === 'Break' ? 15 * 60 * 1000 : 60 * 60 * 1000;
        expiresAt = Date.now() + durationMs;
        localStorage.setItem('arka_presence_timer', JSON.stringify({ userId: actor.id, presence: actor.presence, expiresAt }));
      }

      const tick = () => {
        const diff = Math.ceil((expiresAt - Date.now()) / 1000);
        if (diff <= 0) {
          setTimerSecondsRemaining(0);
          localStorage.removeItem('arka_presence_timer');
          updatePresence('Online', true);
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
  }, [signedIn, actor?.id, actor?.presence]);
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
  const createWork = async (data: { title: string; description: string; client: string; workType: WorkType; priority: Priority; dueDate: string; assigneeId: string }) => { 
    const assignee = person(data.assigneeId); 
    try {
      const workRes = await apiPost<{item: WorkItem}>('/work', {
        title: data.title, description: data.description || 'New operational work assigned from the command center.', client: data.client || undefined, workType: data.workType, priority: data.priority, dueDate: data.dueDate, founderId: actor.id, managerId: assignee.role === 'Manager' ? assignee.id : assignee.managerId, directAssigneeId: assignee.role === 'Team member' ? assignee.id : undefined, stage: assignee.role === 'Manager' ? 'Planning' : 'Assigned', progress: 5, createdAt: TODAY
      });
      setWork((all) => [workRes.item, ...all]); 
      
      if (assignee.role === 'Team member') {
        const taskRes = await apiPost<{item: WorkTask}>('/tasks', {
          workId: workRes.item.id, title: data.title, instructions: data.description || 'Complete the assigned work and submit it for review.', assigneeId: assignee.id, dueDate: data.dueDate, priority: data.priority, stage: 'Assigned', progress: 0, timeMinutes: 0, estimatedMinutes: 240
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
        .catch(() => {
          setStoredToken(null);
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
      onLogout={async () => { try { await apiPost('/auth/logout', {}); } catch(e){} setStoredToken(null); localStorage.removeItem('arka_presence_timer'); setSignedIn(false); setLocation('/'); }}
      onUpdatePresence={updatePresence}
      timerSecondsRemaining={timerSecondsRemaining}
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
    </Shell>
  );

  const page = location === '/people' ? (
    <PeoplePage actor={actor} people={runtimePeople} onAdd={addPerson} onUpdatePassword={updatePersonPassword} onUpdateRole={updatePersonRole} onDeletePerson={deletePerson} />
  ) : location === '/attendance' ? (
    <AttendancePage actor={actor} people={runtimePeople} tasks={scopeTasks} leaves={leaves} sessions={sessions} onRefresh={refresh} />
  ) : location === '/leave' ? (
    <LeavePage actor={actor} people={runtimePeople} leaves={leaves} onApply={addLeave} onDecision={updateLeave} onRefresh={refresh} />
  ) : location === '/team' ? (
    <TeamPage actor={actor} work={scopeWork} tasks={scopeTasks} onOpen={openWork} />
  ) : location === '/reports' ? (
    <ReportsPage actor={actor} reports={reports} work={scopeWork} onSubmit={submitReport} onReview={(id, status) => setReports((all) => all.map((report) => report.id === id ? { ...report, status } : report))} />
  ) : location === '/approvals' || location === '/reviews' ? (
    <ApprovalsPage tasks={scopeTasks} work={scopeWork} onOpen={openWork} />
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
    <WorkListPage title={location === '/today' ? "Today's work" : location === '/submissions' ? 'My submissions' : location === '/my-work' ? 'My work' : location.slice(1)} description="Your focused execution view. Open a work item to start, update, block, or submit it." work={scopeWork} tasks={scopeTasks.filter((task) => location !== '/submissions' || task.stage === 'Review' || task.stage === 'Approved')} onOpen={openWork} />
  ) : (
    <Dashboard actor={actor} work={scopeWork} tasks={scopeTasks} peopleInScope={scopePeople} reports={reports} leaves={leaves} onDecision={updateLeave} onOpen={openWork} onCreate={actor.role === 'Founder' ? () => setCreateOpen(true) : actor.role === 'Manager' ? () => setTaskModalOpen(true) : () => {}} onNavigate={setLocation} onDeletePerson={actor.role === 'Founder' ? deletePerson : undefined} />
  );

  return (
    <Shell
      actor={actor}
      onLogout={async () => { try { await apiPost('/auth/logout', {}); } catch(e){} setStoredToken(null); localStorage.removeItem('arka_presence_timer'); setSignedIn(false); setLocation('/'); }}
      onUpdatePresence={updatePresence}
      timerSecondsRemaining={timerSecondsRemaining}
      allPeople={runtimePeople}
    >
      {page}
      {createOpen && <AssignWorkModal onClose={() => setCreateOpen(false)} onCreate={createWork} />}
      {taskModalOpen && (
        <CreateTaskModal
          workList={scopeWork.length > 0 ? scopeWork : work}
          onClose={() => setTaskModalOpen(false)}
          onCreate={addTask}
        />
      )}
    </Shell>
  );
}

function App() {
  return <ErrorBoundary><QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter><AppRouter /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider></ErrorBoundary>;
}

export default App;