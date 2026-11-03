"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { formatCurrency, getPositionBadge } from "@/lib/utils";
import { PlayerPosition } from "@/types";
import { UserPlus, Upload, Zap, Plus, Check, Loader2, Sparkles, User } from "lucide-react";

const NPL_SAMPLE_PLAYERS = [
  {
    name: "Sanju Varma",
    position: "ATTACKER" as PlayerPosition,
    photoUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Arjun Nair",
    position: "SETTER" as PlayerPosition,
    photoUrl: "https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Pranav Kumar",
    position: "LIBERO" as PlayerPosition,
    photoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Gokul Das",
    position: "DEFENDER" as PlayerPosition,
    photoUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Vivek Menon",
    position: "ALL_ROUNDER" as PlayerPosition,
    photoUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Rahul Chandran",
    position: "ATTACKER" as PlayerPosition,
    photoUrl: "https://images.unsplash.com/photo-1526676037777-05a232554f77?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Kiran Prasad",
    position: "DEFENDER" as PlayerPosition,
    photoUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Anoop Raj",
    position: "SETTER" as PlayerPosition,
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
  },
];

export default function PlayersPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [roomId, setRoomId] = useState("");
  const [roomTitle, setRoomTitle] = useState("Narayana Guru Premiere League");
  const [minBasePrice, setMinBasePrice] = useState(50);
  const [players, setPlayers] = useState<Array<{
    id: string;
    name: string;
    position: PlayerPosition;
    photoUrl: string | null;
  }>>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    position: "ATTACKER" as PlayerPosition,
    photoUrl: "",
  });

  const fetchRoomAndPlayers = async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      if (data.room) {
        setRoomId(data.room.id);
        setRoomTitle(data.room.title);
        setMinBasePrice(data.room.minBasePrice || 50);
        setPlayers(data.room.players || []);
      }
    } catch {
      setError("Failed to load room");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomAndPlayers();
  }, [code]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setForm((prev) => ({ ...prev, photoUrl: data.url }));
      } else {
        setError(data.error || "Failed to upload player photo to Cloudinary");
      }
    } catch {
      setError("Failed to upload player photo to Cloudinary");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleRegisterPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !roomId) return;

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          name: form.name,
          position: form.position,
          photoUrl: form.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(form.name)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to register player");
      } else {
        setSuccessMsg(`Player ${form.name} registered successfully!`);
        setTimeout(() => setSuccessMsg(""), 3000);
        setForm({
          name: "",
          position: "ATTACKER",
          photoUrl: "",
        });
        fetchRoomAndPlayers();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedSamples = async () => {
    if (!roomId) return;
    setSeeding(true);
    setError("");

    try {
      for (const p of NPL_SAMPLE_PLAYERS) {
        await fetch("/api/players", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            name: p.name,
            position: p.position,
            photoUrl: p.photoUrl,
          }),
        });
      }
      setSuccessMsg("Added Narayana Guru Premiere League players to the roster!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchRoomAndPlayers();
    } catch {
      setError("Failed to auto-seed players");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm">Loading player roster...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col arena-court-bg">
      <Navbar roomCode={code} roomTitle={roomTitle} activeTab="players" />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 mb-2 border border-cyan-500/20">
              <Zap className="h-3.5 w-3.5" />
              NARAYANA GURU PREMIERE LEAGUE • PLAYER ROSTER
            </div>
            <h1 className="text-3xl font-black text-white">NPL Player Pool</h1>
            <p className="text-xs text-slate-400 mt-1">
              {players.length} players registered • Base price: ₹{minBasePrice} for all players
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedSamples}
              disabled={seeding}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{seeding ? "Adding Players..." : "Auto-Seed NPL Players"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 p-4 text-xs font-semibold text-rose-400 border border-rose-500/20">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Simple Registration Form: ONLY Name, Photo, Position */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl sticky top-24 backdrop-blur-md">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-400" />
                Register Player
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                All players have fixed base price of ₹{minBasePrice}.
              </p>

              <form onSubmit={handleRegisterPlayer} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Player Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanju Varma"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-sm text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Volleyball Position
                  </label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value as PlayerPosition })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ATTACKER">Attacker (Spiker)</option>
                    <option value="SETTER">Setter (Playmaker)</option>
                    <option value="LIBERO">Libero (Defensive Specialist)</option>
                    <option value="DEFENDER">Defender (Blocker)</option>
                    <option value="ALL_ROUNDER">All-Rounder</option>
                  </select>
                </div>

                {/* Cloudinary Image Upload */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Player Photo (Cloudinary)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
                      {form.photoUrl ? (
                        <Image src={form.photoUrl} alt="Player" fill className="object-cover" unoptimized />
                      ) : (
                        <User className="h-6 w-6 text-slate-500" />
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer border border-slate-700 transition-colors">
                      <Upload className="h-3.5 w-3.5 text-amber-400" />
                      <span>{uploadingPhoto ? "Uploading..." : "Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800 text-xs text-slate-400">
                  <span className="font-semibold text-amber-400">Fixed Base Price:</span> ₹{minBasePrice} •{" "}
                  <span className="font-semibold text-emerald-400">Bid Increment:</span> ₹50
                </div>

                <button
                  type="submit"
                  disabled={submitting || uploadingPhoto}
                  className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Add Player to Pool</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Player Roster Grid */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Registered NPL Roster ({players.length})</h3>
            </div>

            {players.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
                <User className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-300">No players added yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Add players using the simple form or click &quot;Auto-Seed NPL Players&quot;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {players.map((player) => {
                  const badge = getPositionBadge(player.position);
                  const fallbackPhoto = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(player.name)}`;

                  return (
                    <div
                      key={player.id}
                      className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shrink-0">
                          <Image
                            src={player.photoUrl || fallbackPhoto}
                            alt={player.name}
                            fill
                            className="object-cover object-top"
                            unoptimized
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
                            {badge.badge} • {badge.label}
                          </span>

                          <h4 className="text-sm font-extrabold text-white truncate mt-1.5">
                            {player.name}
                          </h4>
                          <p className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5">
                            Base: ₹{minBasePrice}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
