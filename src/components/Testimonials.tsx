"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import {
  MotionDiv,
  MotionHeading,
  MotionStaggerContainer,
} from "@/components/ui/motion-content";
import { useLanguage } from "@/lib/language-context";

type Testimonial = {
  name: string;
  title: string;
  quote: string;
  rating?: number;
};

const fallbackTestimonials: Testimonial[] = [
  {
    name: "Nasrin Mohammadi",
    title: "Forex Trader",
    quote:
      "The signal format is clear, especially the entry, stop loss, and take profit levels.",
    rating: 5,
  },
  {
    name: "Vahid Ahmadi",
    title: "Part-time Trader",
    quote:
      "The updates help me review trades without chasing random market moves.",
    rating: 4,
  },
  {
    name: "Leila Rahimi",
    title: "Risk-focused Trader",
    quote:
      "I like that the service shows outcomes and keeps risk levels visible.",
    rating: 5,
  },
];

export function Testimonials() {
  const { t, language } = useLanguage();
  const [testimonials, setTestimonials] =
    useState<Testimonial[]>(fallbackTestimonials);

  useEffect(() => {
    async function loadTestimonials() {
      try {
        const response = await fetch(`/locales/${language}/common.json`);
        const data = await response.json();

        if (Array.isArray(data?.testimonials) && data.testimonials.length > 0) {
          setTestimonials(data.testimonials.slice(0, 3));
        }
      } catch {
        setTestimonials(fallbackTestimonials);
      }
    }

    loadTestimonials();
  }, [language]);

  return (
    <section
      dir={language === "fa" ? "rtl" : "ltr"}
      className="relative overflow-hidden bg-black py-16"
    >
      <div
        className="absolute inset-0 z-0 bg-[url('/images/back.jpg')] bg-contain bg-center opacity-15"
        aria-hidden="true"
      />
      <div className="container relative z-10 mx-auto max-w-6xl px-4">
        <MotionStaggerContainer className="mb-10 text-center">
          <MotionHeading className="text-3xl font-bold text-white">
            {t("testimonialHeading")}
          </MotionHeading>
        </MotionStaggerContainer>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <MotionDiv
              key={`${testimonial.name}-${index}`}
              className="flex min-h-[230px] flex-col rounded-lg border border-blue-500/15 bg-gray-950/90 p-6 shadow-sm backdrop-blur-sm"
              delay={index * 0.1}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-white">
                    {testimonial.name}
                  </h4>
                  <p className="mt-1 text-xs text-gray-400">
                    {testimonial.title}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5 text-yellow-400">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      className="h-4 w-4"
                      fill={
                        starIndex < (testimonial.rating || 5)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm leading-6 text-gray-300">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
}
