import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { exportUserData } from "@/modules/account/service";

/** Baixa, em JSON, todos os dados que a plataforma guarda sobre a conta logada. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  const limit = await rateLimit(`exportar:${user.id}`, 10, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitos pedidos. Tente mais tarde." }, { status: 429 });
  }

  const data = await exportUserData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-oficina-do-noel.json"',
      "Cache-Control": "no-store",
    },
  });
}
