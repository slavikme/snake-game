"use client";

import { useLocalStorage } from "usehooks-ts";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { FaGithub, FaUserEdit } from "react-icons/fa";
import { GrTest } from "react-icons/gr";
import { LuLogOut } from "react-icons/lu";
import { User } from "@/lib/db/schema";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GameProvider } from "@/contexts/game-context";
import Link from "next/link";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, , removeUser] = useLocalStorage<User | null>("user", null, {
    initializeWithValue: false,
  });
  const [, , removeAuthToken] = useLocalStorage("authToken", "", {
    initializeWithValue: false,
  });
  const [, , removeAuthCreatedAt] = useLocalStorage<string | null>("authCreatedAt", null, {
    initializeWithValue: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <GameProvider>
      <div className="relative font-sans flex flex-col items-center gap-4 justify-between min-h-screen bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 from-slate-100 via-slate-200 to-slate-100">
        <header className="flex gap-2 justify-between w-full p-3">
          <h1 className="text-2xl font-bold flex gap-3 items-center">
            <Image src="/icon-96.png" alt="Snake Game Icon" width={40} height={40} className="inline-block" />
            Snake Game
          </h1>
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <UserAvatar className="text-sm" name={user?.name ?? ""} />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-40">
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserAvatar className="size-10 text-lg" name={user?.name ?? ""} />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-bold text-lg">{user?.name ?? ""}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem disabled>
                    <FaUserEdit />
                    Edit Profile (Coming Soon)
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <GrTest />
                    <Link href="/?phaser">Lab Version</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      removeUser();
                      removeAuthToken();
                      removeAuthCreatedAt();
                      router.push("/signup");
                    }}
                  >
                    <LuLogOut />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="w-8 h-8" />
          )}
        </header>

        <div>{children}</div>

        <footer className="flex flex-row gap-5 items-center justify-center p-3">
          <small>Copyright © 2025 - Slavik Meltser</small>
          <small className="flex gap-[24px] flex-wrap items-center justify-center">
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://github.com/slavikme/snake-game"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub />
              GitHub
            </a>
          </small>
        </footer>
      </div>
    </GameProvider>
  );
}
