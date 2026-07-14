"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { moveItemToLayer, normalizeLayers } from "../lib/layers.js";

type Item = {
  id: string;
  x: number;
  y: number;
  size: number;
  label: string;
  src?: string;
  color: string;
  initials: string;
  z: number;
};

type MapState = {
  title: string;
  subtitle: string;
  xLeft: string;
  xRight: string;
  yTop: string;
  yBottom: string;
  quadrants: [string, string, string, string];
  fontPack: string;
  items: Item[];
};

const COLORS = [
  "#F06449", "#FF8A5B", "#F6C344", "#E9E15B", "#B6D63A", "#69C36D", "#2D9C7A", "#45B7B7", "#4BA3F2", "#3E63DD",
  "#6957D9", "#9B6BD3", "#D66BC2", "#EF6A9A", "#C44D56", "#9A6B4F", "#80756B", "#C8C2B8", "#F7F3EA", "#171713",
];
const FONT_PACKS = [
  { id: "modernist", label: "Modernist", detail: "Space Grotesk + Inter" },
  { id: "editorial", label: "Editorial", detail: "Source Serif 4 + DM Sans" },
  { id: "friendly", label: "Friendly", detail: "Manrope + Nunito Sans" },
  { id: "technical", label: "Technical", detail: "IBM Plex Sans + IBM Plex Mono" },
];

const DEMO_STATE: MapState = {
  title: "The AI landscape",
  subtitle: "A point-in-time view · July 2026",
  xLeft: "Niche",
  xRight: "Universal",
  yTop: "Opinionated",
  yBottom: "Flexible",
  quadrants: ["Cult favorites", "Category leaders", "Specialists", "Platforms"],
  fontPack: "modernist",
  items: [
    { id: "demo-1", x: 22, y: 24, size: 72, label: "Northstar", color: COLORS[0], initials: "N", z: 1 },
    { id: "demo-2", x: 66, y: 20, size: 80, label: "Arc", color: COLORS[9], initials: "A", z: 2 },
    { id: "demo-3", x: 79, y: 43, size: 68, label: "Bloom", color: COLORS[4], initials: "B", z: 3 },
    { id: "demo-4", x: 35, y: 62, size: 76, label: "Relay", color: COLORS[2], initials: "R", z: 4 },
    { id: "demo-5", x: 59, y: 76, size: 70, label: "Mosaic", color: COLORS[11], initials: "M", z: 5 },
  ],
};

