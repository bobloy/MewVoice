import {
  VOICE_ACTIONS,
  CORE_ACTIONS,
  ACTION_DESCRIPTIONS,
  ACTION_RECOMMENDED_CLIPS,
  AUDIO_REQUIREMENTS,
} from '@/types/voicepack';

function downloadInstallScript() {
  fetch('/api/install-script')
    .then((res) => {
      if (!res.ok) throw new Error('Download failed');
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'install_voicepack.py';
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => alert('Could not download install script. Is the server running?'));
}

export function InstructionsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* What is this */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-3">What is this?</h2>
        <p className="text-mew-muted leading-relaxed">
          MewVoice lets you make custom cat voices for{' '}
          <span className="text-mew-text font-medium">Mewgenics</span>.
        </p>
        <p className="text-mew-muted leading-relaxed mt-3">
          Each cat uses a voice pack — short clips for meowing, getting hit,
          purring, and more. This app records or accepts your audio, converts it
          to the correct format, and packages it into a ready-to-install voice
          pack.
        </p>
      </section>

      {/* How it works */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-4">How it works</h2>
        <ol className="space-y-3 text-mew-muted list-decimal list-inside">
          <li>
            <span className="text-mew-text font-medium">Name your pack</span> —
            choose a name and gender. Add a description if you want.
          </li>
          <li>
            <span className="text-mew-text font-medium">Add clips</span> —
            record with the mic or upload audio files. Clips save automatically.
          </li>
          <li>
            <span className="text-mew-text font-medium">Preview</span> — use the
            dice button to hear random pitch variation, similar to in-game
            playback.
          </li>
          <li>
            <span className="text-mew-text font-medium">Build</span> — once all
            required actions have at least one clip, click Build. Audio is
            converted, trimmed, normalized, and packaged.
          </li>
          <li>
            <span className="text-mew-text font-medium">Download</span> — you’ll
            get a ZIP file containing your voice pack.
          </li>
          <li>
            <span className="text-mew-text font-medium">
              Publish (optional)
            </span>{' '}
            — share it in the community library.
          </li>
          <li>
            <span className="text-mew-text font-medium">Install</span> —
            collect your downloaded ZIPs into a folder and run the install
            script. See below.
          </li>
        </ol>
      </section>

      {/* Voice actions */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-2">Voice actions</h2>
        <p className="text-mew-muted text-sm mb-4">
          Based on all 186 built-in voice packs in the game files. Six actions
          are required. Three are optional.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-mew-muted border-b border-mew-highlight/30">
                <th className="pb-2 pr-4">Action</th>
                <th className="pb-2 pr-4">Description</th>
                <th className="pb-2 pr-4 text-center">Recommended</th>
                <th className="pb-2 pr-4 text-center">Game range</th>
                <th className="pb-2 text-center">Required</th>
              </tr>
            </thead>
            <tbody>
              {VOICE_ACTIONS.map((action) => {
                const rec = ACTION_RECOMMENDED_CLIPS[action];
                const isCore = CORE_ACTIONS.includes(action);
                return (
                  <tr
                    key={action}
                    className="border-b border-mew-highlight/10 text-mew-muted"
                  >
                    <td className="py-2 pr-4 text-mew-text font-medium whitespace-nowrap">
                      {action}
                    </td>
                    <td className="py-2 pr-4 text-xs leading-snug">
                      {ACTION_DESCRIPTIONS[action]}
                    </td>
                    <td className="py-2 pr-4 text-center text-mew-text">
                      {rec.recommended}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {rec.gameMin}–{rec.gameMax}
                    </td>
                    <td className="py-2 text-center">
                      {isCore ? (
                        <span className="text-mew-accent font-medium">Yes</span>
                      ) : (
                        <span className="text-mew-muted">No</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audio format */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-3">Audio format</h2>
        <p className="text-mew-muted text-sm mb-4">
          Record in any format your browser supports (usually WebM), or upload
          WAV, MP3, OGG, etc.
        </p>

        <ul className="space-y-1 text-mew-muted text-sm">
          <li>
            <span className="text-mew-text">Format:</span> WAV (uncompressed)
          </li>
          <li>
            <span className="text-mew-text">Sample rate:</span>{' '}
            {AUDIO_REQUIREMENTS.sampleRate.toLocaleString()} Hz
          </li>
          <li>
            <span className="text-mew-text">Channels:</span> Mono
          </li>
          <li>
            <span className="text-mew-text">Bit depth:</span>{' '}
            {AUDIO_REQUIREMENTS.bitDepth}-bit
          </li>
          <li>
            <span className="text-mew-text">Max clip length:</span>{' '}
            {AUDIO_REQUIREMENTS.maxDurationSec}s
          </li>
          <li>Silence trimmed</li>
          <li>Normalized to -20 dBFS</li>
        </ul>

        <p className="text-mew-muted text-xs mt-4">
          No manual formatting needed.
        </p>
      </section>

      {/* Recording tips */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-3">Recording tips</h2>
        <ul className="space-y-2 text-mew-muted text-sm list-disc list-inside">
          <li>Keep clips short. Most are under 1.5 seconds.</li>
          <li>
            Record multiple variations. Four per action is a good baseline.
          </li>
          <li>
            The game applies random pitch shifts on playback.
          </li>
          <li>A quiet room helps.</li>
          <li>
            Gender limits which cats can use the pack. Male voices go to male cats, female to female.
          </li>
        </ul>
      </section>

      {/* Installation */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-3">Installing voice packs</h2>

        <p className="text-mew-muted text-sm mb-4">
          Download as many voice packs as you like, then install them all at
          once with the standalone install script. You need{' '}
          <a
            href="https://www.python.org/downloads/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mew-accent hover:underline"
          >
            Python 3
          </a>{' '}
          installed.
        </p>

        <button
          onClick={downloadInstallScript}
          className="mb-4 px-4 py-2 bg-mew-accent hover:bg-mew-accent/80 text-mew-text rounded-lg font-medium text-sm transition-colors"
        >
          Download install_voicepack.py
        </button>

        <h3 className="text-lg font-bold mt-4 mb-2">Automatic install</h3>
        <ol className="space-y-3 text-mew-muted text-sm list-decimal list-inside mb-4">
          <li>
            <span className="text-mew-text font-medium">
              Download the install script
            </span>{' '}
            — use the button above (one-time download).
          </li>
          <li>
            <span className="text-mew-text font-medium">
              Collect your voice packs
            </span>{' '}
            — put all downloaded voice pack ZIPs into a single folder.
          </li>
          <li>
            <span className="text-mew-text font-medium">Run the script</span>
            {' '} — point it at the folder:
            <code className="block mt-1 bg-mew-bg rounded px-3 py-1.5 text-xs text-mew-text font-mono">
              python install_voicepack.py my_voice_packs/
            </code>
          </li>
        </ol>
        <p className="text-mew-muted text-xs mb-2">
          On first run, the script saves a vanilla backup of resources.gpak.
          Every run after that rebuilds from the vanilla baseline — add or
          remove ZIPs from the folder and re-run to update. Other mods are
          left untouched. You can also install a single ZIP or pass the gpak
          path explicitly:
        </p>
        <div className="space-y-1">
          <code className="block bg-mew-bg rounded px-3 py-1.5 text-xs text-mew-text font-mono">
            python install_voicepack.py single_pack.zip
          </code>
          <code className="block bg-mew-bg rounded px-3 py-1.5 text-xs text-mew-text font-mono">
            python install_voicepack.py my_voice_packs/
            &quot;C:/path/to/resources.gpak&quot;
          </code>
        </div>
        <p className="text-mew-muted text-xs mt-2">
          To remove all custom voices:{' '}
          <code className="bg-mew-bg rounded px-1.5 py-0.5 text-xs font-mono">
            python install_voicepack.py --uninstall
          </code>
        </p>

        <h3 className="text-lg font-bold mt-6 mb-2">Manual install</h3>
        <p className="text-mew-muted text-sm mb-3">
          If you prefer to do it by hand:
        </p>
        <ol className="space-y-3 text-mew-muted text-sm list-decimal list-inside">
          <li>
            <span className="text-mew-text font-medium">
              Back up resources.gpak
            </span>{' '}
            — find it in your Mewgenics install folder and copy it somewhere
            safe.
          </li>
          <li>
            <span className="text-mew-text font-medium">
              Extract the game archive
            </span>{' '}
            — use the{' '}
            <a
              href="https://github.com/ShootMe/GPAK-Extractor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mew-accent hover:underline"
            >
              GPAK-Extractor
            </a>{' '}
            tool. Drag resources.gpak onto the exe to unpack it.
          </li>
          <li>
            <span className="text-mew-text font-medium">
              Copy your pack files
            </span>{' '}
            — from each ZIP, copy the audio/ folder into the extracted output:
            <code className="block mt-1 bg-mew-bg rounded px-3 py-1.5 text-xs text-mew-text font-mono whitespace-pre-line">
              {'audio/voices/YourPackName.gon\naudio/voices/YourPackName/*.wav'}
            </code>
          </li>
          <li>
            <span className="text-mew-text font-medium">
              Register in catgen.gon
            </span>{' '}
            — open{' '}
            <code className="bg-mew-bg rounded px-1.5 py-0.5 text-xs font-mono">
              data/catgen.gon
            </code>{' '}
            and find the{' '}
            <code className="bg-mew-bg rounded px-1.5 py-0.5 text-xs font-mono">
              voice_sets {'{'}
            </code>{' '}
            section. Add a line for each pack:
            <code className="block mt-1 bg-mew-bg rounded px-3 py-1.5 text-xs text-mew-text font-mono">
              YourPackName 1
            </code>
          </li>
          <li>
            <span className="text-mew-text font-medium">Repack</span> — drag
            the output folder back onto the GPAK-Extractor exe to create a new
            gpak.
          </li>
          <li>
            <span className="text-mew-text font-medium">
              Replace the original
            </span>{' '}
            resources.gpak in your game folder with the repacked one.
          </li>
          <li>Launch the game. Your voice packs will be available.</li>
        </ol>

        <div className="mt-4 bg-amber-900/20 rounded-lg p-4 border border-amber-700/30">
          <p className="text-amber-400 text-sm font-medium mb-1">Important</p>
          <p className="text-mew-muted text-xs">
            The install script saves a permanent vanilla baseline
            (resources_vanilla.gpak) on first run. If a game update replaces
            resources.gpak, delete the old resources_vanilla.gpak and re-run
            to create a fresh baseline.
          </p>
        </div>
      </section>
    </div>
  );
}
