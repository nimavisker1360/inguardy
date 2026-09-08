"use client";

import { Button } from "./button";
import { Check } from "lucide-react";

export interface PricingCardProps {
  title: string;
  price: number;
  period: "monthly" | "quarterly" | "yearly";
  features: string[];
  isPopular?: boolean;
}

export function PricingCard({
  title,
  price,
  period,
  features,
  isPopular = false,
}: PricingCardProps) {
  const periodLabel =
    period === "monthly"
      ? "Monthly"
      : period === "quarterly"
      ? "Quarterly"
      : "Yearly";

  return (
    <div
      className={`
        relative rounded-lg border bg-custom/80 backdrop-blur-sm shadow-sm
        ${isPopular ? "border-primary shadow-md" : ""}
      `}
    >
      {isPopular && (
        <div className="absolute -top-3 right-0 left-0 mx-auto w-32 rounded-full bg-primary py-1 text-center text-xs font-medium text-primary-foreground">
          Best Value
        </div>
      )}

      <div className="p-6">
        <h3 className="text-2xl font-bold text-center">{title}</h3>

        <div className="mt-4 text-center">
          <div className="flex items-baseline justify-center">
            <span className="text-4xl font-extrabold tracking-tight">
              {price.toLocaleString()}
            </span>
            <span className="ml-2 text-muted">USD</span>
          </div>
          <span className="text-sm text-muted">{periodLabel}</span>
        </div>

        <ul className="mt-8 space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Button
            variant={isPopular ? "default" : "outline"}
            className="w-full"
          >
            {isPopular ? "Select Premium Plan" : "Select Plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
