import { cn } from "@/lib/cn";

export type ElfPose = "wave" | "gift" | "cheer" | "idle" | "sad";

type Props = {
  pose?: ElfPose;
  /** Largura em pixels; a altura acompanha a proporção. */
  size?: number;
  /** Espelha o duende para olhar para a esquerda. */
  flip?: boolean;
  /** Liga o balanço suave e o aceno. */
  animated?: boolean;
  className?: string;
  /** Descrição para leitores de tela. Sem ela, o duende é decorativo. */
  title?: string;
};

const SKIN = "var(--color-skin)";
const GREEN = "var(--color-elf-green)";
const GREEN_DARK = "var(--color-green-dark)";
const RED = "var(--color-primary)";
const GOLD = "var(--color-gold)";
const INK = "var(--color-text-dark)";

function Arm({ d, hand }: { d: string; hand: [number, number] }) {
  return (
    <>
      <path d={d} fill="none" stroke={GREEN} strokeWidth={17} strokeLinecap="round" />
      <circle cx={hand[0]} cy={hand[1]} r={10} fill={SKIN} />
    </>
  );
}

const LEFT_DOWN = <Arm d="M66 130 Q46 148 48 168" hand={[48, 174]} />;
const RIGHT_DOWN = <Arm d="M134 130 Q154 148 152 168" hand={[152, 174]} />;
const LEFT_UP = <Arm d="M66 130 Q40 116 36 92" hand={[35, 84]} />;
const RIGHT_UP = <Arm d="M134 130 Q160 116 164 92" hand={[165, 84]} />;

/** Duende da Oficina do Noel, em cartoon 2D. */
export function ElfCharacter({
  pose = "wave",
  size = 160,
  flip = false,
  animated = true,
  className,
  title,
}: Props) {
  const sad = pose === "sad";

  return (
    <svg
      viewBox="0 0 200 250"
      width={size}
      height={(size * 250) / 200}
      className={cn(animated && !sad && "animate-bob", className)}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* Sombra no chão */}
      <ellipse cx="100" cy="240" rx="52" ry="7" fill="#000" opacity="0.18" />

      {/* Pernas com meias listradas */}
      <g>
        <rect x="76" y="176" width="18" height="44" rx="8" fill="#fff" />
        <rect x="106" y="176" width="18" height="44" rx="8" fill="#fff" />
        <g fill={RED}>
          <rect x="76" y="186" width="18" height="7" />
          <rect x="76" y="201" width="18" height="7" />
          <rect x="106" y="186" width="18" height="7" />
          <rect x="106" y="201" width="18" height="7" />
        </g>
      </g>

      {/* Sapatos de ponta enrolada */}
      <g fill={GREEN_DARK}>
        <path d="M96 218 Q98 236 78 236 L58 236 Q48 236 52 226 Q54 222 60 226 Q70 216 76 216 Z" />
        <path d="M104 218 Q102 236 122 236 L142 236 Q152 236 148 226 Q146 222 140 226 Q130 216 124 216 Z" />
      </g>
      <circle cx="51" cy="225" r="5" fill={GOLD} />
      <circle cx="149" cy="225" r="5" fill={GOLD} />

      {/* Braços atrás do corpo */}
      {pose === "wave" && LEFT_DOWN}
      {pose === "idle" && (
        <>
          {LEFT_DOWN}
          {RIGHT_DOWN}
        </>
      )}
      {pose === "sad" && (
        <>
          {LEFT_DOWN}
          {RIGHT_DOWN}
        </>
      )}
      {pose === "cheer" && (
        <>
          {LEFT_UP}
          {RIGHT_UP}
        </>
      )}
      {pose === "wave" && (
        <g
          className={animated ? "animate-wave" : undefined}
          style={{ transformOrigin: "134px 130px" }}
        >
          {RIGHT_UP}
        </g>
      )}

      {/* Túnica */}
      <path
        d="M62 124 Q100 108 138 124 L148 180 L136 172 L124 184 L112 172 L100 184 L88 172 L76 184 L64 172 L52 180 Z"
        fill={GREEN}
      />
      {/* Cinto */}
      <rect x="57" y="150" width="86" height="13" rx="3" fill="var(--color-wood-deep)" />
      <rect x="90" y="147" width="20" height="19" rx="4" fill={GOLD} />
      <rect x="95" y="152" width="10" height="9" rx="2" fill="var(--color-wood-deep)" />
      {/* Gola vermelha em zigue-zague */}
      <path
        d="M68 120 Q100 106 132 120 L124 134 L116 122 L108 136 L100 122 L92 136 L84 122 L76 134 Z"
        fill={RED}
      />
      <circle cx="100" cy="141" r="3.5" fill={GOLD} />

      {/* Braços à frente segurando o presente */}
      {pose === "gift" && (
        <>
          <g>
            <rect x="72" y="140" width="56" height="42" rx="5" fill={RED} />
            <rect x="95" y="140" width="10" height="42" fill={GOLD} />
            <rect x="72" y="156" width="56" height="9" fill={GOLD} />
            <path
              d="M100 140 Q84 122 78 134 Q78 142 100 140 Q122 142 122 134 Q116 122 100 140 Z"
              fill={GOLD}
            />
          </g>
          <Arm d="M66 130 Q54 154 72 166" hand={[74, 168]} />
          <Arm d="M134 130 Q146 154 128 166" hand={[126, 168]} />
        </>
      )}

      {/* Orelhas pontudas */}
      <path d="M68 78 L40 62 Q46 88 70 94 Z" fill={SKIN} />
      <path d="M132 78 L160 62 Q154 88 130 94 Z" fill={SKIN} />

      {/* Cabeça */}
      <circle cx="100" cy="82" r="37" fill={SKIN} />
      <circle cx="78" cy="94" r="7" fill="#f08a7a" opacity="0.55" />
      <circle cx="122" cy="94" r="7" fill="#f08a7a" opacity="0.55" />

      {/* Rosto */}
      <g>
        <circle cx="86" cy="84" r="5" fill={INK} />
        <circle cx="114" cy="84" r="5" fill={INK} />
        <circle cx="87.6" cy="82.2" r="1.7" fill="#fff" />
        <circle cx="115.6" cy="82.2" r="1.7" fill="#fff" />
        {sad && (
          <g stroke={INK} strokeWidth="3" strokeLinecap="round">
            <path d="M78 74 L92 77" />
            <path d="M122 74 L108 77" />
          </g>
        )}
        <circle cx="100" cy="93" r="4" fill="#e8a27c" />
        <path
          d={sad ? "M88 107 Q100 97 112 107" : "M86 100 Q100 116 114 100"}
          fill={sad ? "none" : "#fff"}
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Gorro vermelho com pompom amarelo */}
      <path
        d="M62 62 Q70 10 124 12 Q160 14 168 46 Q150 30 132 38 Q142 50 138 62 Q100 44 62 62 Z"
        fill={RED}
      />
      <circle cx="168" cy="50" r="11" fill={GOLD} />
      <path d="M58 60 Q100 38 142 60 L142 72 Q100 50 58 72 Z" fill={GOLD} />
    </svg>
  );
}
