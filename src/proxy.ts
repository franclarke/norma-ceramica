import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "norma-sim";
const VALID = /^demo-[a-z0-9]{6,16}$/;

/**
 * Cada visitante del simulador tiene su propia tienda de prueba. La primera vez se le asigna acá,
 * antes de armar la página: así entra directo, sin dos vueltas de redirección (en un celular con
 * mala señal eran dos segundos mirando una pantalla en blanco). La tienda nace sola al leerla.
 */
export function proxy(request: NextRequest) {
  const current = request.cookies.get(COOKIE)?.value;
  if (current && VALID.test(current)) return NextResponse.next();

  const id = `demo-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  request.cookies.set(COOKIE, id); // para que la página ya la vea en este mismo pedido
  const response = NextResponse.next({ request: { headers: new Headers(request.headers) } });
  response.cookies.set(COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 2 });
  return response;
}

export const config = { matcher: "/simulador" };
