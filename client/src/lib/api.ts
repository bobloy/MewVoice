import { VoicePack, VoicePackMeta, AudioClip } from '@/types/voicepack';

const API_BASE = '/api';

/** Upload a complete voice pack to the server for conversion + packaging */
export async function uploadVoicePack(pack: VoicePack): Promise<{ id: string; downloadUrl: string }> {
  const formData = new FormData();

  formData.append('name', pack.name);
  formData.append('author', pack.author);
  formData.append('gender', pack.gender);
  formData.append('description', pack.description);

  // Append each clip with action/index metadata
  for (const [action, clips] of Object.entries(pack.clips)) {
    clips.forEach((clip: AudioClip, index: number) => {
      formData.append(`clips`, clip.blob, `${action}_${index + 1}.webm`);
      formData.append(`clip_actions`, action);
    });
  }

  const response = await fetch(`${API_BASE}/voicepacks/build`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }

  return response.json();
}

/** Publish a built voice pack to the community library */
export async function publishVoicePack(id: string): Promise<VoicePackMeta> {
  const response = await fetch(`${API_BASE}/voicepacks/${id}/publish`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Publish failed');
  return response.json();
}

/** List community voice packs */
export async function listVoicePacks(page = 1, limit = 20): Promise<{
  packs: VoicePackMeta[];
  total: number;
}> {
  const response = await fetch(`${API_BASE}/voicepacks?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load voice packs');
  return response.json();
}

/** Download a built (unpublished) voice pack zip */
export function getDownloadUrl(id: string): string {
  return `${API_BASE}/voicepacks/${id}/download`;
}

/** Download a published voice pack zip */
export function getPublishedDownloadUrl(id: string): string {
  return `${API_BASE}/voicepacks/${id}/download-published`;
}
