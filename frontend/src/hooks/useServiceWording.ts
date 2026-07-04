import { RestaurantConfig } from "@/types";

export interface ServiceWording {
  isSelfService: boolean;
  serviceName: string;
  orderTypeLabel: string;
  tableOrTokenLabel: string;
  counterOrTableLabel: string;
  pickupOrServeText: string;
  checkoutActionLabel: string;
  paymentPreferenceText: string;
}

export function getServiceWording(serviceType?: string, orderType?: string): ServiceWording {
  const isSelfService =
    serviceType === "self_service" ||
    serviceType === "cafeteria" ||
    orderType === "takeaway" ||
    orderType === "quick_order";

  if (isSelfService) {
    return {
      isSelfService: true,
      serviceName: "Self-Service & Quick Order",
      orderTypeLabel: "Self-Service",
      tableOrTokenLabel: "Pickup Token",
      counterOrTableLabel: "Pickup Counter",
      pickupOrServeText: "Collect at Counter when ready",
      checkoutActionLabel: "Generate Token & Pay",
      paymentPreferenceText: "UPI Tap & Pay Preferred for Instant Token",
    };
  }

  return {
    isSelfService: false,
    serviceName: "Dine-In Table Service",
    orderTypeLabel: "Dine-In",
    tableOrTokenLabel: "Table #",
    counterOrTableLabel: "Your Table",
    pickupOrServeText: "Served hot at your table",
    checkoutActionLabel: "Start Table Session & Order",
    paymentPreferenceText: "Pay via UPI or Card at Table / Counter",
  };
}
