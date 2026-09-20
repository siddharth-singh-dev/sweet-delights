"use client";

import { useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_LABELS, CATEGORY_ORDER, CAKE_IMAGES_BUCKET } from "@/lib/constants";
import { Category, MenuItem, Style } from "@/lib/types";
import { extractStoragePath } from "@/lib/storagePath";

export default function ItemFormModal({
  supabase,
  item,
  styles,
  onClose,
  onSaved,
}: {
  supabase: SupabaseClient;
  item: MenuItem | null;
  styles: Style[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [category, setCategory] = useState<Category>(item?.category ?? "birthday");
  const [styleId, setStyleId] = useState(item?.style_id ?? styles[0]?.id ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [kicker, setKicker] = useState(item?.kicker ?? "");
  const [price, setPrice] = useState(item?.price ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError("");
    if (!name.trim() || !price.trim()) {
      setError("Please fill in at least the name and price.");
      return;
    }
    if (!styleId) {
      setError("Please add a design style first.");
      return;
    }
    setSaving(true);

    let finalImageUrl: string | null = removeImage ? null : imageUrl;
    const oldPath = extractStoragePath(item?.image_url);

    try {
      if (file) {
        const path = `${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from(CAKE_IMAGES_BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from(CAKE_IMAGES_BUCKET)
          .getPublicUrl(path);
        finalImageUrl = publicUrlData.publicUrl;

        // Clean up the previous photo now that the new one is uploaded.
        if (oldPath) {
          await supabase.storage.from(CAKE_IMAGES_BUCKET).remove([oldPath]);
        }
      } else if (removeImage && oldPath) {
        await supabase.storage.from(CAKE_IMAGES_BUCKET).remove([oldPath]);
      }

      const payload = {
        category,
        style_id: styleId,
        name: name.trim(),
        kicker: kicker.trim(),
        price: price.trim(),
        image_url: finalImageUrl,
      };

      if (isEdit) {
        const { error: updateError } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", item!.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("menu_items")
          .insert({ ...payload, available: true });
        if (insertError) throw insertError;
      }

      onSaved();
      onClose();
    } catch (e) {
      setError("Could not save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h3>{isEdit ? "Edit Item" : "Add New Item"}</h3>

        <label style={{ marginBottom: 12 }}>
          Occasion
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label style={{ marginBottom: 12 }}>
          Design Style
          <select value={styleId} onChange={(e) => setStyleId(e.target.value)}>
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ marginBottom: 12 }}>
          Cake Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Butterscotch Crunch"
          />
        </label>

        <label style={{ marginBottom: 12 }}>
          Serving size / tag
          <input
            type="text"
            value={kicker}
            onChange={(e) => setKicker(e.target.value)}
            placeholder="e.g. Serves 8–10"
          />
        </label>

        <label style={{ marginBottom: 12 }}>
          Price
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. From ₹1,200"
          />
        </label>

        <label style={{ marginBottom: 6 }}>
          Cake Photo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {imageUrl && !removeImage && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" }}
            />
            <button
              type="button"
              className="btn btn-outline small"
              onClick={() => setRemoveImage(true)}
            >
              Remove Photo
            </button>
          </div>
        )}

        {error && <p className="save-msg error">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-outline small" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary small" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
