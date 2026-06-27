import re

with open("frontend/src/app/r/[slug]/menu/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "{/* ====== SPECIAL SECTIONS (when no filters active) ====== */}"
start_idx = content.find(start_marker)

# We want to replace from start_idx to the END of the `return ( ... );` block.
# Since we know `page.tsx` ends with `</div></div>);}`, we can just find the last `);`
end_idx = content.rfind(");")
# we need to preserve the `</div></div>` before `);`? No, our book_ui will contain its own closing tags, so we can just replace up to `);`.
# Let's find the closing `  );\\n}` and just inject our UI before it, and replace what's in between.

last_return_close = content.rfind(");")
# Let's back up to the `</div>` wrappers
end_wrapper = content.rfind("</div>", 0, last_return_close)
end_wrapper = content.rfind("</div>", 0, end_wrapper)

if start_idx == -1 or end_wrapper == -1:
    print("Could not find markers")
    exit(1)

new_imports = """
import React, { useRef } from "react";
// @ts-ignore
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight } from "lucide-react";
"""

import_marker = 'import type { MenuItem } from "@/types";'
content = content.replace(import_marker, new_imports + "\\n" + import_marker)

book_logic = """
  const bookRef = useRef<any>(null);
  
  // Paginate items (2 items per page for optimal fit)
  const ITEMS_PER_PAGE = 2;
  const pages = useMemo(() => {
    const p = [];
    for (let i = 0; i < filtered.length; i += ITEMS_PER_PAGE) {
      p.push(filtered.slice(i, i + ITEMS_PER_PAGE));
    }
    if (p.length % 2 !== 0) p.push([]); 
    return p;
  }, [filtered]);

  const Page = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
      <div className="page bg-[#FAF5EC] shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] border-x border-[#E7DFCB] overflow-hidden" ref={ref} data-density={props.density || "soft"}>
        <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}></div>
        <div className="p-4 lg:p-6 h-full flex flex-col relative z-10">
          {props.children}
        </div>
      </div>
    );
  });
  Page.displayName = "Page";

"""

return_marker = "  return ("
content = content.replace(return_marker, book_logic + return_marker)

book_ui = """
      {/* 3D BOOK RENDERING */}
      <div className="mt-8 flex flex-col items-center">
        <div className="hidden lg:flex items-center gap-6 mb-6 z-20 relative">
          <button onClick={() => bookRef.current?.pageFlip()?.flipPrev()} className="p-3 rounded-full bg-[#FAF5EC] border border-[#E7DFCB] shadow-sm hover:shadow-md hover:bg-brand-secondary/20 transition text-brand-primary">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="font-royal uppercase tracking-[0.2em] text-brand-primary">Flip Pages</span>
          <button onClick={() => bookRef.current?.pageFlip()?.flipNext()} className="p-3 rounded-full bg-[#FAF5EC] border border-[#E7DFCB] shadow-sm hover:shadow-md hover:bg-brand-secondary/20 transition text-brand-primary">
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="w-full max-w-[1000px] flex justify-center perspective-[2000px]">
          {filtered.length === 0 && hasActiveFilters ? (
             <div className="text-center py-20">
                <p className="font-editorial italic text-lg text-[#1A1106]/60">No dish matches your criteria — try adjusting your filters.</p>
             </div>
          ) : (
            <HTMLFlipBook 
              width={380} 
              height={700} 
              size="stretch" 
              minWidth={315} 
              maxWidth={500} 
              minHeight={420} 
              maxHeight={800} 
              maxShadowOpacity={0.5} 
              showCover={true} 
              mobileScrollSupport={true} 
              ref={bookRef}
              className="mx-auto drop-shadow-2xl rounded-r-xl"
            >
              {/* FRONT COVER */}
              <Page density="hard">
                <div className="h-full bg-brand-primary text-[#FAF5EC] flex flex-col items-center justify-center p-8 border-l-[12px] border-[#5C0E1B] rounded-r-lg relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] pointer-events-none mix-blend-overlay"></div>
                  <div className="z-10 flex flex-col items-center">
                    <div className="mehfil-divider mb-6 opacity-60"></div>
                    <h1 className="font-royal text-4xl lg:text-5xl text-center leading-tight">{restaurantConfig?.name || "Menu"}</h1>
                    <div className="font-editorial italic text-brand-secondary text-xl mt-6 uppercase tracking-widest">Menu</div>
                    <div className="mehfil-divider mt-6 opacity-60"></div>
                  </div>
                  <div className="absolute bottom-10 font-royal tracking-[0.3em] text-[10px] opacity-50 uppercase">Swipe to open</div>
                </div>
              </Page>

              {/* INSIDE FRONT COVER */}
              <Page density="hard">
                <div className="h-full bg-[#EADDCA] p-8 flex flex-col items-center justify-center relative">
                   <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] pointer-events-none mix-blend-multiply"></div>
                   <p className="font-editorial italic text-center text-[#1A1106]/70 text-lg max-w-xs">{restaurantConfig?.history_intro || "Our journey began with a passion for great food."}</p>
                   <div className="mt-8 font-royal tracking-[0.2em] text-[#5C0E1B] text-xs uppercase">Enjoy your meal</div>
                </div>
              </Page>

              {/* DISH PAGES */}
              {pages.map((pageItems, pageIdx) => (
                <Page key={`page-${pageIdx}`}>
                  <div className="flex-1 flex flex-col gap-6 pt-2">
                    {pageItems.map((item) => {
                      const inCart = cart.items.find((i) => i.item_id === item.id);
                      const isFlipped = !!flipped[item.id];
                      return (
                        <div key={item.id} className="relative w-full h-[300px]" style={{ perspective: "1000px" }} data-testid={`menu-item-${item.id}`}>
                          <motion.div
                            className="relative w-full h-full"
                            style={{ transformStyle: "preserve-3d" }}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.6 }}
                          >
                            <div className="absolute inset-0 bg-white rounded-lg border border-[#E7DFCB] overflow-hidden flex flex-col shadow-sm" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                              <div className="relative h-[120px] bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${item.image_url})` }}>
                                <div className="absolute inset-0 bg-gradient-to-t from-[#5C0E1B]/70 via-transparent to-transparent" />
                                {item.tags?.includes("bestseller") && (
                                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand-secondary text-[#1A1106] text-[9px] font-royal tracking-wider uppercase shadow-md">Bestseller</div>
                                )}
                              </div>
                              <div className="p-3 flex-1 flex flex-col bg-white z-10">
                                <h3 className="font-royal text-base text-brand-primary leading-tight">{item.name}</h3>
                                <div className="font-editorial italic text-xs text-[#1A1106]/70 mt-1 line-clamp-2 flex-1">{item.description}</div>
                                <div className="mt-2 pt-2 border-t border-[#E7DFCB] flex items-center justify-between">
                                  <span className="font-royal text-lg text-brand-primary">{formatCurrency(item.price)}</span>
                                  <div className="flex items-center gap-2 relative z-20">
                                    <button onClick={() => setFlipped((s) => ({ ...s, [item.id]: !s[item.id] }))} className="text-[9px] font-royal tracking-[0.2em] uppercase text-brand-primary hover:text-brand-secondary transition px-1 py-1">Details</button>
                                    {inCart ? (
                                      <div className="flex items-center gap-1 bg-[#5C0E1B] text-[#FAF5EC] rounded-full p-0.5 shadow">
                                        <button onClick={() => cart.setQty(item.id, inCart.qty - 1)} className="h-6 w-6 rounded-full hover:bg-brand-primary flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                                        <span className="px-1 font-royal text-xs font-semibold w-4 text-center">{inCart.qty}</span>
                                        <button onClick={() => cart.setQty(item.id, inCart.qty + 1)} className="h-6 w-6 rounded-full hover:bg-brand-primary flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                                      </div>
                                    ) : (
                                      <button onClick={() => { cart.add(item); toast.success(`${item.name} added`); }} className="bg-[#5C0E1B] hover:bg-brand-primary text-[#FAF5EC] rounded-full px-3 py-1.5 text-[9px] font-royal tracking-wider uppercase transition shadow">Add</button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="absolute inset-0 bg-[#5C0E1B] text-[#FAF5EC] rounded-lg overflow-hidden flex flex-col shadow-md p-4" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                              <div className="font-royal tracking-[0.3em] uppercase text-[9px] text-brand-secondary">Chef's note</div>
                              <h3 className="font-royal text-lg text-[#FAF5EC] mt-1">{item.name}</h3>
                              <div className="mehfil-divider my-2"></div>
                              <p className="font-editorial italic text-[#FAF5EC]/90 leading-relaxed text-xs overflow-y-auto pr-1 custom-scrollbar">{item.description}</p>
                              <button onClick={() => setFlipped((s) => ({ ...s, [item.id]: !s[item.id] }))} className="absolute top-3 right-3 text-[#FAF5EC]/60 hover:text-brand-secondary transition z-20">
                                <BookOpen className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute bottom-4 right-4 text-[10px] font-royal text-[#1A1106]/40">{pageIdx + 1}</div>
                </Page>
              ))}

              {/* INSIDE BACK COVER */}
              <Page density="hard">
                <div className="h-full bg-[#EADDCA] p-8 flex flex-col items-center justify-center relative">
                   <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] pointer-events-none mix-blend-multiply"></div>
                   <p className="font-royal tracking-[0.2em] text-brand-primary text-xs uppercase text-center max-w-[200px]">Thank you for dining with us</p>
                </div>
              </Page>

              {/* BACK COVER */}
              <Page density="hard">
                <div className="h-full bg-brand-primary flex flex-col items-center justify-center p-8 border-l-[12px] border-[#5C0E1B] rounded-l-lg relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] pointer-events-none mix-blend-overlay"></div>
                  <div className="z-10 font-royal text-brand-secondary text-2xl">SmartDine AI</div>
                  <div className="z-10 font-editorial italic text-[#FAF5EC]/50 text-xs mt-2">© {new Date().getFullYear()}</div>
                </div>
              </Page>
            </HTMLFlipBook>
          )}
        </div>
      </div>
"""

new_content = content[:start_idx] + book_ui + "\\n" + content[end_wrapper:]

with open("frontend/src/app/r/[slug]/menu/page.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)
print("Rewrite complete")
