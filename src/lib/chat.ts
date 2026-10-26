// Chat rooms: which rooms a person sees. The database decides the real access (chat_can_read / chat_can_post); this only builds the list.
export type Department = { id: string; name: string; blurb: string; status: "active" | "archived"; members: number };
import type { Admin } from "./permissions";
import type { Application } from "./types";

export type Msg = { id: string; room: string; who: string; label: string; staff: boolean; at: string; text: string; reported?: boolean; deleted?: boolean; mine?: boolean };
export type Room = { id: string; name: string; blurb: string; group: "Everyone" | "Departments" | "Staff" | "Help"; canPost: boolean; canModerate: boolean };

export const ROOM_GENERAL = "general";
export const ROOM_HEADS = "heads";
export const supportRoom = (appId: string) => `support:${appId}`;
export const deptRoom = (id: string) => `dept:${id}`;


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
