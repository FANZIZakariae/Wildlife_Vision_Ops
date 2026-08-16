# Make image deletion reliable in production

## What is happening

The repository currently contains `DELETE /api/v1/jobs/{job_id}`, database cascade relationships, file cleanup, and a local test that passes CORS preflight and deletion. The frontend’s “Unable to reach the inference service” message is only produced when `fetch` receives no readable HTTP response. It is therefore not evidence of a database deletion failure; the deployed browser request is being blocked or misrouted before the response reaches the app. The exact production cause still needs to be confirmed against the deployed backend URL and response headers.

## Implementation

1. **Confirm the production path**
   - Check that the Vercel build’s API base points directly to the active Render HTTPS service.
   - Probe Render’s `/health`, the `OPTIONS` preflight, and the deletion route headers from the Vercel origin.
   - Use the observed status and headers to distinguish a bad API URL, Render availability, or CORS rejection.

2. **Add a preflight-free deletion fallback**
   - Keep the conventional `DELETE /api/v1/jobs/{job_id}` route.
   - Add a compatible `POST /api/v1/jobs/{job_id}/delete` action with no request body or custom headers, allowing browsers to send it as a simple cross-origin request without an `OPTIONS` preflight.
   - Move deletion into one shared backend service so both routes perform exactly the same transaction and file cleanup.

3. **Make frontend deletion resilient**
   - Try the normal `DELETE` request first.
   - If it fails at the network or CORS layer, retry once through the POST fallback.
   - Preserve clear 404/500 messages and only update the UI after confirmed success.

4. **Protect data integrity**
   - Verify the job, detections, reviews, and audit events are deleted together.
   - Keep uploaded-file removal best-effort after the database commit, with useful server logging if disk cleanup fails.
   - Add tests for both endpoints, cross-origin behavior, missing jobs, related-row cleanup, and image-file cleanup.

5. **Document emergency/manual alternatives**
   - Render API docs or `curl`: call the DELETE endpoint directly, bypassing browser CORS.
   - Database console: delete the selected job in a transaction after its reviews, audit events, and detections; this removes database data but not the uploaded file.
   - Render shell: remove the corresponding file from the upload directory; use together with database cleanup. Render-local files may also disappear on restart unless a persistent disk is configured.

## Technical notes

- No changes to inference, YOLO, database architecture, or visual design.
- No GPU/CUDA dependencies.
- The fallback is intentionally a narrowly scoped action endpoint, not a general API redesign.