import type { Metadata } from "next";
import { AdminShell, TableScroll } from "@/components/admin/AdminShell";
import { MusicUploadForm } from "@/components/admin/MusicUploadForm";
import { Button, ChristmasCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { adminDeleteMusic, adminToggleMusic } from "@/modules/admin/actions";
import { listMusics } from "@/modules/admin/queries";

export const metadata: Metadata = { title: "Músicas", robots: { index: false, follow: false } };

async function Musics() {
  await requireAdmin();
  const musics = await listMusics();

  return (
    <div className="space-y-6">
      <ChristmasCard>
        <h2 className="text-primary text-2xl">Nova música autorizada</h2>
        <div className="mt-4">
          <MusicUploadForm />
        </div>
      </ChristmasCard>

      <TableScroll>
        <table className="table-noel">
          <thead>
            <tr>
              <th>Música</th>
              <th>Ouvir</th>
              <th>Licença</th>
              <th>Em uso</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {musics.map((music) => (
              <tr key={music.id}>
                <td>
                  <strong>{music.title}</strong>
                  <span className="block text-xs opacity-70">{music.artist ?? "—"}</span>
                </td>
                <td>
                  <audio
                    controls
                    preload="none"
                    src={music.url}
                    className="h-9 w-48"
                    aria-label={`Ouvir ${music.title}`}
                  />
                </td>
                <td className="max-w-xs text-xs">{music.license ?? "Não informada"}</td>
                <td>{music._count.pages} página(s)</td>
                <td>
                  <span className={music.active ? "badge badge-green" : "badge"}>
                    {music.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <form action={adminToggleMusic}>
                      <input type="hidden" name="id" value={music.id} />
                      <input type="hidden" name="active" value={music.active ? "0" : "1"} />
                      <Button type="submit" variant="outline" size="sm">
                        {music.active ? "Desativar" : "Ativar"}
                      </Button>
                    </form>
                    <form action={adminDeleteMusic}>
                      <input type="hidden" name="id" value={music.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        aria-label={`Excluir ${music.title}`}
                      >
                        Excluir
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {musics.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  Nenhuma música na biblioteca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </div>
  );
}

export default function AdminMusicsPage({ searchParams }: PageProps<"/admin/musicas">) {
  return (
    <AdminShell title="Músicas autorizadas" current="/admin/musicas" searchParams={searchParams}>
      <Musics />
    </AdminShell>
  );
}
