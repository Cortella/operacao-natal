"use client";

/* Miniaturas vêm do storage dos usuários. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GiftPageView } from "@/components/gift/GiftPageView";
import { PhonePreview } from "@/components/landing/PhonePreview";
import {
  Button,
  ChristmasCard,
  ElfCharacter,
  ErrorMessage,
  FormInput,
  FormTextarea,
  PrimaryButton,
  SecondaryButton,
  SuccessMessage,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  confirmMusicUpload,
  deletePhoto,
  requestMusicUpload,
  saveDetails,
  saveMusic,
  savePhotoCaption,
  savePhotoOrder,
  saveSpecialMessage,
  saveStep,
  saveTemplate,
} from "@/modules/pages/actions";
import type { EditorOptions } from "@/modules/pages/queries";
import {
  EDITOR_STEPS,
  LIMITS,
  MUSIC_MAX_BYTES,
  PHOTO_MAX_BYTES,
  missingForCheckout,
  type GiftPageView as PageData,
} from "@/modules/pages/schema";
import { uploadMusicFile, uploadPhoto } from "./upload";

const STEP_LABELS = ["Sobre", "Fotos", "Música", "Mensagem", "Modelo", "Prévia", "Finalizar"];

const STEP_INTRO: Array<{ title: string; text: string }> = [
  { title: "Para quem é o presente?", text: "Comece pelos nomes e pela mensagem principal." },
  { title: "Escolha as fotos", text: "Elas aparecem em uma galeria. Você pode mudar a ordem." },
  { title: "Nossa música", text: "Escolha uma trilha para tocar na página. É opcional." },
  { title: "Mensagem especial", text: "Uma frase curta em destaque, em um cartão natalino." },
  { title: "Escolha o modelo", text: "Cada modelo muda cores, animações e o jeito das fotos." },
  { title: "Veja como ficou", text: "É exatamente assim que a pessoa vai receber." },
  { title: "Tudo pronto?", text: "Confira o resumo e siga para o pagamento." },
];

type SaveState = "idle" | "saving" | "saved" | "error";
type SaveResult = { ok: true } | { ok: false; error: string };

type Props = {
  initialPage: PageData & { editorStep: number };
  options: EditorOptions;
  maxPhotos: number;
  /** Preço já formatado, exibido na etapa final. */
  priceLabel: string;
  publicUrl: string | null;
};

