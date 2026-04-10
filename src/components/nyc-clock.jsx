"use client";

import { useEffect, useState } from "react";

function getNycTimeLabel() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(now);

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return `${date} / ${time}`;
}

export function NycClock({ locationLabel = "NYC" }) {
  const [label, setLabel] = useState(getNycTimeLabel);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLabel(getNycTimeLabel());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="nyc-clock" aria-live="polite">
      {label} / {locationLabel}
    </p>
  );
}
