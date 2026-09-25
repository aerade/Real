export type SearchCompletionSound = "off" | "chime" | "double" | "soft";
export type AudibleSearchCompletionSound = Exclude<SearchCompletionSound, "off">;

export function readSearchCompletionSound(): SearchCompletionSound {
  try {
    const raw = window.localStorage.getItem("real:settings") ?? window.localStorage.getItem("lead-scout:settings");
    const settings = raw ? JSON.parse(raw) as { notificationSound?: unknown; searchCompletionSound?: unknown } : {};
    if (settings.notificationSound === false) return "off";
    if (settings.searchCompletionSound === "off" || settings.searchCompletionSound === "double" || settings.searchCompletionSound === "soft") {
      return settings.searchCompletionSound;
    }
    return "chime";
  } catch {
    return "chime";
  }
}

export function resumeSearchCompletionAudio(current: AudioContext | null): AudioContext | null {
  try {
    if (typeof window === "undefined" || typeof window.AudioContext !== "function") return current;
    const context = current ?? new window.AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => undefined);
    return context;
  } catch {
    return current;
  }
}

export function playSearchCompletionSound(context: AudioContext, sound: AudibleSearchCompletionSound): void {
  const notes = sound === "chime"
    ? [{ frequency: 659, offset: 0 }, { frequency: 784, offset: 0.12 }, { frequency: 988, offset: 0.24 }]
    : sound === "double"
      ? [{ frequency: 784, offset: 0 }, { frequency: 784, offset: 0.22 }]
      : [{ frequency: 587, offset: 0 }, { frequency: 740, offset: 0.18 }];
  const duration = sound === "soft" ? 0.23 : 0.16;
  const startAt = context.currentTime + 0.02;

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + note.offset;
    const noteEnd = noteStart + duration;
    oscillator.type = sound === "soft" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(note.frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(sound === "soft" ? 0.035 : 0.045, noteStart + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.01);
  }
}