export function Editor({ initialPage, options, maxPhotos, priceLabel, publicUrl }: Props) {
  const pageId = initialPage.id;
  const [page, setPage] = useState<PageData>(initialPage);
  const [step, setStep] = useState(Math.min(Math.max(initialPage.editorStep, 1), EDITOR_STEPS));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  /** Executa uma ação de salvamento e reflete o resultado no indicador. */
  const run = useCallback(async (action: () => Promise<SaveResult>) => {
    setSaveState("saving");
    try {
      const result = await action();
      if (result.ok) {
        setSaveState("saved");
        setError(null);
        return true;
      }
      setError(result.error);
    } catch {
      setError("Sem conexão. Suas alterações serão salvas quando a internet voltar.");
    }
    setSaveState("error");
    return false;
  }, []);

  // ---- Textos: salvamento automático, com espera curta depois da última tecla ----
  const details = {
    senderName: page.senderName,
    recipientName: page.recipientName,
    title: page.title,
    introText: page.introText,
    mainMessage: page.mainMessage,
  };
  const special = {
    content: page.special?.content ?? "",
    signature: page.special?.signature ?? "",
  };
  const detailsKey = JSON.stringify(details);
  const specialKey = JSON.stringify(special);
  const [savedDetails, setSavedDetails] = useState(detailsKey);
  const [savedSpecial, setSavedSpecial] = useState(specialKey);

  const flush = useCallback(async () => {
    let ok = true;
    if (savedDetails !== detailsKey) {
      const snapshot = detailsKey;
      if (await run(() => saveDetails(pageId, JSON.parse(snapshot)))) {
        setSavedDetails(snapshot);
      } else ok = false;
    }
    if (savedSpecial !== specialKey) {
      const snapshot = specialKey;
      if (await run(() => saveSpecialMessage(pageId, JSON.parse(snapshot)))) {
        setSavedSpecial(snapshot);
      } else ok = false;
    }
    return ok;
  }, [detailsKey, specialKey, savedDetails, savedSpecial, pageId, run]);

  useEffect(() => {
    if (savedDetails === detailsKey && savedSpecial === specialKey) return;
    const timer = setTimeout(flush, 800);
    return () => clearTimeout(timer);
  }, [detailsKey, specialKey, savedDetails, savedSpecial, flush]);

  // Avisa antes de fechar a aba com texto ainda não salvo.
  const dirty = savedDetails !== detailsKey || savedSpecial !== specialKey;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (patch: Partial<PageData>) => setPage((current) => ({ ...current, ...patch }));

  async function goTo(next: number) {
    const target = Math.min(Math.max(next, 1), EDITOR_STEPS);
    await flush();
    setStep(target);
    void saveStep(pageId, target);
    topRef.current?.scrollIntoView({ block: "start" });
  }

  const missing = missingForCheckout(page);
  const intro = STEP_INTRO[step - 1];
  const showSidePreview = step <= 5;

  return (
    <div ref={topRef} className="scroll-mt-20">
      <Progress step={step} onSelect={goTo} />

      <div
        className={cn("mt-6 grid gap-8", showSidePreview && "lg:grid-cols-[minmax(0,1fr)_380px]")}
      >
        <ChristmasCard className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-elf-green font-display text-sm font-semibold">
                Etapa {step} de {EDITOR_STEPS}
              </p>
              <h1 className="text-primary text-2xl sm:text-3xl">{intro.title}</h1>
              <p className="mt-1">{intro.text}</p>
            </div>
            <SaveBadge state={saveState} />
          </div>

          {error && (
            <ErrorMessage compact title="Não foi possível salvar" className="mt-4">
              {error}
            </ErrorMessage>
          )}

          <div key={step} className="animate-rise mt-6">
            {step === 1 && <DetailsStep page={page} set={set} />}
            {step === 2 && (
              <PhotosStep page={page} setPage={setPage} maxPhotos={maxPhotos} run={run} />
            )}
            {step === 3 && <MusicStep page={page} set={set} musics={options.musics} run={run} />}
            {step === 4 && <SpecialStep page={page} set={set} />}
            {step === 5 && (
              <TemplateStep page={page} set={set} templates={options.templates} run={run} />
            )}
            {step === 6 && (
              <div className="shadow-card -mx-2 overflow-hidden rounded-3xl sm:mx-0">
                <GiftPageView page={page} preview />
              </div>
            )}
            {step === 7 && (
              <FinishStep
                page={page}
                missing={missing}
                priceLabel={priceLabel}
                publicUrl={publicUrl}
                goTo={goTo}
              />
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-black/10 pt-5">
            {step > 1 ? (
              <Button variant="outline" onClick={() => goTo(step - 1)}>
                Voltar
              </Button>
            ) : (
              <span />
            )}
            {step < EDITOR_STEPS && (
              <PrimaryButton onClick={() => goTo(step + 1)}>
                {step === 5 ? "Ver prévia" : "Continuar"}
              </PrimaryButton>
            )}
          </div>
          <p className="mt-4 text-center text-sm opacity-70">
            Seu progresso é salvo sozinho. Você pode sair e continuar depois.
          </p>
        </ChristmasCard>

        {showSidePreview && (
          <aside className="hidden lg:block" aria-label="Prévia em tempo real">
            <div className="sticky top-24">
              <p className="font-display text-text-light mb-3 text-center text-lg">
                Prévia em tempo real
              </p>
              <div className="border-wood-deep shadow-card mx-auto h-[640px] w-[340px] overflow-y-auto rounded-[2.2rem] border-[10px] bg-black">
                {/* A prévia usa a mesma página do presente, reduzida para caber na moldura. */}
                <div className="w-[425px] origin-top-left scale-[0.7529]">
                  <GiftPageView page={page} preview />
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Partes --------------------------------- */

function Progress({ step, onSelect }: { step: number; onSelect: (step: number) => void }) {
  return (
    <nav aria-label="Etapas da criação">
      <ol className="flex items-start justify-between gap-1">
        {STEP_LABELS.map((label, index) => {
          const number = index + 1;
          const done = number < step;
          const current = number === step;
          return (
            <li key={label} className="relative flex flex-1 flex-col items-center">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-4 right-1/2 -z-10 h-1 w-full",
                    done || current ? "bg-gold" : "bg-white/20",
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => onSelect(number)}
                aria-current={current ? "step" : undefined}
                aria-label={`Etapa ${number}: ${label}`}
                className={cn(
                  "font-display flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm font-semibold transition-transform hover:scale-110",
                  current && "bg-gold text-text-dark ring-4 ring-white/30",
                  done && "bg-elf-green text-white",
                  !current && !done && "bg-wood-deep text-text-light border-2 border-white/30",
                )}
              >
                {done ? "✓" : number}
              </button>
              <span
                className={cn(
                  "font-display text-text-light mt-1.5 hidden text-xs sm:block",
                  current ? "font-semibold" : "opacity-70",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const text = { saving: "Salvando…", saved: "Salvo ✓", error: "Não salvo" }[state];
  return (
    <span
      role="status"
      className={cn(
        "font-display shrink-0 rounded-full px-3 py-1 text-sm font-semibold",
        state === "error" ? "bg-danger text-white" : "bg-elf-green/15 text-green-dark",
      )}
    >
      {text}
    </span>
  );
}

type SetPage = (patch: Partial<PageData>) => void;
type Run = (action: () => Promise<SaveResult>) => Promise<boolean>;

function DetailsStep({ page, set }: { page: PageData; set: SetPage }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormInput
        label="Seu nome"
        value={page.senderName}
        onChange={(event) => set({ senderName: event.target.value })}
        maxLength={LIMITS.name}
        placeholder="Ex.: João"
        autoComplete="given-name"
      />
      <FormInput
        label="Nome de quem vai receber"
        value={page.recipientName}
        onChange={(event) => set({ recipientName: event.target.value })}
        maxLength={LIMITS.name}
        placeholder="Ex.: Maria"
      />
      <FormInput
        className="sm:col-span-2"
        label="Título da página"
        value={page.title}
        onChange={(event) => set({ title: event.target.value })}
        maxLength={LIMITS.title}
        placeholder="Ex.: Nosso Natal"
        hint="Aparece bem grande, no topo da página."
      />
      <FormTextarea
        className="sm:col-span-2"
        label="Texto de introdução"
        optional
        rows={2}
        value={page.introText}
        onChange={(event) => set({ introText: event.target.value })}
        maxLength={LIMITS.introText}
        count={page.introText.length}
        placeholder="Ex.: Preparei uma surpresa para você."
      />
      <FormTextarea
        className="sm:col-span-2"
        label="Mensagem principal"
        rows={5}
        value={page.mainMessage}
        onChange={(event) => set({ mainMessage: event.target.value })}
        maxLength={LIMITS.mainMessage}
        count={page.mainMessage.length}
        placeholder="Escreva com o coração. Esta é a mensagem do cartão central."
      />
    </div>
  );
}

function PhotosStep({
  page,
  setPage,
  maxPhotos,
  run,
}: {
  page: PageData;
  setPage: React.Dispatch<React.SetStateAction<PageData>>;
  maxPhotos: number;
  run: Run;
}) {
  const [busy, setBusy] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const pageId = page.id;
  const remaining = maxPhotos - page.photos.length;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setProblem(null);
    const chosen = Array.from(files);
    if (chosen.length > remaining) {
      setProblem(`Você pode adicionar mais ${remaining} foto(s). O limite é ${maxPhotos}.`);
    }
    for (const file of chosen.slice(0, Math.max(remaining, 0))) {
      if (file.size > PHOTO_MAX_BYTES * 3) {
        setProblem(`"${file.name}" é grande demais. Envie fotos de até 8 MB.`);
        continue;
      }
      setBusy((count) => count + 1);
      try {
        const photo = await uploadPhoto(pageId, file);
        setPage((current) => ({ ...current, photos: [...current.photos, photo] }));
      } catch (error) {
        setProblem((error as Error).message);
      } finally {
        setBusy((count) => count - 1);
      }
    }
  }

  async function replace(photoId: string, file: File | undefined) {
    if (!file) return;
    setProblem(null);
    setBusy((count) => count + 1);
    try {
      const photo = await uploadPhoto(pageId, file, photoId);
      setPage((current) => ({
        ...current,
        photos: current.photos.map((item) => (item.id === photoId ? photo : item)),
      }));
    } catch (error) {
      setProblem((error as Error).message);
    } finally {
      setBusy((count) => count - 1);
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= page.photos.length) return;
    const photos = [...page.photos];
    [photos[index], photos[target]] = [photos[target], photos[index]];
    setPage((current) => ({ ...current, photos }));
    void run(() =>
      savePhotoOrder(
        pageId,
        photos.map((photo) => photo.id),
      ),
    );
  }

  function remove(photoId: string) {
    setPage((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== photoId),
    }));
    void run(() => deletePhoto(pageId, photoId));
  }

  function caption(photoId: string, value: string) {
    setPage((current) => ({
      ...current,
      photos: current.photos.map((photo) =>
        photo.id === photoId ? { ...photo, caption: value } : photo,
      ),
    }));
  }

  return (
    <div className="space-y-5">
      {problem && <ErrorMessage compact title={problem} />}

      {remaining > 0 && (
        <label className="border-elf-green hover:bg-elf-green/10 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed bg-white p-6 text-center transition-colors">
          <span className="bg-elf-green flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold text-white">
            +
          </span>
          <span className="font-display text-lg font-semibold">
            {busy > 0 ? "Enviando…" : "Adicionar fotos"}
          </span>
          <span className="text-sm opacity-70">
            JPG, PNG ou WebP · até {maxPhotos} fotos · {page.photos.length} adicionada(s)
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="sr-only"
            disabled={busy > 0}
            onChange={(event) => {
              void add(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      )}

      {page.photos.length === 0 && busy === 0 && (
        <p className="text-center opacity-70">Nenhuma foto ainda. Escolha as preferidas!</p>
      )}

      <ul className="space-y-3">
        {page.photos.map((photo, index) => (
          <li key={photo.id} className="shadow-soft flex gap-3 rounded-2xl bg-white p-3">
            <img
              src={photo.url}
              alt={`Foto ${index + 1}`}
              className="h-24 w-24 shrink-0 rounded-xl object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
              <input
                className="field-control !min-h-10 !py-1.5"
                value={photo.caption}
                maxLength={LIMITS.caption}
                placeholder="Legenda (opcional)"
                aria-label={`Legenda da foto ${index + 1}`}
                onChange={(event) => caption(photo.id, event.target.value)}
                onBlur={(event) => {
                  const value = event.target.value;
                  void run(() => savePhotoCaption(pageId, photo.id, value));
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <IconButton
                  label={`Mover foto ${index + 1} para cima`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </IconButton>
                <IconButton
                  label={`Mover foto ${index + 1} para baixo`}
                  disabled={index === page.photos.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </IconButton>
                <label className="btn btn-outline btn-sm cursor-pointer">
                  Trocar
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="sr-only"
                    aria-label={`Trocar foto ${index + 1}`}
                    onChange={(event) => {
                      void replace(photo.id, event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="text-danger ml-auto cursor-pointer px-2 py-1 font-bold underline"
                  onClick={() => remove(photo.id)}
                  aria-label={`Remover foto ${index + 1}`}
                >
                  Remover
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="btn btn-outline btn-sm !min-h-10 !w-10 !px-0"
      {...props}
    >
      {children}
    </button>
  );
}

function MusicStep({
  page,
  set,
  musics,
  run,
}: {
  page: PageData;
  set: SetPage;
  musics: EditorOptions["musics"];
  run: Run;
}) {
  const [list, setList] = useState(musics);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function choose(music: EditorOptions["musics"][number] | null) {
    set({
      music: music && { id: music.id, title: music.title, artist: music.artist, url: music.url },
    });
    void run(() => saveMusic(page.id, music?.id ?? null));
  }

  function toggle(music: EditorOptions["musics"][number]) {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing === music.id) {
      audio.pause();
      setPlaying(null);
      return;
    }
    audio.src = music.url;
    void audio.play().then(
      () => setPlaying(music.id),
      () => setPlaying(null),
    );
  }

  async function upload(form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("file");
    setProblem(null);
    setDone(false);
    if (!(file instanceof File) || file.size === 0) {
      setProblem("Escolha o arquivo da música.");
      return;
    }
    if (file.size > MUSIC_MAX_BYTES) {
      setProblem("A música precisa ter no máximo 12 MB.");
      return;
    }
    setUploading(true);
    try {
      const requested = await requestMusicUpload(page.id, {
        title: String(data.get("title") ?? ""),
        mime: file.type,
        size: file.size,
        rightsDeclared: data.get("rights") === "on",
      });
      if (!requested.ok) throw new Error(requested.error);
      await uploadMusicFile(requested.data, file);
      const confirmed = await confirmMusicUpload(page.id, requested.data.musicId);
      if (!confirmed.ok) throw new Error(confirmed.error);
      const music = { ...confirmed.data, artist: null, mine: true };
      setList((current) => [...current, music]);
      set({ music: { id: music.id, title: music.title, artist: null, url: music.url } });
      setDone(true);
      form.reset();
    } catch (error) {
      setProblem((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const option = (selected: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left transition-colors",
      selected ? "border-elf-green bg-elf-green/10" : "border-cream-dark hover:border-wood-light",
    );

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} preload="none" />
      <fieldset>
        <legend className="field-label">Músicas da Oficina</legend>
        <ul className="space-y-2">
          <li>
            <label className={cn(option(page.music === null), "cursor-pointer")}>
              <input
                type="radio"
                name="music"
                className="accent-elf-green h-5 w-5"
                checked={page.music === null}
                onChange={() => choose(null)}
              />
              <span className="font-display font-medium">Sem música</span>
            </label>
          </li>
          {list.map((music) => (
            <li key={music.id} className={option(page.music?.id === music.id)}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="music"
                  className="accent-elf-green h-5 w-5 shrink-0"
                  checked={page.music?.id === music.id}
                  onChange={() => choose(music)}
                />
                <span className="min-w-0">
                  <span className="font-display block truncate font-medium">{music.title}</span>
                  <span className="block truncate text-sm opacity-70">
                    {music.mine ? "Enviada por você" : music.artist}
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => toggle(music)}
                aria-label={playing === music.id ? `Pausar ${music.title}` : `Ouvir ${music.title}`}
                className="bg-elf-green flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {playing === music.id ? (
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  ) : (
                    <path d="M7 4l14 8-14 8z" />
                  )}
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <form
        className="space-y-4 rounded-2xl border-2 border-dashed border-black/20 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void upload(event.currentTarget);
        }}
      >
        <p className="font-display text-lg font-semibold">Ou envie a música de vocês</p>
        {problem && <ErrorMessage compact title={problem} />}
        {done && <SuccessMessage compact title="Música adicionada à sua página" />}
        <FormInput
          label="Nome da música"
          name="title"
          maxLength={LIMITS.musicTitle}
          required
          placeholder="Ex.: A nossa canção"
        />
        <div>
          <label htmlFor="music-file" className="field-label">
            Arquivo
          </label>
          <input
            id="music-file"
            type="file"
            name="file"
            required
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav"
            className="field-control !py-2"
          />
          <p className="field-hint">MP3, M4A, OGG ou WAV, com até 12 MB.</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="rights"
            required
            className="accent-elf-green mt-0.5 h-5 w-5"
          />
          <span>
            Declaro que tenho o direito de usar esta música (é de minha autoria, está em domínio
            público ou tenho autorização) e assumo a responsabilidade pelo uso.
          </span>
        </label>
        <SecondaryButton type="submit" loading={uploading}>
          {uploading ? "Enviando música" : "Enviar música"}
        </SecondaryButton>
      </form>
    </div>
  );
}

function SpecialStep({ page, set }: { page: PageData; set: SetPage }) {
  const content = page.special?.content ?? "";
  const signature = page.special?.signature ?? "";
  const update = (patch: { content?: string; signature?: string }) => {
    const next = { content, signature, ...patch };
    set({ special: next.content || next.signature ? next : null });
  };
  return (
    <div className="space-y-5">
      <FormTextarea
        label="Mensagem especial"
        optional
        rows={4}
        value={content}
        maxLength={LIMITS.specialMessage}
        count={content.length}
        placeholder="Ex.: Você deixa meu Natal mais bonito. Te amo!"
        onChange={(event) => update({ content: event.target.value })}
      />
      <FormInput
        label="Assinatura"
        optional
        value={signature}
        maxLength={LIMITS.signature}
        placeholder="Ex.: Do seu João"
        onChange={(event) => update({ signature: event.target.value })}
      />
      <ChristmasCard tone="white" stitched className="text-center">
        <p className="text-primary font-display text-xl break-words whitespace-pre-line">
          “{content || "Sua mensagem aparece assim, em destaque."}”
        </p>
        {signature && <p className="font-display mt-3">{signature}</p>}
      </ChristmasCard>
    </div>
  );
}

function TemplateStep({
  page,
  set,
  templates,
  run,
}: {
  page: PageData;
  set: SetPage;
  templates: EditorOptions["templates"];
  run: Run;
}) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => {
        const selected = page.templateId === template.id;
        return (
          <li key={template.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => {
                set({ templateId: template.id, template: template.config });
                void run(() => saveTemplate(page.id, template.id));
              }}
              className={cn(
                "flex w-full cursor-pointer flex-col items-center rounded-3xl border-4 bg-white p-4 text-center transition-transform hover:-translate-y-1",
                selected ? "border-elf-green" : "border-transparent",
              )}
            >
              <PhonePreview
                compact
                background={template.config.background}
                recipient={page.recipientName || "Maria"}
                sender={page.senderName || "João"}
                message="Feliz Natal!"
                photos={[1, 3]}
              />
              <span className="font-display mt-3 text-xl font-semibold">{template.name}</span>
              <span className="text-sm opacity-80">{template.description}</span>
              {selected && <span className="tag mt-2">Escolhido ✓</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function FinishStep({
  page,
  missing,
  priceLabel,
  publicUrl,
  goTo,
}: {
  page: PageData;
  missing: ReturnType<typeof missingForCheckout>;
  priceLabel: string;
  publicUrl: string | null;
  goTo: (step: number) => void;
}) {
  if (page.status === "PUBLISHED" && publicUrl) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <ElfCharacter pose="cheer" size={110} />
        <p className="font-display text-xl">Sua página está no ar e as alterações já valem.</p>
        <p className="break-all">{publicUrl}</p>
        <SecondaryButton href={publicUrl} target="_blank">
          Abrir minha página
        </SecondaryButton>
      </div>
    );
  }

  if (missing.length > 0) {
    return (
      <div className="space-y-4">
        <p className="font-display text-lg">Falta pouco! Complete estes itens:</p>
        <ul className="space-y-2">
          {missing.map((item) => (
            <li
              key={item.label}
              className="shadow-soft flex items-center justify-between gap-3 rounded-2xl bg-white p-3"
            >
              <span>{item.label}</span>
              <Button variant="outline" size="sm" onClick={() => goTo(item.step)}>
                Preencher
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <ElfCharacter pose="gift" size={110} />
      <p className="font-display text-xl">
        O presente de {page.recipientName} está pronto para ser embrulhado!
      </p>
      <ul className="w-full max-w-sm space-y-1 text-left">
        <li>✓ {page.photos.length} foto(s)</li>
        <li>✓ {page.music ? `Música: ${page.music.title}` : "Sem música"}</li>
        <li>✓ {page.special ? "Com mensagem especial" : "Sem mensagem especial"}</li>
      </ul>
      <p>
        Pagamento único de <strong className="text-primary text-2xl">{priceLabel}</strong>
      </p>
      <PrimaryButton href={`/checkout/${page.id}`} size="lg">
        Ir para o pagamento
      </PrimaryButton>
      <p className="text-sm opacity-70">A página é publicada assim que o pagamento é confirmado.</p>
    </div>
  );
}
