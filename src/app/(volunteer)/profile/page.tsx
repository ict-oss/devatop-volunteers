"use client";
import { ProfileProto } from "./ProfileProto";
import { ProfileReal } from "./ProfileReal";
import { useLive } from "@/lib/live";

export default function Profile() { return useLive() ? <ProfileReal /> : <ProfileProto />; }
