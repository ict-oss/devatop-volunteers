import { sql } from "drizzle-orm";
import { z } from "zod";
import { AppError, guard, rowsOf, type Db } from "./db";

/**
 * Chat rooms. Who may read, post and moderate each room is decided by the database (chat_can_read/post/moderate), never by this code:
 * the room list below only ASKS the database. No contact details in group rooms is a database rule too.
 */
export type ChatMsg = { id: string; room: string; who: string; label: string; staff: boolean; at: string; text: string; reported: boolean; deleted: boolean; mine: boolean };
export type ChatRoom = { id: string; name: string; blurb: string; group: "Everyone" | "Departments" | "Staff" | "Help"; canPost: boolean; canModerate: boolean };

const flags = async (db: Db, room: string) => rowsOf<{ r: boolean; p: boolean; m: boolean }>(await db.execute(sql`select public.chat_can_read(${room}) as r, public.chat_can_post(${room}) as p, public.chat_can_moderate(${room}) as m`))[0];

/** The rooms this person can open, found by asking the database about each candidate. */
export async function myRooms(db: Db, userId: string): Promise<ChatRoom[]> {
  const rooms: ChatRoom[] = [];
  const add = async (id: string, name: string, blurb: string, group: ChatRoom["group"]) => { const f = await flags(db, id); if (f.r) rooms.push({ id, name, blurb, group, canPost: f.p, canModerate: f.m }); };
  await add("general", "All volunteers", "The whole movement, in one room", "Everyone");
  for (const d of rowsOf<{ id: string; name: string; description: string | null }>(await db.execute(sql`select id, name, description from departments where status = 'active' order by sort_order, name`)))
    await add(`dept:${d.id}`, d.name, d.description ?? "", "Departments");
  await add("heads", "Department heads", "Staff and leads only: priorities and cross-department coordination", "Staff");
  // staff are the other end of Support threads, so they do not get a thread of their own
  const staff = rowsOf<{ a: boolean }>(await db.execute(sql`select public.is_admin() as a`))[0]?.a;
  if (!staff) await add(`support:${userId}`, "Support", "Something wrong? Private, only you and the Devatop team", "Help");
  // moderators also see every volunteer's support thread (the database only lets them read them)
  for (const t of rowsOf<{ room: string; who: string }>(await db.execute(sql`select distinct on (room) room, author_name as who from chat_messages where room like 'support:%' and not author_staff and room <> ${`support:${userId}`} order by room, created_at`)))
    await add(t.room, `Support · ${t.who}`, "Private thread with one volunteer", "Help");
  return rooms;
}

const view = (r: Record<string, unknown>, me: string): ChatMsg => ({
  id: String(r.id), room: String(r.room), who: String(r.author_name), label: r.author_staff ? "Staff" : "Volunteer", staff: !!r.author_staff,
  at: new Date(r.created_at as string).toISOString(), text: r.deleted_at ? "" : String(r.body), reported: !!r.reported, deleted: !!r.deleted_at, mine: r.author_id === me,
});
export async function roomMessages(db: Db, userId: string, room: string, limit = 200): Promise<ChatMsg[]> {
  const rows = rowsOf<Record<string, unknown>>(await db.execute(sql`select id, room, author_id, author_name, author_staff, body, reported, deleted_at, created_at from (
    select * from chat_messages where room = ${room} order by created_at desc, id desc limit ${limit}) x order by created_at, id`));
  return rows.map((r) => view(r, userId));
}
export async function reportedMessages(db: Db, userId: string): Promise<ChatMsg[]> {
  return rowsOf<Record<string, unknown>>(await db.execute(sql`select id, room, author_id, author_name, author_staff, body, reported, deleted_at, created_at from chat_messages
    where reported and deleted_at is null and public.chat_can_moderate(room) order by created_at desc limit 100`)).map((r) => view(r, userId));
}

export const messageSchema = z.object({ room: z.string().min(1).max(80), body: z.string().trim().min(1, "Write a message.").max(1000, "Keep it under 1000 characters.") });
export async function postMessage(db: Db, userId: string, room: string, body: string): Promise<void> {
  const p = messageSchema.parse({ room, body });
  try { await db.execute(sql`insert into chat_messages (room, author_id, body) values (${p.room}, ${userId}::uuid, ${p.body})`); }
  catch (e) {
    const m = ((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message) || "";
    if (/no_contact_details_in_group_rooms/.test(m)) throw new AppError("contact_details", "Please don't share phone numbers or emails in group rooms. Use Support for anything private.");
    if (/row-level security|permission denied/i.test(m)) throw new AppError("forbidden", "You cannot post in this room.");
    throw e;
  }
}
const touch = async (db: Db, q: ReturnType<typeof sql>, msg: string) => { const r = await guard(async () => rowsOf(await db.execute(q))); if (r.length === 0) throw new AppError("not_found", msg); };
export const reportMessage = (db: Db, id: string) => touch(db, sql`update chat_messages set reported = true where id = ${id}::uuid and deleted_at is null returning id`, "We could not find that message.");
export const dismissReport = (db: Db, id: string) => touch(db, sql`update chat_messages set reported = false where id = ${id}::uuid returning id`, "We could not find that message, or you may not moderate it.");
export const removeMessage = (db: Db, id: string) => touch(db, sql`update chat_messages set deleted_at = now() where id = ${id}::uuid and deleted_at is null returning id`, "We could not find that message, or you may not remove it.");
