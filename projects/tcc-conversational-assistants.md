My undergraduate final project (TCC) at the Federal University of Mato Grosso do Sul (UFMS):
**"Perspectives on the Development of Conversational Assistants with LLMs: A Case Study"**.

for this thesis i built the same LLM-powered assistant **three times** — on purpose. same
product, same features, three different architectures. this page is the blog-friendly version
of what i learned.

## meet finbot

**finbot** is a telegram assistant for personal credit card management: you register cards,
log expenses (single or installments), ask for invoice reports and edit or delete entries —
all in natural language, like *"70 reais, yesterday, Itaú Black, tire shop"*.

the finance domain was the playground, but the real subject of the thesis was the
**architecture**: how much of the system should be controlled by code, and how much should be
delegated to the LLM?

the stack: **n8n** (self-hosted) for orchestration, **telegram bot api** via webhook,
**postgres (supabase)** for the financial data, **redis** for conversational state and
short-term memory, and LLMs via groq first, then openrouter.

## why n8n?

n8n made it possible to prototype and iterate on the assistant's orchestration visually,
connecting the LLM to the rest of the workflow (triggers, APIs, data) without rebuilding
infrastructure at every experiment — which is exactly the kind of automation work i love.

## version 1 — one giant workflow

the first version was a single n8n workflow with **more than a hundred nodes**. the LLM did
one tiny job: classify the user's intent into a label like `save_expense` or
`generate_report`. everything else — extracting values and dates, normalizing card names,
building queries, assembling responses, managing session state — was code.

it worked as a proof of viability, but:

- changing one feature meant navigating (and possibly breaking) the whole graph
- debugging was painful with that many interconnected nodes
- the model was underused: things it could do flexibly, like extracting several fields from
  one sentence, were handled by rigid code that broke when users phrased things differently

## version 2 — multi-workflow with LLM extraction

the second version split the monolith into an **orchestrator + one sub-workflow per feature**
(expense, card, report, edit, delete). the orchestrator became a proper AI agent: each
sub-workflow was exposed to it as a tool, and the model decided which one to call. inside each
sub-workflow, the LLM extracted all the entities (value, date, category, card) in one shot,
and conversational state moved from postgres tables to redis.

better coupling, better maintainability — but a lot of logic was still duplicated across
sub-workflows, and after the extraction step everything was hardcoded again. the LLM decided
*what* to do and *which* data to use, but never *how*.

## version 3 — multi-agent with atomic tools

the final version reorganized everything around **atomic tools**: minimal, single-purpose
tools like `list_cards`, `insert_expense`, `delete_expense`, `get_report_data`,
`build_report`, `redis_set`, `redis_get`. on top of them, **five specialized agents**
(expense, card, report, edit, delete) coordinated by an orchestrator agent.

the interesting part is that features became *compositions*: editing an expense is just
"list, delete, insert again" reusing existing tools. destructive operations got a two-step
confirmation pattern — the agent lists candidates, stores them in redis, and only acts after
the user confirms. adding a new feature started to feel almost plug-and-play, and most
behavior changes became prompt edits instead of graph surgery.

## measuring it: n8n evaluations + LLM-as-judge

opinions about architecture are cheap, so each version was evaluated with the **n8n
evaluations** module: a set of test cases with expected states and responses, judged by a
separate model (the agents ran on `gpt-4.1-mini`, the judge was `claude-3-5-haiku` — a
different model family on purpose, to reduce self-preference bias).

the aggregated results per version:

- **v1 (single flow):** 9.52% accuracy · 5.86s per interaction · ~5,942 tokens
- **v2 (multi-workflow):** 42.85% accuracy · 10.04s · ~2,903 tokens
- **v3 (multi-agent):** 75.51% accuracy · 7.27s · ~4,538 tokens

v3 gets it right **~8x more often than v1**, costing only about a second and a half more per
interaction. and my favorite counterintuitive finding: v3 makes *several* LLM calls per
message and is still faster than v2, which makes exactly one — a single extraction followed
by a fixed pipeline accumulates more latency than an agent that stops reasoning as soon as
the right tool is called. more LLM calls ≠ slower.

## what i took away from it

- **delegating more to the model improved functional quality at every step.** the trend
  v1 → v2 → v3 was consistent: less micro-management, better conversations.
- **but delegation isn't free.** you give up deterministic guarantees — the agent can pick
  the wrong tool or the wrong arguments — so testing and validation become central, and
  destructive actions need confirmation patterns.
- **one prompt per responsibility.** cramming every intent and every path into a single
  prompt increases hallucination; small, focused prompts (orchestrator routes, specialists
  execute) reduce the decision space per call.
- **"final version" deserves quotes.** systems like this are never done — there's always a
  detail to improve with something you learned last week.

if you're building conversational agents and wondering whether the multi-agent hype is worth
it: in my experiment, it was — as long as you can measure it. build the evaluation first,
then argue about architecture.

## screenshots

*(prints coming soon — i'll add images of the workflows and the assistant in action here.)*

## read the full thesis

the complete document (in portuguese) is available at the UFMS repository:
[repositorio.ufms.br — full thesis PDF](https://repositorio.ufms.br/retrieve/a8d0cdeb-1366-429e-9158-9374162e692c/24028.pdf)
*i'm working on an english version*
