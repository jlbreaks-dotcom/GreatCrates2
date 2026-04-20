import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type TrackRow = {
  id: string;
  user_id: string;
  track: string;
  artist: string;
  tags: string[];
  created_at: string;
};

function Button({ className = "", children, ...props }: any) {
  return (
    <button
      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const Input = React.forwardRef<HTMLInputElement, any>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full px-3 py-2 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 ${className}`}
      {...props}
    />
  )
);

function Badge({ children }: any) {
  return (
    <span className="px-2 py-1 text-xs bg-zinc-800 rounded-full text-zinc-200">
      {children}
    </span>
  );
}

const starterTags = ["house", "hip-hop", "warmup", "late-night", "classic"];

function slug(track: string, artist: string) {
  return encodeURIComponent(`${track} ${artist}`.trim());
}

function getLinks(track: string, artist: string) {
  const q = slug(track, artist);

  return {
    spotify: `https://open.spotify.com/search/${q}`,
    apple: `https://music.apple.com/us/search?term=${q}`,
    amazon: `https://www.amazon.com/s?k=${q}+mp3`,
    discogs: `https://www.discogs.com/search/?q=${q}&type=all`,
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${q}+vinyl`,
    bandcamp: `https://bandcamp.com/search?q=${q}`,
    soundcloud: `https://soundcloud.com/search?q=${q}`,
    stores: `https://www.google.com/search?q=record+stores+near+me`,
  };
}

