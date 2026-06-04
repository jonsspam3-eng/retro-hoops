"use client";

import { useState } from "react";

export function CopyDraftButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="bg-[#ddbda2] text-[#050b23] hover:bg-[#cfa887]"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Draft copied" : "Copy Draft"}
    </button>
  );
}
