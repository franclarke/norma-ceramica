// El motor de la conversación con Norma. Es una función pura:
// recibe la tienda y un mensaje, devuelve la tienda nueva y las respuestas.
// Lo usan igual el webhook de WhatsApp y el simulador.
import type { ConversationStep, Draft, IncomingMessage, OutgoingMessage, Piece, ReplyButton, Store } from "../types";
import { cleanTitle, detectIntent, formatPrice, normalize, parsePieceNumber, parsePrice, splitTitleAndPrice } from "./parse";

export type Context = { now: string; siteUrl: string };
export type Result = {
  store: Store;
  replies: OutgoingMessage[];
  /** Pieza publicada o cambiada en este turno (para mandarle a Norma cómo quedó). */
  touched?: number;
};

const B = {
  add: { id: "menu:add", title: "Agregar una pieza" },
  sold: { id: "menu:sold", title: "Vendí una" },
  edit: { id: "menu:edit", title: "Cambiar algo" },
  publish: { id: "confirm:yes", title: "Sí, publicar" },
  save: { id: "confirm:yes", title: "Sí, guardar" },
  remove: { id: "confirm:yes", title: "Sí, sacarla" },
  restore: { id: "confirm:yes", title: "Sí, volver a ponerla" },
  no: { id: "confirm:no", title: "No" },
  cancel: { id: "confirm:no", title: "Cancelar" },
  fix: { id: "confirm:fix", title: "Cambiar algo" },
  fixPhoto: { id: "fix:photo", title: "La foto" },
  fixTitle: { id: "fix:title", title: "El nombre" },
  fixPrice: { id: "fix:price", title: "El precio" },
  retry: { id: "photo:retry", title: "Mando otra" },
  acceptTitle: { id: "title:accept", title: "Sí, ponele ese" },
  keep: { id: "photo:keep", title: "Usar esta" },
} satisfies Record<string, ReplyButton>;

const MENU = [B.add, B.sold, B.edit];

const text = (t: string, buttons?: ReplyButton[]): OutgoingMessage => ({ kind: "text", text: t, buttons });

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const describe = (p: Pick<Piece, "number" | "title">) => `la ${p.number} (${lower(p.title)})`;
const caption = (number: number, title: string, price: number) => `Pieza Nº ${number} · ${title}\n${formatPrice(price)}`;

