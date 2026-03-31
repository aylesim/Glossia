import { STUDIO_PRESETS } from "@/lib/domain-presets";
import { FIELD_CLASS } from "../styles";

type PresetSectionProps = {
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
};

export default function PresetSection({ selectedPresetId, onSelectPreset }: PresetSectionProps) {
  return (
    <section className="border border-[var(--border-strong)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Workflow preset</p>
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
            Each preset loads a domain, a starter compose prompt, generation mode, and—where available—a sample graph
            so you can review all steps at once. All of that is local; no API key until you ask the model for something
            new.
          </p>
        </div>
        <div className="flex min-w-0 shrink-0 flex-col gap-1 sm:w-72">
          <label htmlFor="studio-preset" className="font-mono text-xs text-[var(--fg-muted)]">
            Preset
          </label>
          <select
            id="studio-preset"
            value={selectedPresetId}
            onChange={(event) => onSelectPreset(event.target.value)}
            className={`${FIELD_CLASS} py-2.5 font-mono text-xs`}
          >
            {STUDIO_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
