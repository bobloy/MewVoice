/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstalledPacksPanel from '../InstalledPacksPanel';

const mockOpenUrl = vi.fn();

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: mockOpenUrl,
}));

function renderPanel() {
  render(
    <InstalledPacksPanel
      packs={[]}
      modRoot="/"
      onToggle={() => {}}
      onSetFrequency={() => {}}
      onImport={() => {}}
      onUninstall={() => {}}
      onScan={() => {}}
      patchDirty={false}
    />,
  );
}

function getPrimaryDownloadButton() {
  return screen.getAllByRole('button', { name: 'Download More Voices' })[0];
}

describe('InstalledPacksPanel opener behavior', () => {
  beforeEach(() => {
    mockOpenUrl.mockReset();
    delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('opens mewvoice with opener plugin in Tauri runtime', async () => {
    (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockOpenUrl.mockResolvedValueOnce(undefined);

    renderPanel();
    await userEvent.click(getPrimaryDownloadButton());

    expect(mockOpenUrl).toHaveBeenCalledWith('https://mewvoice.com');
  });

  it('uses window.open when not running in Tauri runtime', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValueOnce(null);

    renderPanel();
    await userEvent.click(getPrimaryDownloadButton());

    expect(mockOpenUrl).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('https://mewvoice.com', '_blank', 'noopener,noreferrer');
  });

  it('shows manual fallback and copies link when opener fails in Tauri runtime', async () => {
    (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockOpenUrl.mockRejectedValueOnce(new Error('blocked'));

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderPanel();
    await userEvent.click(getPrimaryDownloadButton());

    await waitFor(() => {
      expect(screen.getByText('Open MewVoice manually')).toBeInTheDocument();
    });
    expect(writeText).toHaveBeenCalledWith('https://mewvoice.com');
    expect(screen.getByText('Link copied to clipboard.')).toBeInTheDocument();
  });
});