const DB_NAME = "byaxis-local";
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
    request.onsuccess = () => {
      const stored = request.result as Partial<MapState> | undefined;
      if (!stored) return resolve(null);
      const items = normalizeLayers((stored.items ?? DEMO_STATE.items).map((item, index) => ({ ...item, z: item.z ?? index + 1 })));
      const fontPack = FONT_PACKS.some((pack) => pack.id === stored.fontPack) ? stored.fontPack! : DEMO_STATE.fontPack;
      resolve({ ...DEMO_STATE, ...stored, items, fontPack });
    };
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
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(COLORS[0]);
  const [draftSrc, setDraftSrc] = useState<string | undefined>();
  const [fileDragActive, setFileDragActive] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const itemFileRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!itemModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setItemModalOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [itemModalOpen]);

  const selected = useMemo(() => map.items.find((item) => item.id === selectedId) ?? null, [map.items, selectedId]);
  const layeredItems = useMemo(() => [...map.items].sort((a, b) => b.z - a.z), [map.items]);
  const activeFontPack = FONT_PACKS.find((pack) => pack.id === map.fontPack) ?? FONT_PACKS[0];

  const patchMap = <K extends keyof MapState>(key: K, value: MapState[K]) => setMap((current) => ({ ...current, [key]: value }));

  const patchItem = useCallback((id: string, updates: Partial<Item>) => {
    setMap((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, ...updates } : item),
    }));
  }, []);

  const setLayerPosition = useCallback((id: string, requestedPosition: number) => {
    setMap((current) => ({ ...current, items: moveItemToLayer(current.items, id, requestedPosition) }));
  }, []);

  const openItemModal = () => {
    setDraftName("");
    setDraftColor(COLORS[map.items.length % COLORS.length]);
    setDraftSrc(undefined);
    setFileDragActive(false);
    setItemModalOpen(true);
  };

  const prepareItemFile = async (file?: File) => {
    if (!file?.type.startsWith("image/")) return;
    setDraftSrc(await fileToDataUrl(file));
    if (!draftName.trim()) setDraftName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
  };

  const handleItemFile = async (event: ChangeEvent<HTMLInputElement>) => {
    await prepareItemFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const createItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = draftName.trim();
    if (!label) return;
    const id = crypto.randomUUID();
    setMap((current) => {
      const index = current.items.length;
      const topLayer = Math.max(0, ...current.items.map((item) => item.z));
      const item: Item = {
        id,
        x: 35 + (index * 11) % 35,
        y: 34 + (index * 13) % 34,
        size: 76,
        label,
        src: draftSrc,
        color: draftColor,
        initials: label.slice(0, 2).toUpperCase(),
        z: topLayer + 1,
      };
      return { ...current, items: [...current.items, item] };
    });
    setSelectedId(id);
    setItemModalOpen(false);
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
    setMap((current) => ({ ...current, items: normalizeLayers(current.items.filter((item) => item.id !== selectedId)) }));
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
      setMap((current) => ({ ...current, items: normalizeLayers(current.items.filter((candidate) => candidate.id !== item.id)) }));
      setSelectedId(null);
    }
  };

  const exportPng = async () => {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const heading = document.querySelector<HTMLElement>(".canvas-heading h1");
    const canvasArea = document.querySelector<HTMLElement>(".canvas-area");
    const displayFont = heading ? getComputedStyle(heading).fontFamily : "Arial, sans-serif";
    const bodyFont = canvasArea ? getComputedStyle(canvasArea).fontFamily : "Arial, sans-serif";
    ctx.fillStyle = "#F4F0E8";
    ctx.fillRect(0, 0, 1600, 1200);
    ctx.fillStyle = "#171713";
    ctx.font = `700 66px ${displayFont}`;
    ctx.fillText(map.title, 104, 110);
    ctx.globalAlpha = 0.58;
    ctx.font = `24px ${bodyFont}`;
    ctx.fillText(map.subtitle, 106, 152);
    ctx.globalAlpha = 1;
    const left = 190, top = 235, width = 1220, height = 820;
    ctx.strokeStyle = "rgba(23,23,19,.65)";
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, width, height);
    ctx.beginPath(); ctx.moveTo(left + width / 2, top); ctx.lineTo(left + width / 2, top + height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, top + height / 2); ctx.lineTo(left + width, top + height / 2); ctx.stroke();
    ctx.fillStyle = "rgba(23,23,19,.5)";
    ctx.font = `700 19px ${bodyFont}`;
    ctx.fillText(map.quadrants[0].toUpperCase(), left + 24, top + 38);
    ctx.fillText(map.quadrants[1].toUpperCase(), left + width / 2 + 24, top + 38);
    ctx.fillText(map.quadrants[2].toUpperCase(), left + 24, top + height / 2 + 38);
    ctx.fillText(map.quadrants[3].toUpperCase(), left + width / 2 + 24, top + height / 2 + 38);
    ctx.font = `20px ${bodyFont}`;
    ctx.fillText(map.yTop, left - 2, top - 22);
    ctx.fillText(map.yBottom, left - 2, top + height + 44);
    ctx.textAlign = "right";
    ctx.fillText(map.xRight, left + width, top + height + 44);
    ctx.textAlign = "left";
    ctx.fillText(map.xLeft, left, top + height + 44);

    for (const item of [...map.items].sort((a, b) => a.z - b.z)) {
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
        ctx.fillStyle = item.color === "#171713" ? "#F4F0E8" : "#171713";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `800 ${size * .36}px ${displayFont}`;
        ctx.fillText(item.initials, cx, cy + 2);
      }
      ctx.restore();
      ctx.fillStyle = "#171713";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `700 19px ${bodyFont}`;
      ctx.fillText(item.label, cx, cy + size / 2 + 27);
    }
    ctx.fillStyle = "rgba(23,23,19,.45)";
    ctx.textAlign = "right";
    ctx.font = `700 18px ${bodyFont}`;
    ctx.fillText("byaxis", 1496, 1150);
    const link = document.createElement("a");
    link.download = `${map.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "quadrant-map"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const resetDemo = () => {
    if (window.confirm("Replace this map with the example map?")) {
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
    <main className={`app-shell font-${map.fontPack}`}>
      <header className="topbar">
        <a className="brand" href="#canvas" aria-label="Byaxis home">byaxis<span>.</span></a>
        <div className="save-status" aria-live="polite"><i className={saved ? "saved" : "saving"} />{saved ? "Saved on this device" : "Saving…"}</div>
        <div className="top-actions">
          <button className="button secondary" onClick={openItemModal}><span>＋</span> Add item</button>
          <button className="button primary" onClick={exportPng}>Export PNG <span>↗</span></button>
          <button className="mobile-tools" onClick={() => setMobilePanel((value) => !value)} aria-label="Toggle editing tools">☰</button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`sidebar ${mobilePanel ? "open" : ""}`} aria-label="Map controls">
          <button className="sidebar-add-item" onClick={() => { setMobilePanel(false); openItemModal(); }}>＋ Add item</button>
          <section>
            <p className="eyebrow">Map details</p>
            <label>Title<input value={map.title} onChange={(event) => patchMap("title", event.target.value)} /></label>
            <label>Subtitle<input value={map.subtitle} onChange={(event) => patchMap("subtitle", event.target.value)} /></label>
            <label>Font package
              <select value={map.fontPack} onChange={(event) => patchMap("fontPack", event.target.value)}>
                {FONT_PACKS.map((pack) => <option value={pack.id} key={pack.id}>{pack.label} — {pack.detail}</option>)}
              </select>
            </label>
            <div className="font-sample" aria-label={`${activeFontPack.label} font preview`}><b>Aa</b><span>{activeFontPack.detail}</span></div>
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
            <div className="field-grid quadrant-fields">
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
              <label>Layer
                <select value={selected.z} onChange={(event) => setLayerPosition(selected.id, Number(event.target.value))}>
                  {map.items.map((_, index) => <option value={index + 1} key={index}>{index + 1}{index === 0 ? " · Back" : index === map.items.length - 1 ? " · Front" : ""}</option>)}
                </select>
              </label>
              <div className="layer-controls" aria-label="Move selected item between layers">
                <button onClick={() => setLayerPosition(selected.id, 1)} title="Send to back">⇤</button>
                <button onClick={() => setLayerPosition(selected.id, selected.z - 1)} title="Move backward">←</button>
                <button onClick={() => setLayerPosition(selected.id, selected.z + 1)} title="Move forward">→</button>
                <button onClick={() => setLayerPosition(selected.id, map.items.length)} title="Bring to front">⇥</button>
              </div>
              <button className="text-button danger" onClick={removeSelected}>Remove item</button>
            </> : <p className="hint">Select an item on the map to edit it.</p>}
          </section>

          <section>
            <p className="eyebrow">Items <span>Front to back</span></p>
            <div className="layers-list">
              {layeredItems.map((item) => (
                <button className={`layer-row ${item.id === selectedId ? "selected" : ""}`} key={item.id} onClick={() => setSelectedId(item.id)}>
                  <span className="layer-thumb" style={{ background: item.color, color: item.color === "#171713" ? "#F4F0E8" : "#171713" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.src ? <img src={item.src} alt="" /> : item.initials}
                  </span>
                  <span>{item.label}</span><small>{item.z}</small>
                </button>
              ))}
            </div>
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
            <div className="board" ref={boardRef}>
              <div className="axis axis-x" /><div className="axis axis-y" />
              {map.quadrants.map((label, index) => <span className={`quadrant-label q${index + 1}`} key={index}>{label}</span>)}
              {map.items.map((item) => (
                <button
                  className={`map-item ${selectedId === item.id ? "selected" : ""}`}
                  key={item.id}
                  style={{ left: `${item.x}%`, top: `${item.y}%`, width: item.size, height: item.size, zIndex: item.z }}
                  onPointerDown={(event) => pointerDown(event, item)}
                  onPointerMove={pointerMove}
                  onPointerUp={() => { dragRef.current = null; }}
                  onPointerCancel={() => { dragRef.current = null; }}
                  onKeyDown={(event) => handleKey(event, item)}
                  aria-label={`${item.label}, draggable map item`}
                >
                  <span className="item-visual" style={{ background: item.color, color: item.color === "#171713" ? "#F4F0E8" : "#171713" }}>
                    {/* User-provided data URLs must render directly and never reach an image server. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.src ? <img src={item.src} alt="" draggable={false} /> : <b>{item.initials}</b>}
                  </span>
                  <span className="item-label">{item.label}</span>
                </button>
              ))}
              {!map.items.length && <button className="empty-state" onClick={(event) => { event.stopPropagation(); openItemModal(); }}><span>＋</span><strong>Add your first item</strong><small>Use a color or your own image</small></button>}
            </div>
          </div>
          <footer><span>byaxis</span><span>{map.items.length} item{map.items.length === 1 ? "" : "s"} · stored locally</span></footer>
        </section>
      </div>

      {itemModalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setItemModalOpen(false); }}>
          <form className="item-modal" role="dialog" aria-modal="true" aria-labelledby="add-item-title" onSubmit={createItem}>
            <div className="modal-heading">
              <div><p className="eyebrow">New item</p><h2 id="add-item-title">Add an item</h2></div>
              <button type="button" className="modal-close" onClick={() => setItemModalOpen(false)} aria-label="Close">×</button>
            </div>

            <label>Item name<input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="e.g. Northstar" /></label>

            <div className="modal-section">
              <p className="modal-label">Image <span>Optional</span></p>
              <input ref={itemFileRef} className="visually-hidden" type="file" accept="image/*" onChange={handleItemFile} />
              <button
                type="button"
                className={`image-dropzone ${fileDragActive ? "dragging" : ""}`}
                onClick={() => itemFileRef.current?.click()}
                onDragEnter={(event) => { event.preventDefault(); setFileDragActive(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setFileDragActive(false)}
                onDrop={(event) => { event.preventDefault(); setFileDragActive(false); void prepareItemFile(event.dataTransfer.files[0]); }}
              >
                {draftSrc ? <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draftSrc} alt="Selected item preview" /><span><strong>Image added</strong><small>Drop or click to replace</small></span>
                </> : <><b>↥</b><span><strong>Drop an image here</strong><small>or click to browse</small></span></>}
              </button>
              {draftSrc && <button type="button" className="remove-image" onClick={() => setDraftSrc(undefined)}>Remove image</button>}
            </div>

            <div className="modal-section">
              <p className="modal-label">Color</p>
              <div className="color-palette" role="radiogroup" aria-label="Item color">
                {COLORS.map((color) => <button type="button" role="radio" aria-checked={draftColor === color} aria-label={color} className={draftColor === color ? "selected" : ""} style={{ background: color }} onClick={() => setDraftColor(color)} key={color} />)}
              </div>
            </div>

            <div className="item-preview-row">
              <span>Preview</span>
              <span className="draft-item-preview" style={{ background: draftColor, color: draftColor === "#171713" ? "#F4F0E8" : "#171713" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {draftSrc ? <img src={draftSrc} alt="" /> : (draftName.trim().slice(0, 2).toUpperCase() || "Aa")}
              </span>
              <strong>{draftName.trim() || "Untitled item"}</strong>
            </div>

            <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setItemModalOpen(false)}>Cancel</button><button className="button primary" disabled={!draftName.trim()}>Add item</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
