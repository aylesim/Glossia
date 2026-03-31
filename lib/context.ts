import { formatNodeKindsForModelContext } from "./node-kinds";

const RIBOSOMA_DESCRIPTION = `
Ribosoma è un sistema di composizione MIDI basato su grafi.
Il flusso di elaborazione è modellato come un grafo diretto: ogni nodo ("pallino") è una funzione che trasforma eventi MIDI, e ogni arco (edge) indica verso quale nodo fluiscono gli eventi trasformati.
Lo stato completo della patch (grafo di funzioni) è codificato in un unico file JSON che è la sola fonte di verità (SoT).
L'obiettivo del PoC è generare questo JSON a partire da una richiesta in linguaggio naturale.

Regole generali:
- Il JSON deve avere: "version" (stringa, default "1"), "nodes" (array), "edges" (array).
- Ogni nodo ha: "id" (stringa univoca, snake_case consigliato), "type" (uno dei tipi ammessi), "params" (oggetto, può essere {}).
- Ogni edge ha: "from" (id nodo sorgente), "to" (id nodo destinazione).
- Ogni "from" e "to" deve corrispondere a un "id" esistente in "nodes".
- Il grafo deve iniziare con un nodo "midi.in" e terminare con un nodo "midi.out".
- Non inserire id duplicati.
`.trim();

export function buildSystemPrompt(): string {
  return `
Sei un assistente specializzato in Ribosoma, un sistema di composizione MIDI basato su grafi.

${RIBOSOMA_DESCRIPTION}

${formatNodeKindsForModelContext()}

Esempio completo (usa come riferimento per formato e stile):

Prompt utente: "filtra solo le note nel range do3-sol5, quantizza a ottavi, abbassa un po' la dinamica"

Pseudocodice:
\`\`\`
1. ingresso MIDI (midi.in) → 
2. filtra le note MIDI nell'intervallo 48–79 (filter.pitch, minPitch=48, maxPitch=79) →
3. quantizza onset a 1/8 (time.quantize, grid="1/8") →
4. scala la velocity a 0.7 (velocity.scale, factor=0.7) →
5. uscita MIDI (midi.out)
\`\`\`

JSON risultante:
\`\`\`json
{
  "version": "1",
  "nodes": [
    { "id": "in1",    "type": "midi.in",         "params": {} },
    { "id": "fp1",    "type": "filter.pitch",     "params": { "minPitch": 48, "maxPitch": 79 } },
    { "id": "q1",     "type": "time.quantize",    "params": { "grid": "1/8" } },
    { "id": "vs1",    "type": "velocity.scale",   "params": { "factor": 0.7 } },
    { "id": "out1",   "type": "midi.out",         "params": {} }
  ],
  "edges": [
    { "from": "in1",  "to": "fp1" },
    { "from": "fp1",  "to": "q1"  },
    { "from": "q1",   "to": "vs1" },
    { "from": "vs1",  "to": "out1" }
  ]
}
\`\`\`
`.trim();
}

export function buildPseudocodePrompt(userPrompt: string): string {
  return `
L'utente vuole costruire una patch MIDI Ribosoma con questa richiesta:
"${userPrompt}"

Descrivi il flusso come pseudocodice numerato: elenca in ordine i nodi che userai, il loro tipo (scegliendo SOLO dai tipi ammessi), e i parametri principali. Sii conciso e preciso. NON generare ancora JSON.
`.trim();
}

export function buildJsonPrompt(
  userPrompt: string,
  pseudocode: string,
): string {
  return `
L'utente vuole costruire una patch MIDI Ribosoma con questa richiesta:
"${userPrompt}"

Il flusso è stato già descritto nel seguente pseudocodice:
${pseudocode}

Genera SOLO il JSON della patch, rispettando esattamente lo schema descritto. Rispondi SOLO con un blocco JSON valido (\`\`\`json ... \`\`\`), nessun altro testo.
`.trim();
}
