# ADR 0002 — DAG plus bounded composite nodes, not arbitrary cycles

## Status

Accepted.

## Context

The research recipe needs a critique/revise loop. A general workflow engine might allow cycles in the graph. A scheduler with arbitrary cycles needs convergence rules, per-edge iteration state, termination detection and a much more complicated trace.

## Decision

The graph is a DAG. The analyzer rejects cycles. Bounded loops live **inside composite nodes**:

- `draftBrief` performs draft → critique → revise;
- the node records separate LLM spans for each call;
- the node has a fixed maximum number of passes.

## Consequences

- The scheduler is a simple topological queue with deterministic ordering.
- The trace remains a tree/sequence, not a graph with iteration frames.
- The loop is still visible in the trace and in the cost.
- A future `loop` control node can be added without changing the IR, but it must carry an explicit max-iteration and termination contract.
