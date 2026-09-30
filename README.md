# JEV Caveman Token Optimizer

Portable AI-agent inference optimizer: **bypass -> JEV route -> cost gate -> Caveman -> LLM -> telemetry**.

## System design
```text
Agent
  |
  v
Normalize + token estimate
  |
  +-- trivial? --> Fast model ------------------+
  |                                             |
  +-- no --> JEV -------------------------------+
              |                                 |
              v                                 |
       Fast / Medium / Strong                  |
              |                                 |
              v                                 |
      Caveman cost gate                         |
       |             |                          |
     skip           compress                   |
       \_____________/                          |
              |                                 |
              v                                 |
       OpenAI-compatible LLM                   |
              |                                 |
              v                                 |
       telemetry + net savings                 |
```

The core is provider-neutral except for the included OpenAI-compatible adapter. The JEV adapter is intentionally isolated because its exact API contract must be configured from the JEV/TypeSafe account/docs you use; set `JEV_BASE_URL` and `JEV_ROUTE_PATH` rather than hard-coding an unverified endpoint.

Caveman's current engine is local and fail-closed when compression is unavailable or does not make the input smaller; its token reductions are local/inferred estimates rather than provider billing. See its docs for the current CLI contract.

## Run
```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
pytest
jev-optimize "Explain React useMemo in one paragraph"
jev-optimize-mcp
jev-optimize-gateway
```

For Factory, the plugin uses `.factory-plugin/plugin.json`, root `mcp.json`, and `skills/<name>/SKILL.md`.
