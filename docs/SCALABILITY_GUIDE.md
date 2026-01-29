# Scalability and Operations Guide (Day 2)

This document describes the known limitations of the current implementation and the technical roadmap to support massive scale (1M+ DAU).

## 1. Identified Bottlenecks

| Component | Limitation | Symptom under Load |
|-----------|------------|--------------------|
| **PostgreSQL** | Row-level locking (`FOR UPDATE`) | Increased latency on active wallets; Connection Pool exhaustion. |
| **Node.js** | Single Thread (Event Loop) | CPU blocking on heavy cryptographic calculations (HMAC) if volume is extreme. |
| **Synchronicity** | Direct HTTP Calls | If the External Provider fails, Casino threads get stuck waiting for timeouts (Cascading Failure). |

---

## 2. Mitigation Strategy (Roadmap)

### Phase 1: Hardening (Current + Short Term)
Focus on resilience without major architectural changes.
- [ ] **Circuit Breakers:** Implement "Opossum" or custom logic in HTTP calls to fail fast when external services are unstable.
- [ ] **Rate Limiting:** Add middleware (Redis-backed) to limit requests per IP/User to prevent DDoS or client bugs (loops).
- [ ] **Connection Pooling:** Tune `pg-pool` to avoid saturating the database, preferring to reject requests at the API edge rather than crashing the DB.

### Phase 2: Read Scalability (Medium Term)
Focus on relieving the primary database.
- [ ] **Read Replicas:** Route `getBalance` queries and reporting to Postgres read replicas.
- [ ] **Caching Layer:** Implement Cache-Aside pattern in Redis for balances and game configurations (short TTL of 1-5s for acceptable eventual consistency in display).

### Phase 3: Write Scalability & High Concurrency (Long Term)
Focus on supporting millions of TPS.
- [ ] **Database Sharding:** Partition `CASINO_WALLETS` and `CASINO_TRANSACTIONS` tables based on `user_id`.
- [ ] **Event-Driven Architecture (EDA):**
    - Move transaction history logging to a queue (Kafka/RabbitMQ).
    - Synchronous debit only updates the balance (Redis + Write Behind), and history is processed later.
- [ ] **Horizontal Pod Autoscaling (HPA):** Scale API pods based on CPU and Latency metrics.

---

## 3. Required Observability
To operate this system in production, the following metrics must be monitored (Prometheus/Grafana):

1.  **Business:**
    *   `transactions_total_amount`: Total financial volume processed.
    *   `wallet_insufficient_funds_error_count`: Indicator of fraud or UX issues.
2.  **System:**
    *   `http_request_duration_seconds_bucket`: P95 and P99 Latency.
    *   `db_connection_pool_waiting`: How many requests are waiting for a DB slot.
    *   `external_provider_failure_rate`: Rate of 5xx errors from the external provider.