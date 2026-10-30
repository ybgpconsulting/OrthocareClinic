import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createInterface, emitKeypressEvents } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DATABASE_NAME = 'orthocareclinic';
const DATABASE_ID = 'bb1485a9-0b59-41b4-abf2-d4a7ca1e8f2d';
const ADMIN_ID = 1;
const PASSWORD_MIN_LENGTH = 15;
const PASSWORD_MAX_LENGTH = 128;
const PBKDF2_ITERATIONS = 10_000;
const PBKDF2_KEY_LENGTH = 64;

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const wranglerCli = path.join(projectRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const wranglerConfig = path.join(projectRoot, 'wrangler.toml');

function assertProductionTarget() {
  if (!existsSync(wranglerCli) || !existsSync(wranglerConfig)) {
    throw new Error('Run this utility from a project checkout with dependencies installed.');
  }

  const config = readFileSync(wranglerConfig, 'utf8');
  const expectedConfig = [
    /^name\s*=\s*"orthocareclinic"\s*$/m,
    /^\s*binding\s*=\s*"DB"\s*$/m,
    /^\s*database_name\s*=\s*"orthocareclinic"\s*$/m,
    /^\s*database_id\s*=\s*"bb1485a9-0b59-41b4-abf2-d4a7ca1e8f2d"\s*$/m,
  ];

  if (expectedConfig.some((pattern) => !pattern.test(config))) {
    throw new Error('Refusing to run: wrangler.toml does not match the expected production Worker and D1 database.');
  }
}

function requireInteractiveTerminal() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run this utility in an interactive terminal so passwords can be entered without echo.');
  }
}

function promptVisible(question) {
  requireInteractiveTerminal();
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    terminal.question(question, (answer) => {
      terminal.close();
      resolve(answer);
    });
    terminal.once('close', () => {
      if (process.stdin.destroyed) reject(new Error('Input closed before confirmation.'));
    });
  });
}

function promptHidden(question) {
  requireInteractiveTerminal();
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let value = '';
    let settled = false;

    const cleanup = () => {
      input.off('keypress', onKeypress);
      input.setRawMode(false);
      process.stdout.write('\n');
    };

    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(value);
    };

    const onKeypress = (sequence, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        finish(new Error('Password entry cancelled.'));
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        finish();
        return;
      }
      if (key.name === 'backspace') {
        value = Array.from(value).slice(0, -1).join('');
        return;
      }
      if (!key.ctrl && !key.meta && sequence && !/[\u0000-\u001f\u007f]/.test(sequence)) {
        value += sequence;
      }
    };

    process.stdout.write(question);
    input.setRawMode(true);
    input.resume();
    input.on('keypress', onKeypress);
    emitKeypressEvents(input);
  });
}

function getPasswordPolicyError(password) {
  const length = Array.from(password).length;
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
    return `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
}

function runD1(sql, stage, secrets = []) {
  const result = spawnSync(
    process.execPath,
    [
      wranglerCli,
      'd1',
      'execute',
      DATABASE_NAME,
      '--remote',
      '--json',
      '--command',
      sql,
    ],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      timeout: 120_000,
      windowsHide: true,
    }
  );

  const redact = (text) => secrets.reduce(
    (safeText, secret) => safeText.replaceAll(secret, '[REDACTED]'),
    text
  );

  if (result.error || result.status !== 0) {
    const details = redact((result.stderr || result.error?.message || '').trim());
    throw new Error(`${stage} failed.${details ? ` ${details}` : ''}`);
  }

  let output;
  try {
    output = JSON.parse(result.stdout);
  } catch {
    throw new Error(`${stage} returned an unreadable Wrangler response.`);
  }

  const statements = Array.isArray(output) ? output : [output];
  if (!statements.length || statements.some((statement) => statement?.success !== true)) {
    throw new Error(`${stage} did not complete successfully.`);
  }
  return statements;
}

function readAdminCount(statements) {
  const row = statements[0]?.results?.[0];
  const count = Number(row?.admin_count);
  if (!Number.isInteger(count)) {
    throw new Error('Could not verify the production administrator row.');
  }
  return count;
}

async function main() {
  assertProductionTarget();
  process.stdout.write(`Target D1: production ${DATABASE_NAME} (${DATABASE_ID})\n`);
  const confirmation = await promptVisible(`Type exactly "PRODUCTION ${DATABASE_NAME}" to continue: `);
  if (confirmation !== `PRODUCTION ${DATABASE_NAME}`) {
    throw new Error('Production target confirmation did not match. No database changes were made.');
  }

  let password = '';
  let passwordConfirmation = '';
  let salt;
  let hash;
  let passwordWasUpdated = false;

  try {
    password = await promptHidden('New admin password (input hidden): ');
    const policyError = getPasswordPolicyError(password);
    if (policyError) throw new Error(policyError);

    passwordConfirmation = await promptHidden('Re-enter new admin password (input hidden): ');
    if (password !== passwordConfirmation) {
      throw new Error('Passwords do not match. No database changes were made.');
    }

    const saltHex = randomBytes(16).toString('hex');
    salt = Buffer.from(saltHex, 'hex');
    hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, 'sha512');
    const hashHex = hash.toString('hex');

    const existence = runD1(
      `SELECT COUNT(*) AS admin_count FROM orthocare_clinic_admin WHERE id = ${ADMIN_ID}`,
      'Administrator existence check',
      [saltHex, hashHex]
    );
    if (readAdminCount(existence) !== 1) {
      throw new Error('The production administrator row does not exist exactly once. No account was created or changed.');
    }

    const update = runD1(
      `UPDATE orthocare_clinic_admin
       SET password_salt = '${saltHex}', password_hash = '${hashHex}'
       WHERE id = ${ADMIN_ID}`,
      'Admin password update',
      [saltHex, hashHex]
    );
    if (Number(update[0]?.meta?.changes) !== 1) {
      throw new Error('The admin password update did not affect exactly one row. Session rows were not deleted.');
    }
    passwordWasUpdated = true;

    runD1(
      'DELETE FROM orthocare_clinic_sessions',
      'Admin session revocation',
      [saltHex, hashHex]
    );

    const verification = runD1(
      `SELECT COUNT(*) AS admin_count FROM orthocare_clinic_admin WHERE id = ${ADMIN_ID}`,
      'Administrator verification',
      [saltHex, hashHex]
    );
    if (readAdminCount(verification) !== 1) {
      throw new Error('The admin row could not be verified after reset. Do not assume the reset completed.');
    }

    process.stdout.write('Admin password reset successfully. Existing admin sessions were revoked.\n');
  } catch (error) {
    if (passwordWasUpdated && error instanceof Error && error.message.startsWith('Admin session revocation failed.')) {
      throw new Error('The password was updated, but existing sessions may not have been revoked. Rerun this utility to complete the reset.');
    }
    throw error;
  } finally {
    password = '';
    passwordConfirmation = '';
    salt?.fill(0);
    hash?.fill(0);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Admin password reset failed.'}\n`);
  process.exitCode = 1;
});
