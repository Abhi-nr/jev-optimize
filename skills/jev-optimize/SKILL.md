---
name: jev-optimize
description: Optimize AI-agent inference cost by bypassing trivial requests, routing non-trivial tasks with JEV, and using Caveman context compression only when expected downstream savings justify optimizer overhead.
---
# JEV Optimize
Use `optimize_request` for the complete route -> optional context optimization -> model call flow. Use `select_model` when only routing is needed. Use `optimize_context` only for sufficiently large context. Never claim savings without comparing against the direct baseline; Caveman local token reductions are estimates unless provider usage confirms billing impact. Preserve exact code, credentials, URLs and schemas when compression fidelity is uncertain.
