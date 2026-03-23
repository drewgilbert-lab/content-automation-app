# Using the Skills Library

> Last updated: March 23, 2026

---

## Overview

The Skills Library manages the procedural instructions that tell the AI **how** to perform specific content generation tasks. A skill is an active directive — it describes a method, technique, or workflow step the AI should follow when producing content. This is distinct from Business Rules, which are passive constraints that define what the AI should **not** do or must always comply with.

| | Skill | Business Rule |
|---|---|---|
| Nature | Active — "how to do" | Passive — "what not to do" |
| Example | "Structure blog posts with a hook, 3 key points, and a CTA" | "Never mention competitor pricing" |
| Role in prompt | Procedural instruction | Constraint / guardrail |

---

## Accessing the Skills Library

Navigate to `/skills` from the home page by clicking the **Skills Library** card, or go directly to `/skills` in the URL bar.

---

## Browsing Skills

The Skills Library list page shows all skills with filtering and search controls.

### Filter Tabs

- **All** — every skill regardless of status
- **Active** — skills currently included in content generation
- **Inactive** — skills temporarily excluded from content generation
- **Deprecated** — skills permanently removed from content generation

### Dropdown Filters

- **Content Type** — narrow the list to skills associated with a specific content type (e.g. Email, Blog Post)
- **Category** — narrow the list to skills in a specific category

### Search

The search box filters by skill name, description, and tags as you type. Search is applied on top of the active tab and dropdown filters.

### Reading the List

Each row displays:

- **Name** — the skill's display name
- **Status badge** — Active (green), Inactive (gray), or Deprecated (red)
- **Content Types** — which content types the skill applies to
- **Category** — the skill's organizational category
- **Last Updated** — when the skill was most recently modified

---

## Viewing a Skill

Click any skill row to open its detail page at `/skills/[id]`.

### Main Content Area

The left panel renders the skill's instruction content as formatted markdown. This is the exact text injected into the AI prompt when the skill is selected for generation.

### Sidebar

The right sidebar shows metadata:

- **Version** — the current semantic version (e.g. 1.2.0)
- **Category** — organizational grouping
- **Content Types** — which content types this skill targets
- **Tags** — labels for search and filtering
- **Author** — who created or last edited the skill
- **Output Format** — the expected output structure, if specified
- **Usage Count** — number of generated content items that used this skill
- **Created** — when the skill was first added
- **Last Updated** — when the skill was most recently modified

### Linked Knowledge Objects

Below the main content card, the detail page shows a **Linked Knowledge Objects** section. This lists every knowledge object the skill depends on — each link displays:

- **Object name** — clickable link to the knowledge object's detail page
- **Collection badge** — the type of knowledge object (persona, segment, use case, etc.)
- **Integration prompt** — a short description of how this knowledge object's content should influence the skill

