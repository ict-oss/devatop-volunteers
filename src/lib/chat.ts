// Chat rooms. PROTOTYPE persistence (localStorage, live across tabs via the storage event).
// Production: Supabase Realtime on a `chat_messages` table, with row-level security that mirrors the access rules below.
import type { Department } from "./data";
import type { Admin } from "./permissions";
import type { Application } from "./store";

export type Msg = { id: string; room: string; who: string; label: string; staff: boolean; at: string; text: string; reported?: boolean; deleted?: boolean; mine?: boolean };
export type Room = { id: string; name: string; blurb: string; group: "Everyone" | "Departments" | "Staff" | "Help"; canPost: boolean; canModerate: boolean };

export const ROOM_GENERAL = "general";
export const ROOM_HEADS = "heads";
export const supportRoom = (appId: string) => `support:${appId}`;
export const deptRoom = (id: string) => `dept:${id}`;

const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
export const SEED_CHAT: Msg[] = [
  { id: "c1", room: ROOM_GENERAL, who: "Devatop Team", label: "Staff", staff: true, at: ago(2880), text: "Welcome to the volunteers room. Be kind, stay on topic, and never share phone numbers or emails here. Use Support for anything private." },
  { id: "c2", room: ROOM_GENERAL, who: "Hadiza M.", label: "Volunteer", staff: false, at: ago(300), text: "Anyone going to the Enugu youth summit on the 28th?" },
  { id: "c3", room: ROOM_GENERAL, who: "Tunde A.", label: "Volunteer", staff: false, at: ago(240), text: "Yes, signed up as event crew. See you there." },
  { id: "c4", room: deptRoom("comms"), who: "Devatop Team", label: "Staff", staff: true, at: ago(1500), text: "Communications and Media: post your drafts here for a quick review before they go on the page." },
  { id: "c5", room: deptRoom("comms"), who: "Funke B.", label: "Volunteer", staff: false, at: ago(120), text: "Draft thread on the AI4Rights school sessions is ready. Who can proofread?" },
  { id: "c6", room: deptRoom("ai4rights"), who: "Devatop Team", label: "Staff", staff: true, at: ago(1400), text: "AI4Rights facilitators: the new session script is in Guides. Questions go here." },
  { id: "c7", room: ROOM_HEADS, who: "Olukayode I.", label: "Super Admin", staff: true, at: ago(900), text: "Department leads: please send your top three priorities for November by Friday." },
  { id: "c8", room: ROOM_HEADS, who: "ICT Dept Lead", label: "Department Lead", staff: true, at: ago(600), text: "ICT needs two more volunteers for the digital safety sessions. Can Comms share the call?" },
];

export const shortName = (first: string, last: string) => `${first} ${last.charAt(0)}.`;

/** Volunteers see: the general room, rooms for their own departments, and their own private support thread. */
export function volunteerRooms(me: Application, depts: Department[]): Room[] {
  const mine = depts.filter((d) => d.status === "active" && me.departments.includes(d.id));
  return [
    { id: ROOM_GENERAL, name: "All volunteers", blurb: "The whole movement, in one room", group: "Everyone", canPost: true, canModerate: false },
    ...mine.map((d): Room => ({ id: deptRoom(d.id), name: d.name, blurb: d.blurb, group: "Departments", canPost: true, canModerate: false })),
    { id: supportRoom(me.id), name: "Support", blurb: "Something wrong? Private, only you and the Devatop team", group: "Help", canPost: true, canModerate: false },
  ];
}

/** Admins: roles decide what they see. A Department Lead sees only their own department room; viewers can read but not post. */
export function adminRooms(admin: Admin, depts: Department[], supportThreads: { id: string; name: string }[]): Room[] {
  const post = admin.role !== "viewer";
  const modAll = admin.role === "super" || admin.role === "programme" || admin.role === "coordinator";
  const rooms: Room[] = [{ id: ROOM_GENERAL, name: "All volunteers", blurb: "The whole movement, in one room", group: "Everyone", canPost: post, canModerate: modAll }];
  const active = depts.filter((d) => d.status === "active");
  const visible = modAll ? active : admin.role === "department" ? active.filter((d) => d.id === admin.scope) : [];
  visible.forEach((d) => rooms.push({ id: deptRoom(d.id), name: d.name, blurb: d.blurb, group: "Departments", canPost: post, canModerate: modAll || admin.scope === d.id }));
  if (admin.role !== "viewer") rooms.push({ id: ROOM_HEADS, name: "Department heads", blurb: "Staff and leads only: priorities and cross-department coordination", group: "Staff", canPost: true, canModerate: modAll });
  if (modAll) supportThreads.forEach((t) => rooms.push({ id: t.id, name: `Support · ${t.name}`, blurb: "Private thread with one volunteer", group: "Help", canPost: true, canModerate: true }));
  return rooms;
}

// Safeguarding: no personal contact details in group rooms (volunteers only; staff may share work contacts).
export const hasContactInfo = (t: string) => /(\+?\d[\d\s-]{8,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)/.test(t);
