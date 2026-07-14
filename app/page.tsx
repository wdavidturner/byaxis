"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  x: number;
  y: number;
  size: number;
  label: string;
  src?: string;
  color: string;
  initials: string;
};

type MapState = {
  title: string;
  subtitle: string;
  xLeft: string;
  xRight: string;
  yTop: string;
  yBottom: string;
  quadrants: [string, string, string, string];
  items: Item[];
};

const COLORS = ["#F06449", "#3E63DD", "#B6D63A", "#F2C94C", "#9B6BD3", "#2D9C7A"];

const DEMO_STATE: MapState = {
  title: "The AI landscape",
  subtitle: "A point-in-time view · July 2026",
  xLeft: "Niche",
  xRight: "Universal",
  yTop: "Opinionated",
  yBottom: "Flexible",
  quadrants: ["Cult favorites", "Category leaders", "Specialists", "Platforms"],
  items: [
    { id: "demo-1", x: 22, y: 24, size: 72, label: "Northstar", color: COLORS[0], initials: "N" },
    { id: "demo-2", x: 66, y: 20, size: 80, label: "Arc", color: COLORS[1], initials: "A" },
    { id: "demo-3", x: 79, y: 43, size: 68, label: "Bloom", color: COLORS[2], initials: "B" },
    { id: "demo-4", x: 35, y: 62, size: 76, label: "Relay", color: COLORS[3], initials: "R" },
    { id: "demo-5", x: 59, y: 76, size: 70, label: "Mosaic", color: COLORS[4], initials: "M" },
  ],
};

