/* Real excerpts copied from the repos (generated, do not hand-edit). */
window.CASE_CODE = {
 "keyvault": {
  "file": "frontend/js/crypto.js",
  "url": "https://github.com/eduvanthrahul-afk/keyvault-secrets-manager/blob/main/frontend/js/crypto.js#L74-L94",
  "parts": [
   {
    "start": 74,
    "code": "    /**\n     * Encrypts plaintext using AES-GCM.\n     * @param {string} plaintext - The text to encrypt\n     * @param {CryptoKey} key - The derived encryption key\n     * @returns {Promise<{ciphertext: string, iv: string}>}\n     */\n    async encrypt(plaintext, key) {\n        const encoder = new TextEncoder();\n        const iv = crypto.getRandomValues(new Uint8Array(12));\n\n        const ciphertextBuffer = await crypto.subtle.encrypt(\n            { name: this.ALGO, iv: iv },\n            key,\n            encoder.encode(plaintext)\n        );\n\n        return {\n            ciphertext: this.bufferToHex(ciphertextBuffer),\n            iv: this.bufferToHex(iv)\n        };\n    },"
   }
  ]
 },
 "farme": {
  "file": "server/src/services/notification-worker.service.js",
  "url": "https://github.com/eduvanthrahul-afk/Farm-E/blob/main/server/src/services/notification-worker.service.js#L14-L48",
  "parts": [
   {
    "start": 14,
    "code": "const processOne = async () => {\n  const now = new Date();\n  const lease = crypto.randomUUID();\n  const job = await NotificationJob.findOneAndUpdate({\n    status: { $in: ['QUEUED', 'RETRY', 'PROCESSING'] },\n    nextAttemptAt: { $lte: now },\n    $or: [{ status: { $ne: 'PROCESSING' } }, { lockedUntil: { $lt: now } }],\n  }, {\n    $set: { status: 'PROCESSING', lockedUntil: new Date(now.getTime() + 30000), lease },\n    $inc: { attempts: 1 },\n  }, { returnDocument: 'after', sort: { createdAt: 1 } });\n  if (!job) return false;"
   },
   {
    "start": 38,
    "code": "  } catch (error) {\n    const terminal = job.attempts >= MAX_ATTEMPTS;\n    const delay = Math.min(60 * 60 * 1000, 5000 * (2 ** Math.min(job.attempts - 1, 9)));\n    await NotificationJob.updateOne({ _id: job._id, lease }, { $set: {\n      status: terminal ? 'DEAD' : 'RETRY',\n      lockedUntil: null,\n      nextAttemptAt: new Date(Date.now() + delay),\n      lastError: String(error.message || 'SMS delivery failed').slice(0, 500),\n    } });\n    if (job.notification) await Notification.updateOne({ _id: job.notification }, { $set: { 'channels.sms.status': terminal ? 'FAILED' : 'RETRY' } });\n    logger.warn(`Farmer order SMS ${terminal ? 'gave up after retries' : 'failed and was queued for retry'} (${job._id}).`);"
   }
  ]
 },
 "decisiontwin": {
  "file": "backend/.../service/SimulationRunner.java",
  "url": "https://github.com/eduvanthrahul-afk/oiho/blob/main/backend/src/main/java/com/decisiontwin/service/SimulationRunner.java#L25-L36",
  "parts": [
   {
    "start": 25,
    "code": "  @Async(\"simulationExecutor\") @Transactional(propagation=Propagation.REQUIRES_NEW)\n  public void execute(UUID simulationId){\n    Simulation simulation=simulations.findById(simulationId).orElse(null);if(simulation==null)return;\n    try {\n      simulation.progress=12;simulations.flush();\n      var enginePayload=mapper.readValue(simulation.requestJson,new TypeReference<java.util.Map<String,Object>>(){});\n      JsonNode result=engine.post().uri(\"/simulate\").body(enginePayload).retrieve().body(JsonNode.class);\n      if(result==null)throw new IllegalStateException(\"Simulation engine returned no result.\");\n      ObjectNode response=mapper.createObjectNode().put(\"simulationId\",simulation.id.toString());response.setAll((ObjectNode)result);\n      simulation.status=\"COMPLETED\";simulation.progress=100;simulation.resultJson=mapper.writeValueAsString(response);simulation.completedAt=Instant.now();\n      UUID decisionId=simulation.decision.getId();\n      int updated=decisions.markSimulationComplete(decisionId,simulation.id,result.path(\"recommendation\").asText(\"MODIFY\"),Instant.now());"
   }
  ]
 },
 "crm": {
  "file": "db/migration/V3__create_dashboard_mv.sql  +  MaterializedViewRefreshService.java",
  "url": "https://github.com/eduvanthrahul-afk/CRM_DEV/blob/main/backend/src/main/resources/db/migration/V3__create_dashboard_mv.sql",
  "parts": [
   {
    "start": 1,
    "code": "CREATE MATERIALIZED VIEW mv_dashboard_revenue_risk AS\nSELECT\n    1 AS id,\n    (SELECT COUNT(*) FROM quotes WHERE status IN ('SENT', 'VIEWED')) AS unfollowed_quotes_count,\n    (SELECT COALESCE(SUM(amount), 0) FROM quotes WHERE status IN ('SENT', 'VIEWED')) AS unfollowed_quotes_amount,\n    (SELECT COUNT(*) FROM leads WHERE status = 'NEW' AND last_contacted_at IS NULL) AS uncontacted_leads_count,\n    (SELECT COUNT(*) FROM payments WHERE status = 'OVERDUE' OR (status != 'PAID' AND due_date < CURRENT_DATE)) AS overdue_payments_count,\n    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'OVERDUE' OR (status != 'PAID' AND due_date < CURRENT_DATE)) AS overdue_payments_amount,\n    (SELECT COUNT(*) FROM projects WHERE status = 'DELAYED') AS delayed_projects_count,\n    (SELECT COALESCE(SUM(budget), 0) FROM projects WHERE status = 'DELAYED') AS delayed_projects_budget,\n    (SELECT COUNT(*) FROM quotes WHERE amount > 0 AND ((amount - cost) / amount) < 0.15 AND status != 'REJECTED') AS low_margin_quotes_count;"
   },
   {
    "start": 17,
    "code": "    // Refresh every 5 minutes\n    @Scheduled(cron = \"0 */5 * * * *\")\n    @Transactional\n    public void refreshDashboardStats() {\n        entityManager.createNativeQuery(\"REFRESH MATERIALIZED VIEW mv_dashboard_revenue_risk\").executeUpdate();\n        System.out.println(\"Dashboard Materialized View Refreshed.\");\n    }"
   }
  ]
 }
};
