> Back to [Roadmap Index](./README.md)

# Deferred: Event Logging & Audit Trails

> **Business decision:** Event logging, version history, relationship history, and audit trails are intentionally deferred. The value is understood but the overhead of designing, storing, and surfacing event data is not justified at the current stage. This decision should be revisited once the core knowledge base and content generation workflows are stable and in regular use.

The following capabilities were scoped and removed from the active build plan:

## Content Version History
Track every edit to a knowledge object's `content` field — who changed it, when, and what the previous value was. Enables "restore to previous version" functionality. Would require a dedicated `VersionHistory` collection in Weaviate or a separate data store.

## Relationship History
Track every cross-reference add and remove event — which objects were linked or unlinked, by whom, and when. Enables an "undo last relationship change" capability and a timeline view on each object's detail page. Would require a `RelationshipEvent` log stored outside Weaviate (Weaviate is not optimized for append-only event data).

## Workflow Audit Trail
Track every state transition in the content approval workflow — from state, to state, actor, timestamp. Enables a full accountability record for how a piece of content moved from draft to published. Referenced in WF-6 (removed from the active workflow stories).

## Recent Relationship Changes Dashboard
A "Recent Relationship Changes" panel in the manager dashboard showing the most recent cross-reference modifications across all objects. Depends on the Relationship History log above.

## When to Add This
Event logging becomes valuable when:
- Multiple people are actively editing the knowledge base and accountability is needed
- A bad edit or relationship change causes a content quality regression and recovery is needed
- Compliance or brand governance requirements demand a traceable record of who approved what

The preferred implementation when the time comes is a lightweight append-only log stored in Postgres (or a similar relational store), keeping Weaviate clean as the semantic retrieval layer only.
