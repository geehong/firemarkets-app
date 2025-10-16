import type { Metadata } from "next";
import React from "react";
import UnderConstruction from "@/components/blank/UnderConstruction";

export const metadata: Metadata = {
  title: "Under Construction | Firemarkets",
  description: "This page is currently under construction.",
};

export default function Ecommerce() {
  return (
    <UnderConstruction />
  );
}
