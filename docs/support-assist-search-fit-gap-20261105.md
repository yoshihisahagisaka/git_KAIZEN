# FACTACT SUPPORT — 対応アシスト検索 Fit/Gap（2026-11-05）

Status: **Fit/Gap reviewed; existing-data UI slice implemented as Draft. Approval of new Knowledge persistence is not implied.**

Basis: GitHub Issue #18; `factact-search-explore-product-contract-v1.md` §4, §5, §8–14; `support-round3-phase2-decisions.md` Decision 7; HR2 UI Draft PR #20. This note records the *current* repository implementation, including work delivered after the older contract's §13 baseline description; it does not supersede its Product decisions.

## Existing capability map

| Need | Current Fit | Current Gap / boundary |
| --- | --- | --- |
| 全体横断検索 | `ExploreQueries`, GET `/api/explore/search`, `ExploreUI` provide case-insensitive exact/prefix/contains search across Organization, Person, Device, Service, Work title/ID and Knowledge Candidate title/body/topic. Operator Role gate and tenant-scoped RLS exist. | No approved Procedure/FAQ/Knowledge result type. Work result search does not search the caller's observation or response text. |
| 作業中の検索 | Active Work Anchor keeps the mounted SUPPORT editor and unsaved text while the operator visits Explore. | Explore's existing query lacks a service filter; it searches the authorized Tenant as a whole. |
| 右ペインの参考知識 | `SupportQueries.detail` returns `relatedKnowledge` for the inquiry's `serviceId`. Entries retain source Work/Evidence/Decision provenance; every entry is a **candidate**, not an approved answer. | Data is returned as a whole service list, with no server-side pagination or full-text index. There is no Approved status or publication Authority yet. |
| 右ペインの関連対応 | `SupportQueries.detail` returns completed `previousWork` for the *same Person and Service*, including original caller statement and response/Action/Evidence when available. | This is **not** a search across all people or all past Work for the service. It must not be presented as generalized guidance. |
| 正式マニュアル／FAQ／手順書 | Accepted Product semantics distinguish approved content from candidates, with review, scope and provenance (Decision 7). | No approved content persistence, version/supersession, effective scope, source import, approval Authority checks, or search projection. No new Core type/migration authorized by this UI work. |

## Bounded UI implementation (this slice)

- In SUPPORT's right `対応アシスト`, open **参考情報を検索** without leaving the current Work editor.
- Search only the already-loaded `relatedKnowledge` (current Service) and `previousWork` (current Person + Service). Keyword matching is case-insensitive, normalized and read-only. The results explicitly show the two distinct source categories and never imply approval.
- Show empty results honestly; no nonexistent FAQ/manual cards, fake source links or automatic AI recommendation. Retain `情報を探す` for broad Tenant-scoped Explore navigation, and the existing reference-detail dialogs.
- Do not persist a result as Work Context or update Registry on a search, click, or dialog close.
- Existing `SupportDetailView` already has Service context, so **no new API/schema** is introduced by this UI slice.

## Separate Capability Gate — approved manuals, FAQ and procedures

Before implementing new storage, decide only the genuine gaps using the existing Knowledge / Review / Authority concepts:

1. Source registration/ingestion (file, URL or managed content), immutable source reference and document version. External vendor/manual content rights and permitted visibility need checking.
2. Approval/review authority and applicable scope (`Tenant`, Service, Contract/Organization as actually required), along with source, effective/review/retirement status and supersession history.
3. How to show `Approved Knowledge`, `unapproved Knowledge Candidate`, and `Rule` as **three distinct types**; no automatic conversion, AI approval or publication.
4. Search indexing, long documents, pagination and read permission when data volume grows; prove safe cross-service and cross-tenant behavior.
5. Generic configuration, no SONIX-specific schema, separate UI or service-specific backend fork. Discuss adapters to Zoho/document repositories only after source and authority boundaries are settled.

Do not extrapolate approved-answer behavior from the existing `VPN_GUIDANCE` Knowledge Candidate demo. Formal manual/FAQ implementation is **STOP at the persistence/authority gate**, not declared complete by this PR.

## Verification

- Updated Playwright scenario exercises empty and matched right-pane search with an unsaved response draft, followed by global Explore and return.
- Existing DB tests cover global Explore's Read Authority, RLS, read-only behavior, category matching and query limits. No domain/Persistence code is changed by this slice.
- Browser execution, 13-inch usability, a long candidate body and larger data volumes require Human Review in the established Windows/CI runner. No production action.
