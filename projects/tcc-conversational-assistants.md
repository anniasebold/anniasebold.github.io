My undergraduate final project (TCC) at the Federal University of Mato Grosso do Sul (UFMS):
**"Perspectives on the Development of Conversational Assistants with LLMs: A Case Study"**.

For this thesis I built the same LLM-powered assistant **three times** — on purpose. Same
product, same features, three different architectures. This page is the blog-friendly version
of what I learned.

*(A heads-up: the Telegram prints below are real conversations with the bot, so they're in
Portuguese — the diagrams are translated.)*

## Meet Finbot

**Finbot** is a Telegram assistant for personal credit card management: you register cards,
log expenses (single or installments), ask for invoice reports and edit or delete entries —
all in natural language, like *"70 reais, yesterday, Itaú Black, tire shop"*.

The finance domain was the playground, but the real subject of the thesis was the
**architecture**: how much of the system should be controlled by code, and how much should be
delegated to the LLM?

The stack: **n8n* (self-hosted) for orchestration, **Telegram Bot API** via webhook,
**Postgres (Supabase)** for the financial data, **Redis** for conversational state and
short-term memory, and LLMs via Groq first, then OpenrRouter.

## Why n8n?

n8n made it possible to prototype and iterate on the assistant's orchestration visually,
connecting the LLM to the rest of the workflow (triggers, APIs, data) without rebuilding
infrastructure at every experiment — which is exactly the kind of automation work I like.

![An n8n workflow: nodes connected on the visual canvas](assets/img/finbot-n8n-workflow.png)

## Version 1 — one giant workflow

The first version was a single n8n workflow with **more than a hundred nodes**. The LLM did
one tiny job: classify the user's intent into a label like `save_expense` or
`generate_report`. Everything else — extracting values and dates, normalizing card names,
building queries, assembling responses, managing session state — was code.

![V1 architecture: one single workflow, with the LLM acting only as an intent classifier](assets/img/finbot-v1-architecture.svg)

It worked as a proof of viability, but:

- changing one feature meant navigating (and possibly breaking) the whole graph
- debugging was painful with that many interconnected nodes
- the model was underused: things it could do flexibly, like extracting several fields from
  one sentence, were handled by rigid code that broke when users phrased things differently

## Version 2 — multi-workflow with LLM extraction

The second version split the monolith into an **orchestrator + one sub-workflow per feature**
(expense, card, report, edit, delete). The orchestrator became a proper AI agent: each
sub-workflow was exposed to it as a tool, and the model decided which one to call. Inside each
sub-workflow, the LLM extracted all the entities (value, date, category, card) in one shot,
and conversational state moved from postgres tables to redis.

![V2 architecture: an orchestrator agent routing to one sub-workflow per feature](assets/img/finbot-v2-architecture.svg)

Better coupling, better maintainability — but a lot of logic was still duplicated across
sub-workflows, and after the extraction step everything was hardcoded again. The LLM decided
*what* to do and *which* data to use, but never *how*.

## Version 3 — multi-agent with atomic tools

The final version reorganized everything around **Atomic Tools**: minimal, single-purpose
tools like `list_cards`, `insert_expense`, `delete_expense`, `get_report_data`,
`build_report`, `redis_set`, `redis_get`. On top of them, **five specialized agents**
(expense, card, report, edit, delete) coordinated by an orchestrator agent.

![V3 architecture: orchestrator, five specialized agents and a shared layer of atomic tools](assets/img/finbot-v3-architecture.svg)

The interesting part is that features became *compositions*: editing an expense is just
"list, delete, insert again" reusing existing tools. Destructive operations got a two-step
confirmation pattern — the agent lists candidates, stores them in redis, and only acts after
the user confirms. adding a new feature started to feel almost plug-and-play, and most
behavior changes became prompt edits instead of graph surgery.

## Measuring it: n8n evaluations + LLM-as-judge

Opinions about architecture are cheap, so each version was evaluated with the **n8n
evaluations** module: a set of test cases with expected states and responses, judged by a
separate model (the agents ran on `gpt-4.1-mini`, the judge was `claude-3-5-haiku` — a
different model family on purpose, to reduce self-preference bias).

![LLM-as-judge evaluation flow: the agent's response is scored against the expected one by a judge model](assets/img/finbot-llm-as-judge.svg)

The aggregated results per version:

- **v1 (single flow):** 9.52% accuracy · 5.86s per interaction · ~5,942 tokens
- **v2 (multi-workflow):** 42.85% accuracy · 10.04s · ~2,903 tokens
- **v3 (multi-agent):** 75.51% accuracy · 7.27s · ~4,538 tokens

![Accuracy per version: 9.52% on V1, 42.85% on V2, 75.51% on V3](assets/img/finbot-accuracy-by-version.svg)

V3 gets it right **~8x more often than V1**, costing only about a second and a half more per
interaction. And my favorite counterintuitive finding: V3 makes *several* LLM calls per
message and is still faster than V2, which makes exactly one — a single extraction followed
by a fixed pipeline accumulates more latency than an agent that stops reasoning as soon as
the right tool is called. More LLM calls ≠ slower.

## What I took away from it

- **Delegating more to the model improved functional quality at every step.**  the trend V1 → V2 → V3 was consistent: less micro-management, better conversations.
- **But delegation isn't free.** you give up deterministic guarantees — the agent can pick the wrong tool or the wrong arguments — so testing and validation become central, and destructive actions need confirmation patterns.
- **One prompt per responsibility.** cramming every intent and every path into a single prompt increases hallucination; small, focused prompts (orchestrator routes, specialists execute) reduce the decision space per call.
- **"Final version" deserves quotes.** systems like this are never done — there's always a detail to improve with something you learned last week.

If you're building conversational agents and wondering whether the multi-agent hype is worth
it: in my experiment, it was — as long as you can measure it. Build the evaluation first,
then argue about architecture.

## Screenshots

Some real conversations with the final version (in Portuguese):

![Logging an expense in natural language, and registering a new card the moment Finbot notices it doesn't exist yet](assets/img/finbot-card-registration.png)

*Logging an expense — and registering a new card the moment Finbot notices it doesn't exist yet.*

![Registering an installment purchase in one message](assets/img/finbot-installment-purchase.png)

*An installment purchase: the agent detects the installments, splits the total and assigns each one to the right invoice.*

![Invoice report grouped by category](assets/img/finbot-invoice-report.png)

*An invoice report grouped by category — composed by the `get_report_data` + `build_report` tools.*

![Deleting an expense with a two-step confirmation](assets/img/finbot-delete-confirmation.png)

*Deleting an expense: the agent lists the candidates and asks for confirmation before touching anything.*

## Read the full thesis

The complete document (in portuguese) is available at the UFMS repository:
[repositorio.ufms.br — full thesis PDF](https://repositorio.ufms.br/retrieve/a8d0cdeb-1366-429e-9158-9374162e692c/24028.pdf)
*I'm working on an english version*
