"use client";
import { GuidesProto } from "./GuidesProto";
import { GuidesReal } from "./GuidesReal";
import { useLive } from "@/lib/live";

export default function Guides() { return useLive() ? <GuidesReal /> : <GuidesProto />; }