export function respond(store: Store, msg: IncomingMessage, ctx: Context): Result {
  const s: Store = structuredClone(store);
  const out: OutgoingMessage[] = [];
  const step = s.conversation;
  const set = (c: ConversationStep) => (s.conversation = c);
  const find = (n: number) => s.pieces.find((p) => p.number === n);

  // ---------- Atajos que valen en cualquier momento ----------
  const raw = msg.kind === "text" ? msg.text : msg.kind === "button" ? msg.id : "";
  if (msg.kind === "text") {
    const intent = detectIntent(raw);
    if (intent.type === "cancel" && step.step !== "idle") {
      set({ step: "idle" });
      out.push(text("Listo, lo dejamos ahí. No cambié nada.", MENU));
      return { store: s, replies: out };
    }
    if (intent.type === "undo") return { store: undo(s, out, ctx.now), replies: out };
    if (intent.type === "help") {
      out.push(help());
      return { store: s, replies: out };
    }
  }
  if (msg.kind === "button" && msg.id.startsWith("menu:")) {
    return { store: startMenu(s, msg.id, out), replies: out };
  }

  // ---------- Fotos ----------
  if (msg.kind === "image") {
    const cap = msg.caption?.trim() ?? "";
    const target = step.step === "edit:photo" ? step.number : cap && /^\s*(la|pieza|n[º°o]?\.?)?\s*\d{1,4}\s*$/i.test(cap) ? parsePieceNumber(cap) : null;
    if (target !== null && find(target)) {
      const draft: Draft = { photo: msg.photo };
      set({ step: "edit:confirm", number: target, draft });
      out.push(editPreview(find(target)!, draft));
      return { store: s, replies: out };
    }
    const fromCaption = splitTitleAndPrice(cap);
    const prev = "draft" in step && step.step.startsWith("add:") ? step.draft ?? {} : {};
    const draft: Draft = {
      ...prev,
      photo: msg.photo,
      title: fromCaption.title ?? prev.title,
      price: fromCaption.price ?? prev.price,
      suggestedTitle: msg.suggestedTitle ?? prev.suggestedTitle,
    };
    if (msg.dark) {
      set({ step: "add:dark-photo", draft });
      out.push(text("La foto salió un poco oscura y la pieza no se va a lucir. Si la sacás cerca de una ventana se ve mucho mejor. ¿Querés mandar otra?", [B.retry, B.keep]));
      return { store: s, replies: out };
    }
    return { store: askNext(s, draft, out, true), replies: out };
  }

  // ---------- Según el paso en que estamos ----------
  const answer = msg.kind === "button" ? msg.id : normalize(msg.text);
  const yes = answer === "confirm:yes" || (msg.kind === "text" && detectIntent(msg.text).type === "yes");
  const no = answer === "confirm:no" || (msg.kind === "text" && ["no", "cancel"].includes(detectIntent(msg.text).type));

  switch (step.step) {
    case "add:photo": {
      out.push(text("Estoy esperando la foto de la pieza. Mandámela como cualquier foto de WhatsApp, con el clip o la camarita."));
      return { store: s, replies: out };
    }
    case "add:dark-photo": {
      if (answer === "photo:retry" || no) {
        set({ step: "add:photo", draft: { ...step.draft, photo: undefined } });
        out.push(text("Dale, mandame la otra foto cuando la tengas."));
      } else if (answer === "photo:keep" || yes) {
        askNext(s, step.draft, out, false);
      } else {
        out.push(text("¿Mandás otra foto o uso esta?", [B.retry, B.keep]));
      }
      return { store: s, replies: out };
    }
    case "add:title": {
      if ((answer === "title:accept" || yes) && step.draft.suggestedTitle) {
        return { store: askNext(s, { ...step.draft, title: step.draft.suggestedTitle }, out, false), replies: out };
      }
      if (msg.kind !== "text") break;
      const both = splitTitleAndPrice(msg.text);
      const title = both.title ?? cleanTitle(msg.text);
      if (!title) {
        out.push(text("¿Cómo se llama la pieza? Por ejemplo: Jarra blanca."));
        return { store: s, replies: out };
      }
      return { store: askNext(s, { ...step.draft, title, price: both.price ?? step.draft.price }, out, false), replies: out };
    }
    case "add:price": {
      if (msg.kind !== "text") break;
      const price = parsePrice(msg.text);
      if (price === null) {
        out.push(text("No me quedó claro el precio. Escribilo con números, por ejemplo: 12000"));
        return { store: s, replies: out };
      }
      return { store: askNext(s, { ...step.draft, price }, out, false), replies: out };
    }
    case "add:confirm": {
      if (yes) {
        const before = s.nextNumber;
        const next = publish(s, step.draft, ctx, out);
        return { store: next, replies: out, touched: next.nextNumber > before ? before : undefined };
      }
      if (answer === "confirm:fix") {
        out.push(text("¿Qué querés cambiar?", [B.fixPhoto, B.fixTitle, B.fixPrice]));
        return { store: s, replies: out };
      }
      if (answer === "fix:photo") {
        set({ step: "add:photo", draft: { ...step.draft, photo: undefined } });
        out.push(text("Dale, mandame la foto nueva."));
        return { store: s, replies: out };
      }
      if (answer === "fix:title") {
        set({ step: "add:title", draft: { ...step.draft, title: undefined } });
        out.push(text("¿Cómo se llama la pieza?"));
        return { store: s, replies: out };
      }
      if (answer === "fix:price") {
        set({ step: "add:price", draft: { ...step.draft, price: undefined } });
        out.push(text("¿Cuánto sale? Escribí solo el número, por ejemplo: 12000"));
        return { store: s, replies: out };
      }
      if (no) {
        set({ step: "idle" });
        out.push(text("Listo, no publiqué nada.", MENU));
        return { store: s, replies: out };
      }
      out.push(text("¿La publico así?", [B.publish, B.fix, B.cancel]));
      return { store: s, replies: out };
    }
    case "sold:number":
    case "edit:number": {
      const n = msg.kind === "text" ? parsePieceNumber(msg.text) : null;
      if (n === null) {
        out.push(text("Decime solo el número de la pieza. Está en tu página, en el círculo de cada foto."));
        return { store: s, replies: out };
      }
      return { store: step.step === "sold:number" ? askSold(s, n, out) : askEdit(s, n, out), replies: out };
    }
    case "sold:confirm": {
      if (yes) {
        const p = find(step.number);
        if (p) {
          pushUndo(s, `sacar ${describe(p)}`);
          s.pieces = s.pieces.filter((x) => x.number !== p.number);
          s.sold = [{ ...p, updatedAt: ctx.now }, ...s.sold.filter((x) => x.number !== p.number)];
          s.updatedAt = ctx.now;
          out.push(text(`Listo, saqué ${describe(p)} de la página. ¡Qué bueno que se vendió!\n\nSi fue un error, escribime: deshacer`));
        }
        set({ step: "idle" });
        return { store: s, replies: out };
      }
      if (no) {
        set({ step: "idle" });
        out.push(text("Bueno, la dejo como está.", MENU));
        return { store: s, replies: out };
      }
      out.push(text("¿La saco de la página?", [B.remove, B.no]));
      return { store: s, replies: out };
    }
    case "restore:confirm": {
      if (yes) {
        const p = s.sold.find((x) => x.number === step.number);
        if (p) {
          pushUndo(s, `volver a poner ${describe(p)}`);
          s.sold = s.sold.filter((x) => x.number !== p.number);
          s.pieces = sortPieces([...s.pieces, { ...p, updatedAt: ctx.now }]);
          s.updatedAt = ctx.now;
          out.push(text(`Listo, ${describe(p)} volvió a la página.`));
        }
        set({ step: "idle" });
        return { store: s, replies: out };
      }
      set({ step: "idle" });
      out.push(text("Bueno, no la vuelvo a poner.", MENU));
      return { store: s, replies: out };
    }
    case "edit:what": {
      const p = find(step.number);
      if (!p) break;
      if (answer === "fix:photo") {
        set({ step: "edit:photo", number: p.number });
        out.push(text(`Mandame la foto nueva de ${describe(p)}.`));
      } else if (answer === "fix:title") {
        set({ step: "edit:title", number: p.number });
        out.push(text(`¿Cómo se llama ahora ${describe(p)}?`));
      } else if (answer === "fix:price") {
        set({ step: "edit:price", number: p.number });
        out.push(text(`¿Cuánto sale ahora ${describe(p)}? Hoy está a ${formatPrice(p.price)}.`));
      } else if (no) {
        set({ step: "idle" });
        out.push(text("Bueno, no cambio nada.", MENU));
      } else {
        out.push(text("¿Qué le cambio?", [B.fixPhoto, B.fixTitle, B.fixPrice]));
      }
      return { store: s, replies: out };
    }
    case "edit:photo": {
      out.push(text("Estoy esperando la foto nueva. Mandámela como cualquier foto de WhatsApp."));
      return { store: s, replies: out };
    }
    case "edit:title":
    case "edit:price": {
      const p = find(step.number);
      if (!p || msg.kind !== "text") break;
      let draft: Draft;
      if (step.step === "edit:title") {
        const title = cleanTitle(msg.text);
        if (!title) {
          out.push(text("¿Cómo se llama la pieza?"));
          return { store: s, replies: out };
        }
        draft = { title };
      } else {
        const price = parsePrice(msg.text);
        if (price === null) {
          out.push(text("No me quedó claro el precio. Escribilo con números, por ejemplo: 9500"));
          return { store: s, replies: out };
        }
        draft = { price };
      }
      set({ step: "edit:confirm", number: p.number, draft });
      out.push(editPreview(p, draft));
      return { store: s, replies: out };
    }
    case "edit:confirm": {
      const p = find(step.number);
      if (p && yes) {
        pushUndo(s, `cambiar ${describe(p)}`);
        const next = { ...p, ...stripUndefined(step.draft), updatedAt: ctx.now };
        s.pieces = s.pieces.map((x) => (x.number === p.number ? next : x));
        s.updatedAt = ctx.now;
        set({ step: "idle" });
        out.push(text(`Listo, ya cambié la ${p.number} en tu página.\n\nSi fue un error, escribime: deshacer`));
        return { store: s, replies: out, touched: p.number };
      }
      set({ step: "idle" });
      out.push(text("Bueno, no cambio nada.", MENU));
      return { store: s, replies: out };
    }
    case "idle":
      break;
  }

  // ---------- Sin paso pendiente: ¿qué quiere hacer? ----------
  if (msg.kind === "button") {
    // Un botón viejo de un mensaje anterior: volvemos al menú.
    set({ step: "idle" });
    out.push(text("¿Qué querés hacer?", MENU));
    return { store: s, replies: out };
  }
  const intent = detectIntent(msg.text);
  switch (intent.type) {
    case "greeting":
      out.push(text(`¡Hola, ${s.ownerName}! ¿Qué querés hacer?`, MENU));
      break;
    case "menu:add":
      startMenu(s, "menu:add", out);
      break;
    case "sold":
      if (intent.number === null) startMenu(s, "menu:sold", out);
      else askSold(s, intent.number, out);
      break;
    case "restore": {
      const p = intent.number !== null ? s.sold.find((x) => x.number === intent.number) : undefined;
      if (!p) {
        out.push(text(intent.number === null ? "¿Qué número tenía la pieza que querés volver a poner?" : `No tengo guardada ninguna pieza vendida con el número ${intent.number}.`));
        break;
      }
      set({ step: "restore:confirm", number: p.number });
      out.push({ kind: "image", photo: p.photo, caption: `¿Vuelvo a poner en la página la pieza Nº ${p.number} · ${p.title}?`, buttons: [B.restore, B.no] });
      break;
    }
    case "price": {
      if (intent.number === null) return { store: startMenu(s, "menu:edit", out), replies: out };
      const p = find(intent.number);
      if (!p) {
        out.push(notFound(s, intent.number));
        break;
      }
      if (intent.price === null) {
        set({ step: "edit:price", number: p.number });
        out.push(text(`¿Cuánto sale ahora ${describe(p)}? Hoy está a ${formatPrice(p.price)}.`));
        break;
      }
      set({ step: "edit:confirm", number: p.number, draft: { price: intent.price } });
      out.push(editPreview(p, { price: intent.price }));
      break;
    }
    case "rename": {
      if (intent.number === null) return { store: startMenu(s, "menu:edit", out), replies: out };
      const p = find(intent.number);
      if (!p) {
        out.push(notFound(s, intent.number));
        break;
      }
      if (!intent.title) {
        set({ step: "edit:title", number: p.number });
        out.push(text(`¿Cómo se llama ahora ${describe(p)}?`));
        break;
      }
      set({ step: "edit:confirm", number: p.number, draft: { title: intent.title } });
      out.push(editPreview(p, { title: intent.title }));
      break;
    }
    case "edit":
      if (intent.number === null) startMenu(s, "menu:edit", out);
      else askEdit(s, intent.number, out);
      break;
    case "list":
      out.push(list(s));
      break;
    case "link":
      out.push(text(`Tu página es esta:\n${ctx.siteUrl}\n\nAhora tiene ${count(s.pieces.length)}.`));
      break;
    case "yes":
    case "no":
      out.push(text("¿Qué querés hacer?", MENU));
      break;
    default:
      out.push(text("Perdón, no te entendí. ¿Qué querés hacer?", MENU));
  }
  return { store: s, replies: out };
}

