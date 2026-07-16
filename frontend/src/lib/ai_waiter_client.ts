/**
 * AI Waiter Client — Event-Driven, Non-Blocking UI Layer
 *
 * Architecture:
 *   - sendAIWaiterEvent()    → fire-and-forget async call to POST /api/ai-waiter/event
 *   - showAIToast()          → Top Toast (ITEM_ADDED compliment, auto-dismiss 3 s)
 *   - showAIUpsellSheet()    → Bottom Sheet modal (CHECKOUT upsell, requires user action)
 *   - showAIWelcomeModal()   → Welcome center modal or floating bubble (QR_SCAN)
 *   - All UI functions inject/re-use a single set of DOM elements to avoid duplicates.
 *
 * Usage (auto-wired on menu page load and cart events):
 *   import { sendAIWaiterEvent } from "@/lib/ai_waiter_client";
 *
 *   // On QR scan / page load
 *   sendAIWaiterEvent({ event_type: "QR_SCAN", restaurant_id: "mehfil" });
 *
 *   // On add to cart
 *   sendAIWaiterEvent({
 *     event_type: "ITEM_ADDED",
 *     restaurant_id: "mehfil",
 *     cart_state: cartItems,
 *     added_item: { item_id: "abc", name: "Chicken Lollipops", price: 280, qty: 1, category: "Starters" },
 *   });
 *
 *   // On proceed to pay
 *   const onCheckout = await sendAIWaiterEvent({
 *     event_type: "CHECKOUT",
 *     restaurant_id: "mehfil",
 *     cart_state: cartItems,
 *   });
 *   // Returns: { dialogue_text, action_type, suggested_items } or null on error
 */

import { api } from "@/lib/api";
import { toast } from "sonner";
import { useCart } from "@/stores/cart";
import { useTable } from "@/stores/table";
import { getOrCreateAnonID } from "@/lib/notify";
import { useMenuStore } from "@/stores/menu";
import { useAIWaiterStore } from "@/stores/ai_waiter";

// ── Course Progression & Meal Balance Helper ───────────────────────────────
export function getMealBalanceStatus(cartItems: { category?: string; name: string }[]): {
  statusText: string;
  badgeText: string;
  missingCategory: string | null;
  suggestedAction: string;
} {
  const cats = cartItems.map(i => `${i.category || ""} ${i.name}`.toLowerCase());
  const hasStarter = cats.some(c => /starter|kebab|appetizer|snack|tikka|roll|soup/i.test(c));
  const hasMain = cats.some(c => /main|biryani|curry|thali|rice|dal|masala|paneer|chicken|mutton|fish/i.test(c));
  const hasDrink = cats.some(c => /drink|beverage|lassi|shake|mocktail|soda|water|tea|coffee/i.test(c));
  const hasBread = cats.some(c => /bread|naan|roti|paratha|kulcha/i.test(c));
  const hasDessert = cats.some(c => /dessert|sweet|ice cream|gulab|rasmalai|kheer|halwa/i.test(c));

  if (!hasStarter && !hasMain) {
    return {
      badgeText: "🤖 AI Waiter Course Guidance",
      statusText: "You are just getting started! We recommend beginning with a sizzling Tandoori Kebab or signature Starter.",
      missingCategory: "Starters",
      suggestedAction: "Browse Starters",
    };
  }
  if (hasStarter && !hasMain) {
    return {
      badgeText: "✨ Course 2 Recommendation",
      statusText: "Appetizers selected! Ready for the main event? Our signature Biryanis & rich Curries are waiting.",
      missingCategory: "Main Course",
      suggestedAction: "Add Main Course",
    };
  }
  if (hasMain && !hasDrink && !hasBread) {
    return {
      badgeText: "🍽️ Meal Balance Tip",
      statusText: "Main course added! Enhance your feast with fresh Butter Naan or a refreshing cooling Lassi.",
      missingCategory: "Breads & Beverages",
      suggestedAction: "Complete the Meal",
    };
  }
  if (hasMain && !hasDessert) {
    return {
      badgeText: "👑 Grand Finale Tip",
      statusText: "Your feast looks incredible! Don't forget to crown your royal meal with a signature royal Dessert.",
      missingCategory: "Desserts",
      suggestedAction: "Add Dessert",
    };
  }
  return {
    badgeText: "🌟 Royal 5-Star Feast",
    statusText: "Perfection! Your thali is beautifully balanced across courses for a truly memorable dining experience.",
    missingCategory: null,
    suggestedAction: "Proceed to Order",
  };
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface AIWaiterCartItem {
  item_id: string;
  name: string;
  price: number;
  qty: number;
  category?: string;
}

export interface AIWaiterEventPayload {
  event_type: "QR_SCAN" | "ITEM_ADDED" | "CHECKOUT" | "QUICK_REPLY_CLICKED";
  event_data?: string;
  restaurant_id: string;
  cart_state?: AIWaiterCartItem[];
  added_item?: AIWaiterCartItem;
  user_language?: string;
  silent?: boolean;
}

export interface AISuggestedItem {
  item_id: string;
  name: string;
  price: number;
  reason: string;
}

export interface AIWaiterEventResponse {
  dialogue_text: string;
  action_type: "WELCOME" | "ITEM_VALIDATION" | "UPSELL_OFFER";
  suggested_items: AISuggestedItem[];
  quick_replies?: string[];
  next_state?: Record<string, any>;
}

// ── Device Locale Detection ────────────────────────────────────────────────
/**
 * Detect the browser / device locale and format it for Gemini localization.
 * Examples: "Telugu (te-IN)", "Hindi (hi-IN)", "Spanish (es-ES)", "English (en-US)"
 */
function getDeviceLanguage(): string {
  if (typeof navigator === "undefined" || !navigator.language) {
    return "English (en-US)";
  }
  const code = navigator.language;
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
    const name = displayNames.of(code) || "English";
    return `${name} (${code})`;
  } catch {
    return code;
  }
}

