import { redirect } from "next/navigation";

// The image guide now lives in the admin area (Admin > Site images). This old address just forwards there.
export default function ImageSlots() { redirect("/admin/images"); }
