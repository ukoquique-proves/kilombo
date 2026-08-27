/**
 * Job Manager — In-memory job tracking and output buffering
 *
 * Manages long-running command execution:
 * - Spawns child processes
 * - Buffers stdout/stderr
 * - Tracks job state (pending, running, completed, failed)
 * - Provides job status queries
 *
 * Storage: In-memory (suitable for MVP; persists only during server runtime)
 * TODO: Phase 2 — migrate to persistent storage (sqlite, postgres)
 */

import { spawn } from 'child_process';
import { randomBytes } from 'crypto';

const jobs = new Map();

// Configurable caps to prevent unbounded memory growth
const MAX_OUTPUT_CHARS = 64 * 1024; // keep last 64KB of stdout/stderr per job
const MAX_COMPLETED_JOBS = 1000; // keep at most this many finished jobs in-memory

let _autoCleanupInterval = null;

function appendWithCap(job, field, chunkStr) {
  if (!job[field]) job[field] = '';
  job[field] += chunkStr;
  if (job[field].length > MAX_OUTPUT_CHARS) {
    // keep the tail (most recent output)
    job[field] = job[field].slice(-MAX_OUTPUT_CHARS);
  }
}

function pruneCompletedJobs() {
  // collect completed jobs sorted by endTime ascending (oldest first)
  const completed = Array.from(jobs.values()).filter((j) => j.status !== 'running');
  if (completed.length <= MAX_COMPLETED_JOBS) return 0;
  completed.sort((a, b) => {
    const ta = (a.endTime && a.endTime.getTime()) || 0;
    const tb = (b.endTime && b.endTime.getTime()) || 0;
    return ta - tb;
  });
  const toRemove = completed.slice(0, completed.length - MAX_COMPLETED_JOBS);
  for (const j of toRemove) jobs.delete(j.id);
  return toRemove.length;
}

function startAutoCleanup({ intervalMs = 5 * 60 * 1000, maxAge = 60 * 60 * 1000 } = {}) {
  if (process.env.NODE_ENV === 'test') return; // avoid background timers during tests
  if (_autoCleanupInterval) return;
  _autoCleanupInterval = setInterval(() => {
    try {
      cleanup(maxAge);
      pruneCompletedJobs();
    } catch (err) {
      // never throw from background maintenance
      // eslint-disable-next-line no-console
      console.error('[job-manager auto-cleanup] error', err && err.message);
    }
  }, intervalMs);
}

function stopAutoCleanup() {
  if (_autoCleanupInterval) {
    clearInterval(_autoCleanupInterval);
    _autoCleanupInterval = null;
  }
}

// Start auto-cleanup by default in non-test environments
startAutoCleanup();

/**
 * Generate a short, human-readable job ID
 */
function generateJobId() {
  return randomBytes(6).toString('hex');
}

/**
 * Create a new job
 * @param {string} command - Command to execute (e.g., 'node scripts/create-article.mjs')
 * @param {string[]} args - Command arguments
 * @param {object} options - spawn options (cwd, env, etc.)
 * @returns {string} jobId
 */
export function createJob(command, args = [], options = {}) {
  const jobId = generateJobId();
  
  const job = {
    id: jobId,
    command,
    args,
    status: 'pending',
    startTime: null,
    endTime: null,
    exitCode: null,
    stdout: '',
    stderr: '',
    error: null,
  };
  
  jobs.set(jobId, job);
  
  // Spawn the process
  try {
    const proc = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
      // shell: false (default) — safer than shell: true
      // We pass args as an array, so no shell injection is possible.
      // Node scripts use 'node scripts/file.mjs --arg value' which doesn't need a shell.
    });
    
    job.process = proc;
    job.pid = proc.pid;
    job.status = 'running';
    job.startTime = new Date();
    
    // Buffer output
    proc.stdout.on('data', (chunk) => {
      appendWithCap(job, 'stdout', chunk.toString());
    });

    proc.stderr.on('data', (chunk) => {
      appendWithCap(job, 'stderr', chunk.toString());
    });
    
    // Handle completion
    proc.on('close', (code) => {
      job.exitCode = code;
      job.status = code === 0 ? 'completed' : 'failed';
      job.endTime = new Date();
      job.process = null; // Clean up reference
      // Prune excessive completed jobs to bound memory
      pruneCompletedJobs();
    });
    
    // Handle errors
    proc.on('error', (err) => {
      job.error = err.message;
      job.status = 'failed';
      job.endTime = new Date();
    });
    
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    job.endTime = new Date();
  }
  
  return jobId;
}

/**
 * Get job status
 * @param {string} jobId
 * @returns {object|null} Job object or null if not found
 */
export function getJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  
  // Don't return the process object to frontend
  const { process, ...publicJob } = job;
  return publicJob;
}

/**
 * List all jobs (optional limit)
 * @param {number} limit - Max jobs to return (most recent first)
 * @returns {array}
 */
export function listJobs(limit = 50) {
  const sortedJobs = Array.from(jobs.values())
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
    .slice(0, limit);
  
  return sortedJobs.map(({ process, ...job }) => job);
}

/**
 * Kill a running job
 * @param {string} jobId
 * @returns {boolean} True if job was killed, false if not found or already done
 */
export function killJob(jobId) {
  const job = jobs.get(jobId);
  if (!job || !job.process) return false;
  
  try {
    job.process.kill('SIGTERM');
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up old jobs (older than maxAge milliseconds)
 * @param {number} maxAge - Age in milliseconds (default: 1 hour)
 */
export function cleanup(maxAge = 60 * 60 * 1000) {
  const now = Date.now();
  const toDelete = [];
  
  for (const [jobId, job] of jobs.entries()) {
    if (job.status !== 'running' && job.endTime) {
      if (now - job.endTime.getTime() > maxAge) {
        toDelete.push(jobId);
      }
    }
  }
  
  toDelete.forEach(jobId => jobs.delete(jobId));
  return toDelete.length;
}

export { startAutoCleanup, stopAutoCleanup };

export default { createJob, getJob, listJobs, killJob, cleanup, startAutoCleanup, stopAutoCleanup };
