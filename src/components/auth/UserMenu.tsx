import { Button, SecondaryButton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/modules/auth/actions";

/**
 * Ações do cabeçalho conforme a sessão. Lê o cookie, então deve ficar dentro de
 * um <Suspense> para não segurar o restante da página.
 */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Button href="/entrar" variant="outline" size="sm">
        Entrar
      </Button>
    );
  }

  return (
    <>
      {user.role === "ADMIN" && (
        <SecondaryButton href="/admin" size="sm">
          Painel
        </SecondaryButton>
      )}
      <Button href="/minhas-paginas" variant="outline" size="sm" className="hidden sm:inline-flex">
        Minhas páginas
      </Button>
      <form action={logoutAction}>
        <Button type="submit" variant="outline" size="sm" aria-label="Sair da conta">
          Sair
        </Button>
      </form>
    </>
  );
}

/** Espaço reservado enquanto a sessão é lida. */
export function UserMenuFallback() {
  return <span className="block h-10 w-24" aria-hidden="true" />;
}
