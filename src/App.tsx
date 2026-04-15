import React, { useEffect, useMemo, useRef, useState } from "react";

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

const STORAGE_KEY = "greatcrates_tracks";

const starterTracks = [
  {
    id: 1,
    track: "Show Me Love",
    artist: "Robin S",
    tags: ["house", "classic"],
  },
  {
    id: 2,
    track: "Finally",
    artist: "CeCe Peniston",
    tags: ["house", "vocals"],
  },
];

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
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const [tracks, setTracks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : starterTracks;
    } catch {
      return starterTracks;
    }
  });

  const [track, setTrack] = useState("");
  const [artist, setArtist] = useState("");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTrack, setEditTrack] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editTags, setEditTags] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  }, [tracks]);

  const allTags = useMemo(() => {
    return Array.from(
      new Set([...starterTags, ...tracks.flatMap((t: any) => t.tags || [])])
    ).sort();
  }, [tracks]);

  const filtered = useMemo(() => {
    return tracks.filter((t: any) => {
      const text = `${t.track} ${t.artist} ${(t.tags || []).join(" ")}`.toLowerCase();
      const matchesSearch = !search || text.includes(search.toLowerCase());
      const matchesTags =
        activeTags.length === 0 ||
        activeTags.every((tag) => (t.tags || []).includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [tracks, search, activeTags]);

  function addTrack() {
    if (!track.trim()) return;

    setTracks((prev: any) => [
      {
        id: Date.now(),
        track: track.trim(),
        artist: artist.trim(),
        tags: normalize(tags),
      },
      ...prev,
    ]);

    setTrack("");
    setArtist("");
    setTags("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function emailList() {
    const source = filtered.length ? filtered : tracks;

    const body = source
      .map((t: any) => {
        const l = getLinks(t.track, t.artist || "");
        const tagLine = t.tags?.length ? `#${t.tags.join(" #")}` : "No tags";

        return `${t.artist ? `${t.artist} - ` : ""}${t.track}
${tagLine}

Spotify: ${l.spotify}
Apple: ${l.apple}
Amazon: ${l.amazon}
Discogs: ${l.discogs}
eBay: ${l.ebay}
Stores: ${l.stores}`;
      })
      .join("\n\n");

    window.location.href = `mailto:?subject=${encodeURIComponent(
      "GreatCrates List"
    )}&body=${encodeURIComponent(body)}`;
  }

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function clearFilters() {
    setSearch("");
    setActiveTags([]);
  }

  function startEdit(t: any) {
    setEditingId(t.id);
    setEditTrack(t.track || "");
    setEditArtist(t.artist || "");
    setEditTags((t.tags || []).join(", "));
  }

  function saveEdit(id: number) {
    if (!editTrack.trim()) return;

    setTracks((prev: any) =>
      prev.map((t: any) =>
        t.id === id
          ? {
              ...t,
              track: editTrack.trim(),
              artist: editArtist.trim(),
              tags: normalize(editTags),
            }
          : t
      )
    );

    setEditingId(null);
    setEditTrack("");
    setEditArtist("");
    setEditTags("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTrack("");
    setEditArtist("");
    setEditTags("");
  }

  function deleteTrack(id: number) {
    if (!window.confirm("Delete this track?")) return;
    setTracks((prev: any) => prev.filter((t: any) => t.id !== id));
    if (editingId === id) cancelEdit();
  }

  const sourceBtnClass =
    "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 min-h-[40px] flex items-center justify-center";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
          <div>
            <div className="text-2xl md:text-3xl font-semibold tracking-tight">
              GreatCrates
            </div>
            <div className="text-sm text-zinc-400 mt-1">
              Capture. Organize. Build your set.
            </div>
          </div>

          {!isMobile && (
            <Button
              onClick={emailList}
              className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
            >
              Email List
            </Button>
          )}
        </div>

        {isMobile ? (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
              <div className="text-sm font-medium">Quick Capture</div>

              <Input
                ref={inputRef}
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTrack()}
                placeholder="Add track..."
                className="text-lg py-3"
              />

              <Input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Artist"
              />

              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags"
              />

              <div className="flex gap-2 flex-wrap">
                {starterTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setTags((prev) =>
                        Array.from(new Set([...normalize(prev), tag])).join(", ")
                      )
                    }
                    className="px-2 py-1 text-xs border border-zinc-700 rounded-full bg-zinc-900 hover:bg-zinc-800"
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <Button
                onClick={addTrack}
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
              >
                Save
              </Button>

              <Button
                onClick={emailList}
                className="w-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
              >
                Email List
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-zinc-400">
                Saved Tracks ({tracks.length})
              </div>

              {tracks.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2"
                >
                  {editingId === t.id ? (
                    <>
                      <Input
                        value={editTrack}
                        onChange={(e) => setEditTrack(e.target.value)}
                        placeholder="Track"
                      />
                      <Input
                        value={editArtist}
                        onChange={(e) => setEditArtist(e.target.value)}
                        placeholder="Artist"
                      />
                      <Input
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="Tags"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => saveEdit(t.id)}
                          className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={cancelEdit}
                          className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium">{t.track}</div>
                      <div className="text-sm text-zinc-400">
                        {t.artist || "Unknown artist"}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {(t.tags || []).map((tag: string) => (
                          <Badge key={tag}>#{tag}</Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => startEdit(t)}
                          className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => deleteTrack(t.id)}
                          className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
                <div className="text-sm font-medium">Quick Add</div>

                <Input
                  ref={inputRef}
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTrack()}
                  placeholder="Track"
                />

                <Input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Artist"
                />

                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Tags"
                />

                <div className="flex gap-2 flex-wrap">
                  {starterTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setTags((prev) =>
                          Array.from(new Set([...normalize(prev), tag])).join(", ")
                        )
                      }
                      className="px-2 py-1 text-xs border border-zinc-700 rounded-full bg-zinc-900 hover:bg-zinc-800"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={addTrack}
                  className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                >
                  Add Track
                </Button>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-zinc-400">
                  Saved Tracks ({tracks.length})
                </div>

                {tracks.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2"
                  >
                    {editingId === t.id ? (
                      <>
                        <Input
                          value={editTrack}
                          onChange={(e) => setEditTrack(e.target.value)}
                          placeholder="Track"
                        />
                        <Input
                          value={editArtist}
                          onChange={(e) => setEditArtist(e.target.value)}
                          placeholder="Artist"
                        />
                        <Input
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          placeholder="Tags"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => saveEdit(t.id)}
                            className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={cancelEdit}
                            className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-medium">{t.track}</div>
                        <div className="text-sm text-zinc-400">
                          {t.artist || "Unknown artist"}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {(t.tags || []).map((tag: string) => (
                            <Badge key={tag}>#{tag}</Badge>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => startEdit(t)}
                            className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => deleteTrack(t.id)}
                            className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks, artists, or hashtags"
              />

              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">Filter by hashtag</div>
                <button
                  onClick={clearFilters}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Clear filters
                </button>
              </div>

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
              </div>

              <div className="text-sm text-zinc-400">
                {filtered.length} matching track{filtered.length === 1 ? "" : "s"}
              </div>

              {filtered.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-3"
                >
                  <div>
                    <div className="font-medium">{t.track}</div>
                    <div className="text-sm text-zinc-400">
                      {t.artist || "Unknown artist"}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {(t.tags || []).map((tag: string) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className="px-2 py-1 text-xs rounded-full bg-zinc-800 text-zinc-200"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    <Button
                      className={sourceBtnClass}
                      onClick={() =>
                        window.open(getLinks(t.track, t.artist).spotify, "_blank")
                      }
                    >
                      Spotify
                    </Button>
                    <Button
                      className={sourceBtnClass}
                      onClick={() =>
                        window.open(getLinks(t.track, t.artist).apple, "_blank")
                      }
                    >
                      Apple
                    </Button>
                    <Button
                      className={sourceBtnClass}
                      onClick={() =>
                        window.open(getLinks(t.track, t.artist).amazon, "_blank")
                      }
                    >
                      Amazon
                    </Button>
                    <Button
                      className={sourceBtnClass}
                      onClick={() =>
                        window.open(getLinks(t.track, t.artist).discogs, "_blank")
                      }
                    >
                      Discogs
                    </Button>
                    <Button
                      className={sourceBtnClass}
                      onClick={() =>
                        window.open(getLinks(t.track, t.artist).ebay, "_blank")
                      }
                    >
                      eBay
                    </Button>
                    <Button
                      className={sourceBtnClass}
                      onClick={() =>
                        window.open(getLinks(t.track, t.artist).stores, "_blank")
                      }
                    >
                      Stores
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}