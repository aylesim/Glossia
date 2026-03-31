# Piano PoC: promptare il grafo Ribosoma (JSON come unica fonte di verità)

Questo documento descrive **cosa va realizzato**, **in che ordine**, e **quale risultato finale deve essere dimostrabile** per un proof of concept navigabile via web (idealmente Next.js).

---

## 1. Contesto e problema

**Ribosoma** modella un processo di trasformazioni MIDI come **grafo diretto** di nodi collegati tra loro:

- Ogni **nodo** (“pallino”) rappresenta una **funzione** (o operatore) nel flusso di elaborazione.
- Gli **archi** definiscono come il segnale o i dati fluiscono da una funzione all’altra.
- Lo stato della patch (topologia del grafo, tipi di nodo, parametri) non va duplicato in più posti: deve vivere in un **unico artefatto strutturato**.

**File JSON come only source of truth (SoT):** tutto ciò che l’applicazione mostra o esegue (nel PoC: almeno visualizzazione e validazione) deve essere **derivato dal JSON**. Non si mantiene uno stato parallelo “autoritativo” nell’UI che possa divergere dal file senza una scrittura esplicita verso il SoT.

**Ipotesi da dimostrare:** con un **contesto adeguato** (schema, semantica dei nodi, vincoli, esempi), un utente può **descrivere in linguaggio naturale** ciò che vuole ottenere e un modello linguistico può produrre:

1. una forma intermedia leggibile (**pseudocodice** o piano strutturato del flusso), e da lì  
2. il **JSON** conforme allo schema, pronto a essere la SoT della patch.

Il PoC non deve replicare l’intero motore MIDI di Ribosoma; deve **provare la catena prompt → artefatto intermedio → JSON valido → resa in UI**.

---

## 2. Obiettivo del proof of concept

Costruire un’applicazione web che permetta di:

1. Inserire un **prompt** in linguaggio naturale che descrive il flusso desiderato (es. “prima filtra le note sotto il do4, poi quantizza a sedicesimi”).
2. (Pipeline prevista) Ottenere **pseudocodice** che descrive il grafo in modo umanamente controllabile.
3. Ottenere **JSON** che rappresenta lo stato della patch secondo uno **schema definito e validabile**.
4. **Validare** il JSON contro lo schema e mostrare errori chiari se non è conforme.
5. **Visualizzare** in modo minimamente convincente il grafo (o una rappresentazione equivalente: elenco nodi, archi, parametri) **solo** a partire dal JSON parsato.

**Risultato dimostrabile:** una demo in browser in cui un osservatore vede che “ho chiesto X a parole” e “è emerso un JSON strutturato che rappresenta un grafo di funzioni coerente con la richiesta”, con tracciabilità del passaggio intermedio (pseudocodice) se incluso nella pipeline.

---

## 3. Stack tecnico consigliato

| Area | Scelta consigliata | Motivo |
|------|-------------------|--------|
| Framework | **Next.js** (App Router) | PoC web rapida, API route lato server per le chiavi LLM |
| Linguaggio | **TypeScript** | Allineamento tipi ↔ schema JSON |
| Validazione | **Zod** (o equivalente) | Schema unico usato per validare output modello e stato UI |
| LLM | Configurabile (es. OpenAI API) | Chiave solo server-side |
| UI | Componenti semplici + eventuale grafo leggero | Obiettivo è chiarezza, non un editor nodi completo |

---

## 4. Definizione del “contratto”: schema JSON (SoT)

Prima di scrivere codice va **fissato** (anche in versione ridotta per il PoC) il formato del JSON. Elementi tipici:

- **`version`** (stringa): per evolvere lo schema senza rompere i vecchi file.
- **`nodes`**: array di oggetti con almeno `id` univoco, `type` (tipo di funzione Ribosoma o stub PoC), `params` (oggetto chiave-valore opzionale).
- **`edges`**: array con `from` e `to` (riferimenti a `id` di nodi), eventualmente etichette per porte se servono in futuro.

Regole di integrità (da applicare in validazione):

- Ogni `edge.from` e `edge.to` deve esistere in `nodes`.
- Nessun `id` duplicato tra nodi.
- (Opzionale PoC) `type` deve appartenere a un elenco chiuso di tipi noti.
- (Opzionale) assenza di cicli o vincoli topologici se il dominio lo richiede.

Il file TypeScript + Zod che descrive questo schema è la **base** sia per la validazione in UI sia per le istruzioni al modello (“genera solo JSON che rispetta questo schema”).

