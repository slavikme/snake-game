"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

const Avatar = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) => (
  <AvatarPrimitive.Root
    data-slot="avatar"
    className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
);

const AvatarImage = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) => (
  <AvatarPrimitive.Image data-slot="avatar-image" className={cn("aspect-square size-full", className)} {...props} />
);

const AvatarFallback = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => (
  <AvatarPrimitive.Fallback
    data-slot="avatar-fallback"
    className={cn("bg-muted  flex size-full items-center justify-center rounded-full", className)}
    {...props}
  />
);

const UserAvatar = ({ name, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root> & { name: string }) => (
  <Avatar {...props}>
    <AvatarFallback>
      {name
        .split(" ", 2)
        .map((name) => name.charAt(0).toUpperCase())
        .join("")}
    </AvatarFallback>
  </Avatar>
);

export { Avatar, AvatarImage, AvatarFallback, UserAvatar };
