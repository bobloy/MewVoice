"""
Audio converter for Mewgenics voice packs.
Converts any audio format to mono, 16-bit PCM, 44100 Hz WAV.
Requires ffmpeg. pydub wraps ffmpeg for us.
"""
from pydub import AudioSegment
from pathlib import Path

TARGET_SAMPLE_RATE = 44100
TARGET_CHANNELS = 1
TARGET_SAMPLE_WIDTH = 2

def convert_to_game_wav(input_path: str, output_path: str) -> dict:
    input_ext = Path(input_path).suffix.lower().lstrip(".")
    format_map = {
        "webm": "webm", "ogg": "ogg", "mp3": "mp3", "m4a": "m4a",
        "wav": "wav", "flac": "flac", "aac": "aac", "wma": "wma",
        "opus": "ogg",
    }
    fmt = format_map.get(input_ext, input_ext)
    try:
        audio = AudioSegment.from_file(input_path, format=fmt)
    except Exception as e:
        raise RuntimeError(f"Failed to read audio file: {e}")

    original_duration = len(audio) / 1000.0
    if original_duration < 0.05:
        raise ValueError(f"Audio too short ({original_duration:.2f}s). Minimum is 0.05s.")
    if original_duration > 10.0:
        raise ValueError(f"Audio too long ({original_duration:.2f}s). Maximum is 10s.")

    audio = audio.set_frame_rate(TARGET_SAMPLE_RATE)
    audio = audio.set_channels(TARGET_CHANNELS)
    audio = audio.set_sample_width(TARGET_SAMPLE_WIDTH)

    target_dbfs = -20.0
    change_in_dbfs = target_dbfs - audio.dBFS
    audio = audio.apply_gain(change_in_dbfs)
    audio = _trim_silence(audio)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    audio.export(output_path, format="wav")
    return {
        "original_format": input_ext,
        "original_duration": original_duration,
        "output_duration": len(audio) / 1000.0,
        "output_size": Path(output_path).stat().st_size,
    }

def _trim_silence(audio, silence_thresh=-45, chunk_size=10):
    start_trim = 0
    for i in range(0, len(audio), chunk_size):
        if audio[i:i + chunk_size].dBFS > silence_thresh:
            start_trim = max(0, i - chunk_size)
            break
    end_trim = len(audio)
    for i in range(len(audio), 0, -chunk_size):
        if audio[i - chunk_size:i].dBFS > silence_thresh:
            end_trim = min(len(audio), i + chunk_size)
            break
    trimmed = audio[start_trim:end_trim]
    return audio if len(trimmed) < 50 else trimmed
