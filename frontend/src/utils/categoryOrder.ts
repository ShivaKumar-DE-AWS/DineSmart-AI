export const CATEGORY_ORDER = [
  "Featured",
  "Recommended",
  "Featured / Recommended",
  "Today's Specials",
  "Today's Special",
  "Specials",
  "Bestseller Items",
  "Bestsellers",
  "Signature Biryani",
  "Family Packs",
  "Starters",
  "Kebabs & Tandoori",
  "Kebabs",
  "Tandoori",
  "Main Course",
  "Chicken Curries",
  "Mutton Curries",
  "Seafood",
  "Veg Curries",
  "Rice",
  "Biryani",
  "Fried Rice",
  "Jeera Rice",
  "Chinese",
  "Noodles",
  "Manchuria",
  "Breads",
  "Naan",
  "Roti",
  "Kulcha",
  "Paratha",
  "Beverages",
  "Drinks",
  "Desserts",
  "Kids Menu",
  "Kids Menu (Optional)"
];

export function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.findIndex(
      (cat) => a.toLowerCase().includes(cat.toLowerCase())
    );
    const indexB = CATEGORY_ORDER.findIndex(
      (cat) => b.toLowerCase().includes(cat.toLowerCase())
    );

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
}