// ── Smart Frontend Debouncing (Strategy 2) ─────────────────────────────────
let _itemAddedDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingItemAddedResolve: ((val: AIWaiterEventResponse | null) => void) | null = null;

// ── Core API Call ──────────────────────────────────────────────────────────

/**
 * Fire-and-display: sends the event to the backend and automatically
 * triggers the correct UI component based on action_type.
 *
 * The call is intentionally non-blocking — any error is swallowed silently
 * so the ordering flow is NEVER interrupted by an AI service failure.
 *
 * @param payload         - The event payload to send
 * @param addToCartFn     - Optional callback for CHECKOUT upsell "Add+" button
 * @param proceedPayFn    - Optional callback for CHECKOUT "Proceed to Pay" button
 * @returns               - The parsed AIWaiterEventResponse, or null on error
 */
export async function sendAIWaiterEvent(
  payload: AIWaiterEventPayload,
  addToCartFn?: (item: AISuggestedItem) => void,
  proceedPayFn?: () => void
): Promise<AIWaiterEventResponse | null> {
  try {
    // 2. Optimistic Instant UI for QR_SCAN Welcome (Time-of-Day + Table Size Sharing Recognition)
    if (payload.event_type === "QR_SCAN") {
      const tableSession = useTable.getState().session;
      const sessionKey = "sd_ai_welcomed_" + (tableSession?.id || payload.restaurant_id);
      if (typeof window !== "undefined" && window.sessionStorage) {
        const lastWelcomed = sessionStorage.getItem(sessionKey);
        if (lastWelcomed && (Date.now() - parseInt(lastWelcomed, 10)) < 3000) {
          return null;
        }
        sessionStorage.setItem(sessionKey, Date.now().toString());
      }

      const hour = new Date().getHours();
      let timeGreeting = "👨‍🍳 Welcome to our royal dining hall!";
      if (hour >= 5 && hour < 11) {
        timeGreeting = "🌅 Good morning! Start your day with our freshly prepared breakfast specials and aromatic hot beverages.";
      } else if (hour >= 11 && hour < 16) {
        timeGreeting = "☀️ Good afternoon! Perfect time for a fulfilling lunch feast or our signature Royal Thali & Biryanis.";
      } else if (hour >= 16 && hour < 19) {
        timeGreeting = "🌤️ Pleasant evening! Relax with our crispy evening snacks, tandoori kebabs, and refreshing beverages.";
      } else {
        timeGreeting = "🌙 Good evening! Unwind tonight with our signature royal dinner spread, slow-cooked curries, and fragrant biryanis.";
      }

      if (tableSession && tableSession.table_number) {
        timeGreeting = `🤖 Welcome to Table ${tableSession.table_number}! ${timeGreeting} 👥 Table Dining Tip: Explore our Sharing Platters and Family Combos crafted specially for table groups!`;
      } else {
        const day = new Date().getDay();
        if (day === 0 || day === 6) {
          timeGreeting += " ✨ Weekend Chef Special: Check out our Sharing Platters crafted for weekend feasts!";
        }
      }

      showAIWelcomeModal(timeGreeting, 20000);
    }

    // 2. Optimistic Instant UI for ITEM_ADDED — Deep Dish-Aware Pairing Intelligence
    if (payload.event_type === "ITEM_ADDED" && payload.added_item) {
      const item = payload.added_item;
      const cat  = (item.category || "").toLowerCase();
      const nm   = item.name.toLowerCase();

      let instantMsg = `✨ Excellent choice! ${item.name} is a wonderful addition to your feast.`;
      let suggestedAction: { label: string; onClick: () => void } | undefined;

      const menuStore = useMenuStore.getState();
      const currentCart = useCart.getState().items || [];
      /** Pick the best match from the live menu, allowing items already in cart */
      const getRec = (keywords: string[]) => {
        const recs = menuStore.getRecommendations(keywords, 8);
        // Exclude the exact item just added to avoid immediate redundancy, but allow other items in cart
        return recs.find(r => r.id !== item.item_id) || recs[0];
      };

      // ─── PAIRING RULES (most-specific first) ────────────────────────────

      // ── 1. BIRYANI → pair with raita / salan / starter if no starter yet ──
      const isBiryani = /biryani|biriyani|dum rice|pulao|pulav/.test(nm + " " + cat);
      // ── 2. SOUTH INDIAN TIFFIN ──
      const isIdli    = /idli|idly/.test(nm);
      const isDosa    = /dosa|dosai/.test(nm);
      const isVada    = /vada|medu|vadai/.test(nm);
      const isUpma    = /upma|rava|semolina/.test(nm);
      const isPongal  = /pongal/.test(nm);
      const isUttapam = /uttapam|uthappam/.test(nm);
      const isSouthIndian = isIdli || isDosa || isVada || isUpma || isPongal || isUttapam
                          || /south|sambar|chutney|appam|puttu|pesarattu/.test(nm + " " + cat);
      // ── 3. NORTH INDIAN BREADS ──
      const isNaan    = /naan|nan/.test(nm);
      const isRoti    = /roti|chapati|chapathi|phulka/.test(nm);
      const isParatha = /paratha|parantha/.test(nm);
      const isBread   = isNaan || isRoti || isParatha || /kulcha|puri|bhatura/.test(nm) || cat.includes("bread");
      // ── 4. CURRIES / GRAVIES ──
      const isCurry   = /curry|masala|gravy|korma|butter chicken|dal makhani|paneer|palak|kadai|rogan|chettinad|vindaloo|kofta/.test(nm + " " + cat)
                      || cat.includes("main") || cat.includes("curry") || cat.includes("gravie");
      // ── 5. STARTERS / KEBABS ──
      const isStarter = cat.includes("starter") || cat.includes("kebab") || cat.includes("appetizer")
                      || cat.includes("snack") || /tikka|kebab|lollipop|wings|nugget|roll|chaat|pani puri|bhel|seekh|galouti|reshmi|boti|chop/.test(nm);
      // ── 6. CHINESE / INDO-CHINESE ──
      const isChinese = /chinese|manchurian|noodle|fried rice|chowmein|chow mein|schezwan|hakka|wonton|dim sum|spring roll|momos|dumpling|indo.?chinese/.test(nm + " " + cat);
      // ── 7. FAST FOOD / WESTERN ──
      const isBurger  = /burger|sandwich|wrap|sub|pita/.test(nm);
      const isPizza   = /pizza|pasta/.test(nm);
      const isFastFood= isBurger || isPizza || /fries|loaded|waffle|hot dog|taco|quesadilla/.test(nm);
      // ── 8. DESSERTS ──
      const isDessert = cat.includes("dessert") || cat.includes("sweet")
                      || /gulab|rasmalai|halwa|kheer|ice cream|kulfi|brownie|cake|pastry|ladoo|barfi|jalebi|rasgulla|peda|malpua/.test(nm);
      // ── 9. BEVERAGES ──
      const isBeverage= cat.includes("beverage") || cat.includes("drink")
                      || /lassi|chai|tea|coffee|juice|mocktail|soda|shake|smoothie|nimbu|sherbet|cooler/.test(nm);
      // ── 10. RICE / THALI ──
      const isRice    = /plain rice|steamed rice|jeera rice|ghee rice|curd rice|lemon rice|coconut rice/.test(nm) || cat.includes("rice");
      const isThali   = /thali|combo|platter|meal|set/.test(nm + " " + cat);

      // ─── APPLY PAIRING RULES (most-specific wins) ───────────────────────

      if (isBiryani) {
        // If no starter in cart yet → suggest a starter
        const hasStarter = currentCart.some(ci => /starter|kebab|appetizer|tikka|snack/.test((ci.category||"").toLowerCase() + " " + ci.name.toLowerCase()));
        if (!hasStarter) {
          const rec = getRec(["starter", "kebab", "tikka", "appetizer", "snack", "tandoori", "chop"]);
          if (rec) {
            instantMsg = `🍗 A wonderful Biryani pick! AI Waiter suggests starting with a sizzling ${rec.name} as a perfect appetizer before your Biryani feast!`;
            suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
          } else {
            // fallback → suggest raita/salan
            const recR = getRec(["raita", "salan", "mirchi", "salad", "papad", "pickle"]);
            if (recR) {
              instantMsg = `🍛 Excellent Biryani choice! AI Waiter recommends pairing it with ${recR.name} to bring out the rich aromatic flavors!`;
              suggestedAction = { label: `+ Add ${recR.name} (₹${recR.price})`, onClick: () => useCart.getState().add(recR, 1) };
            } else {
              instantMsg = `🍛 Excellent Biryani choice! Pair it with a creamy Raita or Mirchi Salan for an authentic royal feast experience!`;
            }
          }
        } else {
          // Starter already in cart → suggest raita or beverage
          const rec = getRec(["raita", "salan", "mirchi", "salad", "lassi", "chaas", "drink"]);
          if (rec) {
            instantMsg = `🍛 Perfect Biryani! AI Waiter suggests adding ${rec.name} to cool down and complement all those amazing aromatic spices!`;
            suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
          } else {
            instantMsg = `🍛 Royal Biryani! Your starter + Biryani combination is a classic feast. Don't forget a cooling Raita or Lassi!`;
          }
        }

      } else if (isIdli) {
        // Idli → suggest dosa (classic combo) or vada + sambar
        const rec = getRec(["dosa", "dosai", "vada", "vadai", "medu", "uttapam"]);
        if (rec) {
          instantMsg = `🌅 Classic South Indian! AI Waiter suggests adding ${rec.name} — the Idli + ${rec.name} combo is a timeless South Indian breakfast pairing loved by all!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🌅 Fresh soft Idli — a South Indian classic! Pair it with fresh Sambar and a variety of Chutneys for an authentic breakfast experience.`;
        }

      } else if (isDosa) {
        // Dosa → suggest idli or vada or filter coffee
        const rec = getRec(["idli", "vada", "vadai", "coffee", "chai", "filter coffee"]);
        if (rec) {
          instantMsg = `🥞 Crispy golden Dosa — a South Indian legend! AI Waiter suggests adding ${rec.name} to complete a traditional South Indian breakfast combo!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🥞 Crispy golden Dosa! Pair it with fresh Coconut Chutney, Sambar, and a filter Coffee for the ultimate South Indian experience!`;
        }

      } else if (isVada) {
        // Vada → suggest sambar, idli, coffee
        const rec = getRec(["idli", "dosa", "dosai", "coffee", "chai", "filter", "sambar"]);
        if (rec) {
          instantMsg = `🍩 Crispy Medu Vada — a South Indian delight! AI Waiter suggests pairing it with ${rec.name} for the quintessential South Indian combination!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🍩 Crispy Medu Vada dipped in hot Sambar! Absolutely divine. Pair with Idli or a filter Coffee to complete your South Indian experience!`;
        }

      } else if (isUpma || isPongal) {
        const rec = getRec(["coffee", "chai", "vada", "vadai", "dosa", "idli", "chutney"]);
        if (rec) {
          instantMsg = `☀️ Wholesome South Indian classic! AI Waiter suggests ${rec.name} to complement your ${item.name} perfectly!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `☀️ Wholesome ${item.name}! A perfect South Indian comfort dish — best enjoyed with fresh coconut chutney and hot filter coffee!`;
        }

      } else if (isUttapam) {
        const rec = getRec(["sambar", "chutney", "coffee", "chai", "dosa", "idli"]);
        if (rec) {
          instantMsg = `🥞 Thick fluffy Uttapam! AI Waiter suggests pairing it with ${rec.name} for a complete South Indian tiffin experience!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🥞 Fluffy Uttapam loaded with fresh toppings — perfect with fresh Sambar and Chutneys!`;
        }

      } else if (isChinese) {
        // Chinese/Indo-Chinese → suggest complementary dish
        const hasFriedRice = /fried rice|egg rice|veg rice/.test(nm);
        const hasNoodles   = /noodle|chowmein|chow mein|hakka/.test(nm);
        if (hasFriedRice) {
          const rec = getRec(["manchurian", "chilli", "noodle", "hakka", "schezwan", "chowmein"]);
          if (rec) {
            instantMsg = `🍜 Excellent Indo-Chinese choice! AI Waiter suggests ${rec.name} — Fried Rice + ${rec.name} is the ultimate Indo-Chinese combo!`;
            suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
          } else {
            instantMsg = `🍜 Classic Fried Rice! Pair it with Gobi/Veg Manchurian or a Chilli dish for the perfect Indo-Chinese feast!`;
          }
        } else if (hasNoodles) {
          const rec = getRec(["fried rice", "manchurian", "chilli", "spring roll", "schezwan"]);
          if (rec) {
            instantMsg = `🍜 Slurpy noodles! AI Waiter suggests ${rec.name} alongside — the classic Noodles + Fried Rice combo is always a hit!`;
            suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
          } else {
            instantMsg = `🍜 Delicious noodles! Pair with Fried Rice and Manchurian for the ultimate Indo-Chinese trio!`;
          }
        } else {
          // Manchurian or chilli or spring roll etc.
          const rec = getRec(["fried rice", "noodle", "chowmein", "hakka"]);
          if (rec) {
            instantMsg = `🥢 Perfect Indo-Chinese snack! AI Waiter suggests ${rec.name} to create the classic Indo-Chinese combo!`;
            suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
          } else {
            instantMsg = `🥢 Excellent Chinese pick! Pair with Fried Rice or Hakka Noodles for a complete Indo-Chinese experience!`;
          }
        }

      } else if (isBurger) {
        const rec = getRec(["fries", "loaded", "wedge", "shake", "soda", "cold drink", "juice"]);
        if (rec) {
          instantMsg = `🍔 Juicy burger! AI Waiter suggests adding ${rec.name} — a classic Burger + ${rec.name} combo for the ultimate fast food experience!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🍔 Juicy burger loaded with flavors! Pair it with crispy Fries and a chilled shake for the perfect fast food combo!`;
        }

      } else if (isPizza) {
        const rec = getRec(["garlic bread", "garlic", "wings", "fries", "soda", "cold drink", "juice", "pasta"]);
        if (rec) {
          instantMsg = `🍕 Great pizza pick! AI Waiter suggests adding ${rec.name} — Garlic Bread or Pasta makes a great pizza combo!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🍕 Perfect pizza choice! Pair with Garlic Bread and a chilled drink for the complete Italian-style experience!`;
        }

      } else if (isNaan || (isBread && isNaan)) {
        // Naan → suggest curry/gravy
        const rec = getRec(["butter chicken", "paneer", "dal makhani", "curry", "gravy", "masala", "korma", "tikka masala", "palak"]);
        if (rec) {
          instantMsg = `🫓 Fresh tandoori ${item.name} straight from the clay oven! AI Waiter suggests dunking it into our rich ${rec.name} for a royal North Indian experience!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🫓 Fresh tandoori ${item.name}! Best enjoyed dipped in Dal Makhani, Butter Chicken, or any rich curry — the perfect North Indian pairing!`;
        }

      } else if (isRoti || isParatha) {
        const rec = getRec(["dal", "curry", "sabzi", "paneer", "masala", "gravy", "chicken", "mutton", "aloo"]);
        if (rec) {
          instantMsg = `🫓 Fresh ${item.name} hot off the tawa! AI Waiter suggests pairing it with ${rec.name} for a hearty, wholesome North Indian meal!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🫓 Fresh ${item.name}! Best paired with a rich Dal or your favourite Sabzi — a classic home-style Indian combination!`;
        }

      } else if (isCurry) {
        // Curry → suggest bread if no bread in cart, else suggest rice/biryani
        const hasBreadInCart = currentCart.some(ci => /naan|roti|bread|paratha|kulcha|puri/.test((ci.category||"").toLowerCase() + " " + ci.name.toLowerCase()));
        if (!hasBreadInCart) {
          const rec = getRec(["naan", "roti", "bread", "paratha", "kulcha", "rice", "biryani"]);
          if (rec) {
            instantMsg = `🍛 Rich and aromatic ${item.name}! AI Waiter suggests pairing it with ${rec.name} — a match made in culinary heaven!`;
            suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
          } else {
            instantMsg = `🍛 Rich ${item.name}! Best enjoyed with fresh Butter Naan or Jeera Rice to soak up all that gorgeous gravy!`;
          }
        } else {
          // Already has bread → suggest raita/salad/beverage to balance
          const rec = getRec(["raita", "salad", "lassi", "chaas", "drink", "papad", "pickle"]);
          if (rec) {
            instantMsg = `🍛 Perfect ${item.name} selection! AI Waiter suggests ${rec.name} to refresh your palate and balance the flavors!`;
            suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
          } else {
            instantMsg = `🍛 Excellent ${item.name}! Your bread + curry combo is perfect. A cooling Raita or Lassi would make it absolutely divine!`;
          }
        }

      } else if (isStarter) {
        // Starter → suggest main course as logical next step
        const rec = getRec(["biryani", "main course", "curry", "masala", "dal", "paneer", "chicken curry", "naan", "bread"]);
        if (rec) {
          instantMsg = `🌟 Sizzling ${item.name} to kick off your feast! AI Waiter suggests following it with ${rec.name} for a complete dining experience!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🌟 Sizzling ${item.name} to ignite your appetite! Ready for the main event? Our signature Biryanis & rich Curries are waiting to impress!`;
        }

      } else if (isRice && !isBiryani) {
        // Plain rice → suggest dal/curry/rasam/sambhar
        const rec = getRec(["dal", "sambar", "rasam", "curry", "sabzi", "chicken", "mutton", "fish curry", "egg curry", "papad"]);
        if (rec) {
          instantMsg = `🍚 Comfort rice! AI Waiter suggests pairing it with ${rec.name} — rice + ${rec.name} is pure comfort food bliss!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🍚 Comfort rice! Best enjoyed with Dal, Sambar, or a rich Curry for a balanced and satisfying meal!`;
        }

      } else if (isThali) {
        // Thali / combo → already balanced, suggest dessert
        const rec = getRec(["dessert", "sweet", "ice cream", "kulfi", "gulab", "rasmalai", "halwa", "kheer"]);
        if (rec) {
          instantMsg = `🎉 Royal Thali — a complete feast! AI Waiter suggests finishing with ${rec.name} to crown your royal dining experience!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🎉 Royal Thali selected — a perfectly balanced feast across all courses! Don't forget to end with a sweet dessert!`;
        }

      } else if (isDessert) {
        // Dessert → suggest chai/coffee as perfect ending
        const rec = getRec(["chai", "tea", "coffee", "filter coffee", "masala chai", "cardamom", "kulhad"]);
        if (rec) {
          instantMsg = `🍮 Sweet indulgence! AI Waiter suggests a warm ${rec.name} alongside — the perfect dessert + ${rec.name} ending to a royal meal!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `🍮 Delightful ${item.name}! A perfect dessert to crown your dining experience. Pair it with a warm Masala Chai or Coffee!`;
        }

      } else if (isBeverage) {
        // Beverage → suggest pairing with the right food
        const isHotDrink = /chai|tea|coffee|hot chocolate/.test(nm);
        if (isHotDrink) {
          const rec = getRec(["snack", "biscuit", "cookie", "cake", "paratha", "toast", "sandwich"]);
          if (rec) {
            instantMsg = `☕ A perfect warm brew! AI Waiter suggests ${rec.name} alongside — a classic pairing that never disappoints!`;
            suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
          } else {
            instantMsg = `☕ Perfect warm ${item.name}! Best enjoyed with a light snack or crispy toast on the side!`;
          }
        } else {
          const rec = getRec(["starter", "kebab", "tikka", "snack", "appetizer", "chaat"]);
          if (rec) {
            instantMsg = `🥤 Refreshing ${item.name}! AI Waiter suggests ${rec.name} alongside — a perfect snack + beverage combo!`;
            suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
          } else {
            instantMsg = `🥤 Refreshing ${item.name}! Pair it with a crispy starter or kebab for a delightful snacking experience!`;
          }
        }

      } else {
        // Generic fallback — smart: look at what's missing from the cart
        const hasMainInCart  = currentCart.some(ci => /main|biryani|curry|masala|dal/.test((ci.category||"").toLowerCase() + " " + ci.name.toLowerCase()));
        const hasDessertInCart = currentCart.some(ci => /dessert|sweet|ice cream/.test((ci.category||"").toLowerCase() + " " + ci.name.toLowerCase()));
        let recKeywords = hasDessertInCart ? ["beverage", "drink", "tea", "coffee"] : hasMainInCart ? ["dessert", "sweet", "ice cream"] : ["biryani", "main", "curry", "starter", "snack"];
        const rec = getRec(recKeywords);
        if (rec) {
          instantMsg = `✨ Excellent choice! ${item.name} is a wonderful addition. AI Waiter also recommends ${rec.name} to elevate your dining experience!`;
          suggestedAction = { label: `+ Add ${rec.name} (₹${rec.price})`, onClick: () => useCart.getState().add(rec, 1) };
        } else {
          instantMsg = `✨ Excellent choice! ${item.name} is a wonderful addition to your feast. Explore our menu for the perfect pairing!`;
        }
      }

      if (suggestedAction) {
        showAIToast(instantMsg, 5000, suggestedAction);
      } else {
        showAIToast(instantMsg, 3500);
      }
    }

    // Strategy 2: Smart Frontend Debouncing (1.5s delay for ITEM_ADDED network calls)
    if (payload.event_type === "ITEM_ADDED") {
      return new Promise<AIWaiterEventResponse | null>((resolve) => {
        if (_itemAddedDebounceTimer) {
          clearTimeout(_itemAddedDebounceTimer);
          if (_pendingItemAddedResolve) {
            _pendingItemAddedResolve(null);
          }
        }
        _pendingItemAddedResolve = resolve;

        _itemAddedDebounceTimer = setTimeout(async () => {
          _itemAddedDebounceTimer = null;
          const currentCart = useCart.getState().items || [];
          const updatedCartState = currentCart.map(i => ({
            item_id: i.item_id || "",
            name: i.name,
            price: i.price,
            qty: i.qty,
            category: i.category,
          })) as any[];

          try {
            const response = await api<AIWaiterEventResponse>("/api/ai-waiter/event", {
              method: "POST",
              body: JSON.stringify({
                event_type: payload.event_type,
                event: payload.event_type,
                restaurant_id: payload.restaurant_id,
                cart_state: updatedCartState,
                current_cart: updatedCartState,
                added_item: payload.added_item ?? null,
                user_language: payload.user_language ?? getDeviceLanguage(),
                device_id: getOrCreateAnonID(),
                session_state: useAIWaiterStore.getState().sessionState,
              }),
            });
            if (response) {
              if (response.next_state) useAIWaiterStore.getState().updateSessionState(response.next_state);
              if (response.action_type === "UPSELL_OFFER" && (response.suggested_items.length > 0 || response.quick_replies?.length)) {
                showAIUpsellSheet(response.dialogue_text, response.suggested_items, response.quick_replies || [], addToCartFn, proceedPayFn);
              }
            }
            if (_pendingItemAddedResolve) _pendingItemAddedResolve(response);
          } catch (e) {
            if (_pendingItemAddedResolve) _pendingItemAddedResolve(null);
          } finally {
            _pendingItemAddedResolve = null;
          }
        }, 1500);
      });
    }

    const response = await api<AIWaiterEventResponse>("/api/ai-waiter/event", {
      method: "POST",
      body: JSON.stringify({
        event_type: payload.event_type,
        event: payload.event_type,
        restaurant_id: payload.restaurant_id,
        cart_state: payload.cart_state ?? [],
        current_cart: payload.cart_state ?? [],
        added_item: payload.added_item ?? null,
        user_language: payload.user_language ?? getDeviceLanguage(),
        device_id: getOrCreateAnonID(),
        session_state: useAIWaiterStore.getState().sessionState,
      }),
    });

    if (response?.next_state) {
      useAIWaiterStore.getState().updateSessionState(response.next_state);
    }

    // Route to the correct UI handler if not silent
    if (!payload.silent) {
      if (response.action_type === "WELCOME") {
        showAIWelcomeModal(response.dialogue_text, 20000);
      } else if (response.action_type === "UPSELL_OFFER") {
        showAIUpsellSheet(response.dialogue_text, response.suggested_items, response.quick_replies || [], addToCartFn, proceedPayFn);
      }
    }

    return response;
  } catch (err) {
    // Silent failure — AI Waiter must never block ordering flow
    console.warn("[AI Waiter] Event failed (non-blocking):", err);
    return null;
  }
}

// ── DOM Bootstrap: inject styles + containers once ─────────────────────────

let _uiReady = false;

function _bootstrapUI(): void {
  if (_uiReady || typeof document === "undefined") return;
  _uiReady = true;

  // ── Inject CSS ────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.id = "ai-waiter-styles";
  style.textContent = `
    /* ── Top Toast ── */
    #ai-waiter-toast {
      position: fixed;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 420px;
      background: #1A1A1A;
      color: #FFFFFF;
      padding: 12px 18px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      z-index: 9999;
      transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: none;
    }
    #ai-waiter-toast.show { top: 20px; }
    #ai-waiter-toast .toast-icon { font-size: 20px; flex-shrink: 0; }
    #ai-waiter-toast .toast-text {
      font-size: 13px;
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.45;
      margin: 0;
    }

    /* ── Overlay ── */
    #ai-waiter-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.50);
      backdrop-filter: blur(3px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      z-index: 9997;
    }
    #ai-waiter-overlay.show { opacity: 1; pointer-events: auto; }

    /* ── Bottom Sheet ── */
    #ai-waiter-sheet {
      position: fixed;
      bottom: -100%;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 520px;
      background: #FFFFFF;
      border-radius: 24px 24px 0 0;
      padding: 24px 20px 28px;
      box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
      z-index: 9998;
      transition: bottom 0.4s cubic-bezier(0.1, 1, 0.2, 1);
      font-family: system-ui, -apple-system, sans-serif;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }
    #ai-waiter-sheet.show { bottom: 0; }
    .ai-sheet-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 10px; flex-shrink: 0;
    }
    .ai-sheet-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #222; }
    .ai-sheet-pitch { font-size: 15px; color: #555; line-height: 1.55; margin-bottom: 16px; flex-shrink: 0; }
    .ai-upsell-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; overflow-y: auto; max-height: 45vh; padding-right: 4px; }
    .ai-upsell-card {
      flex-direction: column; gap: 12px;
      background: linear-gradient(135deg, #FFFFFF 0%, #FAF8F5 100%);
      padding: 16px 18px; border-radius: 16px; border: 1px solid #EAE5DD;
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
      transition: all 0.2s ease;
    }
    .ai-upsell-card:hover { border-color: #D6C7B2; box-shadow: 0 6px 18px rgba(192, 57, 43, 0.08); }
    .ai-upsell-card-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
    .ai-upsell-card h4 { margin: 0; font-size: 16.5px; color: #1E1B18; font-weight: 700; }
    .ai-upsell-card .price { color: #C0392B; font-weight: 700; font-size: 15px; background: #FDE8E6; padding: 3px 10px; border-radius: 8px; }
    .ai-upsell-card .reason { font-size: 13.5px; color: #5C554E; margin: 0; line-height: 1.5; font-style: normal; }
    .ai-add-btn {
      width: 100%; background: linear-gradient(135deg, #C0392B 0%, #A93226 100%);
      color: #FFF; border: none; padding: 12px; border-radius: 12px;
      font-size: 14.5px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      box-shadow: 0 4px 10px rgba(192, 57, 43, 0.2);
      transition: all 0.2s ease;
    }
    .ai-add-btn:hover { background: linear-gradient(135deg, #D35400 0%, #C0392B 100%); box-shadow: 0 6px 14px rgba(192, 57, 43, 0.3); }
    .ai-add-btn:active { transform: scale(0.98); }
    .ai-skip-btn {
      width: 100%; background: none; border: none;
      color: #777; font-size: 15px; font-weight: 500;
      padding: 14px; cursor: pointer; text-align: center;
    }
    .ai-skip-btn:hover { color: #333; }

    /* ── Welcome Modal ── */
    @keyframes aiWelcomePop {
      0% { opacity: 0; transform: scale(0.9) translateY(12px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    #ai-waiter-welcome {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; padding: 20px;
    }
    #ai-waiter-welcome.hidden { display: none; }
    .ai-welcome-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(5px);
    }
    .ai-welcome-card {
      position: relative;
      background: linear-gradient(135deg, #FFFFFF 0%, #FAF6F0 100%);
      border-radius: 24px; padding: 36px 28px;
      max-width: 380px; width: 100%; text-align: center;
      border: 1px solid #EAE0D0;
      box-shadow: 0 20px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(192, 57, 43, 0.1);
      animation: aiWelcomePop 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-welcome-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: #FDE8E6; color: #C0392B;
      padding: 6px 14px; border-radius: 50px;
      font-size: 13px; font-weight: 700; margin-bottom: 16px;
    }
    .ai-welcome-card h2 { margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #1E1B18; }
    .ai-welcome-card p { margin: 0 0 26px; font-size: 15.5px; color: #4A443E; line-height: 1.6; }
    .ai-welcome-btn {
      background: linear-gradient(135deg, #C0392B 0%, #A93226 100%); color: #FFF; border: none;
      padding: 16px 32px; border-radius: 50px;
      font-size: 16px; font-weight: 700; cursor: pointer; width: 100%;
      box-shadow: 0 6px 16px rgba(192, 57, 43, 0.25); transition: all 0.2s ease;
    }
    .ai-welcome-btn:hover { background: linear-gradient(135deg, #D35400 0%, #C0392B 100%); box-shadow: 0 8px 20px rgba(192, 57, 43, 0.35); }
    .ai-welcome-btn:active { transform: scale(0.98); }
  `;
  document.head.appendChild(style);

  // ── Toast DOM ──────────────────────────────────────────────────────────
  const toast = document.createElement("div");
  toast.id = "ai-waiter-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">✨</span><p class="toast-text" id="ai-toast-msg"></p>`;
  document.body.appendChild(toast);

  // ── Overlay DOM ────────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.id = "ai-waiter-overlay";
  overlay.setAttribute("role", "dialog");
  document.body.appendChild(overlay);

  // ── Bottom Sheet DOM ───────────────────────────────────────────────────
  const sheet = document.createElement("div");
  sheet.id = "ai-waiter-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.innerHTML = `
    <div class="ai-sheet-header">
      <span aria-hidden="true">✨</span>
      <h3>AI Waiter Recommendation</h3>
    </div>
    <p class="ai-sheet-pitch" id="ai-sheet-pitch"></p>
    <div class="ai-upsell-list" id="ai-upsell-list"></div>
    <div class="ai-quick-replies" id="ai-quick-replies" style="display: flex; gap: 8px; overflow-x: auto; padding: 4px 0; margin-top: 12px; scrollbar-width: none;"></div>
    <button class="ai-skip-btn" id="ai-skip-btn">No thanks, Proceed to Payment →</button>
  `;
  document.body.appendChild(sheet);

  // ── Welcome Modal DOM ──────────────────────────────────────────────────
  const welcome = document.createElement("div");
  welcome.id = "ai-waiter-welcome";
  welcome.classList.add("hidden");
  welcome.setAttribute("role", "dialog");
  welcome.setAttribute("aria-modal", "true");
  welcome.innerHTML = `
    <div class="ai-welcome-backdrop" id="ai-welcome-backdrop"></div>
    <div class="ai-welcome-card">
      <div class="ai-welcome-badge"><span>👑 Royal AI Waiter</span></div>
      <div class="ai-welcome-icon" aria-hidden="true">🤖</div>
      <h2>Welcome to SmartDine!</h2>
      <p id="ai-welcome-text"></p>
      <button class="ai-welcome-btn" id="ai-welcome-btn">Explore Royal Feast →</button>
    </div>
  `;
  document.body.appendChild(welcome);
}

// ── UI Functions ───────────────────────────────────────────────────────────

let _toastTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Show a Top Toast notification that auto-dismisses after 20 seconds.
 * Position: slides down from top — keeps thumb-scrolling zone free.
 */
export function showAIToast(
  message: string,
  durationMs = 4000,
  action?: { label: string; onClick: () => void }
): void {
  const cleanMsg = message ? message.replace(/\*\*/g, "") : "";
  toast("✨ AI Waiter Suggestion", {
    description: cleanMsg,
    duration: durationMs,
    closeButton: true,
    action: action ? {
      label: action.label.replace(/\*\*/g, ""),
      onClick: () => {
        action.onClick();
        toast.success(`${action.label.replace("++ ", "").replace("+ Add ", "").replace(/\*\*/g, "")} added to order!`, { duration: 3000 });
      },
    } : undefined,
    style: {
      background: "#FAF5EC",
      color: "#1A1106",
      border: "2px solid #8A6A1B",
      fontSize: "14px",
      fontWeight: "500",
      fontFamily: "var(--font-editorial, serif)",
      padding: "14px 18px",
      borderRadius: "14px",
      boxShadow: "0 10px 30px rgba(138, 106, 27, 0.22)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      width: "100%",
      maxWidth: "360px",
    },
    actionButtonStyle: {
      background: "#8A6A1B",
      color: "#FFFFFF",
      fontWeight: "600",
      padding: "8px 16px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontSize: "13px",
      width: "100%",
      textAlign: "center",
      marginTop: "4px",
    },
  });
}

/**
 * Show a Bottom Sheet upsell modal.
 * Slides up from bottom, requiring user to either add an item or skip.
 */
export function showAIUpsellSheet(
  pitchText: string,
  items: AISuggestedItem[],
  quickReplies: string[] = [],
  onAddToCart?: (item: AISuggestedItem) => void,
  onProceedToPay?: () => void
): void {
  _bootstrapUI();
  const overlay = document.getElementById("ai-waiter-overlay");
  const sheet   = document.getElementById("ai-waiter-sheet");
  const pitch   = document.getElementById("ai-sheet-pitch");
  const list    = document.getElementById("ai-upsell-list");
  const replies = document.getElementById("ai-quick-replies");
  const skipBtn = document.getElementById("ai-skip-btn");
  if (!overlay || !sheet || !pitch || !list || !replies || !skipBtn) return;

  pitch.textContent = pitchText ? _cleanText(pitchText) : "";

  // Build upsell cards in clean horizontal sentence structure with full-width horizontal addition button below
  list.innerHTML = items
    .map(
      (item) => `
      <div class="ai-upsell-card" style="display: flex; flex-direction: column; gap: 8px; background: #FFFFFF; padding: 14px 16px; border-radius: 16px; border: 1px solid #EAE5DD; box-shadow: 0 4px 12px rgba(0,0,0,0.03); width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; width: 100%;">
          <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #1E1B18;">${_cleanText(item.name)}</h4>
          <span style="color: #C0392B; font-weight: 700; font-size: 14px; background: #FDE8E6; padding: 2px 10px; border-radius: 6px; white-space: nowrap;">₹${item.price.toFixed(0)}</span>
        </div>
        <p style="margin: 0; font-size: 13.5px; color: #5C554E; line-height: 1.4;">${_cleanText(item.reason || "Recommended by chef to complement your dining selection.")}</p>
        <button class="ai-add-btn" data-item-id="${_esc(item.item_id)}" style="width: 100%; background: linear-gradient(135deg, #C0392B 0%, #A93226 100%); color: #FFF; border: none; padding: 11px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px; box-shadow: 0 4px 10px rgba(192, 57, 43, 0.2);">
          <span>+ Add to Feast · ₹${item.price.toFixed(0)}</span>
        </button>
      </div>`
    )
    .join("");

  // Wire up Add buttons
  list.querySelectorAll<HTMLButtonElement>(".ai-add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.itemId;
      const found = items.find((i) => i.item_id === id);
      if (found) {
        if (onAddToCart) onAddToCart(found);
        else {
          useCart.getState().add({ id: found.item_id, name: found.name, price: found.price } as any, 1);
          toast.success(`${found.name} added to order!`, { duration: 3000 });
        }
      }
      _closeSheet();
    });
  });

  // Build quick replies
  replies.innerHTML = quickReplies.map(reply => 
    `<button class="ai-quick-reply-btn" data-reply="${_esc(reply)}" style="white-space: nowrap; padding: 6px 12px; background: #FDE8E6; color: #C0392B; border: 1px solid #C0392B; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0;">${_cleanText(reply)}</button>`
  ).join("");

  replies.querySelectorAll<HTMLButtonElement>(".ai-quick-reply-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const reply = btn.dataset.reply;
      if (reply) {
        _closeSheet();
        const restaurant_id = useMenuStore.getState().restaurantId || "";
        const cartItems = useCart.getState().items;
        sendAIWaiterEvent({
          event_type: "QUICK_REPLY_CLICKED",
          event_data: reply,
          restaurant_id,
          cart_state: cartItems as any
        });
      }
    });
  });

  // Wire up Skip / Proceed to Pay button
  skipBtn.onclick = () => {
    _closeSheet();
    if (onProceedToPay) onProceedToPay();
  };

  overlay.classList.add("show");
  sheet.classList.add("show");
  // Overlay tap also closes the sheet
  overlay.onclick = () => {
    _closeSheet();
    if (onProceedToPay) onProceedToPay();
  };
}

function _closeSheet(): void {
  document.getElementById("ai-waiter-overlay")?.classList.remove("show");
  document.getElementById("ai-waiter-sheet")?.classList.remove("show");
}

/**
 * Show a Welcome center modal when the customer first opens the menu.
 * Auto-closes after 5 seconds if user does not interact.
 */
export function showAIWelcomeModal(message: string, autoDismissMs = 20000): void {
  if (typeof window !== "undefined") {
    if (sessionStorage.getItem("sd_ai_welcome_shown") === "true") return;
    sessionStorage.setItem("sd_ai_welcome_shown", "true");
  }
  _bootstrapUI();
  const welcome = document.getElementById("ai-waiter-welcome");
  const text    = document.getElementById("ai-welcome-text");
  const btn     = document.getElementById("ai-welcome-btn");
  if (!welcome || !text || !btn) return;

  text.textContent = _cleanText(message);
  welcome.classList.remove("hidden");

  const close = () => welcome.classList.add("hidden");

  btn.onclick = close;
  document.getElementById("ai-welcome-backdrop")!.onclick = close;

  // Auto-dismiss after delay so it never blocks the menu browse
  setTimeout(close, autoDismissMs);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip markdown asterisks and escape HTML for clean UI display. */
function _cleanText(str: string): string {
  if (!str) return "";
  const cleaned = str.replace(/\*\*/g, "").replace(/\*/g, "");
  return _esc(cleaned);
}

/** Escape HTML to prevent XSS from AI-generated text inserted into DOM. */
function _esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
