import { Category } from "./types";

export const CATEGORY_LABELS: Record<Category, string> = {
  birthday: "Birthday Cakes",
  wedding: "Wedding Cakes",
  custom: "Custom & Theme",
  everyday: "Everyday & Cupcakes",
};

export const CATEGORY_ORDER: Category[] = [
  "birthday",
  "wedding",
  "custom",
  "everyday",
];

export const CAKE_IMAGES_BUCKET = "cake-images";
