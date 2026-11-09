/**
 * Process Check Utility
 * Detects if another instance of the application is already running
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const LOCK_FILE = join(tmpdir(), 'milliontasks.lock');
const APP_IDENTIFIER = 'MillionTasks';

export interface ProcessCheckResult {
  isDuplicate: boolean;
  runningPids: number[];
  currentPid: number;
}

/**
 * Check if another instance of the application is running
 * Uses both lock file and process detection for reliability
 */
export function checkForDuplicateProcess(): ProcessCheckResult {
  const currentPid = process.pid;
  const runningPids: number[] = [];

  try {
    // Check lock file only - it's more reliable than process scanning
    if (existsSync(LOCK_FILE)) {
      const storedPid = parseInt(readFileSync(LOCK_FILE, 'utf8').trim());

      // Check if that process is still running AND it's not our parent process
      if (isProcessRunning(storedPid) && storedPid !== process.ppid) {
        // Verify it's actually running our application
        try {
          const cmdline = execSync(`ps -p ${storedPid} -o command=`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
          }).trim();

          // Only count it as a duplicate if it's running index.ts/js
          if (cmdline.includes('index.ts') || cmdline.includes('index.js')) {
            runningPids.push(storedPid);
          } else {
            // Lock file is stale - clean it up
            unlinkSync(LOCK_FILE);
          }
        } catch {
          // Process doesn't exist anymore - clean up lock file
          unlinkSync(LOCK_FILE);
        }
      } else {
        // Lock file exists but process is dead or is our parent - clean it up
        unlinkSync(LOCK_FILE);
      }
    }

    return {
      isDuplicate: runningPids.length > 0,
      runningPids,
      currentPid,
    };
  } catch (error) {
    console.error('Error checking for duplicate process:', error);
    // On error, assume no duplicate to allow startup
    return {
      isDuplicate: false,
      runningPids: [],
      currentPid,
    };
  }
}

/**
 * Create a lock file with current PID
 */
export function createLockFile(): void {
  try {
    writeFileSync(LOCK_FILE, process.pid.toString(), 'utf8');

    // Clean up lock file on exit
    process.on('exit', () => {
      try {
        if (existsSync(LOCK_FILE)) {
          const storedPid = parseInt(readFileSync(LOCK_FILE, 'utf8').trim());
          if (storedPid === process.pid) {
            unlinkSync(LOCK_FILE);
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  } catch (error) {
    console.warn('Failed to create lock file:', error);
  }
}

/**
 * Check if a process with given PID is running
 */
function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without actually signaling it
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Find all running instances of the application
 */
function findRunningInstances(): number[] {
  try {
    // Use ps to find processes
    // Look for tsx/node processes running our index.ts
    const psOutput = execSync(
      `ps aux | grep -E "(tsx|node).*${APP_IDENTIFIER}" | grep -v grep | awk '{print $2}'`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    return psOutput
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(pid => parseInt(pid))
      .filter(pid => !isNaN(pid) && pid !== process.pid);
  } catch (error) {
    // If grep finds nothing, it returns non-zero exit code
    // This is expected when no instances are running
    return [];
  }
}

/**
 * Format error message for duplicate process detection
 */
export function formatDuplicateProcessError(result: ProcessCheckResult): string {
  const pidList = result.runningPids.join(', ');

  return `
⚠️  Another instance of ${APP_IDENTIFIER} is already running!

Running instances (PIDs): ${pidList}
Current process (PID): ${result.currentPid}

This will cause conflicts with the Telegram Bot API.

To fix this:
1. Stop the other instance(s):
   kill ${result.runningPids[0]}

2. Or stop all instances:
   pkill -f "${APP_IDENTIFIER}.*tsx"

3. Then restart this application

If you're sure there are no other instances, delete the lock file:
   rm ${LOCK_FILE}
`;
}
