"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Check, CheckCheck, ImagePlus, Mic, RotateCcw, SendHorizontal, Upload, X } from "lucide-react";
import { resetSandbox, sendToBot, type SendResult } from "./actions";
import type { ChatEntry, IncomingMessage, OutgoingMessage, Photo, ReplyButton } from "@/lib/types";
import s from "./simulador.module.css";

type Sample = { id: string; label: string; photo: Photo; dark?: boolean };
type Pending = { id: string; message: IncomingMessage };

const TRIES = ["hola", "vendí la jarrita blanca", "bajale 2000 a la tetera", "se me rompió una taza", "deshacer", "lista"];

const formatSeconds = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

/** Grabador de audio como el de WhatsApp: tocar para grabar, tocar para mandar. */
function useRecorder(onAudio: (file: File) => void, onError: (msg: string) => void) {
  const [state, setState] = useState<{ rec: MediaRecorder; started: number } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const send = useRef(true);

  useEffect(() => {
    if (!state) return;
    const t = setInterval(() => {
      const secs = Math.floor((Date.now() - state.started) / 1000);
      setSeconds(secs);
      // Como mucho 30 segundos: alcanza para decir lo que haga falta y cuida el crédito de la IA.
      if (secs >= 30 && state.rec.state === "recording") {
        send.current = true;
        state.rec.stop();
      }
    }, 250);
    return () => clearInterval(t);
  }, [state]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setState(null);
        setSeconds(0);
        if (!send.current || !chunks.length) return;
        const mime = rec.mimeType || "audio/webm";
        onAudio(new File(chunks, `audio.${mime.includes("mp4") ? "m4a" : "webm"}`, { type: mime }));
      };
      send.current = true;
      rec.start();
      setState({ rec, started: Date.now() });
    } catch {
      onError("No pude usar el micrófono. Fijate que el navegador tenga permiso.");
    }
  }

  function stop(shouldSend: boolean) {
    send.current = shouldSend;
    state?.rec.stop();
  }

  return { recording: Boolean(state), seconds, start, stop };
}

