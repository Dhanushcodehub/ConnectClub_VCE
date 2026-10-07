"use client";

import { motion } from "framer-motion";
import { Camera, Briefcase, Play, Mail, ArrowRight, Sparkles } from "lucide-react";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/animations";
import { CTAButton } from "@/components/ui/CTAButton";

export function CTA() {
  return (
    <section className="relative z-10 bg-transparent pt-24 pb-24 mt-20">
      <div className="container-grid">
        <div className="col-span-4 md:col-span-6 lg:col-span-8 lg:col-start-3">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="flex flex-col items-center text-center"
          >
            <motion.h2
              variants={fadeUp}
              className="text-h2 font-display font-black uppercase tracking-tighter text-white mb-6 whitespace-nowrap"
            >
              GET IN <span className="text-highlight ml-2 md:ml-4">TOUCH</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="text-base md:text-lg text-white/70 mb-12 max-w-2xl"
            >
              Join the community of innovators. Attend our next event, or talk to Connect AI to find out how to get involved. Have questions or need assistance? Reach out to us via our official emails or social media.
            </motion.p>

            <div className="w-full flex flex-col md:flex-row justify-center items-center md:items-start gap-16 md:gap-32 text-left mb-16">
              {/* Left Column - Socials */}
              <motion.div variants={fadeUp} className="flex flex-col items-center md:items-start space-y-6">
                <a href="#" className="flex items-center gap-4 text-white/60 hover:text-white transition-colors group">
                  <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-base font-medium">Instagram</span>
                </a>
                <a href="#" className="flex items-center gap-4 text-white/60 hover:text-white transition-colors group">
                  <Briefcase className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-base font-medium">LinkedIn</span>
                </a>
                <a href="#" className="flex items-center gap-4 text-white/60 hover:text-white transition-colors group">
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-base font-medium">YouTube</span>
                </a>
              </motion.div>

              {/* Right Column - Emails */}
              <motion.div variants={fadeUp} className="flex flex-col items-center md:items-start space-y-8">
                <div>
                  <h4 className="text-primary font-bold tracking-widest uppercase text-[10px] mb-2">Connect Club Email</h4>
                  <a href="mailto:connectclub@vce.ac.in" className="text-lg md:text-xl font-bold text-white hover:text-primary transition-colors">
                    connectclub@vce.ac.in
                  </a>
                </div>
                <div>
                  <h4 className="text-primary font-bold tracking-widest uppercase text-[10px] mb-2">Support Email</h4>
                  <a href="mailto:support@connectclubvce.in" className="text-lg md:text-xl font-bold text-white hover:text-primary transition-colors">
                    support@connectclubvce.in
                  </a>
                </div>
              </motion.div>
            </div>

            {/* Buttons Row */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
            >
              <CTAButton
                href="/events"
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-4 h-4 text-current" />}
              >
                Upcoming Events
              </CTAButton>
              <CTAButton
                href="/connect-ai"
                variant="glass"
                size="lg"
                icon={<Sparkles className="w-4 h-4 text-purple-400" />}
                iconPosition="left"
              >
                Connect AI
              </CTAButton>
              <CTAButton
                href="/contact"
                variant="glass"
                size="lg"
                icon={<Mail className="w-4 h-4 text-purple-400" />}
                iconPosition="left"
              >
                Contact Us
              </CTAButton>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

