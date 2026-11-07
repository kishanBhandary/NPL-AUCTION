"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { formatCurrency, getPositionBadge } from "@/lib/utils";
import { PlayerPosition, SessionUser } from "@/types";
import { UserPlus, Upload, Zap, Plus, Check, Loader2, User, Pencil, Trash2, X, AlertTriangle } from "lucide-react";

export default function PlayersPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [roomId, setRoomId] = useState("");
  const [roomOwnerId, setRoomOwnerId] = useState("");
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit Player State
  const [editingPlayer, setEditingPlayer] = useState<{
    id: string;
    name: string;
    position: PlayerPosition;
    photoUrl: string | null;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    position: "ATTACKER" as PlayerPosition,
    photoUrl: "",
  });
  const [editingSubmitting, setEditingSubmitting] = useState(false);
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);

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
        setRoomOwnerId(data.room.ownerId);
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
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user);
      })
      .catch(() => {});
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

  const handleStartEdit = (player: {
    id: string;
    name: string;
    position: PlayerPosition;
    photoUrl: string | null;
  }) => {
    setEditingPlayer(player);
    setEditForm({
      name: player.name,
      position: player.position,
      photoUrl: player.photoUrl || "",
    });
    setError("");
  };

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEditPhoto(true);
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
        setEditForm((prev) => ({ ...prev, photoUrl: data.url }));
      } else {
        setError(data.error || "Failed to upload player photo to Cloudinary");
      }
    } catch {
      setError("Failed to upload player photo to Cloudinary");
    } finally {
      setUploadingEditPhoto(false);
      e.target.value = "";
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editForm.name.trim()) return;

    setEditingSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/players/${editingPlayer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          position: editForm.position,
          photoUrl: editForm.photoUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update player");
      } else {
        setSuccessMsg(`Player "${editForm.name}" updated successfully!`);
        setTimeout(() => setSuccessMsg(""), 3000);
        setEditingPlayer(null);
        fetchRoomAndPlayers();
      }
    } catch {
      setError("An unexpected error occurred while updating player");
    } finally {
      setEditingSubmitting(false);
    }
  };

  const handleDeletePlayer = async (player: { id: string; name: string }) => {
    if (!confirm(`Are you sure you want to remove "${player.name}" from the auction roster?`)) {
      return;
    }

    setDeletingPlayerId(player.id);
    setError("");

    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete player");
      } else {
        setSuccessMsg(`Player "${player.name}" removed from roster.`);
        setTimeout(() => setSuccessMsg(""), 3000);
        setPlayers((prev) => prev.filter((p) => p.id !== player.id));
      }
    } catch {
      setError("An unexpected error occurred while deleting player");
    } finally {
      setDeletingPlayerId(null);
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
        <Navbar roomCode={code} roomTitle={roomTitle} activeTab="players" />

        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Top Header Hero Banner */}
          <div className="relative rounded-2xl border border-amber-500/40 bg-[#080d1e]/50 p-5 sm:p-6 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
            <div className="absolute inset-0 pointer-events-none z-0">
              <Image
                src="/images/npl-container-banner.jpg"
                alt="Stadium Hero Banner"
                fill
                priority
                className="object-cover object-center opacity-85 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#060913]/90 via-[#060913]/60 to-transparent sm:w-3/5" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060913]/50 via-transparent to-transparent" />
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-2">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>NPL Athlete Roster</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white drop-shadow">
                NPL Player Pool
              </h1>
              <p className="text-xs sm:text-sm text-slate-300/90 mt-1 font-medium drop-shadow">
                {players.length} registered athletes • Fixed Base Price: ₹{minBasePrice}
              </p>
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

                      {/* Player Actions: Edit & Delete */}
                      <div className="border-t border-slate-800/80 mt-3 pt-2.5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">
                          NPL Athlete
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(player)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
                            title={`Edit ${player.name}`}
                          >
                            <Pencil className="h-3 w-3 text-amber-400" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(player)}
                            disabled={deletingPlayerId === player.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
                            title={`Delete ${player.name}`}
                          >
                            {deletingPlayerId === player.id ? (
                              <Loader2 className="h-3 w-3 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="h-3 w-3 text-rose-400" />
                            )}
                            <span>{deletingPlayerId === player.id ? "Deleting..." : "Delete"}</span>
                          </button>
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

      {/* EDIT PLAYER MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-[#181106] via-[#090e1c] to-[#060913] p-6 text-slate-100 shadow-2xl shadow-amber-950/50">
            <button
              onClick={() => !editingSubmitting && setEditingPlayer(null)}
              disabled={editingSubmitting}
              className="absolute top-4 right-4 rounded-full bg-slate-900/80 p-1.5 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Edit Player Details</h3>
                <p className="text-xs text-slate-400">Update player name, position, or photo</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  placeholder="e.g., Rohit Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Volleyball Position
                </label>
                <select
                  value={editForm.position}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, position: e.target.value as PlayerPosition }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="ATTACKER">Attacker (Outside Hitter / Opposite)</option>
                  <option value="SETTER">Setter (Playmaker)</option>
                  <option value="LIBERO">Libero (Defensive Specialist)</option>
                  <option value="DEFENDER">Middle Blocker / Defender</option>
                  <option value="ALL_ROUNDER">Universal All-Rounder</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Player Photo
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
                    {editForm.photoUrl ? (
                      <Image
                        src={editForm.photoUrl}
                        alt="Player"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="h-6 w-6 text-slate-500" />
                    )}
                  </div>

                  <label className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer border border-slate-700 transition-colors">
                    <Upload className="h-3.5 w-3.5 text-amber-400" />
                    <span>{uploadingEditPhoto ? "Uploading..." : "Change Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditFileUpload}
                      className="hidden"
                      disabled={uploadingEditPhoto}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={editingSubmitting}
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingSubmitting || uploadingEditPhoto}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {editingSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
