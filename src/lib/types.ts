export type Photo = {
  url: string;
  width: number;
  height: number;
};

export type Piece = {
  /** El "numerito": nunca se reutiliza dentro de una tienda. */
  number: number;
  title: string;
  /** Pesos argentinos, entero. */
  price: number;
  photo: Photo;
  createdAt: string;
  updatedAt: string;
};

/** Un botón de respuesta rápida, como los de WhatsApp (máximo 3, 20 caracteres). */
export type ReplyButton = { id: string; title: string };

export type OutgoingMessage =
  | { kind: "text"; text: string; buttons?: ReplyButton[] }
  | { kind: "image"; photo: Photo; caption: string; buttons?: ReplyButton[] };

export type IncomingMessage =
  | { kind: "text"; text: string; voice?: boolean }
  | { kind: "button"; id: string; title: string }
  | { kind: "image"; photo: Photo; caption?: string; dark?: boolean; suggestedTitle?: string };

/** Lo que el bot está esperando de Norma. */
export type Draft = {
  photo?: Photo;
  title?: string;
  price?: number;
  /** Nombre que propuso la IA mirando la foto (Norma lo acepta o escribe otro). */
  suggestedTitle?: string;
  /** La foto salió oscura: antes de seguir le preguntamos si manda otra. */
  dark?: boolean;
};

/** Un cambio pedido sobre una pieza que todavía no sabemos cuál es, o a cuánto. */
export type Change = {
  kind: "price" | "rename" | "edit";
  /** null: quiere cambiar el precio pero no dijo a cuánto. */
  price?: number | null;
  /** "bajale 2000" es -2000. */
  delta?: number;
  /** "bajale un 10%" es -10. */
  percent?: number;
  title?: string | null;
  photo?: boolean;
};

export type ConversationStep =
  | { step: "idle" }
  /** Le acabamos de mostrar una pieza: lo que diga ahora ("ahora sale 9000") es sobre esa. */
  | { step: "piece"; number: number }
  | { step: "add:photo"; draft?: Draft }
  | { step: "add:title"; draft: Draft }
  | { step: "add:price"; draft: Draft }
  | { step: "add:confirm"; draft: Draft }
  | { step: "add:dark-photo"; draft: Draft }
  /**
   * options: las candidatas cuando lo que dijo ("la taza") coincide con varias.
   * missed: ya le preguntamos una vez y no entendimos; a la segunda, soltamos.
   */
  | { step: "sold:number"; why?: "sold" | "broken"; options?: number[]; missed?: boolean }
  | { step: "sold:confirm"; numbers: number[]; why?: "sold" | "broken" }
  | { step: "restore:number"; options?: number[]; missed?: boolean }
  | { step: "edit:number"; change?: Change; options?: number[]; missed?: boolean }
  | { step: "edit:what"; number: number }
  | { step: "edit:photo"; number: number }
  | { step: "edit:title"; number: number }
  | { step: "edit:price"; number: number }
  | { step: "edit:confirm"; number: number; draft: Draft }
  | { step: "restore:confirm"; number: number };

/** Para poder deshacer: la foto completa de la tienda antes del cambio. */
export type UndoEntry = {
  /** Para que el botón «Me equivoqué» de un mensaje deshaga ese cambio y no otro. */
  id?: string;
  label: string;
  pieces: Piece[];
  sold: Piece[];
};

export type ChatEntry = {
  id: string;
  from: "norma" | "bot";
  at: string;
  message: IncomingMessage | OutgoingMessage;
};

export type Store = {
  id: string;
  ownerName: string;
  /** Teléfono que ven los compradores, tal cual se muestra. */
  contactPhone: string;
  pieces: Piece[];
  /** Vendidas: no se muestran, pero se pueden volver a publicar. */
  sold: Piece[];
  nextNumber: number;
  updatedAt: string;
  conversation: ConversationStep;
  undo: UndoEntry[];
  /** Fotos que mandó juntas y esperan su turno: se cargan de a una. */
  queue?: Draft[];
  /** Solo en las tiendas del simulador: la conversación para dibujar el chat. */
  chat?: ChatEntry[];
  demo?: boolean;
  /** Ids de mensajes de WhatsApp ya procesados (WhatsApp reintenta los webhooks). */
  processed?: string[];
};
