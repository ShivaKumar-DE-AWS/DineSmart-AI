import { Navigation } from "@/components/landing/Navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { AIWaiterShowcase } from "@/components/landing/AIWaiterShowcase";
import { ProductFeatures } from "@/components/landing/ProductFeatures";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";
import { ROICalculator } from "@/components/landing/ROICalculator";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CustomerSuccess } from "@/components/landing/CustomerSuccess";
import { DashboardShowcase } from "@/components/landing/DashboardShowcase";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FreeTrialSection } from "@/components/landing/FreeTrialSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-ink selection:bg-electric-blue/30 font-sans text-cream overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <SocialProofBar />
      <ProblemSection />
      <SolutionSection />
      <AIWaiterShowcase />
      <ProductFeatures />
      <InteractiveDemo />
      <ROICalculator />
      <HowItWorks />
      <CustomerSuccess />
      <DashboardShowcase />
      <ComparisonSection />
      <PricingSection />
      <FreeTrialSection />
      <FAQSection />
      <Footer />
    </div>
  );
}
