import type { AppState, InstalledVoicePack } from '@/types/manager';
import { createDefaultState } from '@/types/manager';

/**
 * Check if we're running inside the Tauri webview (vs. a plain browser).
 * When running `npm run dev:web` (Vite only), Tauri APIs aren't available.
 */
function isTauri(): boolean {
  return '__TAURI_INTERNALS__' in window;
}

/**
 * Lazy-import invoke to avoid crashing when Tauri isn't available.
 */
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// ── State persistence ──

export async function loadState(): Promise<AppState> {
  if (!isTauri()) return createDefaultState();
  const json = await tauriInvoke<string>('load_state');
  return JSON.parse(json);
}

export async function saveState(state: AppState): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke('save_state', { state: JSON.stringify(state) });
}

// ── Path detection ──

export async function detectMewtatorPath(): Promise<string | null> {
  if (!isTauri()) return null;
  return tauriInvoke<string | null>('detect_mewtator_path');
}

export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) {
    // In browser mode, prompt for a path string
    return window.prompt('Enter mod folder path:');
  }
  // Use the frontend dialog plugin directly
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true, multiple: false });
  return selected;
}

export async function validateModPath(path: string): Promise<boolean> {
  if (!isTauri()) return true;
  return tauriInvoke<boolean>('validate_mod_path', { path });
}

// ── Patch generation ──

export async function writeVoicePatch(
  modRoot: string,
  content: string,
): Promise<void> {
  if (!isTauri()) {
    console.log('[mock] writeVoicePatch to', modRoot, '\n', content);
    return;
  }
  await tauriInvoke('write_voice_patch', { modRoot, content });
}

// ── Pack installation ──

export async function installPack(
  zipPath: string,
  modRoot: string,
): Promise<InstalledVoicePack> {
  if (!isTauri()) throw new Error('Pack installation requires the desktop app');
  const json = await tauriInvoke<string>('install_pack', { zipPath, modRoot });
  return JSON.parse(json);
}

export async function uninstallPack(
  modRoot: string,
  folderName: string,
): Promise<void> {
  if (!isTauri()) throw new Error('Pack uninstall requires the desktop app');
  await tauriInvoke('uninstall_pack', { modRoot, folderName });
}

// ── Scanning ──

export async function scanInstalledPacks(
  modRoot: string,
): Promise<InstalledVoicePack[]> {
  if (!isTauri()) return [];
  const json = await tauriInvoke<string>('scan_installed_packs', { modRoot });
  return JSON.parse(json);
}
