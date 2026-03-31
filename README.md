# Ribosoma — graph composer PoC

Proof of concept: **promptare un grafo di funzioni MIDI** usando un LLM come generatore del JSON che funge da unica fonte di verità (SoT) della patch.

## Cosa fa

1. Scrivi un prompt in linguaggio naturale (es. _"filtra le note basse, quantizza a sedicesimi"_).
2. Il sistema genera **pseudocodice** che descrive il flusso nodo per nodo.
3. Dal pseudocodice viene generato il **JSON della patch**, validato contro lo schema Zod.
4. La UI mostra il **grafo interattivo** dei nodi e degli archi.

Il JSON è l'unica SoT: tutto ciò che vedi nella UI deriva dal parse del JSON validato.

## Avvio in locale

```bash
# 1. Installa le dipendenze
npm install

# 2. Configura la chiave API
cp .env.local.example .env.local
# Poi apri .env.local e inserisci la tua OPENAI_API_KEY

# 3. Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Variabili d'ambiente

| Variabile | Obbligatoria | Default | Descrizione |
|-----------|-------------|---------|-------------|
| `OPENAI_API_KEY` | sì | — | Chiave API OpenAI |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | Modello da usare (es. `gpt-4o`) |

## Struttura del progetto

```
lib/
  node-kinds.ts     # Catalogo dei tipi di nodo (pallini) del PoC
  schema.ts         # Schema Zod della patch + validazione
  context.ts        # System prompt e user prompt builder per LLM
  examples.ts       # Fixture di patch di esempio

app/
  page.tsx                    # UI demo
  components/PatchGraph.tsx   # Visualizzatore grafo (ReactFlow)
  api/generate/route.ts       # Endpoint POST: pipeline pseudocodice → JSON

examples/
  sample-patch.json   # Patch di esempio in formato JSON

docs/
  PIANO-POC.md        # Documentazione dettagliata del progetto
```

## Tipi di nodo disponibili

| `type` | Funzione |
|--------|----------|
| `midi.in` | Ingresso del flusso MIDI |
| `midi.out` | Uscita MIDI |
| `filter.pitch` | Filtra note per range di pitch |
| `filter.channel` | Filtra per canale MIDI |
| `transform.transpose` | Trasposizione in semitoni |
| `time.quantize` | Quantizzazione a griglia |
| `velocity.scale` | Scala la velocity |
| `cc.map` | Rimappa Control Change |

> I nodi sono **stub semantici** per il PoC: descrivono il grafo ma non eseguono trasformazioni MIDI reali.

## Modalità di generazione

- **Pipeline completa**: pseudocodice → JSON in sequenza.
- **Solo pseudocodice**: produce solo la descrizione intermedia.
- **JSON da pseudocodice**: rigenera il JSON a partire da pseudocodice esistente (utile dopo correzioni manuali).