### 4.1 Pallini (funzioni) di esempio per il PoC

Nel repository è definito un **catalogo chiuso** di tipi di nodo pensati per la demo (trasformazioni MIDI generiche, senza legare il PoC a un motore reale).

**Nessuna esecuzione reale:** questi tipi sono solo **vocabolario semantico** per JSON, validazione, UI e contesto LLM. Non esiste nel PoC un runtime che applichi filtri, quantizzazione o CC ai messaggi MIDI; `midi.in` / `midi.out` non aprono device o stream. L’obiettivo è dimostrare la **composizione del grafo e la SoT JSON**, non l’audio.

Serve tre cose:

1. **Elenco machine-readable** in `lib/node-kinds.ts`: ogni voce ha `type` (stringa usata nel JSON), `label`, `description` (testo per umani e per contesto LLM), e `params` con nome, tipo valore e significato.
2. **Lista degli id ammessi** esportata come `POC_NODE_TYPE_IDS` e helper `getNodeKindByType` / `formatNodeKindsForModelContext()` per costruire il prompt di sistema e validare che `node.type` sia uno dei tipi noti. `formatNodeKindsForModelContext()` antepone `POC_NODE_KINDS_STUB_DISCLAIMER`, così anche il modello sa che i pallini non hanno runtime MIDI.
3. **Patch JSON di esempio** in `examples/sample-patch.json`: grafo lineare `midi.in` → filtro canale → filtro pitch → quantize → scala velocity → `midi.out`, con parametri realistici.

Tabella riassuntiva (dettaglio completo nel file TS):

| `type` | Ruolo |
|--------|--------|
| `midi.in` | Ingresso del flusso nella patch |
| `midi.out` | Uscita verso il sink |
| `filter.pitch` | Solo note con pitch in `minPitch`–`maxPitch` |
| `transform.transpose` | Sposta il pitch di `semitones` |
| `time.quantize` | Griglia `grid`: `1/4`, `1/8`, `1/16`, `1/32` |
| `velocity.scale` | Moltiplica velocity per `factor` |
| `cc.map` | Rimappa CC `fromCc` → `toCc` |
| `filter.channel` | Solo eventi sul canale `channel` (1–16) |

Quando importerai Zod, lo schema della patch dovrà **accettare solo** questi `type` (o un sottoinsieme) e le chiavi in `params` coerenti con la definizione del tipo.

---

## 5. Contesto per il modello (system / developer prompt)

Va predisposto un **documento di contesto** (testo lungo stabile) che includa:

- Descrizione sintetica di Ribosoma e significato di nodi e archi nel flusso MIDI.
- **Schema** del JSON (campi obbligatori, tipi, esempi validi).
- Elenco dei **`type`** di nodo ammessi nel PoC con una riga di descrizione ciascuno.
- **Esempi few-shot**: almeno uno con prompt utente → pseudocodice → JSON finale.
- Regole di output: formato (es. solo JSON in un blocco codice per lo step JSON; niente testo extra se possibile).

Questo contesto va inviato al modello ad ogni richiesta (o referenziato in modo equivalente), così la generazione resta **vincolata** al dominio Ribosoma e allo schema.

---

## 6. Pipeline di generazione

### 6.1 Modalità consigliata (due passaggi)

1. **Passo A — Pseudocodice**  
   Input: prompt utente + contesto.  
   Output: testo strutturato (pseudocodice) che elenca nodi, collegamenti e parametri in linguaggio quasi-algoritmico.

2. **Passo B — JSON**  
   Input: prompt utente + pseudocodice del passo A + contesto + istruzione “produci solo JSON valido secondo lo schema”.  
   Output: stringa JSON da parsare e validare con Zod.

**Vantaggio:** il passo intermedio è ispezionabile e correggibile; riduce errori di struttura rispetto a un solo shot diretto a JSON.

### 6.2 Modalità alternativa (un passaggio)

Una sola chiamata che produce direttamente il JSON. Utile come confronto o fallback, ma meno adatto a “dimostrare” il ragionamento intermedio.

### 6.3 Orchestrazione lato server

- Un **endpoint API** (es. `POST /api/compose` o `/api/generate`) riceve: `prompt`, opzionalmente `mode: "full" | "pseudocode-only" | "json-only"`, e opzionalmente `pseudocode` già approvato dall’utente per rigenerare solo il JSON.
- Il server chiama il provider LLM con il contesto; **non** espone mai la chiave API al client.

---

## 7. Applicazione Next.js: cosa implementare

### 7.1 Struttura logica

