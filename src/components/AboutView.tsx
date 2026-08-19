import React from 'react';
import { MainTab } from '../types';
import { Lightbulb, Eye, Shield, FileText, AlertTriangle, ArrowRight } from 'lucide-react';

interface AboutViewProps {
  setActiveTab: (tab: MainTab) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ setActiveTab }) => {
  return (
    <div className="pb-28 animate-fade-in">
      {/* HERO SECTION */}
      <section className="relative min-h-[420px] md:min-h-[480px] rounded-b-3xl overflow-hidden shadow-md flex flex-col justify-end p-6 md:p-12 text-center text-white">
        <img
          src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=80"
          alt="Serene Spa Environment"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.55]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b1c19]/90 via-[#1b1c19]/40 to-transparent" />

        <div className="relative z-10 max-w-md md:max-w-2xl mx-auto space-y-3">
          <h1 className="font-serif text-4xl md:text-5xl text-[#fbf9f4] font-normal tracking-tight">
            About Us
          </h1>
          <p className="text-xs md:text-sm font-light text-[#e4e2dd] max-w-xs md:max-w-md mx-auto leading-relaxed">
            Experience luxury wellness at your doorstep with trusted professionals dedicated to your comfort, relaxation, and well-being.
          </p>
        </div>
      </section>

      {/* OUR STORY SECTION */}
      <section className="px-4 py-8 max-w-md md:max-w-4xl lg:max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="font-serif text-2xl md:text-3xl text-[#1b1c19]">Our Story</h2>
          <p className="text-xs md:text-sm text-[#747871] leading-relaxed max-w-xs md:max-w-lg mx-auto">
            Premium Spa was created with one simple vision—to make premium spa and wellness services accessible in the comfort of your home. We combine luxury, professionalism, hygiene, and convenience to deliver a relaxing experience without the need to visit a spa center.
          </p>
        </div>

        {/* MISSION & VISION CARDS */}
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 pt-2">
          {/* Mission Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#e9e8e3] shadow-2xs space-y-3 text-left hover:border-[#52634f]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#d5e8cf]/50 text-[#3b4b38] flex items-center justify-center">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-xl text-[#1b1c19]">Our Mission</h3>
            <p className="text-xs text-[#747871] leading-relaxed">
              To provide unparalleled relaxation and therapeutic treatments that elevate the everyday, prioritizing exceptional quality and client well-being in every interaction.
            </p>
          </div>

          {/* Vision Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#e9e8e3] shadow-2xs space-y-3 text-left hover:border-[#52634f]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#52634f]/10 text-[#52634f] flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-xl text-[#1b1c19]">Our Vision</h3>
            <p className="text-xs text-[#747871] leading-relaxed">
              To become the defining standard for mobile luxury wellness, seamlessly integrating restorative practices into modern lifestyles across the globe.
            </p>
          </div>
        </div>

        {/* LEGAL & POLICIES SECTION */}
        <div className="pt-6 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl md:text-3xl text-[#1b1c19]">Legal & Policies</h2>
            <p className="text-xs md:text-sm text-[#747871]">Clear, transparent guidelines for peace of mind.</p>
          </div>

          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
            {/* Privacy Policy */}
            <div className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-2xs space-y-2 text-left">
              <div className="flex items-center space-x-2 text-[#52634f]">
                <Shield className="w-4 h-4" />
                <h4 className="font-semibold text-sm text-[#1b1c19]">Privacy Policy</h4>
              </div>
              <p className="text-xs text-[#747871] leading-relaxed">
                We value your privacy. We collect and use information solely to provide services, ensuring your data rights are protected and never shared without consent.
              </p>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-2xs space-y-2 text-left">
              <div className="flex items-center space-x-2 text-[#52634f]">
                <FileText className="w-4 h-4" />
                <h4 className="font-semibold text-sm text-[#1b1c19]">Terms & Conditions</h4>
              </div>
              <p className="text-xs text-[#747871] leading-relaxed">
                By booking, you accept our terms. All services are governed by local wellness standards. Scheduling is subject to professional availability.
              </p>
            </div>

            {/* Zero Tolerance Policy */}
            <div className="bg-white rounded-2xl p-4 border border-[#ba1a1a]/20 shadow-2xs space-y-2 text-left">
              <div className="flex items-center space-x-2 text-[#ba1a1a]">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="font-semibold text-sm text-[#ba1a1a]">Zero Tolerance Policy</h4>
              </div>
              <p className="text-xs text-[#747871] leading-relaxed">
                Strictly non-sexual professional therapeutic spa service. We maintain absolute professional boundaries to ensure safety and comfort for all staff.
              </p>
            </div>

            {/* Therapist Safety */}
            <div className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-2xs space-y-2 text-left">
              <div className="flex items-center space-x-2 text-[#52634f]">
                <Shield className="w-4 h-4" />
                <h4 className="font-semibold text-sm text-[#1b1c19]">Safety & Conduct</h4>
              </div>
              <p className="text-xs text-[#747871] leading-relaxed">
                Only professionally trained and screened therapists visit your home. Sessions are non-invasive, professional, and strictly therapeutic. Clear booking details keep both clients and therapists secure.
              </p>
            </div>

            {/* Disclaimer */}
            <div className="bg-white rounded-2xl p-4 border border-[#e9e8e3] shadow-2xs space-y-2 text-left">
              <div className="flex items-center space-x-2 text-[#52634f]">
                <FileText className="w-4 h-4" />
                <h4 className="font-semibold text-sm text-[#1b1c19]">Wellness Disclaimer</h4>
              </div>
              <p className="text-xs text-[#747871] leading-relaxed">
                Our services are non-medical relaxation and therapeutic wellness treatments. They do not diagnose, treat, or cure any medical condition. Please consult a certified medical professional for health concerns.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="pt-4 text-center">
          <button
            onClick={() => setActiveTab('therapists')}
            className="w-full py-3 bg-[#52634f] hover:bg-[#3b4b38] text-white rounded-full font-serif font-medium text-xs uppercase tracking-wider shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <span>Explore Therapists & Book</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
