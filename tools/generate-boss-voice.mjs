#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = resolve(process.cwd());
const voiceRoot = join(projectRoot, 'assets/boss-rush/audio/voice');
const manifest = JSON.parse(readFileSync(join(voiceRoot, 'manifest.json'), 'utf8'));
const skillRoot = process.env.MEDIA_USE_SKILL_DIR || join(homedir(), '.agents/skills/media-use');
const ttsScript = join(skillRoot, 'audio/scripts/heygen-tts.mjs');
const force = process.argv.includes('--force');
const onlyVoice = process.argv.find((arg) => arg.startsWith('--voice='))?.split('=')[1] || '';
const fromCue = process.argv.find((arg) => arg.startsWith('--from='))?.split('=')[1] || '';
const concurrency = Math.max(1, Math.min(3, Number(process.argv.find((arg) => arg.startsWith('--concurrency='))?.split('=')[1]) || 2));

if (!existsSync(ttsScript)) throw new Error(`找不到 media-use TTS：${ttsScript}`);

const tasks = [];
for (const [voiceKey, voice] of Object.entries(manifest.voices)) {
  if (onlyVoice && voiceKey !== onlyVoice) continue;
  let reachedStart = !fromCue;
  for (const [cue, text] of Object.entries(manifest.cues[voiceKey])) {
    if (cue === fromCue) reachedStart = true;
    if (!reachedStart) continue;
    const output = join(voiceRoot, voiceKey, `${cue}.mp3`);
    if (force || !existsSync(output)) tasks.push({ voiceKey, voice, cue, text, output });
  }
}

function generate(task, attempt = 1) {
  mkdirSync(dirname(task.output), { recursive: true });
  return new Promise((resolveTask, rejectTask) => {
    const child = spawn(process.execPath, [
      ttsScript,
      task.text,
      '-o', task.output,
      '--lang', manifest.language,
      '--voice', task.voice.voice_id,
      '--speed', String(task.voice.speed)
    ], { stdio: 'inherit', env: process.env });
    child.on('error', rejectTask);
    child.on('exit', (code) => {
      if (code === 0 && existsSync(task.output)) {
        console.log(`完成 ${task.voiceKey}/${task.cue}`);
        resolveTask();
      } else if (attempt < 3) {
        console.warn(`重试 ${task.voiceKey}/${task.cue}（第 ${attempt + 1} 次）`);
        setTimeout(() => generate(task, attempt + 1).then(resolveTask, rejectTask), 1200);
      } else rejectTask(new Error(`生成失败：${task.voiceKey}/${task.cue}`));
    });
  });
}

let cursor = 0;
async function worker() {
  while (cursor < tasks.length) {
    const task = tasks[cursor++];
    await generate(task);
  }
}

console.log(`待生成 ${tasks.length} 条 Boss 配音`);
await Promise.all(Array.from({ length: concurrency }, () => worker()));
console.log('全部 Boss 配音生成完成');
