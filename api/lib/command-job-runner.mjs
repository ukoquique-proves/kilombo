// @ts-check
/**
 * Shared helper for command endpoints that spawn a script as a job.
 * Extracted from api/server.mjs — see docs/TO_FIX.md #80. Originally a
 * module-scoped function in server.mjs closing over KILOMBO_DIR; now takes
 * `cwd` explicitly as part of opts instead of closing over anything, so it
 * has no dependency on server.mjs's module scope. Behavior is unchanged.
 */

import { createJob, getJob } from './job-manager.mjs';

/**
 * Spawn a script as a job and respond with the standard job-started shape,
 * or a standard 500 on failure to start it.
 *
 * @param {import('express').Response} res
 * @param {string[]} args - argv passed to `node`, e.g. ['scripts/foo.mjs', '--flag', 'val']
 * @param {{ message: string, warning?: string, errorMessage?: string, cwd: string }} opts
 *   - message: success message included in the 200 response
 *   - warning: optional warning string included in the 200 response (omitted if undefined)
 *   - errorMessage: text used in the 500 response if the job fails to start
 *     (defaults to 'Failed to start job')
 *   - cwd: working directory passed to createJob (was KILOMBO_DIR via closure)
 */
export function startCommandJob(res, args, { message, warning, errorMessage = 'Failed to start job', cwd }) {
  try {
    const jobId = createJob('node', args, { cwd });
    const job = getJob(jobId);

    res.json({
      jobId,
      startTime: job.startTime,
      message,
      warning,
    });
  } catch (err) {
    res.status(500).json({
      error: errorMessage,
      details: err.message,
    });
  }
}