If no links exist, the section shows "No linked knowledge objects." See [Managing Knowledge Links](#managing-knowledge-links) below for how to add and edit links.

### Suggest Links

The **Suggest Links** button appears below the linked knowledge objects section. Clicking it runs a semantic similarity search across all knowledge object collections to find objects whose content is most relevant to the skill.

Each suggestion shows:

- **Object name** and **type badge**
- **Match percentage** — a cosine similarity score indicating how closely the object's content relates to the skill

For each suggestion you can:

- **Accept** — navigates to the skill's edit page with the suggested object pre-populated as a new link (you still need to write the integration prompt before saving)
- **Dismiss** — removes the suggestion from the list

Use Suggest Links when initially setting up a skill's knowledge dependencies, or periodically to discover new knowledge objects that may be relevant after the knowledge base has grown.

### Action Buttons

The detail page shows action buttons:

- **Edit** — opens the edit form for this skill
- **Activate / Deactivate** — toggles the skill between active and inactive status
- **Deprecate / Restore** — marks the skill as deprecated, or restores a deprecated skill
- **Delete** — permanently removes the skill (with a confirmation step)

---

## Creating a Skill

1. Navigate to `/skills` and click **+ New Skill**.
2. Fill in the required fields:
   - **Name** — a clear, descriptive name for the skill
   - **Description** — a short summary of what the skill does
   - **Instruction Content** — the full procedural instruction in markdown; this is what the AI reads during generation
   - **Content Types** — select at least one content type this skill applies to
3. Optionally fill in:
   - **Category** — an organizational grouping
   - **Tags** — labels for search and filtering
   - **Output Format** — expected output structure
   - **Author** — the person responsible for this skill
   - **Parameters** — a JSON object defining any configurable parameters
4. Click **Save**.

New skills start at version **1.0.0** and are **Active** by default, meaning they are immediately available for content generation.

---

## Editing a Skill

1. Open the skill's detail page.
2. Click **Edit**.
3. Modify any fields as needed.
4. Select a **version bump level**:
   - **Patch** (e.g. 1.0.0 -> 1.0.1) — minor fixes, typo corrections, formatting
   - **Minor** (e.g. 1.0.0 -> 1.1.0) — added detail, new examples, expanded instructions
   - **Major** (e.g. 1.0.0 -> 2.0.0) — fundamental changes to the skill's approach or scope
5. Click **Save**.

The version number increments automatically based on the level you select.

---

## Managing Knowledge Links

Skills can declare dependencies on specific knowledge objects. When a linked knowledge object is updated and accepted, the system automatically evaluates whether the change is significant enough to suggest a refresh of the skill's instructions. If significant, a system-generated submission enters the Review Queue for admin review.

### Adding a Link

1. Open the skill's edit page.
2. Scroll to the **Linked Knowledge Objects** section.
3. Type in the search box to find a knowledge object by name.
4. Click a search result to add it as a link.
5. Write an **integration prompt** in the textarea that appears. The integration prompt tells the AI which aspects of the knowledge object are relevant to this skill — for example: *"Update references to job titles, pain points, and language patterns to reflect any changes in the linked persona."*
6. The integration prompt is required. You cannot save the skill with an empty integration prompt on any link.

### Editing a Link's Integration Prompt

On the edit page, find the link in the Linked Knowledge Objects section and edit the textarea directly.

### Removing a Link

Click the **Remove** button on any link card in the edit form. The link is removed when you save.

### What Happens When a Linked Object Changes

1. An admin accepts an update to a knowledge object (via the Review Queue or AI Merge).
2. The system checks whether any active skills have that object in their `sourceKnowledgeObjects`.
3. For each linked skill, a materiality evaluation runs — a lightweight AI call that assesses whether the knowledge change is significant enough to warrant updating the skill.
4. If significant, a system-generated submission appears in the Review Queue with a "System" source badge. The admin reviews the suggestion and can use "Merge with AI" to generate an updated version of the skill, or accept/reject/defer as with any other submission.
5. If not significant (e.g., minor formatting changes), no submission is created.

The evaluation is **lazy** — no AI merge runs until the admin explicitly triggers it. The system only creates the suggestion.

---

## Managing Skill Status

Skills have three statuses that control whether they participate in content generation:

- **Active** — included in context assembly and available for selection during generation
- **Inactive** — temporarily excluded from context assembly; useful for testing or seasonal skills you want to pause without losing the content
- **Deprecated** — permanently excluded from context assembly; intended for skills that are outdated or replaced

### Changing Status

- **Deactivate** an active skill to temporarily remove it from generation without deprecating it. Click **Deactivate** on the detail page.
- **Activate** an inactive skill to bring it back into generation. Click **Activate** on the detail page.
- **Deprecate** a skill to permanently remove it from generation. Click **Deprecate** on the detail page. Deprecated skills remain browsable but are never selected for generation.
- **Restore** a deprecated skill to return it to active status. Click **Restore** on the detail page.

---

## Content Types

Skills are linked to one or more content types:

- **Email** — outreach emails, nurture sequences, follow-ups
- **Blog Post** — long-form articles and thought pieces
- **Social Post** — LinkedIn, Twitter, and other social media content
- **Thought Leadership** — executive perspectives, industry commentary
- **Internal Doc** — internal memos, process documents, team communications
- **Content Narrative** — strategic narrative artifacts for theme and messaging direction
- **Pillar Research** — deep research deliverables for pillar workflows
- **Competitor Functionality Brief** — capability-focused competitive analysis briefs
- **Competitor Persona + Messaging Brief** — persona and messaging competitive synthesis briefs
- **Market Content Brief** — market landscape and trend synthesis briefs

During content generation, the system automatically selects skills that match the requested content type. A skill linked to multiple content types is eligible for any of those types.

---

## Context Assembly

Skills integrate with the content generation pipeline through context assembly — the process that builds the full prompt sent to the AI.

### How Skills Are Selected

- **Automatic** — skills matching the requested content type are selected by default
- **Manual** — the user explicitly picks specific skills for a generation request
- **Hybrid** — automatic selection plus manual additions or removals

### Prompt Ordering

In the assembled prompt, skills appear **before** business rules. This means the AI reads procedural instructions first ("here is how to write this"), then constraints second ("here is what to avoid").

### Limits

A maximum of 3-5 skills are included per generation request. This keeps the prompt focused and avoids conflicting instructions. If more skills match the content type than the limit allows, the system prioritizes by relevance and usage history.

---

## Tips

- Write skill instructions as direct commands to the AI (e.g. "Open with a question that highlights the reader's pain point" rather than "The AI should open with a question")
- Keep each skill focused on one technique or workflow — split broad approaches into separate skills
- Use content type associations to ensure skills are only applied where they make sense
- Review usage counts periodically to identify skills that are rarely or never used

---

## Common Pitfalls

**My skill is not being used in content generation.** Check that the skill's status is Active and that its content type associations match the type of content being generated. Inactive and deprecated skills are excluded from context assembly.

**I changed a skill but the version did not update.** You must select a version bump level (patch, minor, or major) when saving edits. If no bump level is selected, the save may not proceed.

**Too many skills are competing and the output quality is inconsistent.** The system limits skills to 3-5 per generation. If you have many overlapping skills for the same content type, consider consolidating them or deactivating the less effective ones.

**I want to test a new skill without affecting production generation.** Create the skill and immediately deactivate it. You can review its content on the detail page. When you are ready to include it in generation, activate it.

**I accidentally deleted a skill.** Deletion is permanent. If you are unsure, deprecate the skill instead — deprecation is reversible via the Restore action.

**A linked knowledge object was updated but no refresh suggestion appeared in the queue.** The system runs a materiality evaluation for each linked skill. If the knowledge change is not significant relative to what the skill depends on (as defined by the integration prompt), no submission is created. This is intentional — minor formatting or structural changes that don't affect the facts the skill references are filtered out.

**I see a system-generated skill submission in the Review Queue but I don't understand what triggered it.** Open the submission detail page. The "Source Description" field shows which knowledge object was updated. The "Integration Prompt" section shows how the link was configured. Use "Merge with AI" to see the AI's suggested update before deciding.

**Suggest Links is returning irrelevant results.** The suggestions are based on semantic similarity between the skill's content and knowledge object content. If the skill's instructions are very generic, the suggestions may be broad. Write more specific skill content to improve suggestion quality.
