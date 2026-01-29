# ADR 002: Modular Monolithic Architecture

* **Status:** Accepted
* **Date:** 2026-01-23

## Context
The challenge requires implementing two distinct domains (`Casino` and `Provider`) that must interact via HTTP and maintain logical separation, but may share the database and repository.

## Decision
Implement a **Modular Monolith**.
Both domains reside in the same codebase and Node.js process but adhere to strict boundaries regarding imports and communication via simulated public interfaces (HTTP/Service interfaces).

## Justification
1.  **Avoid Microservice Complexity:** For the current functional scope, separating into physically distinct services (different containers) would add orchestration overhead, real network latency, and deployment complexity (CI/CD) without immediate benefit.
2.  **Ease of Testing:** Integration tests (E2E) are drastically simplified by running in a single test process.
3.  **Safe Refactoring:** Moving code between modules is trivial in a modular monolith (Ctrl+C/V with type checking), whereas it is painful in distributed microservices.

## Module Boundaries
*   **Golden Rule:** Code in `src/casino` **MUST NOT** import models or services from `src/provider` directly, and vice-versa.
*   **Communication:** Communication must occur as if they were external systems (even if, for performance, we use encapsulated internal function calls, they must simulate API contracts with strict DTOs).
*   **Data:** `CASINO_*` tables are accessed only by the Casino module. `PROVIDER_*` tables are accessed only by the Provider module.

## Evolution Plan
If the team or load grows disproportionately (e.g., Provider scales 10x more than Casino):
1.  **Physical Split:** Thanks to modular separation, extracting the `src/provider` folder to a new repository/service is a "Lift and Shift" task.
2.  **Database:** The Prisma schema is already separated by prefixes, facilitating future migration to distinct database clusters.