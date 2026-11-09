# WATECH-BI — PROMPT 10: FOLLOW-UP AUTOMATION REPORT
**Project:** `E:\watech-bi`  
**Status:** PASS  

---

## 1. CRM FOLLOW-UP LIFECYCLE SYNCHRONIZATION

The Follow-Up Automation Engine connects `FollowUpSchedule` records to background workers:

1. **Due Detection:**
   The cron runner `/api/cron/reminders` or worker scanner scans all schedules where `nextFollowUpDate <= today` or status is `due_today` / `overdue`.
2. **Opt-Out & Consent Check:**
   Prior to dispatching any outreach, the prospect's email is evaluated against CRM unsubscribe flags and the suppression ledger.
   - If opted out: Schedule status is immediately marked `stopped`, notes updated with refusal reason, and zero outbound communications are dispatched.
3. **Queue Enqueueing:**
   Approved follow-ups are routed as high-priority `scheduled_followup` background jobs.
4. **Rescheduling & Intervals:**
   Upon successful job execution, the attempt counter is incremented and `nextFollowUpDate` advances automatically by the configured interval (e.g. 3 days).
