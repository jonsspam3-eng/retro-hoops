"use client";

import Image from "next/image";
import { useState } from "react";

export function FadeImage({ className = "", imageClassName = "", onLoad, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const alt = typeof props.alt === "string" ? props.alt : "";

  return (
    <div className={`fade-image ${loaded ? "is-loaded" : ""} ${className}`}>
      <Image
        {...props}
        alt={alt}
        className={imageClassName}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
      />
    </div>
  );
}
