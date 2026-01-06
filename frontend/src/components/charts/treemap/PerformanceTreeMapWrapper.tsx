"use client";

import dynamic from "next/dynamic";
import React from "react";

const PerformanceTreeMapToday = dynamic(
    () => import("./PerformanceTreeMapToday"),
    { ssr: false }
);

export default function PerformanceTreeMapWrapper(props: any) {
    return <PerformanceTreeMapToday {...props} />;
}
