import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { preload } from "react-dom";
import type { PublicStore } from "@/lib/store";
import type { Piece } from "@/lib/types";
import { formatPrice } from "@/lib/bot/parse";
import s from "./store-view.module.css";

const GLAZES = ["celadon", "ironred", "shino", "ash"] as const;
const glazeOf = (n: number) => GLAZES[n % GLAZES.length];

// Ancho real de una tablilla en cada pantalla (1 columna, 2 columnas, pared de 2 y de 3).
const SIZES = "(min-width: 1360px) 22vw, (min-width: 1024px) 33vw, (min-width: 640px) 46vw, 92vw";
const PHOTO_SIZES = "(min-width: 1360px) 18vw, (min-width: 1024px) 27vw, (min-width: 640px) 38vw, 76vw";

// Cada tablilla cuelga un poquito torcida de su clavo, siempre igual para la misma pieza.
const tilt = (n: number) => (((n * 37) % 11) - 5) * 0.16;

const updatedLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));

export function StoreView({ store, compact = false, featured }: { store: PublicStore; compact?: boolean; featured?: number }) {
  // En el link de una pieza (/14), esa pieza va primero y grande; el resto sigue abajo.
  const shared = featured !== undefined ? store.pieces.find((p) => p.number === featured) : undefined;
  const pieces = shared ? store.pieces.filter((p) => p !== shared) : store.pieces;
  // Fondos que vienen por CSS: se avisan temprano para que no demoren la primera pantalla.
  // (En la vista compacta del simulador no: vive en un iframe que a veces está oculto.)
  if (!compact) {
    preload("/plates/glaze-cobalt.webp", { as: "image", fetchPriority: "high" });
    preload("/plates/logo.webp", { as: "image", fetchPriority: "high" });
  }
  return (
    <div className={s.wall} data-compact={compact || undefined} data-featured={featured !== undefined || undefined}>
      <header className={s.intro}>
        <div className={s.introInner}>
          <h1 className={s.logo}>
            <span className="sr-only">Norma, cerámica</span>
            <span className={`brush ${s.logoMark}`} style={{ "--src": "url(/plates/logo.webp)" } as CSSProperties} aria-hidden />
          </h1>
          <p className={s.hello}>Hola, soy Norma. Estas son las piezas que tengo ahora en el taller. Las hago yo, una por una.</p>
          <Contact phone={store.contactPhone} />
          <p className={s.updated}>Actualizado el {updatedLabel(store.updatedAt)}</p>
        </div>
      </header>

      <main className={s.main}>
        {featured !== undefined && (
          <section className={s.featured} aria-labelledby="compartida">
            {shared ? (
              <>
                <h2 id="compartida" className={s.featuredTitle}>
                  Te compartieron la pieza Nº {shared.number}
                </h2>
                <ul className={s.featuredTile}>
                  <Tile piece={shared} priority />
                </ul>
                <p className={s.featuredAsk}>
                  ¿Te gustó? Escribime al <strong className={s.nowrap}>{store.contactPhone}</strong> y contame que es la {shared.number}.
                </p>
              </>
            ) : (
              <h2 id="compartida" className={s.featuredTitle}>
                La pieza Nº {featured} ya no está: seguro se vendió. Mirá las que tengo ahora.
              </h2>
            )}
            <h2 className={s.allTitle}>{shared ? "Las demás piezas del taller" : "Las piezas del taller"}</h2>
          </section>
        )}
        {pieces.length ? (
          <ul className={s.tiles} id="piezas" aria-label={`${pieces.length} piezas`}>
            {pieces.map((p, i) => (
              <Tile key={p.number} piece={p} priority={!shared && i < 2} />
            ))}
          </ul>
        ) : (
          <p className={s.empty}>Ahora no tengo piezas en el taller. Volvé a mirar en unos días, que siempre estoy haciendo algo.</p>
        )}

        {pieces.length > 0 && (
          <section className={s.back} aria-labelledby="lista">
            <h2 id="lista" className={s.backTitle}>
              La lista, por si es más fácil
            </h2>
            <table className={s.list}>
              <thead>
                <tr>
                  <th scope="col">Nº</th>
                  <th scope="col">Pieza</th>
                  <th scope="col">Precio</th>
                </tr>
              </thead>
              <tbody>
                {store.pieces.map((p) => (
                  <tr key={p.number}>
                    <td>{p.number}</td>
                    <td>{p.title}</td>
                    <td>{formatPrice(p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Contact phone={store.contactPhone} again />
          </section>
        )}

        <footer className={s.footer}>
          {store.demo ? (
            <p>Esta es una tienda de prueba del simulador. Las fotos son de Unsplash y Pexels; los nombres y precios, de ejemplo.</p>
          ) : (
            <p>
              Fotos de ejemplo de Unsplash y Pexels. ¿Sos Norma, o querés ver cómo se actualiza esta página?{" "}
              <Link href="/simulador">Probalo acá</Link>.
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}

function Contact({ phone, again = false }: { phone: string; again?: boolean }) {
  return (
    <div className={s.contact} data-again={again || undefined}>
      <p className={s.contactAsk}>¿Te gustó alguna?</p>
      <p className={s.contactText}>
        Escribime al{" "}
        <span className={s.phone}>
          {phone}
          <span className={`brush ${s.phoneStroke}`} style={{ "--src": "url(/plates/stroke.webp)" } as CSSProperties} aria-hidden />
        </span>{" "}
        y contame cuál. Cada pieza tiene su numerito, así no nos confundimos.
      </p>
    </div>
  );
}

function Tile({ piece, priority }: { piece: Piece; priority: boolean }) {
  const glaze = glazeOf(piece.number);
  return (
    <li className={s.tile} id={`pieza-${piece.number}`} style={{ "--tilt": `${tilt(piece.number)}deg` } as CSSProperties}>
      <article className={s.slab} aria-label={`Pieza número ${piece.number}: ${piece.title}, ${formatPrice(piece.price)}`}>
        <Image src={`/plates/tile-${glaze}.webp`} alt="" fill sizes={SIZES} priority={priority} className={s.slabImage} />
        <div className={s.window}>
          <Image
            src={piece.photo.url}
            alt={piece.title}
            width={piece.photo.width}
            height={piece.photo.height}
            sizes={PHOTO_SIZES}
            priority={priority}
            className={s.photo}
          />
        </div>
        <div className={s.label} aria-hidden>
          <span className={s.number}>{piece.number}</span>
          <span className={s.groove} />
          <span className={s.text}>
            <span className={s.title}>{piece.title}</span>
            <span className={s.price}>{formatPrice(piece.price)}</span>
          </span>
        </div>
      </article>
    </li>
  );
}
