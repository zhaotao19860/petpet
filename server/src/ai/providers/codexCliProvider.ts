import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StarAiProvider, StarAiProviderRequest } from '../types.js';

function runCodex(prompt: string, outputFile: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const codexPath = process.env.CODEX_CLI_PATH || '/opt/homebrew/bin/codex';
    const child = spawn(codexPath, [
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '--output-last-message',
      outputFile,
      '-',
    ], {
      stdio: ['pipe', 'ignore', 'pipe'],
      env: process.env,
    });

    let settled = false;
    let stderr = '';
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish(new Error('CODEX_TIMEOUT'));
    }, timeoutMs);

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => finish(error));
    child.on('close', (code) => {
      if (code === 0) {
        finish();
      } else {
        finish(new Error(`CODEX_EXIT_${code}: ${stderr.slice(0, 300)}`));
      }
    });
    child.stdin.end(prompt);
  });
}

export class CodexCliStarAiProvider implements StarAiProvider {
  async complete(request: StarAiProviderRequest) {
    const dir = await mkdtemp(join(tmpdir(), 'petpet-star-codex-'));
    const outputFile = join(dir, 'last-message.txt');
    const prompt = [
      request.system,
      '',
      '请只回答一个 JSON 对象，不要运行命令，不要修改文件。',
      'JSON 必须符合当前模式需要的字段。',
      '',
      request.user,
    ].join('\n');
    try {
      await runCodex(prompt, outputFile, request.timeoutMs);
      return await readFile(outputFile, 'utf8');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
