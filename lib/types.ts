export type Category = "birthday" | "wedding" | "custom" | "everyday";

export interface Settings {
  id: number;
  whatsapp: string;
  address: string;
  hours: string;
}

export interface Style {
  id: string;
  key: string;
  label: string;
}

export interface MenuItem {
  id: string;
  category: Category;
  style_id: string;
  name: string;
  kicker: string;
  price: string;
  available: boolean;
  image_url: string | null;
}
