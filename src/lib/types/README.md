# `lib/types`

The single source of truth for shared type shapes (constitution Principle
XIII: a type used in more than one place is a named, exported type defined
once, not retyped at each usage site).

Entity types (`User`, `Game`, `Collection`, `CollectionItem`, `List`,
`Comparison`, `ListEntry`) and the `List.filter` schema land here in Phase 1
(see `.project/artifacts/datamodel.md`), reused by the data layer, server, and
UI.
