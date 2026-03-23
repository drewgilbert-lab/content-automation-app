# Getting Started with the Content Engine

> Last updated: February 2026

---

## What Is the Content Engine?

The Content Engine is an internal AI platform that stores your company's strategic knowledge — personas, account segments, use cases, ICP definitions, and business rules — and uses that knowledge to generate high-quality, on-brand content.

Think of it as a structured memory for your go-to-market team. Instead of starting every content request from scratch, the system retrieves the most relevant company knowledge and feeds it directly to Claude (the underlying AI model) as context. The result is content that reflects your real personas, segments, and business priorities — not generic AI output.

---

## Navigating the Application

When you first open the app, you land on the home dashboard. From there, you can navigate to three main areas:

- **Knowledge Base** (`/knowledge`) — Browse, search, create, and manage knowledge objects. This is the heart of the system.
- **Review Queue** (`/queue`) — The place where proposed changes to the knowledge base wait for admin approval before going live.
- **Dashboard** (`/dashboard`) — A health view showing whether your knowledge base is complete, up-to-date, and well-connected.

You can also reach the Dashboard and Review Queue from the home page cards and from navigation links throughout the application.

---

## Understanding Your Role

The Content Engine has four roles: **Admin**, **Editor**, **Contributor**, and **Viewer**. Your current role is shown in the top-right corner of every page.

### Admin

Admins have full platform access including user management, system configuration, and connected systems. Admins can also perform all Editor actions — reviewing submissions, creating and editing content directly, and using the AI Merge tool.

### Editor

Editors are responsible for content governance. They review submissions in the Review Queue: they can accept, reject, or defer changes proposed by Contributors, and can use the AI Merge tool to intelligently combine a proposed update with the current version. Editors can also create and edit knowledge objects directly without going through the review queue.

### Contributor

Contributors can browse the knowledge base and propose changes, but cannot write directly or approve submissions. When a Contributor fills out the create or edit form and clicks "Submit for Review," their proposed content is placed into the Review Queue as a submission. An Editor or Admin then reviews it before it goes live.

### Viewer

Viewers have read-only access. They can browse the knowledge base, skills, and narratives, and view the cost dashboard, but cannot create, edit, or submit content.

This four-tier model ensures the knowledge base always reflects reviewed, approved information — Editors and Admins serve as content gatekeepers while Contributors propose changes and Viewers consume the output.

### Switching Roles

To switch between roles, click the role toggle in the top-right corner of the app header. Your role selection persists across page loads (it is saved locally in your browser). This toggle is designed for testing and internal use — in production, roles will be tied to your Google sign-in via Group W authentication.

---

## Knowledge Object Types

The knowledge base stores six types of objects. Here is what each one represents:

| Type | What it describes |
|---|---|
| **Persona** | A buyer archetype — their role, goals, pain points, and how they communicate (e.g. Sales, Marketing, RevOps) |
| **Segment** | A category of target companies defined by firmographic criteria like revenue range and employee count (e.g. Enterprise, Mid-Market) |
| **Use Case** | A specific business problem your product solves, including the scenario, benefits, and business drivers |
| **ICP** | Ideal Customer Profile — the intersection of a specific persona and segment, describing your ideal buyer precisely |
| **Business Rule** | Passive constraints that apply to all generated content: tone guidelines, competitor policies, prohibited terms, and brand standards |
| **Skill** | Active procedural instructions for specific content types — step-by-step guidance on how the AI should structure and write a particular kind of content |

---

## Common Pitfalls

**I saved a change but it doesn't appear immediately.** If you are a Contributor, your change goes into the Review Queue, not directly into the knowledge base. Ask an Editor or Admin to review your submission.

**I cannot find the edit button.** The edit button is only visible to Admins and Editors. If you are in Contributor mode, you will see a "Submit for Review" button instead.

**The role toggle isn't working as expected.** Try refreshing the page. The role is stored in your browser's local storage, so a hard refresh should resync it.

**I see a "deprecated" banner on a knowledge object.** Deprecated objects have been soft-deleted — they still exist in the system but are excluded from content generation. Only Admins can deprecate or restore objects. See the [Managing Knowledge](./managing-knowledge.md) guide for details.
