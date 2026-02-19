import { invoke } from '@tauri-apps/api/core';
import type { AppState, InstalledVoicePack } from '@/types/manager';

// ── State persistence ──

export async function loadState(): Promise<AppState> {
  const json = await invoke<string>('load_state');
  return JSON.parse(json);
}

export async function saveState(state: AppState): Promise<void> {
  await invoke('save_state', { state: JSON.stringify(state) });
}

// ── Path detection ──

export async function detectMewtatorPath(): Promise<string | null> {
  return invoke<string | null>('detect_mewtator_path');
}

export async function pickFolder(): Promise<string | null> {
  return invoke<string | null>('pick_folder');
}

export async function validateModPath(path: string): Promise<boolean> {
  return invoke<boolean>('validate_mod_path', { path });
}

// ── Patch generation ──

export async function writeVoicePatch(
  modRoot: string,
  content: string,
): Promise<void> {
  await invoke('write_voice_patch', { modRoot, content });
}

// ── Pack installation ──

export async function installPack(
  zipPath: string,
  modRoot: string,
): Promise<InstalledVoicePack> {
  const json = await invoke<string>('install_pack', { zipPath, modRoot });
  return JSON.parse(json);
}

export async function uninstallPack(
  modRoot: string,
  folderName: string,
): Promise<void> {
  await invoke('uninstall_pack', { modRoot, folderName });
}

// ── Scanning ──

export async function scanInstalledPacks(
  modRoot: string,
): Promise<InstalledVoicePack[]> {
  const json = await invoke<string>('scan_installed_packs', { modRoot });
  return JSON.parse(json);
}
