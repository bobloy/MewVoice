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
      {/* Overview */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-3">What is this?</h2>
        <p className="text-mew-muted leading-relaxed">
          Mewgenics Voice Pack Creator lets you record custom cat voices for{' '}
          <span className="text-mew-text font-medium">Mewgenics</span>. Every cat in
          the game uses a voice pack — a set of short audio clips that play when
          the cat meows, gets hit, purrs, and so on. This tool records your clips,
          converts them to the right format, and packages everything into a
          ready-to-install voice pack.
        </p>
      </section>

      {/* How it works */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-4">How it works</h2>
        <ol className="space-y-3 text-mew-muted list-decimal list-inside">
          <li>
            <span className="text-mew-text font-medium">Name your pack</span> — give
            it a name, choose a gender, and optionally add a description.
          </li>
          <li>
            <span className="text-mew-text font-medium">Record or upload clips</span>{' '}
            — for each voice action, hit the mic button and make your sound.
            Recordings save automatically when you stop. You can also upload
            pre-recorded audio files.
          </li>
          <li>
            <span className="text-mew-text font-medium">Preview with pitch shift</span>{' '}
            — click the dice button on any clip to hear it with random pitch
            variation, simulating how it sounds in-game.
          </li>
          <li>
            <span className="text-mew-text font-medium">Build</span> — once all
            required actions have at least one clip, hit Build. The server converts
            your audio to mono 16-bit 44100 Hz WAV, trims silence, normalizes
            volume, and generates the GON config file.
          </li>
          <li>
            <span className="text-mew-text font-medium">Download</span> — grab the
            ZIP file containing your voice pack, ready to install.
          </li>
          <li>
            <span className="text-mew-text font-medium">Publish (optional)</span> —
            share your pack to the community library so others can download it.
          </li>
        </ol>
      </section>

      {/* Voice actions & data */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-2">Voice actions</h2>
        <p className="text-mew-muted text-sm mb-4">
          Based on analysis of all 186 built-in voice packs in the game files.
          The 6 core actions are required to build; the 3 optional actions can be
          skipped.
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
          You can record in any format your browser supports (usually WebM) or
          upload WAV, MP3, OGG, etc. The server automatically converts everything
          to the game's required format:
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
          <li>
            <span className="text-mew-text">Processing:</span> Silence trimmed,
            volume normalized to -20 dBFS
          </li>
        </ul>
      </section>

      {/* Tips */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-3">Recording tips</h2>
        <ul className="space-y-2 text-mew-muted text-sm list-disc list-inside">
          <li>Keep clips short — most in-game sounds are under 1.5 seconds.</li>
          <li>
            Record multiple variations of each action so the game can pick
            randomly. 4 clips per action is a good target.
          </li>
          <li>
            The game applies random pitch shifting to each clip on playback,
            so don't worry about matching an exact pitch. Use the dice
            button to preview how this sounds.
          </li>
          <li>
            Background noise is trimmed automatically, but a quiet room still
            helps.
          </li>
          <li>
            Gender affects which cats can use your voice — "male" or "female"
            restricts the pack, "neutral" allows any cat.
          </li>
        </ul>
      </section>

      {/* Installation */}
      <section className="bg-mew-surface rounded-xl p-6 border border-mew-highlight/30">
        <h2 className="text-2xl font-bold mb-3">Installing a voice pack</h2>
        <p className="text-mew-muted text-sm mb-4">
          Voice packs need to be added to the game's resource archive. This is a
          manual process for now — a one-click installer is planned.
        </p>

        <ol className="space-y-3 text-mew-muted text-sm list-decimal list-inside">
          <li>
            <span className="text-mew-text font-medium">
              Back up your resources.gpak
            </span>{' '}
            — find it in your Mewgenics install folder. Copy it somewhere safe
            before making changes.
          </li>
          <li>
            <span className="text-mew-text font-medium">
              Extract the game resources
            </span>{' '}
            — use the GPAK tool to unpack the archive:
            <code className="block mt-1 bg-mew-bg rounded px-3 py-1.5 text-xs text-mew-text font-mono">
              python gpak_tool.py extract "path/to/resources.gpak" unpacked/
            </code>
          </li>
          <li>
            <span className="text-mew-text font-medium">
              Copy the voice files
            </span>{' '}
            — unzip your downloaded pack and copy its contents into the unpacked
            folder. This adds:
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
              unpacked/data/catgen.gon
            </code>{' '}
            and find the <code className="bg-mew-bg rounded px-1.5 py-0.5 text-xs font-mono">voice_sets {'{'}</code>{' '}
            section. Add your pack:
            <code className="block mt-1 bg-mew-bg rounded px-3 py-1.5 text-xs text-mew-text font-mono">
              YourPackName 1 // Custom voice pack
            </code>
          </li>
          <li>
            <span className="text-mew-text font-medium">Repack</span> — rebuild
            the archive:
            <code className="block mt-1 bg-mew-bg rounded px-3 py-1.5 text-xs text-mew-text font-mono">
              python gpak_tool.py pack unpacked/ resources.gpak
            </code>
          </li>
          <li>
            <span className="text-mew-text font-medium">
              Replace the original
            </span>{' '}
            — move the new resources.gpak back into your game folder.
          </li>
          <li>
            <span className="text-mew-text font-medium">Launch Mewgenics</span>{' '}
            — your new voice should appear in the cat generation pool.
          </li>
        </ol>

        <div className="mt-4 bg-mew-bg rounded-lg p-4 border border-yellow-500/20">
          <p className="text-yellow-400 text-sm font-medium mb-1">
            Important
          </p>
          <p className="text-mew-muted text-xs">
            Always keep a backup of your original resources.gpak. Game updates
            may overwrite your modded archive, so you'll need to re-apply voice
            packs after updating.
          </p>
        </div>
      </section>
    </div>
  );
}