export function Simulator({
  storeId,
  initialChat,
  samples,
  voice,
}: {
  storeId: string;
  initialChat: ChatEntry[];
  samples: Sample[];
  voice: boolean;
}) {
  const [chat, setChat] = useState(initialChat);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [picker, setPicker] = useState(false);
  const [draft, setDraft] = useState<{ sample?: Sample; file?: File; preview: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [pageVersion, setPageVersion] = useState(0);
  const [tab, setTab] = useState<"chat" | "page">("chat");
  const [updated, setUpdated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat, pending]);

  function send(form: FormData, optimistic: IncomingMessage) {
    setError(null);
    setPending({ id: "pending", message: optimistic });
    startTransition(async () => {
      const res: SendResult = await sendToBot(form);
      setPending(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setChat(res.chat);
      if (res.changed) {
        setPageVersion((v) => v + 1);
        setUpdated(true);
      }
    });
  }

  function sendText(value: string) {
    const t = value.trim();
    if (!t || isPending) return;
    const f = new FormData();
    f.set("kind", "text");
    f.set("text", t);
    setText("");
    send(f, { kind: "text", text: t });
  }

  function pressButton(b: ReplyButton) {
    if (isPending) return;
    const f = new FormData();
    f.set("kind", "button");
    f.set("id", b.id);
    f.set("title", b.title);
    send(f, { kind: "button", id: b.id, title: b.title });
  }

  const recorder = useRecorder(
    (file) => {
      const f = new FormData();
      f.set("kind", "audio");
      f.set("file", file);
      send(f, { kind: "text", text: "Audio", voice: true });
    },
    (msg) => setError(msg),
  );
  const recording = recorder.recording;

  function sendPhoto() {
    if (!draft || isPending) return;
    const f = new FormData();
    f.set("kind", "image");
    f.set("caption", caption);
    if (draft.sample) f.set("sample", draft.sample.id);
    if (draft.file) f.set("file", draft.file);
    send(f, { kind: "image", photo: { url: draft.preview, width: 4, height: 3 }, caption: caption || undefined });
    setDraft(null);
    setCaption("");
  }

  function reset() {
    startTransition(async () => {
      const res = await resetSandbox();
      if (res.ok) {
        setChat([]);
        setPageVersion((v) => v + 1);
        setUpdated(false);
      }
    });
  }

  const lastBot = [...chat].reverse().find((e) => e.from === "bot");
  const liveButtons = !pending && lastBot ? lastBot : null;

  return (
    <div className={s.stage} data-tab={tab}>
      <div className={s.tabs} role="tablist" aria-label="Qué ver">
        <button role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")}>
          WhatsApp de Norma
        </button>
        <button
          role="tab"
          aria-selected={tab === "page"}
          onClick={() => {
            setTab("page");
            setUpdated(false);
          }}
        >
          La página {updated && <span className={s.dot} aria-label="cambió" />}
        </button>
      </div>

      <section className={`${s.column} ${s.chatColumn}`} aria-label="El WhatsApp de Norma">
        <p className={s.caption}>El WhatsApp de Norma</p>
        <div className={s.phone}>
          <div className={s.waHeader}>
            <span className={s.avatar} aria-hidden>
              <span className="brush" style={{ ["--src" as string]: "url(/plates/logo.webp)" }} />
            </span>
            <span className={s.waName}>
              Mi página
              <small>{isPending ? "escribiendo…" : "en línea"}</small>
            </span>
            <button className={s.reset} onClick={reset} disabled={isPending} title="Empezar de nuevo">
              <RotateCcw size={18} aria-hidden />
              <span>Empezar de nuevo</span>
            </button>
          </div>

          <div className={s.thread} ref={scroller} aria-live="polite">
            <p className={s.system}>Sos Norma. Este es tu chat con tu página.</p>
            <div className={`${s.row} ${s.rowIn}`}>
              <div className={`${s.bubble} ${s.in}`}>
                <p className={s.bubbleText}>
                  {"¡Hola, Norma! Escribime como a cualquier persona:\n\n"}
                  {"• Mandame una foto para agregar una pieza (tocá la cámara de abajo).\n"}
                  {"• «vendí la 14», o «vendí la jarrita blanca», para sacar una que vendiste.\n"}
                  {"• «la 23 ahora sale 19000» para cambiar un precio.\n"}
                  {"• «deshacer» si te equivocaste."}
                  {voice && "\n\nO mandame un audio con tus palabras, como «la jarrita blanca ya la vendí». Tocá el micrófono."}
                </p>
                <span className={s.meta}>Mi página</span>
              </div>
            </div>
            {chat.map((e, i) => (
              <Bubble
                key={e.id}
                entry={e}
                buttons={e === liveButtons && i === chat.length - 1 ? (e.message as OutgoingMessage).buttons : undefined}
                onButton={pressButton}
              />
            ))}
            {pending && <Bubble entry={{ id: "p", from: "norma", at: "", message: pending.message }} sending />}
            {updated && !isPending && (
              <button
                className={s.seeChange}
                onClick={() => {
                  setTab("page");
                  setUpdated(false);
                }}
              >
                Ver cómo quedó la página
              </button>
            )}
            {isPending && (
              <div className={`${s.bubble} ${s.in} ${s.typing}`} aria-label="Escribiendo">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>

          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}

          <div className={s.tries} aria-label="Cosas para probar">
            {TRIES.map((t) => (
              <button key={t} onClick={() => sendText(t)} disabled={isPending}>
                {t}
              </button>
            ))}
          </div>

          {recording ? (
            <div className={s.composer} role="status">
              <button type="button" className={s.iconButton} onClick={() => recorder.stop(false)} aria-label="Cancelar el audio">
                <X size={24} aria-hidden />
              </button>
              <span className={s.recording}>
                <i aria-hidden /> Grabando… {formatSeconds(recorder.seconds)}
              </span>
              <button type="button" className={s.send} onClick={() => recorder.stop(true)} aria-label="Mandar el audio">
                <SendHorizontal size={22} aria-hidden />
              </button>
            </div>
          ) : (
            <form
              className={s.composer}
              onSubmit={(e) => {
                e.preventDefault();
                sendText(text);
              }}
            >
              <button type="button" className={s.iconButton} onClick={() => setPicker(true)} aria-label="Mandar una foto" disabled={isPending}>
                <Camera size={24} aria-hidden />
              </button>
              <input
                className={s.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={voice ? "Escribí, o tocá el micrófono" : "Escribí un mensaje"}
                aria-label="Mensaje para la página"
                enterKeyHint="send"
                maxLength={500}
              />
              {voice && !text.trim() ? (
                <button type="button" className={s.send} onClick={() => recorder.start()} aria-label="Grabar un audio" disabled={isPending}>
                  <Mic size={22} aria-hidden />
                </button>
              ) : (
                <button type="submit" className={s.send} aria-label="Mandar" disabled={isPending || !text.trim()}>
                  <SendHorizontal size={22} aria-hidden />
                </button>
              )}
            </form>
          )}

          {picker && (
            <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Elegí una foto">
              <div className={s.sheetHead}>
                <span>Elegí una foto</span>
                <button onClick={() => setPicker(false)} aria-label="Cerrar">
                  <X size={22} aria-hidden />
                </button>
              </div>
              <div className={s.samples}>
                {samples.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDraft({ sample: p, preview: p.photo.url });
                      setPicker(false);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.photo.url} alt="" />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
              <button className={s.upload} onClick={() => fileInput.current?.click()}>
                <Upload size={20} aria-hidden /> Subir una foto mía
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDraft({ file, preview: URL.createObjectURL(file) });
                    setPicker(false);
                  }
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {draft && (
            <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Mandar foto">
              <div className={s.sheetHead}>
                <span>Mandar foto</span>
                <button onClick={() => setDraft(null)} aria-label="Cancelar">
                  <X size={22} aria-hidden />
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.draftPhoto} src={draft.preview} alt="La foto que vas a mandar" />
              <form
                className={s.composer}
                onSubmit={(e) => {
                  e.preventDefault();
                  sendPhoto();
                }}
              >
                <ImagePlus size={22} aria-hidden className={s.captionIcon} />
                <input
                  className={s.input}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Nombre y precio (opcional), ej: Taza verde 8500"
                  aria-label="Texto de la foto"
                  maxLength={300}
                  autoFocus
                />
                <button type="submit" className={s.send} aria-label="Mandar foto">
                  <SendHorizontal size={22} aria-hidden />
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      <section className={`${s.column} ${s.pageColumn}`} aria-label="La página de Norma">
        <p className={s.caption}>
          Su página, en el celu de un comprador
          {updated && <span className={s.flash}>recién actualizada</span>}
        </p>
        <div className={`${s.phone} ${s.pagePhone}`}>
          <iframe
            key={pageVersion}
            src={`/tienda/${storeId}?compacta${pageVersion ? "#piezas" : ""}`}
            title="La página de Norma"
            className={s.frame}
            // Después de un cambio, la página abre en las piezas. El ancla sola a veces no alcanza
            // (el contenido llega por streaming), así que se asegura al terminar de cargar.
            // Se mueve solo la ventana de adentro: scrollIntoView arrastraría también la página de afuera.
            // Se repite un instante después: al hidratar, la página de adentro a veces vuelve arriba.
            onLoad={(e) => {
              const view = e.currentTarget.contentWindow;
              if (!pageVersion || !view) return;
              const toTiles = () => {
                const tiles = view.document?.getElementById("piezas");
                if (tiles) view.scrollTo({ top: tiles.getBoundingClientRect().top + view.scrollY - 8 });
              };
              toTiles();
              setTimeout(toTiles, 350);
              setTimeout(toTiles, 1000);
            }}
          />
        </div>
        <a className={s.open} href={`/tienda/${storeId}`} target="_blank" rel="noreferrer">
          Abrir la tienda de prueba en otra pestaña
        </a>
      </section>
    </div>
  );
}

function Bubble({
  entry,
  buttons,
  onButton,
  sending = false,
}: {
  entry: ChatEntry;
  buttons?: ReplyButton[];
  onButton?: (b: ReplyButton) => void;
  sending?: boolean;
}) {
  const m = entry.message;
  const mine = entry.from === "norma";
  const time = entry.at ? new Date(entry.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "";
  const body = m.kind === "button" ? m.title : m.kind === "text" ? m.text : m.caption;
  return (
    <div className={`${s.row} ${mine ? s.rowOut : s.rowIn}`}>
      <div className={`${s.bubble} ${mine ? s.out : s.in}`}>
        {m.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={s.bubblePhoto}
            src={m.photo.url}
            style={m.photo.width / m.photo.height > 1.5 ? { aspectRatio: `${m.photo.width} / ${m.photo.height}` } : undefined}
            alt={mine ? "Foto que mandó Norma" : "Vista previa de la pieza"}
          />
        )}
        {m.kind === "text" && "voice" in m && m.voice && (
          <span className={s.voice}>
            <Mic size={16} aria-hidden /> {sending ? "Audio · escuchando…" : "Audio · lo que entendí:"}
          </span>
        )}
        {body && !(sending && m.kind === "text" && "voice" in m && m.voice) && <p className={s.bubbleText}>{body}</p>}
        <span className={s.meta}>
          {time}
          {mine && (sending ? <Check size={14} aria-hidden /> : <CheckCheck size={14} aria-hidden className={s.read} />)}
        </span>
      </div>
      {buttons && buttons.length > 0 && (
        <div className={s.replyButtons}>
          {buttons.map((b) => (
            <button key={b.id + b.title} onClick={() => onButton?.(b)}>
              {b.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
