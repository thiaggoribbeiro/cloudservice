import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { FileTypeIcon } from "./FileTypeIcon";
import { FolderTileIcon } from "./icons";

// Bump when the content changes: anyone who ticked "Não mostrar novamente"
// for an older edition sees the new one.
const EDITION = "2026-11-aptus";
const HIDE_KEY = `avestacloud-whatsnew-hidden-${EDITION}`;

export function shouldShowWhatsNew(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) !== "1";
  } catch {
    return true;
  }
}

function rememberHidden(hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(HIDE_KEY, "1");
    else localStorage.removeItem(HIDE_KEY);
  } catch {
    // Storage blocked: it just shows again next time.
  }
}

const EASE = "cubic-bezier(0.2, 0, 0, 1)";
function anim(name: string, duration: number, delay = 0, fill = "both", ease = EASE): CSSProperties {
  return { animation: `${name} ${duration}ms ${ease} ${delay}ms ${fill}` };
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A thin bar standing in for a line of text in the miniatures.
function Line({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span className={`block h-1.5 rounded-full bg-light-surface-container-high ${className}`} style={style} />;
}

function PhotoGlyph({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center bg-light-surface-container-high text-light-outline ${className}`}>
      <span className="ms-icon text-[20px]" aria-hidden="true">
        landscape
      </span>
    </span>
  );
}

// ---- Scene 1: the new shell assembles itself, then flips to dark ----------
function SceneLayout() {
  const rows = [0, 1, 2, 3];
  return (
    <div
      className="absolute inset-x-6 inset-y-5 overflow-hidden rounded-xl border border-light-outline-variant bg-light-background shadow-md sm:inset-x-10"
      style={anim("wn-dark", 700, 2900, "forwards", "ease-out")}
    >
      <div
        className="absolute inset-y-0 left-0 flex w-[30%] flex-col gap-1.5 border-r border-light-outline-variant bg-light-surface-container-lowest p-2.5"
        style={anim("wn-slide-left", 520, 100)}
      >
        <span className="mb-1 flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-light-primary" />
          <Line className="w-10 bg-light-on-surface/25" />
        </span>
        <span className="mb-1 h-4 rounded-md bg-light-primary" />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="relative flex items-center gap-1.5 rounded-md px-1.5 py-1">
            {i === 1 && (
              <span className="absolute inset-0 rounded-md bg-light-secondary-container" style={anim("wn-fade", 300, 1300)} />
            )}
            <span className="relative h-2 w-2 rounded-sm bg-light-outline/60" />
            <Line className="relative w-10" />
          </span>
        ))}
      </div>

      <div
        className="absolute left-[30%] right-0 top-0 flex h-9 items-center gap-2 border-b border-light-outline-variant bg-light-surface-container-lowest px-2.5"
        style={anim("wn-fade", 400, 450)}
      >
        <span className="h-4 w-2/5 rounded-md border border-light-outline-variant bg-light-surface" />
        <span className="ml-auto flex h-3.5 w-6 items-center rounded-full border border-light-outline-variant bg-light-surface-container-high px-px">
          <span className="h-2.5 w-2.5 rounded-full bg-light-surface-container-lowest shadow-sm" style={anim("wn-knob", 450, 2900, "forwards")} />
        </span>
        <span className="h-4 w-4 rounded-full bg-light-surface-container text-light-primary" />
      </div>

      <div className="absolute bottom-0 left-[30%] right-0 top-9 p-3">
        <Line className="mb-2.5 h-2.5 w-1/3 bg-light-on-surface/30" style={anim("wn-rise", 400, 650)} />
        <div className="overflow-hidden rounded-lg border border-light-outline-variant bg-light-surface-container-lowest">
          {rows.map((i) => (
            <span
              key={i}
              className="flex items-center gap-2 border-b border-light-outline-variant px-2 py-1.5 last:border-b-0"
              style={anim("wn-rise", 420, 800 + i * 110)}
            >
              <span className={`h-3 w-3 rounded-sm ${i < 2 ? "bg-[#F59E0B]" : "bg-light-outline/50"}`} />
              <Line className="w-1/2" />
              <Line className="ml-auto w-8" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Scene 2: one folder cycles list → icons → photos -----------------------
const SCENE2_ITEMS: { kind: "folder" | "photo" | "pdf" }[] = [
  { kind: "folder" },
  { kind: "photo" },
  { kind: "photo" },
  { kind: "pdf" },
  { kind: "photo" },
  { kind: "photo" },
];

function ItemGlyph({ kind, size }: { kind: "folder" | "photo" | "pdf"; size: string }) {
  if (kind === "folder") return <FolderTileIcon className={size} />;
  if (kind === "pdf") return <FileTypeIcon name="a.pdf" mimeType="application/pdf" className={size} />;
  return <PhotoGlyph className={`${size} rounded-md`} />;
}

function SceneViewModes() {
  const LIST_OUT = 2300;
  const ICONS_IN = 2500;
  const ICONS_OUT = 4900;
  const PHOTOS_IN = 5100;
  const labelStyle = (inAt: number | null, outAt: number | null): CSSProperties => {
    const parts = [];
    if (inAt !== null) parts.push(`wn-fade 250ms ease-out ${inAt}ms both`);
    if (outAt !== null) parts.push(`wn-out 200ms ease-in ${outAt}ms forwards`);
    return { animation: parts.join(", ") };
  };

  return (
    <div className="absolute inset-x-6 inset-y-4 sm:inset-x-10">
      <div className="mb-2 flex items-center justify-between">
        <Line className="h-2.5 w-24 bg-light-on-surface/30" />
        <span className="relative flex h-6 w-[104px] items-center rounded-md border border-light-outline-variant bg-light-surface-container-lowest px-2 font-label text-[10px] leading-none text-light-on-surface shadow-sm">
          <span className="absolute inset-0 flex items-center gap-1 px-2" style={labelStyle(null, LIST_OUT)}>
            <span className="ms-icon w-3 text-[12px]">table_rows</span>Detalhes
          </span>
          <span className="absolute inset-0 flex items-center gap-1 px-2" style={labelStyle(ICONS_IN, ICONS_OUT)}>
            <span className="ms-icon w-3 text-[12px]">grid_view</span>Ícones médios
          </span>
          <span className="absolute inset-0 flex items-center gap-1 px-2" style={labelStyle(PHOTOS_IN, null)}>
            <span className="ms-icon w-3 text-[12px]">photo_library</span>Fotos
          </span>
        </span>
      </div>

      <div className="relative h-[calc(100%-2rem)]">
        {/* Detalhes */}
        <div
          className="absolute inset-0 overflow-hidden rounded-lg border border-light-outline-variant bg-light-surface-container-lowest"
          style={{ animation: `wn-out 260ms ease-in ${LIST_OUT}ms forwards` }}
        >
          {SCENE2_ITEMS.map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-2 border-b border-light-outline-variant px-2 py-[5px] last:border-b-0"
              style={anim("wn-rise", 380, 150 + i * 80)}
            >
              <ItemGlyph kind={item.kind} size="h-4 w-4" />
              <Line className="w-2/5" />
              <Line className="ml-auto w-10" />
              <Line className="w-6" />
            </span>
          ))}
        </div>

        {/* Ícones médios */}
        <div
          className="absolute inset-0 grid grid-cols-6 content-center gap-2"
          style={{
            animation: `wn-in 300ms ${EASE} ${ICONS_IN}ms both, wn-out 260ms ease-in ${ICONS_OUT}ms forwards`,
          }}
        >
          {SCENE2_ITEMS.map((item, i) => (
            <span key={i} className="flex flex-col items-center gap-1.5" style={anim("wn-pop", 380, ICONS_IN + 80 + i * 60)}>
              <ItemGlyph kind={item.kind} size="h-9 w-9" />
              <Line className="w-3/4" />
            </span>
          ))}
        </div>

        {/* Fotos */}
        <div className="absolute inset-0 grid grid-cols-3 gap-2" style={anim("wn-in", 320, PHOTOS_IN)}>
          {SCENE2_ITEMS.filter((item) => item.kind !== "folder")
            .slice(0, 3)
            .concat([{ kind: "photo" }, { kind: "photo" }, { kind: "photo" }])
            .slice(0, 6)
            .map((item, i) => (
              <span
                key={i}
                className="flex flex-col overflow-hidden rounded-lg border border-light-outline-variant bg-light-surface-container-lowest"
                style={anim("wn-pop", 400, PHOTOS_IN + 80 + i * 70)}
              >
                {item.kind === "pdf" ? (
                  <span className="flex flex-1 items-center justify-center bg-light-surface-container-low">
                    <ItemGlyph kind="pdf" size="h-7 w-7" />
                  </span>
                ) : (
                  <PhotoGlyph className="flex-1" />
                )}
                <span className="px-1.5 py-1">
                  <Line className="w-2/3" />
                </span>
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

// ---- Scene 3: a click on a PDF opens it full size, pages scroll -------------
function SceneOpen() {
  const CLICK = 1500;
  const OPEN = 1750;
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-6 top-8 grid grid-cols-4 gap-3 sm:inset-x-10">
        <span className="flex flex-col items-center gap-1.5 rounded-lg p-2">
          <FolderTileIcon className="h-12 w-12" />
          <Line className="w-3/4" />
        </span>
        <span className="flex flex-col items-center gap-1.5 rounded-lg p-2">
          <PhotoGlyph className="h-12 w-full rounded-md" />
          <Line className="w-3/4" />
        </span>
        <span className="relative flex flex-col items-center gap-1.5 rounded-lg p-2">
          <span
            className="absolute inset-0 rounded-lg border border-light-primary bg-light-surface-container-lowest shadow-sm"
            style={anim("wn-fade", 200, CLICK - 250)}
          />
          <span className="relative flex flex-col items-center gap-1.5" style={anim("wn-press", 220, CLICK, "none", "ease-out")}>
            <FileTypeIcon name="a.pdf" mimeType="application/pdf" className="h-12 w-12" />
            <Line className="w-10" />
          </span>
          {/* click ring + cursor, centred on the PDF icon */}
          <span
            className="pointer-events-none absolute left-1/2 top-8 -ml-4 -mt-4 h-8 w-8 rounded-full border-2 border-light-primary"
            style={anim("wn-ring", 520, CLICK, "both", "ease-out")}
          />
          <span
            className="pointer-events-none absolute left-1/2 top-8 z-10 text-light-on-surface drop-shadow"
            style={{ animation: `wn-cursor 1000ms ${EASE} 250ms both, wn-out 200ms ease-in ${OPEN + 150}ms forwards` }}
            aria-hidden="true"
          >
            <svg width="18" height="20" viewBox="0 0 18 20">
              <path
                d="M2 1.5v14.2l3.9-3.6 2.5 5.9 2.6-1.1-2.5-5.8h5.4z"
                fill="currentColor"
                stroke="var(--color-light-surface-container-lowest)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
        <span className="flex flex-col items-center gap-1.5 rounded-lg p-2">
          <PhotoGlyph className="h-12 w-full rounded-md" />
          <Line className="w-3/4" />
        </span>
      </div>

      {/* the viewer overlay, growing out of the clicked tile */}
      <div
        className="absolute inset-3 flex flex-col overflow-hidden rounded-xl border border-light-outline-variant bg-light-surface-container-lowest shadow-2xl"
        style={{ ...anim("wn-open", 460, OPEN), transformOrigin: "62% 30%" }}
      >
        <span className="flex items-center gap-2 border-b border-light-outline-variant px-3 py-2">
          <FileTypeIcon name="a.pdf" mimeType="application/pdf" className="h-4 w-4" />
          <Line className="w-28 bg-light-on-surface/30" />
          <span className="ms-icon ml-auto text-[14px] text-light-on-surface-variant">close</span>
        </span>
        <span className="relative flex-1 overflow-hidden bg-light-surface-container-low">
          <span
            className="absolute left-1/2 top-3 flex w-[46%] -translate-x-1/2 flex-col gap-2"
            style={{ animation: `wn-scroll 2600ms ease-in-out ${OPEN + 900}ms forwards` }}
          >
            {[0, 1, 2].map((page) => (
              <span key={page} className="flex flex-col gap-1.5 rounded-sm bg-light-surface-container-lowest p-3 shadow-sm">
                <Line className="mb-1 h-2 w-1/2 bg-light-on-surface/30" />
                {[90, 100, 80, 95, 70, 100, 60].map((w, i) => (
                  <Line key={i} className="h-1" style={{ width: `${w}%` }} />
                ))}
              </span>
            ))}
          </span>
        </span>
        <span className="flex items-center gap-1 border-t border-light-outline-variant px-3 py-1.5">
          <span className="ms-icon text-[14px] text-light-on-surface-variant">chevron_left</span>
          <span className="font-body text-[10px] tabular-nums text-light-on-surface-variant">2 de 3</span>
          <span className="ms-icon text-[14px] text-light-on-surface-variant">chevron_right</span>
          <span className="ml-auto h-4 w-14 rounded-md border border-light-outline-variant" />
        </span>
      </div>
    </div>
  );
}

type Slide = { title: string; body: ReactNode; Scene: () => ReactNode; replayMs: number };

const SLIDES: Slide[] = [
  {
    title: "O Cloud Service está de cara nova",
    body: "O menu agora fica fixo na lateral, a busca está no topo e o tema claro ou escuro se troca no botão ao lado do seu nome.",
    Scene: SceneLayout,
    replayMs: 6500,
  },
  {
    title: "Escolha como ver cada pasta",
    body: "No botão do canto de qualquer pasta, alterne entre Detalhes, Ícones pequenos, médios, grandes e Fotos. Sua escolha fica salva.",
    Scene: SceneViewModes,
    replayMs: 8200,
  },
  {
    title: "Fotos e PDFs abrem com um clique",
    body: "Clique no arquivo para vê-lo inteiro na tela, sem baixar. Use as setas para passar para o próximo da pasta.",
    Scene: SceneOpen,
    replayMs: 6800,
  },
];

export function WhatsNewDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [cycle, setCycle] = useState(0);
  const [hideNextTime, setHideNextTime] = useState(false);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function close() {
    rememberHidden(hideNextTime);
    onClose();
  }

  function go(to: number) {
    if (to < 0 || to >= SLIDES.length || to === index) return;
    setDirection(to > index ? "next" : "prev");
    setIndex(to);
    setCycle(0);
  }

  // Replay the scene on a loop while its slide is showing.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = setTimeout(() => setCycle((c) => c + 1), slide.replayMs);
    return () => clearTimeout(timer);
  }, [index, cycle, slide.replayMs]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  const Scene = slide.Scene;
  const enter = direction === "next" ? "wn-slide-next" : "wn-slide-prev";

  return (
    <div className="animate-fade fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-light-scrim/55 p-3 backdrop-blur-[1px] sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="stagger-0 w-full max-w-[520px] overflow-hidden rounded-2xl border border-light-outline-variant bg-light-surface-container-lowest shadow-2xl"
      >
        <div className="relative h-[224px] overflow-hidden border-b border-light-outline-variant bg-light-surface-container-low" aria-hidden="true">
          <Scene key={`${index}-${cycle}`} />
        </div>

        <div className="px-6 pb-5 pt-5">
          <div key={index} style={anim(enter, 320, 0)}>
            <p className="mb-1 font-label text-label-sm text-light-primary">Novidades</p>
            <h2 id={titleId} className="font-headline text-headline-sm text-light-on-surface">
              {slide.title}
            </h2>
            <p className="mt-1.5 min-h-[60px] font-body text-body-md text-light-on-surface-variant">{slide.body}</p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" role="group" aria-label="Novidades">
              {SLIDES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Novidade ${i + 1} de ${SLIDES.length}: ${s.title}`}
                  aria-current={i === index ? "step" : undefined}
                  className={`h-2 rounded-full transition-all duration-surface-enter ease-surface-enter ${
                    i === index ? "w-6 bg-light-primary" : "w-2 bg-light-outline-variant hover:bg-light-outline"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-gutter-sm">
              {index > 0 ? (
                <button type="button" onClick={() => go(index - 1)} className="btn-ghost">
                  Voltar
                </button>
              ) : (
                <button type="button" onClick={close} className="btn-ghost border-transparent bg-transparent">
                  Pular
                </button>
              )}
              <button type="button" onClick={isLast ? close : () => go(index + 1)} className="btn-primary" autoFocus>
                {isLast ? "Começar a usar" : "Próxima"}
              </button>
            </div>
          </div>

          <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 font-body text-body-sm text-light-on-surface-variant">
            <input
              type="checkbox"
              checked={hideNextTime}
              onChange={(e) => setHideNextTime(e.target.checked)}
              className="h-4 w-4 accent-light-primary"
            />
            Não mostrar novamente
          </label>
        </div>
      </div>
    </div>
  );
}
