# T3Cloneathon: A Next-Generation AI Chat Platform

![Status: In Progress](https://img.shields.io/badge/status-in%20progress-yellow)


https://github.com/user-attachments/assets/4049bc25-4f80-4d20-aeff-9dd9550b8b1b


🚧 **This project is a work-in-progress and is currently undergoing a significant refactor to use Convex and the latest Vercel AI SDK.** 🚧

An ambitious project to build a feature-rich, multi-LLM chat application for the [T3 Cloneathon](https://cloneathon.t3.chat/). The goal is to create a comprehensive, customizable, and high-performance AI chat experience that goes beyond a simple interface.

## Core Vision

This platform is an R&D initiative to explore the cutting edge of AI-powered web applications. The focus is on building a robust backend, a highly interactive frontend, and implementing a wide range of features that modern AI users expect.

## Key Features (Planned & Prototyped)

-   [x] **Chat with Various LLMs:** Dropdown support for multiple language models and providers (OpenAI, OpenRouter).
-   [x] **Authentication & Sync:** User authentication with NextAuth.js.
-   [x] **Responsive Design:** Browser-friendly UI built with Tailwind CSS.
-   [x] **Web Search:** Implemented a working prototype for real-time web search using Tavily AI.
-   [x] **Chat Sharing:** Prototype for sharing conversations via a public URL.
-   [x] **Syntax Highlighting:** Code formatting with `highlight.js`.
-   [x] **Bring Your Own Key:** UI to allow users to use their own API keys.
-   [🚧] **Resumable Streams:** Planning to implement with upstash or convex to continue generation after a page refresh.
-   [🚧] **Attachment Support:** Prototyped support for file uploads (images, PDFs).
-   [🚧] **Image Generation Support:** Prototyped support for AI image generation.
-   [🚧] **Chat Branching:** UI for creating alternative conversation paths is prototyped; full integration with AI SDK is in progress.
-   [ ] **Customizable UI:** Future goal to add themes and custom prompt "personalities."

## Tech Stack

This project is built on the T3 Stack and leverages the latest in AI and web development technologies.

-   **Framework:** Next.js 15 / React 19
-   **AI:** Vercel AI SDK (v5 planned), OpenRouter, Tavily AI
-   **Backend & Database:**
    -   **Current:** tRPC, Drizzle ORM, PostgreSQL
    -   **Planned Refactor:** **Convex** for real-time database and backend functions.
-   **Authentication:** NextAuth.js / Clerk
-   **Styling:** Tailwind CSS, Radix UI
-   **Schema Validation:** Zod
-   **Package Manager:** pnpm

## Getting Started

> Note: Setup instructions will be updated after the refactor to Convex is complete.
