export type ParamValueType = "number" | "string" | "boolean";

export type NodeParamSpec = {
  key: string;
  valueType: ParamValueType;
  description: string;
  default?: string | number | boolean;
};

export type NodeKindDefinition = {
  type: string;
  label: string;
  description: string;
  params: NodeParamSpec[];
};

export const POC_NODE_KINDS: readonly NodeKindDefinition[] = [
  {
    type: "midi.in",
    label: "Ingresso MIDI",
    description:
      "Punto di ingresso del flusso MIDI nella patch. Non trasforma gli eventi; li rende disponibili agli archi uscenti.",
    params: [],
  },
  {
    type: "midi.out",
    label: "Uscita MIDI",
    description:
      "Punto di uscita del flusso MIDI. Riceve gli eventi dal grafo e li consegna al sink (PoC: solo topologia, nessun driver reale).",
    params: [],
  },
  {
    type: "filter.pitch",
    label: "Filtro intervallo di nota",
    description:
      "Lascia passare solo note-on/note-off il cui pitch è nell’intervallo inclusivo minPitch–maxPitch (numero nota MIDI 0–127).",
    params: [
      {
        key: "minPitch",
        valueType: "number",
        description: "Pitch minimo inclusivo (MIDI, 0–127).",
        default: 0,
      },
      {
        key: "maxPitch",
        valueType: "number",
        description: "Pitch massimo inclusivo (MIDI, 0–127).",
        default: 127,
      },
    ],
  },
  {
    type: "transform.transpose",
    label: "Trasposizione",
    description:
      "Trasla il pitch delle note di un numero intero di semitoni (positivo o negativo).",
    params: [
      {
        key: "semitones",
        valueType: "number",
        description: "Semitoni di spostamento (es. 12 = un’ottava su).",
        default: 0,
      },
    ],
  },
  {
    type: "time.quantize",
    label: "Quantizzazione",
    description:
      "Allinea onset (e opzionalmente durate, nel PoC solo onset) a una griglia musicale fissa.",
    params: [
      {
        key: "grid",
        valueType: "string",
        description:
          'Risoluzione della griglia: una tra "1/4", "1/8", "1/16", "1/32".',
        default: "1/16",
      },
    ],
  },
  {
    type: "velocity.scale",
    label: "Scala velocity",
    description:
      "Moltiplica la velocity delle note per un fattore; utile per comprimere o esagerare il dinamismo.",
    params: [
      {
        key: "factor",
        valueType: "number",
        description: "Fattore moltiplicativo (es. 0.5 attenua, 1.2 rinforza).",
        default: 1,
      },
    ],
  },
  {
    type: "cc.map",
    label: "Rimappa Control Change",
    description:
      "Riscrive i messaggi CC: il controller sorgente viene emesso come un altro numero di controller.",
    params: [
      {
        key: "fromCc",
        valueType: "number",
        description: "Numero CC in ingresso (0–127).",
        default: 1,
      },
      {
        key: "toCc",
        valueType: "number",
        description: "Numero CC in uscita (0–127).",
        default: 11,
      },
    ],
  },
  {
    type: "filter.channel",
    label: "Filtro canale MIDI",
    description:
      "Lascia passare solo eventi appartenenti al canale indicato (1–16 nel dominio umano; nel JSON si usa 1–16 come nel PoC).",
    params: [
      {
        key: "channel",
        valueType: "number",
        description: "Canale MIDI 1–16.",
        default: 1,
      },
    ],
  },
] as const;

export const POC_NODE_KINDS_STUB_DISCLAIMER =
  "PoC non eseguibile: i tipi di nodo sono solo etichette semantiche per comporre il grafo nel JSON. Nessuna trasformazione MIDI viene applicata in runtime; midi.in/midi.out non collegano device.";

export const POC_NODE_TYPE_IDS: readonly string[] = POC_NODE_KINDS.map(
  (k) => k.type,
);

export function getNodeKindByType(
  type: string,
): NodeKindDefinition | undefined {
  return POC_NODE_KINDS.find((k) => k.type === type);
}

export function formatNodeKindsForModelContext(): string {
  const lines: string[] = [
    POC_NODE_KINDS_STUB_DISCLAIMER,
    "",
    "Tipi di nodo ammessi nel PoC (campo `type` nel JSON). Ogni nodo ha `id`, `type`, `params` (oggetto; chiavi solo tra quelle elencate per quel tipo).",
    "",
  ];
  for (const k of POC_NODE_KINDS) {
    lines.push(`- **${k.type}** (${k.label}): ${k.description}`);
    if (k.params.length > 0) {
      for (const p of k.params) {
        lines.push(
          `  - \`${p.key}\` (${p.valueType}) — ${p.description}` +
            (p.default !== undefined ? ` [default: ${JSON.stringify(p.default)}]` : ""),
        );
      }
    } else {
      lines.push("  - nessun parametro (`params` può essere `{}`).");
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
