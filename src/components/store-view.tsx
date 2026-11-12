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

// Ancho de la foto dentro de la tablilla en cada pantalla (1 columna, 2 columnas, pared de 2 y de 3).
const PHOTO_SIZES = "(min-width: 1360px) 18vw, (min-width: 1024px) 27vw, (min-width: 640px) 38vw, 76vw";
// La losa es una textura de gres: se pide un escalón más chica que su ancho real y a calidad 60.
// No se nota y es lo primero grande que pinta el celular, así que cada KB cuenta.
const SLAB_SIZES = "(min-width: 1360px) 20vw, (min-width: 1024px) 30vw, (min-width: 640px) 42vw, 80vw";
// La pieza de un link (/14) va sola y más grande: hasta 34rem de ancho.
const BIG_PHOTO_SIZES = "(min-width: 640px) 450px, 76vw";
const BIG_SLAB_SIZES = "(min-width: 640px) 544px, 80vw";

/** first: la que se ve al abrir (se pide antes que nada). eager: las de la primera fila. lazy: el resto. */
type Load = "first" | "eager" | "lazy";

// Cada tablilla cuelga un poquito torcida de su clavo, siempre igual para la misma pieza.
const tilt = (n: number) => (((n * 37) % 11) - 5) * 0.16;

// "miércoles 11 de noviembre"
const updatedLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" })
    .format(new Date(iso))
    .replace(",", "");

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export function StoreView({ store, compact = false, featured }: { store: PublicStore; compact?: boolean; featured?: number }) {
  // En el link de una pieza (/14), esa pieza va primero y grande; el resto sigue abajo.
  const shared = featured !== undefined ? store.pieces.find((p) => p.number === featured) : undefined;
  const pieces = shared ? store.pieces.filter((p) => p !== shared) : store.pieces;
  // Lo que viene por CSS se avisa temprano para que no demore la primera pantalla: el logo con
  // prioridad (sin él no hay nombre) y el esmalte del fondo sin apuro, en el tamaño de cada pantalla.
  // (En la vista compacta del simulador no: vive en un iframe que a veces está oculto.)
  if (!compact) {
    // (El logo es una máscara CSS, y esas se piden en modo CORS: sin crossOrigin se bajaba dos veces.)
    preload("/plates/logo.webp", { as: "image", fetchPriority: "high", crossOrigin: "anonymous" });
    preload("/plates/glaze-cobalt-1000.webp", { as: "image", media: "(max-width: 899px)" });
    preload("/plates/glaze-cobalt.webp", { as: "image", media: "(min-width: 900px)" });
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
        </div>
      </header>

      <div className={s.main}>
        <main>
        {featured !== undefined && (
          <section className={s.featured} aria-labelledby="compartida">
            {shared ? (
              <>
                <h2 id="compartida" className={s.featuredTitle}>
                  Esta es la {shared.number}, la que te mandaron
                </h2>
                <ul className={s.featuredTile}>
                  <Tile piece={shared} load="first" big />
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
          </section>
        )}
        {featured !== undefined && pieces.length > 0 && <h2 className={s.allTitle}>{shared ? "Las demás piezas del taller" : "Las piezas del taller"}</h2>}
        {pieces.length ? (
          <ul className={s.tiles} id="piezas" aria-label={`${pieces.length} piezas`}>
            {pieces.map((p, i) => (
              <Tile key={p.number} piece={p} load={shared ? "lazy" : i === 0 ? "first" : i < 3 ? "eager" : "lazy"} />
            ))}
          </ul>
        ) : (
          !shared && <p className={s.empty}>Ahora no tengo piezas en el taller. Volvé a mirar en unos días, que siempre estoy haciendo algo.</p>
        )}

        {store.pieces.length > 0 && (
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
        </main>

        <footer className={s.footer}>
          <p>La última vez que cambié algo fue el {updatedLabel(store.updatedAt)}.</p>
          {store.demo ? (
            <p>Esta es una tienda de prueba del simulador. Las fotos son de Unsplash y Pexels; los nombres y precios, de ejemplo.</p>
          ) : (
            <p>
              Fotos de ejemplo de Unsplash y Pexels. ¿Sos Norma, o querés ver cómo se actualiza esta página?{" "}
              {/* Sin prefetch: un comprador casi nunca va a tocar estos links, y su celular no baja nada de más. */}
              <Link href="/simulador" prefetch={false}>
                Probalo acá
              </Link>
              .{" "}
              <Link href="/privacidad" prefetch={false}>
                Privacidad
              </Link>
              .
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

function Contact({ phone, again = false }: { phone: string; again?: boolean }) {
  return (
    <div className={s.contact} data-again={again || undefined}>
      <h2 className={s.contactAsk}>¿Te gustó alguna?</h2>
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

function Tile({ piece, load, big = false }: { piece: Piece; load: Load; big?: boolean }) {
  const glaze = glazeOf(piece.number);
  const loading = load === "lazy" ? "lazy" : "eager";
  // Norma saca las fotos con el celular parado. En la ventanita apaisada una foto así perdía la
  // mitad (el asa de la tetera, el pie de la jarra): esas van enteras, sobre su propio desenfoque.
  const portrait = piece.photo.height > piece.photo.width * 1.1;
  return (
    // tabIndex -1: al tocarla queda enfocada y se hamaca entera (no entra en el recorrido del teclado).
    <li className={s.tile} id={`pieza-${piece.number}`} tabIndex={-1} style={{ "--tilt": `${tilt(piece.number)}deg` } as CSSProperties}>
      <article className={s.slab}>
        <Image
          src={`/plates/tile-${glaze}.webp`}
          alt=""
          fill
          sizes={big ? BIG_SLAB_SIZES : SLAB_SIZES}
          quality={60}
          loading={loading}
          fetchPriority={load === "first" ? "high" : undefined}
          className={s.slabImage}
        />
        <div className={s.window} data-portrait={portrait || undefined}>
          {portrait && (
            <Image src={piece.photo.url} alt="" width={32} height={Math.round((32 * piece.photo.height) / piece.photo.width)} quality={60} loading={loading} className={s.backdrop} />
          )}
          <Image
            src={piece.photo.url}
            alt={`Foto de ${lower(piece.title)}`}
            width={piece.photo.width}
            height={piece.photo.height}
            sizes={big ? BIG_PHOTO_SIZES : PHOTO_SIZES}
            loading={loading}
            className={s.photo}
          />
        </div>
        <div className={s.label}>
          <span className={s.number}>
            <span className="sr-only">Pieza número </span>
            {piece.number}
          </span>
          <span className={s.groove} aria-hidden />
          <span className={s.text}>
            <span className={s.title} data-long={piece.title.length > 28 || undefined}>
              {piece.title}
            </span>
            <span className={s.price}>{formatPrice(piece.price)}</span>
          </span>
        </div>
      </article>
    </li>
  );
}
