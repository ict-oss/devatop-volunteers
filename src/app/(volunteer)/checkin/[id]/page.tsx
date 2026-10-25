"use client";
import { CheckInProto } from "./CheckInProto";
import { CheckInReal } from "./CheckInReal";
import { useLive } from "@/lib/live";

export default function CheckIn() {
  const live = useLive();
  return live ? <CheckInReal /> : <CheckInProto />;
}
