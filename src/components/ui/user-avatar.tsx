import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
};

export function UserAvatar({
  username,
  size = "md",
  className,
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/20 font-semibold text-primary ring-2 ring-border",
        sizes[size],
        className
      )}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
