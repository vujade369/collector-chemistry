"use client";

import type { ComponentPropsWithoutRef } from "react";

type WalletInputProps = ComponentPropsWithoutRef<"input">;

export default function WalletInput(props: WalletInputProps) {
  return <input type="text" {...props} />;
}