const DB_NAME = "quadrants-local";
const STORE_NAME = "maps";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readState(): Promise<MapState | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get("current");
    request.onsuccess = () => resolve((request.result as MapState) ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function writeState(state: MapState): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(state, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export default function Home() {
  const [map, setMap] = useState<MapState>(DEMO_STATE);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const [mobilePanel, setMobilePanel] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    readState().then((stored) => stored && setMap(stored)).catch(() => {}).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const dirtyTimeout = window.setTimeout(() => setSaved(false), 0);
    const timeout = window.setTimeout(() => {
      writeState(map).then(() => setSaved(true)).catch(() => {});
    }, 350);
    return () => {
      window.clearTimeout(dirtyTimeout);
      window.clearTimeout(timeout);
    };
  }, [map, ready]);

  const selected = useMemo(() => map.items.find((item) => item.id === selectedId) ?? null, [map.items, selectedId]);

  const patchMap = <K extends keyof MapState>(key: K, value: MapState[K]) => setMap((current) => ({ ...current, [key]: value }));

  const patchItem = useCallback((id: string, updates: Partial<Item>) => {
    setMap((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, ...updates } : item),
    }));
  }, []);

  const addFiles = async (incoming: File[]) => {
    const files = incoming.filter((file) => file.type.startsWith("image/"));
    const additions = await Promise.all(files.map(async (file, index): Promise<Item> => {
      const label = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      return {
        id: crypto.randomUUID(),
        x: 35 + ((map.items.length + index) * 11) % 35,
        y: 34 + ((map.items.length + index) * 13) % 34,
        size: 76,
        label,
        src: await fileToDataUrl(file),
        color: COLORS[(map.items.length + index) % COLORS.length],
        initials: label.slice(0, 2).toUpperCase(),
      };
    }));
    if (additions.length) {
      setMap((current) => ({ ...current, items: [...current.items, ...additions] }));
      setSelectedId(additions.at(-1)?.id ?? null);
    }
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    await addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>, item: Item) => {
    if (!boardRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = boardRef.current.getBoundingClientRect();
    const itemX = rect.left + (item.x / 100) * rect.width;
    const itemY = rect.top + (item.y / 100) * rect.height;
    dragRef.current = { id: item.id, dx: event.clientX - itemX, dy: event.clientY - itemY };
    setSelectedId(item.id);
  };

  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = ((event.clientX - dragRef.current.dx - rect.left) / rect.width) * 100;
    const y = ((event.clientY - dragRef.current.dy - rect.top) / rect.height) * 100;
    patchItem(dragRef.current.id, { x: Math.max(7, Math.min(93, x)), y: Math.max(9, Math.min(90, y)) });
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setMap((current) => ({ ...current, items: current.items.filter((item) => item.id !== selectedId) }));
    setSelectedId(null);
  };

  const handleKey = (event: React.KeyboardEvent<HTMLButtonElement>, item: Item) => {
    const step = event.shiftKey ? 5 : 1;
    const moves: Record<string, Partial<Item>> = {
      ArrowLeft: { x: Math.max(7, item.x - step) },
      ArrowRight: { x: Math.min(93, item.x + step) },
      ArrowUp: { y: Math.max(9, item.y - step) },
      ArrowDown: { y: Math.min(90, item.y + step) },
    };
    if (moves[event.key]) {
      event.preventDefault();
      patchItem(item.id, moves[event.key]);
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setMap((current) => ({ ...current, items: current.items.filter((candidate) => candidate.id !== item.id) }));
      setSelectedId(null);
    }
  };

  const exportPng = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#F4F0E8";
    ctx.fillRect(0, 0, 1600, 1200);
    ctx.fillStyle = "#171713";
    ctx.font = "700 66px Arial, sans-serif";
    ctx.fillText(map.title, 104, 110);
    ctx.globalAlpha = 0.58;
    ctx.font = "24px Arial, sans-serif";
    ctx.fillText(map.subtitle, 106, 152);
    ctx.globalAlpha = 1;
    const left = 190, top = 235, width = 1220, height = 820;
    ctx.strokeStyle = "rgba(23,23,19,.65)";
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, width, height);
    ctx.beginPath(); ctx.moveTo(left + width / 2, top); ctx.lineTo(left + width / 2, top + height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, top + height / 2); ctx.lineTo(left + width, top + height / 2); ctx.stroke();
    ctx.fillStyle = "rgba(23,23,19,.5)";
    ctx.font = "700 19px Arial, sans-serif";
    ctx.fillText(map.quadrants[0].toUpperCase(), left + 24, top + 38);
    ctx.fillText(map.quadrants[1].toUpperCase(), left + width / 2 + 24, top + 38);
    ctx.fillText(map.quadrants[2].toUpperCase(), left + 24, top + height / 2 + 38);
    ctx.fillText(map.quadrants[3].toUpperCase(), left + width / 2 + 24, top + height / 2 + 38);
    ctx.font = "20px Arial, sans-serif";
    ctx.fillText(map.yTop, left - 2, top - 22);
    ctx.fillText(map.yBottom, left - 2, top + height + 44);
    ctx.textAlign = "right";
    ctx.fillText(map.xRight, left + width, top + height + 44);
    ctx.textAlign = "left";
    ctx.fillText(map.xLeft, left, top + height + 44);

    await Promise.all(map.items.map(async (item) => {
      const cx = left + (item.x / 100) * width;
      const cy = top + (item.y / 100) * height;
      const size = item.size * 1.35;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx - size / 2, cy - size / 2, size, size, 18);
      ctx.clip();
      ctx.fillStyle = item.color;
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
      if (item.src) {
        try {
          const image = await loadImage(item.src);
          const scale = Math.max(size / image.width, size / image.height);
          const w = image.width * scale, h = image.height * scale;
          ctx.drawImage(image, cx - w / 2, cy - h / 2, w, h);
        } catch {}
      } else {
        ctx.fillStyle = "#171713";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `800 ${size * .36}px Arial, sans-serif`;
        ctx.fillText(item.initials, cx, cy + 2);
      }
      ctx.restore();
      ctx.fillStyle = "#171713";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = "700 19px Arial, sans-serif";
      ctx.fillText(item.label, cx, cy + size / 2 + 27);
    }));
    ctx.fillStyle = "rgba(23,23,19,.45)";
    ctx.textAlign = "right";
    ctx.font = "700 18px Arial, sans-serif";
    ctx.fillText("quadrants.io", 1496, 1150);
    const link = document.createElement("a");
    link.download = `${map.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "quadrant-map"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const resetDemo = () => {
    if (window.confirm("Replace this map with the starter example?")) {
      setMap(DEMO_STATE);
      setSelectedId(null);
    }
  };

  const clearMap = () => {
    if (window.confirm("Remove every item from this map?")) {
      setMap((current) => ({ ...current, items: [] }));
      setSelectedId(null);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#canvas" aria-label="Quadrants home">quadrants<span>.</span></a>
        <div className="save-status" aria-live="polite"><i className={saved ? "saved" : "saving"} />{saved ? "Saved on this device" : "Saving…"}</div>
        <div className="top-actions">
          <button className="button secondary" onClick={() => uploadRef.current?.click()}><span>＋</span> Add images</button>
          <button className="button primary" onClick={exportPng}>Export PNG <span>↗</span></button>
          <button className="mobile-tools" onClick={() => setMobilePanel((value) => !value)} aria-label="Toggle editing tools">☰</button>
        </div>
      </header>

      <input ref={uploadRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={handleFiles} />

      <div className="workspace">
        <aside className={`sidebar ${mobilePanel ? "open" : ""}`} aria-label="Map controls">
          <section>
            <p className="eyebrow">Map details</p>
            <label>Title<input value={map.title} onChange={(event) => patchMap("title", event.target.value)} /></label>
            <label>Subtitle<input value={map.subtitle} onChange={(event) => patchMap("subtitle", event.target.value)} /></label>
          </section>

          <section>
            <p className="eyebrow">Axis labels</p>
            <div className="field-grid">
              <label>Left<input value={map.xLeft} onChange={(event) => patchMap("xLeft", event.target.value)} /></label>
              <label>Right<input value={map.xRight} onChange={(event) => patchMap("xRight", event.target.value)} /></label>
              <label>Top<input value={map.yTop} onChange={(event) => patchMap("yTop", event.target.value)} /></label>
              <label>Bottom<input value={map.yBottom} onChange={(event) => patchMap("yBottom", event.target.value)} /></label>
            </div>
          </section>

          <section>
            <p className="eyebrow">Quadrants</p>
            <div className="field-grid quadrants-fields">
              {map.quadrants.map((label, index) => (
                <label key={index}>Q{index + 1}<input value={label} onChange={(event) => {
                  const quadrants = [...map.quadrants] as MapState["quadrants"];
                  quadrants[index] = event.target.value;
                  patchMap("quadrants", quadrants);
                }} /></label>
              ))}
            </div>
          </section>

          <section className={`item-editor ${selected ? "active" : ""}`}>
            <p className="eyebrow">Selected item</p>
            {selected ? <>
              <label>Label<input value={selected.label} onChange={(event) => patchItem(selected.id, { label: event.target.value })} /></label>
              <label>Size <output>{selected.size}px</output><input className="range" type="range" min="48" max="128" value={selected.size} onChange={(event) => patchItem(selected.id, { size: Number(event.target.value) })} /></label>
              <button className="text-button danger" onClick={removeSelected}>Remove item</button>
            </> : <p className="hint">Select an image on the map to edit it.</p>}
          </section>

          <div className="sidebar-bottom">
            <p><strong>Private by design.</strong><br />Your map and images stay in this browser.</p>
            <div><button className="text-button" onClick={resetDemo}>Reset example</button><button className="text-button danger" onClick={clearMap}>Clear items</button></div>
          </div>
        </aside>

        <section className="canvas-area" id="canvas" onClick={() => setMobilePanel(false)}>
          <div className="canvas-heading">
            <div><h1>{map.title || "Untitled map"}</h1><p>{map.subtitle}</p></div>
            <p className="drag-note"><span>↖</span> Drag anything to reposition</p>
          </div>

          <div className="map-frame">
            <span className="axis-label axis-top">{map.yTop}</span>
            <span className="axis-label axis-bottom">{map.yBottom}</span>
            <span className="axis-label axis-left">{map.xLeft}</span>
            <span className="axis-label axis-right">{map.xRight}</span>
            <div
              className="board"
              ref={boardRef}
              onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
              onDrop={(event) => { event.preventDefault(); void addFiles(Array.from(event.dataTransfer.files)); }}
            >
              <div className="axis axis-x" /><div className="axis axis-y" />
              {map.quadrants.map((label, index) => <span className={`quadrant-label q${index + 1}`} key={index}>{label}</span>)}
              {map.items.map((item) => (
                <button
                  className={`map-item ${selectedId === item.id ? "selected" : ""}`}
                  key={item.id}
                  style={{ left: `${item.x}%`, top: `${item.y}%`, width: item.size, height: item.size }}
                  onPointerDown={(event) => pointerDown(event, item)}
                  onPointerMove={pointerMove}
                  onPointerUp={() => { dragRef.current = null; }}
                  onPointerCancel={() => { dragRef.current = null; }}
                  onKeyDown={(event) => handleKey(event, item)}
                  aria-label={`${item.label}, draggable map item`}
                >
                  <span className="item-visual" style={{ background: item.color }}>
                    {/* User-provided data URLs must render directly and never reach an image server. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.src ? <img src={item.src} alt="" draggable={false} /> : <b>{item.initials}</b>}
                  </span>
                  <span className="item-label">{item.label}</span>
                </button>
              ))}
              {!map.items.length && <button className="empty-state" onClick={(event) => { event.stopPropagation(); uploadRef.current?.click(); }}><span>＋</span><strong>Add your first images</strong><small>PNG, JPG, GIF or WebP</small></button>}
            </div>
          </div>
          <footer><span>quadrants.io</span><span>{map.items.length} item{map.items.length === 1 ? "" : "s"} · stored locally</span></footer>
        </section>
      </div>
    </main>
  );
}
