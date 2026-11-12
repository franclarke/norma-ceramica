import { describe, expect, it } from "vitest";
import { toRecipient, toWhatsApp } from "./whatsapp";

describe("toRecipient", () => {
  it("saca el 9 de los celulares argentinos", () => expect(toRecipient("5491123456789")).toBe("541123456789"));
  it("deja igual los demás números", () => {
    expect(toRecipient("541123456789")).toBe("541123456789");
    expect(toRecipient("15551892360")).toBe("15551892360");
  });
  it("el mensaje sale al número corregido, con botones de 20 caracteres como máximo", () => {
    const p = toWhatsApp("5491123456789", { kind: "text", text: "Hola", buttons: [{ id: "a", title: "Un título larguísimo de botón" }] }, "https://x.test") as {
      to: string;
      interactive: { action: { buttons: { reply: { title: string } }[] } };
    };
    expect(p.to).toBe("541123456789");
    expect(p.interactive.action.buttons[0].reply.title.length).toBeLessThanOrEqual(20);
  });
});
