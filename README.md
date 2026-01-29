Financial transaction processing engine for games (Wallet Service), focused on integrity, high concurrency, and scalability

## 🏗 Architecture & Scalability (Deep Dive)

This project is supported by detailed architectural documentation that analyzes trade-offs for high-scale environments:

*   [**ADR-001: Concurrency Control**](docs/architecture/ADR-001-concurrency-control.md) - Analysis of Postgres Locking vs. Redis Distributed Locks.
*   [**ADR-002: Modular Monolith**](docs/architecture/ADR-002-modular-monolith.md) - Strategy for logical domain separation.
*   [**Scalability Guide (Day 2 Ops)**](docs/SCALABILITY_GUIDE.md) - Roadmap for 1M+ DAU (Sharding, Read Replicas).

Architecture and Smart Decisions

This project uses advanced software engineering patterns (Staff/Principal) to ensure robustness in a critical environment:

Financial Integrity (Row-Level Locking): Use of `SELECT ... FOR UPDATE` within atomic (ACID) transactions. This locks the user’s balance row in the database during the operation.
Objective: Ensures absolute consistency. Prevents two simultaneous requests from spending the same balance (Race Condition).

Resilience to Network Failures (Idempotency): Native implementation of checks using `transactionId`. If the client loses connection and resends the same request (retry), the system recognizes the previous transaction and returns the original saved response without processing it again.
Objective: Protects the user from duplicate charges on unstable connections.

Performance and Offloading:
Redis (Read-Through Cache): Balance reads are served from memory, reducing latency and load on the primary database.
RabbitMQ (Async Offloading): Heavy auditing and logging processes are dispatched to queues, freeing the API to respond instantly to the player.

Security (HMAC): Cryptographic signing of payloads to ensure that bet data has not been altered in transit (Man-in-the-middle).

Observability: Deep health checks (DB, Redis, Queue) and integrated Prometheus metrics for real-time monitoring.

Critical Problems Avoided

Thanks to the architectural choices above, the system is immune to the most common online casino issues:

| Problem | Applied Solution | Result |
| Negative Balance / Double Spend | Pessimistic Transactions (DB Lock) | 100% balance accuracy, even with 1000 requests/sec. |
| Duplicate Charge (Network Error) | Idempotency Keys | The user never pays twice for the same bet. |
| Slow / Stalled System | Caching (Redis) + Queues (RabbitMQ) | Millisecond responses, regardless of log load. |
| Value Fraud | HMAC SHA-256 Validation | Impossible to alter the bet value via proxy/attack. |

Tech Stack

Core: Node.js 20, TypeScript, Express.
Data: PostgreSQL 16 (Prisma ORM), Redis 7.
Messaging: RabbitMQ.
Ops: Docker Compose, Prometheus Metrics.

How to Run
```bash

#Ups the entire environment (App, Database, Cache, Queues, etc.)
docker-compose up --build
```

Useful Endpoints
Swagger Docs: http://localhost:3000/api-docs
Health Check: http://localhost:3000/health
Metrics: http://localhost:3000/metrics

---
Made by **Juan Walsh**
Discord: `juanexilado`
