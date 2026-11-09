# WATECH-BI — LEAD INTELLIGENCE UX REPORT
## 360° Lead Dossier & Advanced Lead Management Table

---

### 1. Unified 360° Lead Dossier Structure

The Lead Dossier (`LeadIntelligenceView.tsx`) eliminates fragmentation by consolidating the outputs of all 10 intelligence stages into a single drawer:

1. **Business Profile & Provenance:**
   - Official legal business name & brand name.
   - Verified website URL, registered base domain, and canonical HTTP status.
   - Office phone number and physical headquarters location.
   - Provenance indicator (`DEMO` vs real production import).

2. **Technical Website Findings (10-Category Deep-Dive):**
   - Total Website Health Score (0–100).
   - Core Web Vitals & Performance metrics.
   - SSL security status (HTTPS encryption).
   - Server response latency in milliseconds.

3. **Decision-Maker & Staff Intelligence:**
   - Person's full name, role, and corporate executive classification (`DM` badge for Owner / GM / President).
   - Direct contact email and verification status.
   - Direct business telephone number.

4. **Commercial Service Opportunities:**
   - Identified commercial problems (e.g., Missing Viewport, Slow Page Load, Inadequate GBP Optimization).
   - Urgency & Priority band (`HIGH`, `MEDIUM`, `LOW`).
   - Actionable Watech service recommendation.

5. **Deterministic 100-Pt Lead Scoring Breakdown:**
   - Total lead score and Grade Band:
     - **Tier A (80–100):** Prime high-urgency opportunity with reachability.
     - **Tier B (60–79):** Strong opportunity.
     - **Tier C (40–59):** Moderate leverage.
     - **Hold (<40):** Low digital urgency or modern compliant website.

---

### 2. Advanced Lead Table UX

- **Multi-Attribute Filters:** Filter simultaneously by Score Band, Decision-Maker Presence, and Verified Email.
- **Sorting Controls:** Sort by Lead Score, Official Name, or City in ascending/descending order.
- **Pagination:** Controlled slice rendering (10 per page) with page jump controls to prevent DOM overload with large lead catalogs.
- **CSV Data Portability:** One-click CSV export containing all filtered leads, scores, contact details, and tier bands.