function normalize(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,#]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const [email, setEmail] = useState("");

  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const [track, setTrack] = useState("");
  const [artist, setArtist] = useState("");
  const [tags, setTags] = useState("");

  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTrack, setEditTrack] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editTags, setEditTags] = useState("");

  useEffect(() => {
    const boot = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setAuthLoading(false);

      if (session?.user) {
        await loadTracks(session.user.id);
      }
    };

    boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        await loadTracks(nextUser.id);
      } else {
        setTracks([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const allTags = useMemo(() => {
    return Array.from(
      new Set([...starterTags, ...tracks.flatMap((t) => t.tags || [])])
    ).sort();
  }, [tracks]);

  const filtered = useMemo(() => {
    return tracks.filter((t) => {
      const text =
        `${t.track} ${t.artist} ${(t.tags || []).join(" ")}`.toLowerCase();

      const matchesSearch =
        !search || text.includes(search.toLowerCase());

      const matchesTags =
        activeTags.length === 0 ||
        activeTags.every((tag) => t.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [tracks, search, activeTags]);

  async function loadTracks(userId: string) {
    setLoadingTracks(true);

    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      setTracks((data as TrackRow[]) || []);
    }

    setLoadingTracks(false);
  }

  async function signIn() {
    if (!email.trim()) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Check your email for the magic link.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function addTrack() {
    if (!track.trim() || !user) return;

    const { error } = await supabase.from("tracks").insert([
      {
        user_id: user.id,
        track: track.trim(),
        artist: artist.trim(),
        tags: normalize(tags),
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setTrack("");
    setArtist("");
    setTags("");

    await loadTracks(user.id);

    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function saveEdit(id: string) {
    if (!user || !editTrack.trim()) return;

    await supabase
      .from("tracks")
      .update({
        track: editTrack.trim(),
        artist: editArtist.trim(),
        tags: normalize(editTags),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    setEditingId(null);
    setEditTrack("");
    setEditArtist("");
    setEditTags("");

    await loadTracks(user.id);
  }

  async function deleteTrack(id: string) {
    if (!user) return;
    if (!window.confirm("Delete this track?")) return;

    await supabase
      .from("tracks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    await loadTracks(user.id);
  }

  function startEdit(t: TrackRow) {
    setEditingId(t.id);
    setEditTrack(t.track);
    setEditArtist(t.artist);
    setEditTags((t.tags || []).join(", "));
  }

  function clearFilters() {
    setSearch("");
    setActiveTags([]);
  }

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag)
        ? prev.filter((x) => x !== tag)
        : [...prev, tag]
    );
  }

  function emailList() {
    const rows = filtered.length ? filtered : tracks;

    const body = rows
      .map((t) => {
        const l = getLinks(t.track, t.artist);

        return `${t.artist} - ${t.track}

Spotify: ${l.spotify}
Apple: ${l.apple}
Amazon: ${l.amazon}
Discogs: ${l.discogs}
eBay: ${l.ebay}
Bandcamp: ${l.bandcamp}
SoundCloud: ${l.soundcloud}`;
      })
      .join("\n\n");

    window.location.href = `mailto:?subject=${encodeURIComponent(
      "GreatCrates List"
    )}&body=${encodeURIComponent(body)}`;
  }

  function Card({ t }: { t: TrackRow }) {
    return (
      <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-3">
        {editingId === t.id ? (
          <>
            <Input
              value={editTrack}
              onChange={(e: any) => setEditTrack(e.target.value)}
            />
            <Input
              value={editArtist}
              onChange={(e: any) => setEditArtist(e.target.value)}
            />
            <Input
              value={editTags}
              onChange={(e: any) => setEditTags(e.target.value)}
            />

            <div className="flex gap-2">
              <Button
                onClick={() => saveEdit(t.id)}
                className="bg-zinc-100 text-zinc-900"
              >
                Save
              </Button>

              <Button
                onClick={() => setEditingId(null)}
                className="bg-zinc-800 border border-zinc-700"
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="font-medium">{t.track}</div>
              <div className="text-sm text-zinc-400">
                {t.artist || "Unknown artist"}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {t.tags.map((tag) => (
                <Badge key={tag}>#{tag}</Badge>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(getLinks(t.track, t.artist)).map(
                ([name, url]) => (
                  <Button
                    key={name}
                    onClick={() =>
                      window.open(url, "_blank")
                    }
                    className="bg-zinc-800 border border-zinc-700"
                  >
                    {name}
                  </Button>
                )
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => startEdit(t)}
                className="bg-zinc-800 border border-zinc-700"
              >
                Edit
              </Button>

              <Button
                onClick={() => deleteTrack(t.id)}
                className="bg-zinc-800 border border-zinc-700"
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="text-3xl font-semibold">
            GreatCrates
          </div>

          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
            <div>Sign in to sync your crates</div>

            <Input
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />

            <Button
              onClick={signIn}
              className="w-full bg-zinc-100 text-zinc-900"
            >
              Send Magic Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <div>
            <div className="text-3xl font-semibold">
              GreatCrates
            </div>
            <div className="text-sm text-zinc-400">
              Capture. Organize. Build your set.
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={emailList}
              className="bg-zinc-100 text-zinc-900"
            >
              Email List
            </Button>

            <Button
              onClick={signOut}
              className="bg-zinc-800 border border-zinc-700"
            >
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
              <div>Quick Add</div>

              <Input
                ref={inputRef}
                value={track}
                onChange={(e: any) => setTrack(e.target.value)}
                placeholder="Track"
              />

              <Input
                value={artist}
                onChange={(e: any) => setArtist(e.target.value)}
                placeholder="Artist"
              />

              <Input
                value={tags}
                onChange={(e: any) => setTags(e.target.value)}
                placeholder="Tags"
              />

              <Button
                onClick={addTrack}
                className="bg-zinc-100 text-zinc-900"
              >
                Add Track
              </Button>
            </div>

            <div className="space-y-2">
              {loadingTracks
                ? "Loading..."
                : tracks.map((t) => <Card key={t.id} t={t} />)}
            </div>
          </div>

          <div className="space-y-4">
            <Input
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              placeholder="Search tracks or artists"
            />

            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 text-xs rounded-full border ${
                    activeTags.includes(tag)
                      ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                      : "bg-zinc-900 text-zinc-300 border-zinc-700"
                  }`}
                >
                  #{tag}
                </button>
              ))}

              <button
                onClick={clearFilters}
                className="text-xs text-zinc-400"
              >
                Clear
              </button>
            </div>

            <div className="space-y-2">
              {filtered.map((t) => (
                <Card key={t.id} t={t} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