- **`lib/schema.ts`** (o simile): definizione Zod + tipi TypeScript esportati per `Patch` / `GraphState`.
- **`lib/node-kinds.ts`**: catalogo tipi di nodo PoC (già presente) + `formatNodeKindsForModelContext()` da incorporare nel contesto LLM.
- **`lib/ribosoma-context.md`** o stringa in TS: testo del contesto per il modello (versionabile insieme al codice).
- **`examples/sample-patch.json`**: patch di esempio (già presente); opzionale **`lib/examples.ts`** che lo importa o duplica per test.
- **`app/api/.../route.ts`**: logica di chiamata LLM e assemblaggio dei messaggi per passo A e/o B.
- **`app/page.tsx`** (o route dedicata): UI del PoC.

### 7.2 Interfaccia utente minima

- Campo **prompt**.
- Pulsanti: **Genera (pipeline completa)**, eventualmente **Solo pseudocodice**, **Genera JSON da pseudocodice corrente** (se l’utente ha modificato il testo).
- Aree di output: **Pseudocodice** (textarea o `<pre>`), **JSON** (con evidenziazione sintassi se facile), **Messaggi di validazione** (successo / elenco errori Zod).
- **Preview del grafo**: almeno una rappresentazione leggibile derivata dal JSON (lista nodi e archi, o mini-grafo con libreria leggera). La preview **non** deve essere la SoT: se l’utente “sposta” un nodo solo in canvas senza aggiornare il JSON, nel PoC si può o ignorare il drag o richiedere esplicitamente “esporta in JSON”; per semplicità, spesso si usa **sola lettura** dalla SoT.

### 7.3 Variabili d’ambiente

- Chiave API del provider (es. `OPENAI_API_KEY`) solo in `.env.local`, letta solo in route server.

### 7.4 Affidabilità dell’output LLM

- Dopo ogni generazione JSON: **parse** + **safeParse Zod**.  
- Se fallisce: mostrare errore e opzionalmente **ritentare** con un messaggio di correzione (“l’errore era: … rigenera solo JSON valido”).  
- Opzionale: richiedere **JSON mode** / structured output se il provider lo supporta, per ridurre markup spurio.

---

## 8. Risultato finale atteso (deliverable)

Al termine dell’implementazione, il **risultato finale** è:

1. **Repository** con un’app Next.js avviabile in locale (`npm run dev`) che espone una pagina demo.
2. **Documentazione operativa minima** in README: come impostare `.env.local`, come avviare, cosa inserire nel prompt.
3. **Comportamento dimostrabile:**  
   - L’utente inserisce una richiesta in linguaggio naturale.  
   - Il sistema mostra (se pipeline completa) pseudocodice e poi JSON.  
   - Il JSON viene **validato**; se valido, la UI mostra **una preview coerente** del grafo (o equivalente strutturato).  
4. **Principio SoT rispettato:** la preview e ogni rappresentazione “ufficiale” dello stato patch nel PoC derivano dal JSON validato, non da stato fantasma nel client.

Non è richiesto per il PoC: motore MIDI reale, **implementazione eseguibile dei tipi di nodo** (i pallini restano definizioni e metadati), persistenza su database, autenticazione multi-utente, editor grafico completo da zero con undo/redo su grafo.

---

## 9. Criteri di successo (checklist)

- [ ] Schema JSON + Zod definiti e documentati nel contesto del modello.  
- [ ] API server-side che esegue la pipeline senza esporre segreti.  
- [ ] UI che mostra prompt, output intermedio (se abilitato), JSON, esito validazione.  
- [ ] Almeno **un esempio** precaricabile o documentato che produce un grafo sensato.  
- [ ] Dimostrazione registrabile (schermo o istruzioni) in **meno di 2 minuti** del flusso end-to-end.

---

## 10. Estensioni successive (fuori scope PoC stretto)

- Allineamento 1:1 con il JSON **reale** di Ribosoma (se già esiste un formato di export).  
- Import/export file `.json` da disco.  
- Diff tra due versioni della patch.  
- Test automatici su fixture JSON e su risposte simulate del LLM.  
- Integrazione con runtime MIDI quando il formato sarà stabile.

---

## 11. Riepilogo in una frase

**Il PoC è riuscito quando, partendo da un prompt in linguaggio naturale e dal contesto Ribosoma/schema, si ottiene un JSON validato che rappresenta il grafo di funzioni, e una UI web mostra in modo chiaro e tracciabile il percorso pseudocodice → JSON → anteprima dello stato della patch.**
