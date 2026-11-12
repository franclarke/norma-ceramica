import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import s from "./not-found.module.css";

export const metadata: Metadata = { title: "Acá no hay nada · Norma · cerámica", robots: { index: false } };

// Un link mal escrito también cae en la pared del taller, no en una pantalla negra en inglés.
export default function NotFound() {
  return (
    <main className={s.page}>
      <Link href="/" className={s.logo} aria-label="Norma, cerámica: ir a la página">
        <span className="brush" style={{ "--src": "url(/plates/logo.webp)" } as CSSProperties} aria-hidden />
      </Link>
      <h1 className={s.title}>Acá no hay nada colgado.</h1>
      <p className={s.text}>Puede que el link haya llegado cortado, o que esa pieza ya no esté.</p>
      <p className={s.text}>
        <Link href="/">Mirá las piezas que tengo ahora</Link>
      </p>
    </main>
  );
}
