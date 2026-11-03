"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import {
  Trophy,
  Users,
  ArrowRight,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Shield,
  Zap,
  Upload,
  Camera,
  Check,
  X,
  User,
} from "lucide-react";
import { PlayerPosition } from "@/types";

export default function CreateRoomPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("Narayana Guru Premiere League");
  const [description, setDescription] = useState("Official live player auction for Narayana Guru Premiere League");
  const [expectedTeamsCount, setExpectedTeamsCount] = useState(4);
  const [playersPerTeam, setPlayersPerTeam] = useState(8); // 7 on court + 1 substitute = 8

  // Financial parameters
  const startingPurse = 5000;
  const minBasePrice = 50;
  const defaultBidIncrement = 50;
  const timerDuration = 30;

  // List of players input (starts empty - no auto-seeding)
  const [playerList, setPlayerList] = useState<
    Array<{ name: string; position: PlayerPosition; photoUrl?: string }>
  >([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPos, setNewPlayerPos] = useState<PlayerPosition>("ATTACKER");
  const [newPlayerPhoto, setNewPlayerPhoto] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Cloudinary image upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "npl_players");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.url) {
        setNewPlayerPhoto(data.url);
      } else {
        setError(data.error || "Failed to upload player photo to Cloudinary");
      }
    } catch {
      setError("Network error while uploading player photo to Cloudinary");
    } finally {
      setUploadingPhoto(false);
      // Reset input value so same file can be re-selected if desired
      e.target.value = "";
    }
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;

    setPlayerList([
      ...playerList,
      {
        name: newPlayerName.trim(),
        position: newPlayerPos,
        photoUrl:
          newPlayerPhoto ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newPlayerName.trim())}`,
      },
    ]);

    setNewPlayerName("");
    setNewPlayerPhoto("");
  };

  const handleRemovePlayer = (idx: number) => {
    setPlayerList(playerList.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startingPurse,
          minBasePrice,
          defaultBidIncrement,
          timerDuration,
          expectedTeamsCount: Number(expectedTeamsCount) || 4,
          playersPerTeam: Number(playersPerTeam) || 8,
          players: playerList,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/");
        } else {
          setError(data.error || "Failed to create auction room");
        }
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred while creating the room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col arena-court-bg">
      <Navbar activeTab="rooms" />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          <div className="border-b border-slate-800 pb-5 mb-6 flex items-center justify-between">
            <div>

              <h1 className="text-2xl sm:text-3xl font-black text-white">Create Auction Room</h1>
              <p className="mt-1 text-xs text-slate-400">
                Set tournament teams, match squad size (7+1), and add players with Cloudinary photos for live auction.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Tournament Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Narayana Guru Premiere League"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* User Input: Number of Teams & Players per Team in match (7+1) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-950/60 p-4 border border-slate-800">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Number of Teams in League
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    required
                    min={2}
                    max={24}
                    value={expectedTeamsCount}
                    onChange={(e) => setExpectedTeamsCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-sm font-mono font-bold text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">e.g. 4, 6, 8 or 10 franchises</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Players Per Team in Match (7+1)
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    required
                    min={6}
                    max={15}
                    value={playersPerTeam}
                    onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-sm font-mono font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Default: 7 on court + 1 substitute (Total: {playersPerTeam})</p>
              </div>
            </div>
            {/* List of Players Section with Cloudinary Photo Upload */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Player Roster ({playerList.length} Players Added)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Add player names, positions, and photos (uploaded to Cloudinary).
                  </p>
                </div>
              </div>

              {/* Quick Add Player Inputs & Photo Upload */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Player Name */}
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Player Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Kumar"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddPlayer();
                        }
                      }}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 px-3 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Position */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Position
                    </label>
                    <select
                      value={newPlayerPos}
                      onChange={(e) => setNewPlayerPos(e.target.value as PlayerPosition)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 px-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="ATTACKER">Attacker (Spiker)</option>
                      <option value="SETTER">Setter (Playmaker)</option>
                      <option value="LIBERO">Libero (Defense)</option>
                      <option value="DEFENDER">Defender (Blocker)</option>
                      <option value="ALL_ROUNDER">All-Rounder</option>
                    </select>
                  </div>

                  {/* Add Player Button */}
                  <div className="sm:col-span-3 flex sm:items-end">
                    <button
                      type="button"
                      onClick={handleAddPlayer}
                      disabled={!newPlayerName.trim()}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Player</span>
                    </button>
                  </div>
                </div>

                {/* Photo Upload Row */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-900 flex-wrap">
                  {/* Photo Preview Thumbnail */}
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    {uploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    ) : newPlayerPhoto ? (
                      <>
                        <Image
                          src={newPlayerPhoto}
                          alt="Preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => setNewPlayerPhoto("")}
                          title="Remove photo"
                          className="absolute inset-0 bg-slate-950/60 opacity-0 hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <User className="h-4 w-4 text-slate-600" />
                    )}
                  </div>

                  {/* Cloudinary File Upload Button */}
                  <label className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors">
                    <Camera className="h-3.5 w-3.5 text-amber-400" />
                    <span>{uploadingPhoto ? "Uploading to Cloudinary..." : "Upload Photo (Cloudinary)"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>

                  {/* Or image URL input */}
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="url"
                      placeholder="Or paste image URL here..."
                      value={newPlayerPhoto}
                      onChange={(e) => setNewPlayerPhoto(e.target.value)}
                      className="w-full rounded-xl border border-slate-900 bg-slate-900/60 py-1.5 px-3 text-[11px] text-slate-300 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Added Players List */}
                {playerList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-900">
                    {playerList.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-xl bg-slate-900/90 border border-slate-800 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative h-7 w-7 rounded-full overflow-hidden bg-slate-800 shrink-0">
                            {p.photoUrl ? (
                              <Image src={p.photoUrl} alt={p.name} fill className="object-cover" unoptimized />
                            ) : (
                              <User className="h-4 w-4 m-auto text-slate-500" />
                            )}
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-white block truncate">{p.name}</span>
                            <span className="text-[10px] text-amber-400 font-mono">{p.position}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors shrink-0"
                          title="Remove player"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 px-3 rounded-xl border border-dashed border-slate-800/80 text-slate-500 text-xs">
                    No players added yet. Add players above or add them later inside the room management page.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Create Room & Go to Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
