# WATECH-BI — PROMPT 10: WEBHOOK SECURITY SPECIFICATION & DEFENSE REPORT
**Project:** `E:\watech-bi`  
**Status:** PASS  

---

## 1. INBOUND WEBHOOK DEFENSE MATRIX

| Threat | Defense Mechanism | Verified Behavior |
| :--- | :--- | :--- |
| **Tampered / Forged Payload** | HMAC-SHA256 signature verification | Discrepant signature header immediately rejected (HTTP 401). |
| **Replay Attacks** | Timestamp freshness tolerance (`<= 300s`) | Payloads older than 5 minutes rejected as expired. |
| **Duplicate Delivery Storms**| Event ID idempotency ledger | Repeated deliveries of the same event ID are acknowledged without re-executing actions. |
| **Malformed JSON** | Safe try/catch body parsing | Syntax errors return HTTP 400 without unhandled server crashes. |

---

## 2. OUTBOUND WEBHOOK DISPATCH & SSRF DEFENSE

1. **Cryptographic Signing:**
   Every outbound webhook payload includes `X-Watech-Signature` (`sha256=<hex>`), `X-Watech-Timestamp`, and `X-Watech-Event`.
2. **SSRF Guard Integration:**
   Before opening any outbound socket, the destination URL is validated via `isSafeTargetUrl()`:
   - Blocks loopback addresses: `127.0.0.1`, `localhost`, `0.0.0.0`
   - Blocks cloud instance metadata: `169.254.169.254`, `metadata.google.internal`
   - Blocks private RFC1918 subnets: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   - Blocks restricted ports: 22, 25, 3306, 5432, 6379, 8080, 27017
3. **Circuit Breaker & Automatic Disablement:**
   Endpoints exceeding 5 consecutive network failures are automatically transitioned to `isActive: false` to prevent outbound retry spam.
