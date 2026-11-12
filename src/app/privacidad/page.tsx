import type { Metadata } from "next";
import Link from "next/link";
import s from "./privacidad.module.css";

export const metadata: Metadata = {
  title: "Privacidad · Norma · cerámica",
  description: "Qué datos usa la página de Norma y su ayudante de WhatsApp, y cómo pedir que se borren.",
};

export default function Privacidad() {
  return (
    <main className={s.page}>
      <Link href="/" className={s.back}>
        ← Volver a la página de Norma
      </Link>
      <h1>Privacidad</h1>
      <p className={s.updated}>Última actualización: 12 de noviembre de 2026</p>

      <p>
        Esta página muestra las piezas de cerámica de Norma. Norma la actualiza conversando por WhatsApp con un ayudante automático. Acá
        contamos qué datos se usan para eso, en palabras simples.
      </p>

      <h2>Quienes miran la página</h2>
      <p>
        No hace falta registrarse ni dejar ningún dato. No usamos cookies de publicidad ni de seguimiento. Medimos solo el rendimiento de
        la página (cuánto tarda en cargar), de forma anónima, con Vercel Speed Insights.
      </p>

      <h2>Quienes le escriben al ayudante de WhatsApp</h2>
      <ul>
        <li>
          Cuando alguien le escribe al número del ayudante, WhatsApp (Meta) nos manda el mensaje y el número de teléfono de quien escribe.
        </li>
        <li>
          Solo el número de Norma puede cambiar la página. A cualquier otra persona, el ayudante le contesta con el teléfono de Norma y no
          guarda su mensaje.
        </li>
        <li>
          De Norma se guardan las fotos, nombres y precios de sus piezas, y el estado de la conversación necesario para seguirla, como
          cuál pieza está cargando.
        </li>
        <li>
          Los audios y los mensajes que el ayudante no entiende a la primera se procesan con inteligencia artificial, a través del AI
          Gateway de Vercel, solo para entender qué quiere hacer Norma. Las fotos sin nombre se analizan para proponerle uno. No se usan
          para nada más ni se venden.
        </li>
      </ul>

      <h2>Dónde se guarda</h2>
      <p>
        En servicios de Vercel (Blob) y Upstash (Redis), en Estados Unidos. Las tiendas de prueba del simulador se borran solas a los
        dos días.
      </p>

      <h2>Cómo pedir que se borren tus datos</h2>
      <p>
        Pedíselo a Norma por WhatsApp y borramos lo que tengamos tuyo dentro de los 30 días.
      </p>
    </main>
  );
}
