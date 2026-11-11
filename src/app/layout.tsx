import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://norma-ceramica.vercel.app"),
  title: "Norma · cerámica",
  description: "Las piezas que tengo ahora en el taller. Cada una tiene su numerito: si te gusta alguna, escribime y contame cuál.",
};

export const viewport: Viewport = {
  themeColor: "#0e2189",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={atkinson.variable}>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
