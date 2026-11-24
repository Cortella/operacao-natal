"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadMusicFile } from "@/components/editor/upload";
import { ErrorMessage, FormInput, PrimaryButton, SuccessMessage } from "@/components/ui";
import { adminConfirmMusicUpload, adminRequestMusicUpload } from "@/modules/admin/actions";

/** Cadastro de música da biblioteca: o arquivo vai direto ao storage e depois é conferido. */
export function MusicUploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("file");
    setError(null);
    setDone(false);
    if (!(file instanceof File) || file.size === 0) {
      setError("Escolha o arquivo da música.");
      return;
    }
    setBusy(true);
    try {
      const requested = await adminRequestMusicUpload({
        title: String(data.get("title") ?? ""),
        artist: String(data.get("artist") ?? ""),
        license: String(data.get("license") ?? ""),
        mime: file.type,
        size: file.size,
      });
      if (!requested.ok) throw new Error(requested.error);
      await uploadMusicFile(requested.data, file);
      const confirmed = await adminConfirmMusicUpload(requested.data.musicId);
      if (!confirmed.ok) throw new Error(confirmed.error);
      setDone(true);
      form.reset();
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}
    >
      {error && <ErrorMessage compact title={error} className="sm:col-span-2" />}
      {done && <SuccessMessage compact title="Música cadastrada" className="sm:col-span-2" />}
      <FormInput label="Título" name="title" required maxLength={80} />
      <FormInput label="Artista" name="artist" optional maxLength={80} />
      <FormInput
        className="sm:col-span-2"
        label="Licença ou autorização de uso"
        name="license"
        required
        maxLength={300}
        placeholder="Ex.: Domínio público; licença nº 123 da biblioteca X; autorização do autor"
        hint="Fica registrado junto da música. Cadastre apenas músicas que a plataforma pode usar."
      />
      <div className="sm:col-span-2">
        <label htmlFor="admin-music-file" className="field-label">
          Arquivo
        </label>
        <input
          id="admin-music-file"
          type="file"
          name="file"
          required
          accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav"
          className="field-control !py-2"
        />
        <p className="field-hint">MP3, M4A, OGG ou WAV, com até 12 MB.</p>
      </div>
      <div className="sm:col-span-2">
        <PrimaryButton type="submit" loading={busy}>
          {busy ? "Enviando" : "Cadastrar música"}
        </PrimaryButton>
      </div>
    </form>
  );
}
