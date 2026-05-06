---
tags: [constellate, reference, mental-models, build]
status: active
note_type: reference
owner: Trevor
updated: 2026-05-06
visibility: internal
aliases: [Mental Models, Vibe Coding Lessons]
---

# Mental Models for Building with AI

Purpose: distilled lessons from studying how other builders work with AI tools. Not theory. Things that have been proven in practice.

---

## The two modes you are always in

When building, you are either in one of two states:

**Implementing a new feature**
- Define it clearly before touching anything
- Provide context, frameworks, explicit details
- Make incremental changes
- Commit after each thing that works

**Debugging an error**
- Understand the structure before trying to fix it
- Copy the exact error, paste it without commentary
- Point the AI toward the right file
- Ask for the simplest fix first, not the most thorough one

Knowing which mode you are in tells you what to do next.

---

## Planning is the undervalued part

Most people spend 5 minutes planning and 5 hours debugging.

Invert this. Spend 30 to 90 minutes planning before writing a single line of code. If the plan is directionally right, implementation is fast. If the plan is wrong, no amount of implementation skill saves you.

The adversarial loop: write a plan, have a second model or perspective review it, refine, then implement. Keep going until the plan has no obvious holes.

---

## Context windows and when to start fresh

The AI only remembers a certain amount of conversation at once. After too many back and forth turns, it starts to lose the thread and produce inconsistent output.

Signs you need a fresh context:
- The AI starts contradicting earlier decisions
- Fixes in one place break something else
- Output quality drops noticeably
- You are more than 8 to 10 turns deep on a complex problem

When this happens: start a new session, summarize what exists and what you want, do not paste the whole conversation history.

---

## Vibe coding platforms vs real tools

Vibe coding tools like V0 and Lovable are great for:
- Getting a working UI prototype fast
- Testing whether an idea looks right
- Exploring design directions

They hit a wall when:
- Real backend complexity arrives
- Environment variables and integrations need to be connected
- Something breaks and the AI cannot trace why
- You need the app to actually be production ready

Claude Code is the answer for building something real. It understands your entire project structure. It can one-shot problems that vibe coding tools cannot solve after hours of trying.

You are already past the vibe coding stage. Do not go back.

---

## Simplest solution first

When the AI suggests downloading five dependencies to solve a problem, ask it for the simplest possible version first.

More often than not, the simple version works and you do not need the complexity. The AI has a tendency to reach for comprehensive solutions when minimal ones would do.

---

## Metaprompting

Instead of telling the AI what to build, tell it how to think about what you want to build. Ask it to ask you questions. Use those questions to surface what you have not defined yet.

The output of good metaprompting is a clear brief or PRD that you can then hand to the building agent. This is more valuable than any single prompt.

---

## When to use a third party service

Simple things: do them yourself. Compressing an image, basic formatting, simple calculations.

Complex things with known solutions: use a third party service. Authentication, search with semantic understanding, payment processing. Do not rebuild what already exists well.

The test: would a competent engineer build this from scratch, or would they reach for an existing tool? If they would reach for a tool, reach for the tool.

---

## The product has to feel interesting first

Features do not fix a product that does not feel compelling.

Before adding anything new, ask: does the current version make someone say "this is interesting"? If not, go deeper on what exists before building what is next.

This is the difference between a product that ships and one that gets rebuilt forever.
