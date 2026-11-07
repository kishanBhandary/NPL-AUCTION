"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { Trophy, Upload, Shield, ArrowRight, Loader2, Star, Lock, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PlayerPosition } from "@/types";

export default function JoinRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [room, setRoom] = useState<{
    id: string;
    title: string;
    roomCode: string;
    startingPurse: number;
    status: string;
  } | null>(null);

  const [loadingRoom, setLoadingRoom] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Franchise info
  const [teamName, setTeamName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState("");
  const [uploadingOwnerPhoto, setUploadingOwnerPhoto] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // 1 Main Fixed Player Info
  const [mainPlayerName, setMainPlayerName] = useState("");
  const [mainPlayerPos, setMainPlayerPos] = useState<PlayerPosition>("ATTACKER");
  const [mainPlayerPhotoUrl, setMainPlayerPhotoUrl] = useState("");
  const [uploadingPlayerPhoto, setUploadingPlayerPhoto] = useState(false);

  useEffect(() => {
    fetch(`/api/rooms/${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.room) {
          setRoom(data.room);
        } else {
          setError(data.error || "Room not found");
        }
      })
      .catch(() => setError("Failed to fetch room"))
      .finally(() => setLoadingRoom(false));
  }, [code]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "team_logos");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setLogoUrl(data.url);
      } else {
        setError(data.error || "Failed to upload team logo");
      }
    } catch {
      setError("Failed to upload team logo to Cloudinary");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleOwnerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingOwnerPhoto(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "owner_photos");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setOwnerPhotoUrl(data.url);
      } else {
        setError(data.error || "Failed to upload owner photo");
      }
    } catch {
      setError("Failed to upload owner photo to Cloudinary");
    } finally {
      setUploadingOwnerPhoto(false);
      e.target.value = "";
    }
  };

  const handlePlayerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPlayerPhoto(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "main_players");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setMainPlayerPhotoUrl(data.url);
      } else {
        setError(data.error || "Failed to upload main player photo");
      }
    } catch {
      setError("Failed to upload main player photo to Cloudinary");
    } finally {
      setUploadingPlayerPhoto(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !ownerName || !email) {
      setError("Team name, owner name and email are required");
      return;
    }

    if (!mainPlayerName.trim()) {
      setError("Please designate 1 Main Fixed Player for your franchise");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: teamName.trim(),
          teamCode: teamName.trim().slice(0, 3).toUpperCase(),
          ownerName: ownerName.trim(),
          ownerPhotoUrl: ownerPhotoUrl || null,
          email: email.trim(),
          password,
          logoUrl: logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(teamName.trim())}`,
          mainPlayerName: mainPlayerName.trim(),
          mainPlayerPosition: mainPlayerPos,
          mainPlayerPhotoUrl: mainPlayerPhotoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(mainPlayerName.trim())}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to register team");
      } else {
        router.push(`/room/${code}/waiting`);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRoom) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm">Connecting to {code}...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* 1. CINEMATIC VOLLEYBALL STADIUM ARENA BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/images/npl-dashboard-bg.jpg"
          alt="Volleyball Arena Stadium"
          fill
          priority
          className="object-cover object-center opacity-25 brightness-80 contrast-125 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/95 via-[#070b18]/85 to-[#060913]/98" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_rgba(4,7,16,0.95)_85%)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar roomCode={code} roomTitle={room?.title} roomStatus={room?.status} />

        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
          {/* Header Hero Banner */}
          <div className="relative rounded-2xl border border-amber-500/30 bg-[#090e1e]/95 p-5 sm:p-6 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
            <div className="absolute inset-0 pointer-events-none z-0">
              <Image
                src="/images/npl-hero-banner.jpg"
                alt="Stadium Hero Banner"
                fill
                priority
                className="object-cover object-right sm:object-center opacity-60 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070c1a] via-[#070c1a]/85 to-transparent sm:w-2/3" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070c1a]/80 via-transparent to-transparent" />
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-2">
                <Trophy className="h-3 w-3 text-amber-400" />
                <span>Franchise Registration • Room {code}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow">
                Register Your Franchise
              </h1>
              <p className="text-xs sm:text-sm text-slate-300/90 mt-1 font-medium drop-shadow">
                {room?.title} • Starting Purse: <strong className="text-emerald-400 font-mono">{formatCurrency(room?.startingPurse || 5000)}</strong>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#090e1e]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">

          {error && (
            <div className="mb-5 rounded-lg bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 border border-rose-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Franchise Info */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Franchise / Team Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Malabar Strikers"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Owner Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Owner / Captain"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@npl.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Franchise Owner Photo (Optional) */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Franchise Owner Photo (Optional)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 rounded-full border border-amber-500/50 bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                  {ownerPhotoUrl ? (
                    <Image src={ownerPhotoUrl} alt="Owner" fill className="object-cover" unoptimized />
                  ) : (
                    <User className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer border border-slate-700">
                    <Upload className="h-3 w-3 text-amber-400" />
                    <span>{uploadingOwnerPhoto ? "Uploading..." : "Upload Owner Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOwnerPhotoUpload}
                      className="hidden"
                      disabled={uploadingOwnerPhoto}
                    />
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">Stored directly in Cloudinary</p>
                </div>
              </div>
            </div>

            {/* Franchise Logo (Optional) */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Franchise Logo (Optional)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 rounded-lg border border-slate-700 bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Logo" fill className="object-cover" unoptimized />
                  ) : (
                    <Shield className="h-5 w-5 text-slate-500" />
                  )}
                </div>
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer border border-slate-700">
                  <Upload className="h-3 w-3 text-amber-400" />
                  <span>{uploadingLogo ? "Uploading..." : "Upload Logo (Cloudinary)"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                </label>
              </div>
            </div>

            {/* 1 MAIN FIXED PLAYER SECTION */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    1 Main Fixed Player (Fixed Squad Star)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Fixed for Auction
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Enter your franchise&apos;s main fixed player. This player is fixed and automatically added as your 1st squad member.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Main Player Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanju Varma"
                    value={mainPlayerName}
                    onChange={(e) => setMainPlayerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Player Position
                  </label>
                  <select
                    value={mainPlayerPos}
                    onChange={(e) => setMainPlayerPos(e.target.value as PlayerPosition)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ATTACKER">Attacker (Spiker)</option>
                    <option value="SETTER">Setter (Playmaker)</option>
                    <option value="LIBERO">Libero (Defensive Specialist)</option>
                    <option value="DEFENDER">Defender (Blocker)</option>
                    <option value="ALL_ROUNDER">All-Rounder</option>
                  </select>
                </div>
              </div>

              {/* Main Player Photo */}
              <div className="pt-2 flex items-center gap-3">
                <div className="relative h-12 w-12 rounded-lg border border-slate-700 bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                  {mainPlayerPhotoUrl ? (
                    <Image src={mainPlayerPhotoUrl} alt="Player" fill className="object-cover" unoptimized />
                  ) : (
                    <User className="h-6 w-6 text-slate-500" />
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer border border-slate-700">
                    <Upload className="h-3 w-3 text-amber-400" />
                    <span>{uploadingPlayerPhoto ? "Uploading..." : "Upload Player Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePlayerPhotoUpload}
                      className="hidden"
                      disabled={uploadingPlayerPhoto}
                    />
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">Stored directly in Cloudinary</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || uploadingLogo || uploadingPlayerPhoto}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Register Franchise & Enter Waiting Room</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
