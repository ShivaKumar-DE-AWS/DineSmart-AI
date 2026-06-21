"use client";
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/stores/session";
import type { Order } from "@/types";

/**
 * Subscribes to the SSE order stream for the current user's restaurant.
 * Passes JWT as query param (EventSource can't send custom headers).
 * Automatically updates the React Query cache for ["kds-orders", restaurantId]
 * and ["counter-orders", restaurantId] so the UI updates in real-time.
 */
export function useOrderStream() {
  const qc = useQueryClient();
  const { user, token } = useSession();
  const rid = user?.restaurant_id;
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_order" && data.order) {
          const order: Order = data.order;
          // Update kitchen query
          if (rid) {
            qc.setQueryData<Order[]>(["kds-orders", rid], (old) => {
              if (!old) return [order];
              // Deduplicate
              if (old.some((o) => o.id === order.id)) return old;
              return [order, ...old];
            });
            // Update counter query
            qc.setQueryData<Order[]>(["counter-orders", rid], (old) => {
              if (!old) return [order];
              if (old.some((o) => o.id === order.id)) return old;
              return [order, ...old];
            });
          }
        } else if (data.type === "status_update") {
          if (rid) {
            qc.setQueryData<Order[]>(["kds-orders", rid], (old) => {
              if (!old) return old;
              return old.map((o) =>
                o.id === data.order_id ? { ...o, status: data.status } : o
              );
            });
            qc.setQueryData<Order[]>(["counter-orders", rid], (old) => {
              if (!old) return old;
              return old.map((o) =>
                o.id === data.order_id ? { ...o, status: data.status } : o
              );
            });
          }
        }
      } catch {
        // Ignore parse errors (keepalive lines etc.)
      }
    },
    [qc, rid]
  );

  useEffect(() => {
    if (!rid || !token) return;
    // Pass JWT as query param — EventSource can't send Authorization headers
    const params = new URLSearchParams({ restaurant_id: rid, token });
    const es = new EventSource(`/api/orders/stream?${params.toString()}`);
    es.onmessage = handleEvent;
    es.onerror = () => {
      // Auto-reconnect handled by EventSource browser API
    };
    eventSourceRef.current = es;
    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [rid, token, handleEvent]);
}
