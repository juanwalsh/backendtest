# ADR 001: Concurrency Control Strategy and Financial Integrity

* **Status:** Accepted
* **Date:** 2026-01-23
* **Context:** Technical Assessment / MVP

## Context
The system requires strict balance integrity (ACID). Scenarios involving *Race Conditions*, where multiple requests attempt to debit the balance simultaneously, are unacceptable as they can lead to negative balances or "double spending".

## Decision
Use native Database **Pessimistic Locking** via SQL `SELECT ... FOR UPDATE` within a serializable/atomic transaction managed by Prisma (`prisma.$transaction`).

## Justification
1.  **Strong Consistency:** The relational database (PostgreSQL) is the single source of truth. Delegating the lock to it ensures that no application instance can violate integrity.
2.  **Operational Simplicity:** Avoids introducing additional infrastructure (such as Redis Cluster or Zookeeper) solely for distributed lock management in this initial phase.
3.  **Compliance:** The assessment prioritizes data correctness and financial safety over absolute latency or massive initial throughput.

## Consequences and Trade-offs

### Positives
*   Mathematical guarantee that the balance will never be inconsistent.
*   Simple and auditable implementation.
*   Automatic failure recovery (DB rolls back the transaction if the connection drops).

### Negatives (Scalability Limits)
*   **Database Contention:** The `FOR UPDATE` clause locks the user row (`wallet_id`). In scenarios of extremely high concurrency (e.g., 1000 requests/sec for the *same* user), this creates a serialized queue, increasing latency and database connection consumption.
*   **Deadlock Risk:** If there are cross-transactions (A waits for B, B waits for A), the database may kill the connection. (Mitigated by the simplicity of current queries).

## Evolution Plan (Path to Scale)
When database contention becomes a bottleneck (monitored via `db_lock_wait_time` metrics), the strategy will migrate to:
1.  **Distributed Locking (Redis/Redlock):** Move locking logic to memory (Redis), relieving the PostgreSQL disk I/O.
2.  **Optimistic Locking:** Use row versioning (`version` column) for high-read, low-write scenarios.
3.  **Write-Behind (Queue-based):** For non-critical events (like game statistics), process asynchronously via RabbitMQ.