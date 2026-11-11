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
  | { kind: "text"; text: string }
  | { kind: "button"; id: string; title: string }
  | { kind: "image"; photo: Photo; caption?: string; dark?: boolean };

/** Lo que el bot está esperando de Norma. */
export type Draft = {
  photo?: Photo;
  title?: string;
  price?: number;
  /** Si está editando una pieza existente. */
  number?: number;
};

export type ConversationStep =
  | { step: "idle" }
  | { step: "add:photo"; draft?: Draft }
  | { step: "add:title"; draft: Draft }
  | { step: "add:price"; draft: Draft }
  | { step: "add:confirm"; draft: Draft }
  | { step: "add:dark-photo"; draft: Draft }
  | { step: "sold:number" }
  | { step: "sold:confirm"; number: number }
  | { step: "edit:number" }
  | { step: "edit:what"; number: number }
  | { step: "edit:photo"; number: number }
  | { step: "edit:title"; number: number }
  | { step: "edit:price"; number: number }
  | { step: "edit:confirm"; number: number; draft: Draft }
  | { step: "restore:confirm"; number: number };

/** Para poder deshacer: la foto completa de la tienda antes del cambio. */
export type UndoEntry = {
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
  /** Solo en las tiendas del simulador: la conversación para dibujar el chat. */
  chat?: ChatEntry[];
  demo?: boolean;
  /** Ids de mensajes de WhatsApp ya procesados (WhatsApp reintenta los webhooks). */
  processed?: string[];
};
