const API_BASE = "http://localhost:3000/api";

export interface CourseInfo {
  _id: string;
  subject: string;
  courseNumber: string;
  title: string;
  creditHours: { low: number; high: number };
  description?: string;
  college?: string;
  department?: string;
}

export interface MeetingTime {
  weekDays: ("M" | "T" | "W" | "R" | "F" | "S" | "U")[];
  startTime: string;
  endTime: string;
  meetingType: { code: string; description: string };
  buildingDescription?: string;
  room?: string;
}

export interface Section {
  _id: string;
  courseId: CourseInfo;
  crn: string;
  sectionNumber: string;
  termCode: string;
  subject: string;
  courseNumber: string;
  courseTitle: string;
  creditHours: number;
  scheduleType: { code: string; description: string };
  instructor: string;
  meetingTimes: MeetingTime[];
  enrollmentMax: number;
  enrollmentCurrent: number;
  waitlistTotal: number;
  waitlistRemaining: number;
  status: "Open" | "Closed" | "Waitlisted";
  campus?: string;
  requirementDesignation?: string;
  linkIdentifier?: string | null;
}

export interface Requirement {
  _id: string;
  code: string;
  description: string;
}

export interface PrerequisiteOption {
  course: { _id: string; subject: string; courseNumber: string; title: string } | null;
  minGrade: string;
  concurrentAllowed: boolean;
}

export interface PrerequisiteGroup {
  logicGroup: string;
  options: PrerequisiteOption[];
}

export interface PrerequisiteResponse {
  courseId: string;
  groups: PrerequisiteGroup[];
}

export interface GeneratedScheduleGroup {
  courseId: string;
  subject: string;
  courseNumber: string;
  title: string;
  creditHours: { low: number; high: number };
  sections: (Section & { blocks: { day: string; start: number; end: number }[] })[];
}

export interface GeneratedSchedule {
  totalUnits: number;
  totalClassMinutes: number;
  earliestStart: string;
  latestEnd: string;
  activeDays: string[];
  daysOff: string[];
  totalGapMinutes: number;
  groups: GeneratedScheduleGroup[];
}

export interface SavedSchedule {
  _id: string;
  userId: string;
  name: string;
  termCode: string;
  sectionIds: Section[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisReport {
  totalUnits: number;
  totalClassMinutes: number;
  earliestStart: string;
  latestEnd: string;
  activeDays: string[];
  daysOff: string[];
  totalGapMinutes: number;
  conflicts: {
    sectionA: string;
    sectionB: string;
    day: string;
    overlapStart: string;
    overlapEnd: string;
  }[];
}

// Fetch helper injecting auth header
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/settings";
    }
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `API error: ${res.status}`);
  }

  // Handle stream responses
  if (res.headers.get("Content-Type")?.includes("text/calendar")) {
    return res.text();
  }

  return res.json();
}

export const api = {
  // Authentication
  register: (body: any) => fetchApi("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: any) => fetchApi("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  // Catalog
  getCourses: (params: { page?: number; limit?: number; search?: string; subject?: string }) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.search) query.append("search", params.search);
    if (params.subject && params.subject !== "all") query.append("subject", params.subject);
    return fetchApi(`/courses?${query.toString()}`);
  },
  getCourseDetails: (id: string) => fetchApi(`/courses/${id}`),
  getCoursePrereqs: (id: string): Promise<PrerequisiteResponse> => fetchApi(`/courses/${id}/prerequisites`),
  getRequirements: (): Promise<Requirement[]> => fetchApi("/requirements"),
  
  getSectionsByCourse: (courseId: string, termCode?: string): Promise<Section[]> => {
    const query = termCode ? `?termCode=${termCode}` : "";
    return fetchApi(`/sections/course/${courseId}${query}`);
  },
  getSectionByCrn: (crn: string, termCode: string): Promise<Section> => 
    fetchApi(`/sections/crn/${crn}?termCode=${termCode}`),
  getSectionById: (id: string): Promise<Section> => fetchApi(`/sections/${id}`),
  getLinkedSections: (id: string): Promise<{ linkIdentifier: string | null; linkedSections: Section[] }> => 
    fetchApi(`/sections/${id}/linked`),

  // Admin Data Sync
  syncBanner: (body: { termCode: string; subjects?: string[] }, adminApiKey: string) => 
    fetchApi("/sync", {
      method: "POST",
      headers: { "intake_api_key": adminApiKey },
      body: JSON.stringify(body)
    }),
  bulkIntake: (body: { courses: any[]; sections: any[] }, adminApiKey: string) => 
    fetchApi("/intake", {
      method: "POST",
      headers: { "intake_api_key": adminApiKey },
      body: JSON.stringify(body)
    }),

  // Combinatorics Generation
  generateSchedules: (body: { courseIds: string[]; termCode: string; lockedSectionIds?: string[] }): Promise<{ total: number; schedules: GeneratedSchedule[] }> => 
    fetchApi("/generate", { method: "POST", body: JSON.stringify(body) }),
  generateNearMissSchedules: (body: { courseIds: string[]; termCode: string; lockedSectionIds?: string[] }): Promise<{ total: number; schedules: GeneratedSchedule[] }> => 
    fetchApi("/generate/invalid", { method: "POST", body: JSON.stringify(body) }),

  // User Saved Schedules CRUD
  createSchedule: (body: { name: string; termCode: string; sectionIds: string[] }): Promise<SavedSchedule> => 
    fetchApi("/schedules", { method: "POST", body: JSON.stringify(body) }),
  getSchedules: (termCode?: string): Promise<SavedSchedule[]> => {
    const query = termCode ? `?termCode=${termCode}` : "";
    return fetchApi(`/schedules${query}`);
  },
  getScheduleById: (id: string): Promise<SavedSchedule> => fetchApi(`/schedules/${id}`),
  updateSchedule: (id: string, body: { name?: string; sectionIds?: string[] }): Promise<SavedSchedule> => 
    fetchApi(`/schedules/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSchedule: (id: string): Promise<{ message: string }> => 
    fetchApi(`/schedules/${id}`, { method: "DELETE" }),
  analyzeSchedule: (id: string): Promise<AnalysisReport> => fetchApi(`/schedules/${id}/analyze`),
  getIcsExportUrl: (scheduleId: string, options: any = {}) => {
    const jsonStr = JSON.stringify(options);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return `${API_BASE}/schedules/${scheduleId}/export.ics?options=${b64}`;
  }
};
