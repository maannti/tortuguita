"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface TurtleIconProps {
  className?: string;
  isThinking?: boolean;
}

export function TurtleIcon({ className, isThinking = false }: TurtleIconProps) {
  return (
    <Image
      src="/tortu.svg"
      alt="Tortu AI"
      width={24}
      height={24}
      className={cn(className, isThinking && "animate-turtle-think")}
    />
  );
}