// ---------- Pasos compartidos ----------

function startMenu(s: Store, id: string, out: OutgoingMessage[]): Store {
  if (id === "menu:add") {
    s.conversation = { step: "add:photo" };
    out.push(text("Mandame una foto de la pieza.\n\nSi querés, en el mismo mensaje escribí el nombre y el precio. Por ejemplo: Jarra blanca 12000"));
  } else if (id === "menu:sold") {
    s.conversation = { step: "sold:number" };
    out.push(text("¿Qué número tiene la pieza que vendiste?"));
  } else {
    s.conversation = { step: "edit:number" };
    out.push(text("¿Qué número tiene la pieza que querés cambiar?"));
  }
  return s;
}

function askNext(s: Store, draft: Draft, out: OutgoingMessage[], fresh: boolean): Store {
  if (!draft.title && draft.suggestedTitle) {
    s.conversation = { step: "add:title", draft };
    out.push(text(`${fresh ? "¡Qué linda! " : ""}¿Le pongo «${draft.suggestedTitle}»? Si no, escribime cómo se llama.`, [B.acceptTitle]));
  } else if (!draft.title) {
    s.conversation = { step: "add:title", draft };
    out.push(text(fresh ? "¡Qué linda! ¿Cómo se llama esta pieza?" : "¿Cómo se llama esta pieza?"));
  } else if (!draft.price) {
    s.conversation = { step: "add:price", draft };
    out.push(text(`¿Cuánto sale ${lower(draft.title)}? Escribí solo el número, por ejemplo: 12000`));
  } else {
    s.conversation = { step: "add:confirm", draft };
    out.push({
      kind: "image",
      photo: draft.photo!,
      caption: `Así va a quedar en tu página:\n\n${caption(s.nextNumber, draft.title, draft.price)}\n\n¿La publico?`,
      buttons: [B.publish, B.fix, B.cancel],
    });
  }
  return s;
}

