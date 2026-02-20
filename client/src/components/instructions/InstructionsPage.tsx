import {
  VOICE_ACTIONS,
  CORE_ACTIONS,
  ACTION_DESCRIPTIONS,
  ACTION_RECOMMENDED_CLIPS,
  AUDIO_REQUIREMENTS,
} from '@/types/voicepack';

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
            <span className="text-mew-text font-medium">Install</span> — import
            the ZIP into the MewVoice Desktop app. See below.
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
          <li>
            <span className="text-mew-text font-medium">Sing clips</span> are
            not a cat singing a melody — they're a very short meow the game
            repeats rapidly at different pitches to emulate singing. Keep them
            under ~0.7s. If you skip Sing, the game uses your first Normal clip
            as a fallback.
          </li>
        </ul>
      </section>

      {/* Installation */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-3">Installing voice packs</h2>

        <p className="text-mew-muted text-sm mb-4">
          Voice packs are installed using the{' '}
          <span className="text-mew-text font-medium">MewVoice Desktop</span> app,
          which manages your packs and registers them with{' '}
          <a
            href="https://www.nexusmods.com/mewgenics/mods/1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mew-accent hover:underline"
          >
            Mewtator
          </a>
          .
        </p>

        <h3 className="text-lg font-bold mt-4 mb-2">Setup</h3>
        <ol className="space-y-3 text-mew-muted text-sm list-decimal list-inside mb-4">
          <li>
            <span className="text-mew-text font-medium">Install Mewtator</span> —
            follow the instructions on the{' '}
            <a
              href="https://www.nexusmods.com/mewgenics/mods/1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mew-accent hover:underline"
            >
              Nexus Mods page
            </a>{' '}
            to set up the mod loader.
          </li>
          <li>
            <span className="text-mew-text font-medium">Download MewVoice Desktop</span> —
            grab the latest release from{' '}
            <a
              href="https://github.com/bobloy/MewVoice/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mew-accent hover:underline"
            >
              GitHub Releases
            </a>{' '}
            or{' '}
            <a
              href="https://www.nexusmods.com/mewgenics/mods/76"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mew-accent hover:underline"
            >
              NexusMods
            </a>
            .
          </li>
          <li>
            <span className="text-mew-text font-medium">Point it at your mods folder</span> —
            on first launch, the app will ask you to select your Mewtator{' '}
            <code className="bg-mew-bg rounded px-1.5 py-0.5 text-xs font-mono">mods</code>{' '}
            directory.
          </li>
        </ol>

        <h3 className="text-lg font-bold mt-4 mb-2">Installing packs</h3>
        <ol className="space-y-3 text-mew-muted text-sm list-decimal list-inside mb-4">
          <li>
            <span className="text-mew-text font-medium">Download voice packs</span> —
            build your own above or grab one from the community library.
          </li>
          <li>
            <span className="text-mew-text font-medium">Import the ZIP</span> —
            open MewVoice Desktop and import the downloaded ZIP file. The app
            extracts the audio and registers the voice with the game.
          </li>
          <li>
            <span className="text-mew-text font-medium">Enable and adjust</span> —
            toggle packs on/off and set spawn frequency. The app writes a single
            merged patch file so all your packs work together.
          </li>
          <li>
            <span className="text-mew-text font-medium">Launch the game</span> —
            Mewtator picks up the changes automatically.
          </li>
        </ol>

        <div className="mt-4 bg-mew-accent/10 rounded-lg p-4 border border-mew-accent/30">
          <p className="text-mew-accent text-sm font-medium mb-1">Why a desktop app?</p>
          <p className="text-mew-muted text-xs leading-relaxed">
            The game needs a single merged patch file listing all active voice packs
            and their spawn weights. MewVoice Desktop manages this automatically —
            importing, enabling/disabling, adjusting frequency, and muting base
            game voices all update one{' '}
            <code className="font-mono">catgen.gon.patch</code>{' '}
            file without you touching any game files.
          </p>
        </div>
      </section>
    </div>
  );
}
