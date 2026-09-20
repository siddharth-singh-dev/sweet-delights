"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/constants";
import { Category, MenuItem, Settings, Style } from "@/lib/types";
import {
  ArrowIcon,
  BrandIcon,
  CakePlaceholderIcon,
  ChevronIcon,
  HeroCakeIllustration,
  WhatsAppIcon,
} from "./icons";

export default function PublicSite() {
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [styles, setStyles] = useState<Style[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Category>("birthday");
  const [openStyles, setOpenStyles] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const [settingsRes, stylesRes, itemsRes] = await Promise.all([
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("styles").select("*").order("created_at", { ascending: true }),
        supabase.from("menu_items").select("*").order("created_at", { ascending: true }),
      ]);

      if (!isMounted) return;
      if (settingsRes.data) setSettings(settingsRes.data as Settings);
      if (stylesRes.data) setStyles(stylesRes.data as Style[]);
      if (itemsRes.data) setItems(itemsRes.data as MenuItem[]);
      setLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  function styleLabel(styleId: string) {
    return styles.find((s) => s.id === styleId)?.label ?? "Design";
  }

  function orderOnWhatsApp(text: string) {
    if (!settings?.whatsapp) return;
    const message = `Hi Sweet Delights! I'd like to order: ${text}.`;
    window.open(
      `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }

  function toggleStyle(styleId: string) {
    setOpenStyles((prev) => {
      const next = new Set(prev);
      if (next.has(styleId)) next.delete(styleId);
      else next.add(styleId);
      return next;
    });
  }

  const itemsForActiveTab = items.filter((i) => i.category === activeTab);
  const stylesPresent = styles.filter((s) =>
    itemsForActiveTab.some((i) => i.style_id === s.id)
  );

  return (
    <>
      <header id="site-header">
        <div className="nav">
          <a href="#top" className="brand">
            <BrandIcon />
            <span className="brand-name">Sweet Delights</span>
          </a>
          <ul className="nav-links">
            <li>
              <a href="#menu">Menu</a>
            </li>
            <li>
              <a href="#how">How to Order</a>
            </li>
          </ul>
          <button className="wa-btn" onClick={() => orderOnWhatsApp("a custom cake")}>
            <WhatsAppIcon />
            Order
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-grid">
            <div>
              <h1>Home-baked cakes, made for you</h1>
              <p>Choose your occasion, pick a design, and order directly on WhatsApp.</p>
              <div className="hero-ctas">
                <a href="#menu" className="btn btn-outline">
                  See the Menu
                </a>
                <button
                  className="wa-btn"
                  style={{ padding: "12px 22px", fontSize: "14.5px" }}
                  onClick={() => orderOnWhatsApp("a custom cake")}
                >
                  <WhatsAppIcon />
                  Order on WhatsApp
                </button>
              </div>
            </div>
            <div className="hero-art">
              <HeroCakeIllustration />
            </div>
          </div>
        </section>

        <section className="about">
          <div className="about-inner">
            <h2>Baked by hand, at home</h2>
            <p>Every cake is mixed and finished fresh, to order — no shortcuts, nothing pre-made.</p>
          </div>
        </section>

        <section className="how" id="how">
          <h2>How ordering works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Choose the occasion</h3>
              <p>Birthday, wedding, or something else.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Pick a design &amp; cake</h3>
              <p>Open a design style to see cakes and prices.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>Order on WhatsApp</h3>
              <p>Tap a cake — it opens WhatsApp, ready to send.</p>
            </div>
          </div>
        </section>

        <section className="menu" id="menu">
          <h2>The Menu</h2>
          <p className="sub">Choose an occasion, then a design, to see cakes and prices.</p>

          <div className="tabs">
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                className={`tab-btn${activeTab === cat ? " active" : ""}`}
                onClick={() => setActiveTab(cat)}
              >
                {CATEGORY_LABELS[cat].replace(" Cakes", "").replace(" & Cupcakes", "")}
              </button>
            ))}
          </div>

          <div className="menu-grid">
            {loading ? (
              <p className="loading-note">Loading menu…</p>
            ) : itemsForActiveTab.length === 0 ? (
              <p className="empty-note">Nothing listed here yet — ask us on WhatsApp.</p>
            ) : (
              stylesPresent.map((style) => {
                const styleItems = itemsForActiveTab.filter((i) => i.style_id === style.id);
                const isOpen = openStyles.has(style.id);
                return (
                  <div key={style.id} className={`style-block${isOpen ? " open" : ""}`}>
                    <button className="style-toggle" type="button" onClick={() => toggleStyle(style.id)}>
                      <span>{style.label}</span>
                      <ChevronIcon />
                    </button>
                    <div className="style-panel">
                      {styleItems.map((item) => (
                        <div
                          key={item.id}
                          className={`item-row${item.available ? "" : " unavailable"}`}
                          onClick={
                            item.available
                              ? () =>
                                  orderOnWhatsApp(
                                    `${item.name} — ${styleLabel(item.style_id)} design (${CATEGORY_LABELS[item.category]})`
                                  )
                              : undefined
                          }
                        >
                          <div className="item-left">
                            <div className="item-thumb">
                              {item.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.image_url} alt={item.name} loading="lazy" />
                              ) : (
                                <CakePlaceholderIcon />
                              )}
                            </div>
                            <div className="item-info">
                              <span className="item-name">{item.name}</span>
                              <span className="item-kicker">{item.kicker}</span>
                            </div>
                          </div>
                          <div className="item-right">
                            {item.available ? (
                              <>
                                <span className="item-price">{item.price}</span>
                                <ArrowIcon />
                              </>
                            ) : (
                              <span className="item-price">Unavailable</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="final-cta" id="contact">
          <h2>Ready to order?</h2>
          <p>Message us on WhatsApp and we&apos;ll take it from there.</p>
          <button className="wa-btn" onClick={() => orderOnWhatsApp("a custom cake")}>
            <WhatsAppIcon />
            Order on WhatsApp
          </button>
        </section>
      </main>

      <footer>
        <span className="brand-name">Sweet Delights</span>
        <p>{settings?.address ?? ""}</p>
        <p>{settings?.hours ?? ""}</p>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Sweet Delights</span>
          <Link href="/admin" className="manage-link">
            Manage Site
          </Link>
        </div>
      </footer>

      <button
        className="float-wa"
        aria-label="Order on WhatsApp"
        onClick={() => orderOnWhatsApp("a custom cake")}
      >
        <WhatsAppIcon />
      </button>
    </>
  );
}
