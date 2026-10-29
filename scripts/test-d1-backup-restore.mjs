import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wranglerCli = path.join(projectRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const scratchDirectory = await mkdtemp(path.join(tmpdir(), 'orthocare-d1-restore-drill-'));
const backupArgument = process.argv[2];
const suppliedBackup = backupArgument ? path.resolve(backupArgument) : null;
const restoreDatabaseName = 'orthocare-restore-drill';
const sourceDatabaseName = 'orthocare-backup-fixture';
let importFile;

function writeConfig(folder, databaseName) {
  const databaseId = randomUUID();
  const configPath = path.join(folder, 'wrangler.toml');
  const config = [
    `name = "${databaseName}"`,
    'compatibility_date = "2025-03-01"',
    '',
    '[[d1_databases]]',
    'binding = "DB"',
    `database_name = "${databaseName}"`,
    `database_id = "${databaseId}"`,
    '',
  ].join('\n');
  return mkdir(folder, { recursive: true })
    .then(() => writeFile(configPath, config, 'utf8'))
    .then(() => configPath);
}

function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [wranglerCli, ...args], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    let stdout = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.resume();
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Wrangler exited with code ${code} during the isolated D1 restore drill.`));
    });
  });
}

function parseResults(output) {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error('Could not parse Wrangler JSON output during restore verification.');
  }
}

async function removeScratchDirectory() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await rm(scratchDirectory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(error.code) || attempt === 11) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

try {
  const restoreDirectory = path.join(scratchDirectory, 'restore');
  const restoreConfig = await writeConfig(restoreDirectory, restoreDatabaseName);

  if (suppliedBackup) {
    importFile = suppliedBackup;
  } else {
    const sourceDirectory = path.join(scratchDirectory, 'source');
    const sourceConfig = await writeConfig(sourceDirectory, sourceDatabaseName);
    await runWrangler([
      'd1', 'execute', sourceDatabaseName, '--config', sourceConfig, '--local',
      '--command',
      "CREATE TABLE backup_restore_probe (id TEXT PRIMARY KEY, payload TEXT NOT NULL); INSERT INTO backup_restore_probe VALUES ('fixture-1', 'synthetic-only');",
    ]);
    importFile = path.join(scratchDirectory, 'fixture-export.sql');
    await runWrangler([
      'd1', 'export', sourceDatabaseName, '--config', sourceConfig, '--local', '--output', importFile,
    ]);
    const fixtureHash = createHash('sha256').update(await readFile(importFile)).digest('hex');
    await writeFile(
      `${importFile}.sha256`,
      `${fixtureHash}  ${path.basename(importFile)}\n`,
      'utf8',
    );
  }

  const backupBytes = await readFile(importFile);
  const sidecarPath = `${importFile}.sha256`;
  const sidecar = await readFile(sidecarPath, 'utf8');
  const expectedHash = sidecar.match(/^([a-f\d]{64})\s+/i)?.[1];
  const actualHash = createHash('sha256').update(backupBytes).digest('hex');
  if (!expectedHash || actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error('Backup SHA-256 sidecar is invalid or does not match the SQL file.');
  }

  let sql = backupBytes.toString('utf8');
  sql = sql.replace(/^\s*PRAGMA defer_foreign_keys\s*=\s*TRUE;\s*$/gim, '');
  if (/\bPRAGMA\b/i.test(sql)) {
    throw new Error('Backup contains unsupported PRAGMA statements; refusing the restore drill.');
  }
  const sanitizedImport = path.join(scratchDirectory, 'restore-import.sql');
  await writeFile(sanitizedImport, sql, 'utf8');

  await runWrangler([
    'd1', 'execute', restoreDatabaseName, '--config', restoreConfig,
    '--local', '--file', sanitizedImport,
  ]);

  const tableCheck = parseResults(await runWrangler([
    'd1', 'execute', restoreDatabaseName, '--config', restoreConfig,
    '--local', '--command',
    "SELECT COUNT(*) AS restored_tables FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';",
    '--json',
  ]));
  const tableCount = tableCheck[0]?.results?.[0]?.restored_tables;
  if (!Number.isInteger(tableCount) || tableCount < 1) {
    throw new Error('Restore verification found no restored tables.');
  }

  if (!suppliedBackup) {
    const fixtureCheck = parseResults(await runWrangler([
      'd1', 'execute', restoreDatabaseName, '--config', restoreConfig,
      '--local', '--command',
      "SELECT COUNT(*) AS restored_rows FROM backup_restore_probe WHERE id = 'fixture-1' AND payload = 'synthetic-only';",
      '--json',
    ]));
    if (fixtureCheck[0]?.results?.[0]?.restored_rows !== 1) {
      throw new Error('Synthetic backup row did not survive the restore drill.');
    }
  }

  console.log(`PASS isolated D1 restore drill (${tableCount} tables restored; source data was not modified).`);
} finally {
  await removeScratchDirectory();
}
