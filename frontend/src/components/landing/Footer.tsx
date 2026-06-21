import Link from "next/link";
import { Sparkles, Twitter, Instagram, Linkedin, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050505] pt-20 pb-10 px-6 lg:px-24">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              {/* Fallback text logo mimicking the image */}
              <div className="text-2xl font-bold tracking-tight">
                <span className="text-white">Smart</span>
                <span className="text-[#D95333]">Dine</span>
                <span className="text-[#2A64F6] ml-1">AI</span>
              </div>
            </div>
            <p className="text-stone text-sm leading-relaxed max-w-sm mb-8">
              Turn every restaurant into an AI-powered dining experience. The complete operating system for modern food businesses.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-stone hover:text-white hover:bg-white/10 transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-stone hover:text-white hover:bg-white/10 transition">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-stone hover:text-white hover:bg-white/10 transition">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://github.com/ShivaKumar-DE-AWS/DineSmart-AI" target="_blank" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-stone hover:text-white hover:bg-white/10 transition">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-stone">
              <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
              <li><Link href="/r/mehfil-hyderabad" className="hover:text-white transition">Live Demo</Link></li>
              <li><Link href="#roi" className="hover:text-white transition">ROI Calculator</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-stone">
              <li><Link href="#" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="#" className="hover:text-white transition">Careers</Link></li>
              <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
              <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-stone">
              <li><Link href="#" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white transition">Cookie Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone">
          <div>© 2026 SmartDine AI. All rights reserved.</div>
          <div className="flex gap-2">
            <span>Built with ❤️</span>
            <span>•</span>
            <span>SmartDine AI Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
