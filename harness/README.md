# ArtifyBharat Agent Harness

Agent Harness configuration and execution engine designed according to the `agent-harness-construction` principles.

## Core Pillars
1. **Action Space Quality**: Stable, schema-first Pydantic action models (`harness/action_space.py`) ensuring deterministic tool inputs.
2. **Observation Formatting**: Structured envelopes (`status`, `summary`, `next_actions`, `artifacts`) preventing unstructured hallucination (`harness/observation.py`).
3. **Error Recovery Contract**: Every error state produces an actionable root cause hint, safe retry instructions, and explicit stop gates (`harness/recovery.py`).
4. **Context Budgeting**: Invariant minimal system prompt; external knowledge loaded via files; compaction at phase boundaries (`harness/harness_config.json`).
5. **Pass@k Benchmarking**: Built-in metrics tracking `completion_rate`, `pass@1`, `pass@3`, and cost per task (`harness/evaluator.py`).

## Action Granularity Rules
- **Micro-tools** (High risk): `issue_passport` (Cryptographic provenance actions).
- **Medium-tools** (Common tasks): `calculate_pricing`, `export_channels`.
- **Macro-tools** (Batch operations): `run_verification`.
