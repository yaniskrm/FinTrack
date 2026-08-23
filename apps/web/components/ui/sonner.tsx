"use client";

import type { ComponentProps } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

function Toaster(props: ComponentProps<typeof Sonner>) {
  const { theme } = useTheme();
  const resolved = theme === "light" || theme === "dark" ? theme : "system";

  return <Sonner theme={resolved} className="toaster group" richColors {...props} />;
}

export { Toaster };