function publish(s: Store, draft: Draft, ctx: Context, out: OutgoingMessage[]): Store {
  if (!draft.photo || !draft.title || !draft.price) return askNext(s, draft, out, false);
  const number = s.nextNumber;
  pushUndo(s, `agregar la ${number} (${lower(draft.title)})`);
  s.pieces = sortPieces([...s.pieces, { number, title: draft.title, price: draft.price, photo: draft.photo, createdAt: ctx.now, updatedAt: ctx.now }]);
  s.nextNumber = number + 1;
  s.updatedAt = ctx.now;
  s.conversation = { step: "idle" };
  out.push(text(`¡Listo! ${draft.title} ya está en tu página con el número ${number}.\n\nCuando la vendas, escribime: vendí la ${number}`));
  return s;
}

function askSold(s: Store, n: number, out: OutgoingMessage[]): Store {
  const p = s.pieces.find((x) => x.number === n);
  if (!p) {
    s.conversation = { step: "idle" };
    out.push(notFound(s, n));
    return s;
  }
  s.conversation = { step: "sold:confirm", number: n };
  out.push({ kind: "image", photo: p.photo, caption: `¿Saco de la página la pieza Nº ${p.number} · ${p.title}?`, buttons: [B.remove, B.no] });
  return s;
}

function askEdit(s: Store, n: number, out: OutgoingMessage[]): Store {
  const p = s.pieces.find((x) => x.number === n);
  if (!p) {
    s.conversation = { step: "idle" };
    out.push(notFound(s, n));
    return s;
  }
  s.conversation = { step: "edit:what", number: n };
  out.push({ kind: "image", photo: p.photo, caption: `${caption(p.number, p.title, p.price)}\n\n¿Qué le cambio?`, buttons: [B.fixPhoto, B.fixTitle, B.fixPrice] });
  return s;
}

