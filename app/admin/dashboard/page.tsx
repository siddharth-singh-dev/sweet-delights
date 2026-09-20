"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { CATEGORY_LABELS, CATEGORY_ORDER, CAKE_IMAGES_BUCKET } from "@/lib/constants";
import { extractStoragePath } from "@/lib/storagePath";
import { Category, MenuItem, Settings, Style } from "@/lib/types";
import ItemFormModal from "@/components/admin/ItemFormModal";
import AddStyleModal from "@/components/admin/AddStyleModal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { CakePlaceholderIcon } from "@/components/icons";

type ModalState =
  | { type: "add-style" }
  | { type: "delete-style-blocked"; style: Style }
  | { type: "delete-style-confirm"; style: Style }
  | { type: "item-form"; item: MenuItem | null }
  | { type: "delete-item-confirm"; item: MenuItem }
  | null;

export default function AdminDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [styles, setStyles] = useState<Style[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<Category>("birthday");
  const [modal, setModal] = useState<ModalState>(null);

  const [waInput, setWaInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [hoursInput, setHoursInput] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsMsgIsError, setSettingsMsgIsError] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const refetch = useCallback(async () => {
    const [settingsRes, stylesRes, itemsRes] = await Promise.all([
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("styles").select("*").order("created_at", { ascending: true }),
      supabase.from("menu_items").select("*").order("created_at", { ascending: true }),
    ]);
    if (settingsRes.data) {
      const s = settingsRes.data as Settings;
      setSettings(s);
      setWaInput(s.whatsapp);
      setAddressInput(s.address);
      setHoursInput(s.hours);
    }
    if (stylesRes.data) setStyles(stylesRes.data as Style[]);
    if (itemsRes.data) setItems(itemsRes.data as MenuItem[]);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/admin");
        return;
      }
      setCheckingAuth(false);
      refetch();
    });
  }, [supabase, router, refetch]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin");
  }

  async function saveSettings() {
    setSettingsMsg("");
    if (!/^\d{8,15}$/.test(waInput.trim())) {
      setSettingsMsgIsError(true);
      setSettingsMsg("WhatsApp number should be digits only, with country code.");
      return;
    }
    setSavingSettings(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ id: 1, whatsapp: waInput.trim(), address: addressInput.trim(), hours: hoursInput.trim() });
    setSavingSettings(false);
    if (error) {
      setSettingsMsgIsError(true);
      setSettingsMsg("Could not save — try again.");
      return;
    }
    setSettingsMsgIsError(false);
    setSettingsMsg("Saved.");
    refetch();
  }

  async function handleDeleteStyle(style: Style) {
    const { error } = await supabase.from("styles").delete().eq("id", style.id);
    if (error) {
      // Postgres foreign-key violation because a menu item still references this style.
      setModal({ type: "delete-style-blocked", style });
      return;
    }
    setModal(null);
    refetch();
  }

  async function handleToggleAvailable(item: MenuItem) {
    await supabase.from("menu_items").update({ available: !item.available }).eq("id", item.id);
    refetch();
  }

  async function handleDeleteItem(item: MenuItem) {
    await supabase.from("menu_items").delete().eq("id", item.id);
    const oldPath = extractStoragePath(item.image_url);
    if (oldPath) {
      await supabase.storage.from(CAKE_IMAGES_BUCKET).remove([oldPath]);
    }
    setModal(null);
    refetch();
  }

  function styleLabel(styleId: string) {
    return styles.find((s) => s.id === styleId)?.label ?? "—";
  }

  if (checkingAuth) {
    return (
      <div className="admin-page">
        <p className="loading-note">Checking your session…</p>
      </div>
    );
  }

  const itemsForTab = items.filter((i) => i.category === activeTab);

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <span className="brand-name" style={{ color: "var(--plum-dark)" }}>
          Manage Sweet Delights
        </span>
        <button className="btn btn-outline small" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      <div className="admin-body">
        {/* Contact & Hours */}
        <div className="admin-section">
          <h3>Contact &amp; Hours</h3>
          <div className="admin-form-grid">
            <label>
              WhatsApp Number
              <span className="hint">Country code + number, no + or spaces</span>
              <input type="text" value={waInput} onChange={(e) => setWaInput(e.target.value)} />
            </label>
            <label>
              Address / Area
              <input type="text" value={addressInput} onChange={(e) => setAddressInput(e.target.value)} />
            </label>
          </div>
          <label style={{ marginBottom: 14 }}>
            Hours text
            <input type="text" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)} />
          </label>
          <button className="btn btn-primary small" onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? "Saving…" : "Save"}
          </button>
          <p className={`save-msg${settingsMsgIsError ? " error" : ""}`}>{settingsMsg}</p>
        </div>

        {/* Design Styles */}
        <div className="admin-section">
          <div className="admin-section-head">
            <h3>Design Styles</h3>
            <button className="btn btn-primary small" onClick={() => setModal({ type: "add-style" })}>
              + Add Style
            </button>
          </div>
          {styles.length === 0 ? (
            <p className="empty-note" style={{ padding: "16px 0" }}>
              No styles yet. Tap &quot;+ Add Style&quot;.
            </p>
          ) : (
            styles.map((s) => (
              <div className="admin-item-row" key={s.id}>
                <div className="row-main">
                  <strong>{s.label}</strong>
                </div>
                <div className="row-actions">
                  <button
                    className="danger"
                    onClick={() => setModal({ type: "delete-style-confirm", style: s })}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Menu Items */}
        <div className="admin-section">
          <div className="admin-section-head">
            <h3>Menu Items</h3>
            <button className="btn btn-primary small" onClick={() => setModal({ type: "item-form", item: null })}>
              + Add Item
            </button>
          </div>
          <div className="tabs" style={{ marginBottom: 16, justifyContent: "flex-start" }}>
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                className={`tab-btn${activeTab === cat ? " active" : ""}`}
                onClick={() => setActiveTab(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          {itemsForTab.length === 0 ? (
            <p className="empty-note" style={{ padding: "16px 0" }}>
              No items yet. Tap &quot;+ Add Item&quot;.
            </p>
          ) : (
            itemsForTab.map((item) => (
              <div className={`admin-item-row${item.available ? "" : " row-unavailable"}`} key={item.id}>
                <div className="row-main" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="item-thumb" style={{ width: 44, height: 44 }}>
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} />
                    ) : (
                      <CakePlaceholderIcon />
                    )}
                  </div>
                  <div>
                    <strong>{item.name}</strong>
                    <span className="row-price">{item.price}</span>
                    <div className="row-sub">
                      {item.kicker} · {styleLabel(item.style_id)} · {item.available ? "Available" : "Unavailable"}
                    </div>
                  </div>
                </div>
                <div className="row-actions">
                  <button onClick={() => handleToggleAvailable(item)}>
                    {item.available ? "Mark Unavailable" : "Mark Available"}
                  </button>
                  <button onClick={() => setModal({ type: "item-form", item })}>Edit</button>
                  <button className="danger" onClick={() => setModal({ type: "delete-item-confirm", item })}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modal?.type === "add-style" && (
        <AddStyleModal
          supabase={supabase}
          existingStyles={styles}
          onClose={() => setModal(null)}
          onSaved={refetch}
        />
      )}

      {modal?.type === "delete-style-blocked" && (
        <ConfirmModal
          title="Can't delete this style"
          body={`Some cakes still use "${modal.style.label}". Edit or delete those items first, then remove the style.`}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "delete-style-confirm" && (
        <ConfirmModal
          title={`Delete "${modal.style.label}"?`}
          body="This can't be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDeleteStyle(modal.style)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "item-form" && (
        <ItemFormModal
          supabase={supabase}
          item={modal.item}
          styles={styles}
          onClose={() => setModal(null)}
          onSaved={refetch}
        />
      )}

      {modal?.type === "delete-item-confirm" && (
        <ConfirmModal
          title="Delete this item?"
          body={`"${modal.item.name}" will be removed for everyone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDeleteItem(modal.item)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
