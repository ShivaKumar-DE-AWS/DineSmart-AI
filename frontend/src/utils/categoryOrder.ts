// The requested flowing order, implemented via keyword matching to handle variations like "Veg Kebab" or "Chicken Spl. Curries"
export const CATEGORY_GROUPS = [
  { keywords: ["feature", "recommend"], name: "Featured" },
  { keywords: ["special", "today"], name: "Specials" },
  { keywords: ["bestseller", "best seller"], name: "Bestsellers" },
  { keywords: ["signature biryani", "special biryani", "mandi"], name: "Signature Biryani" },
  { keywords: ["family pack"], name: "Family Packs" },
  { keywords: ["soup"], name: "Soups" }, // Soups usually precede starters
  { keywords: ["starter", "appetizer", "dry item"], name: "Starters" },
  { keywords: ["kebab", "tandoori", "tikka"], name: "Kebabs & Tandoori" },
  { keywords: ["curry", "curries", "main", "gravy", "masala", "seafood"], name: "Main Course" },
  { keywords: ["biryani", "rice", "pulao"], name: "Rice" },
  { keywords: ["chinese", "noodle", "manchuria", "fried rice"], name: "Chinese" },
  { keywords: ["bread", "naan", "roti", "kulcha", "paratha"], name: "Breads" },
  { keywords: ["beverage", "drink", "shake", "juice", "mocktail"], name: "Beverages" },
  { keywords: ["dessert", "sweet", "ice cream", "brownie"], name: "Desserts" },
  { keywords: ["kid"], name: "Kids Menu" }
];

export function sortCategories(categories: string[]): string[] {
  const getCategoryGroupIndex = (catName: string) => {
    const lowerCat = catName.toLowerCase();
    return CATEGORY_GROUPS.findIndex(group => 
      group.keywords.some(kw => lowerCat.includes(kw))
    );
  };

  return [...categories].sort((a, b) => {
    const indexA = getCategoryGroupIndex(a);
    const indexB = getCategoryGroupIndex(b);

    if (indexA !== -1 && indexB !== -1) {
      if (indexA === indexB) return a.localeCompare(b);
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    return a.localeCompare(b);
  });
}
