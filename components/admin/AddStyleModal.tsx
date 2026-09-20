"use client";

import { useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/storagePath";
import { Style } from "@/lib/types";

export default function AddStyleModal({
  supabase,
  existingStyles,
  onClose,
  onSaved,
}: {
  supabase: SupabaseClient;
  existingStyles: Style[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }
    setSaving(true);
    setError("");

    let baseKey = slugify(trimmed);
    let key = baseKey;
    let n = 2;
    while (existingStyles.some((s) => s.key === key)) {
      key = `${baseKey}-${n}`;
      n++;
    }

    const { error: insertError } = await supabase.from("styles").insert({ key, label: trimmed });
    setSaving(false);
    if (insertError) {
      setError("Could not save — please try again.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h3>Add Design Style</h3>
        <label style={{ marginBottom: 6 }}>
          Style Name
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Ombre Watercolor"
            autoFocus
          />
        </label>
        {error && <p className="save-msg error">{error}</p>}
        <div className="modal-actions">
          <button className="btn btn-outline small" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary small" onClick={handleSave} disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
