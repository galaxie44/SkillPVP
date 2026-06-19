"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/layout/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-3 rounded-lg"
      onClick={toggleTheme}
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4" />
          Mode clair
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          Mode sombre
        </>
      )}
    </Button>
  );
}