function editPreview(p: Piece, draft: Draft): OutgoingMessage {
  const next = { ...p, ...stripUndefined(draft) };
  return {
    kind: "image",
    photo: next.photo,
    caption: `Así va a quedar:\n\n${caption(next.number, next.title, next.price)}\n\n¿Lo guardo?`,
    buttons: [B.save, B.cancel],
  };
}

function notFound(s: Store, n: number): OutgoingMessage {
  const sold = s.sold.find((x) => x.number === n);
  if (sold) return text(`La ${n} (${lower(sold.title)}) ya la habías sacado de la página. Si la volviste a tener, escribime: volví a tener la ${n}`);
  return text(`No encuentro ninguna pieza con el número ${n}. Fijate el número en el círculo de la foto, o escribime "lista" y te mando todas.`);
}

function list(s: Store): OutgoingMessage {
  if (!s.pieces.length) return text("Todavía no tenés piezas en la página. Mandame una foto y la agregamos.", [B.add]);
  const rows = s.pieces.map((p) => `${p.number} · ${p.title} · ${formatPrice(p.price)}`).join("\n");
  return text(`En tu página hay ${count(s.pieces.length)}:\n\n${rows}`);
}

function help(): OutgoingMessage {
  return text(
    [
      "Así podés manejar tu página, escribiéndome como a cualquier persona:",
      "",
      "• Para agregar una pieza: mandame la foto. Si querés, con el nombre y el precio abajo.",
      "• Si vendiste una: «vendí la 14».",
      "• Para cambiar un precio: «la 14 ahora sale 9000».",
      "• Para cambiar la foto: mandá la foto nueva y escribí abajo el número.",
      "• Si te equivocaste: «deshacer».",
      "• Para ver todo lo que hay: «lista».",
    ].join("\n"),
    MENU,
  );
}

function undo(s: Store, out: OutgoingMessage[], now: string): Store {
  const last = s.undo.pop();
  s.conversation = { step: "idle" };
  if (!last) {
    out.push(text("No hay nada para deshacer. Tu página está como la dejaste."));
    return s;
  }
  s.pieces = last.pieces;
  s.sold = last.sold;
  s.updatedAt = now;
  out.push(text(`Listo, deshice lo último: ${last.label}. La página quedó como antes.`));
  return s;
}

function pushUndo(s: Store, label: string) {
  s.undo = [...s.undo, { label, pieces: s.pieces, sold: s.sold }].slice(-10);
}

const sortPieces = (pieces: Piece[]) => [...pieces].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number);
const count = (n: number) => (n === 1 ? "1 pieza" : `${n} piezas`);
const stripUndefined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
