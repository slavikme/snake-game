"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { validateAuthToken } from "@/lib/actions/auth";
import { useLocalStorage } from "usehooks-ts";
import { User } from "@/lib/db/schema";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const storageOptions = {
  initializeWithValue: true,
};

export const AuthGuard = ({ children, requireAuth = true }: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [authToken, , removeAuthToken] = useLocalStorage("authToken", "", storageOptions);
  const [, , removeAuthCreatedAt] = useLocalStorage<string | null>("authCreatedAt", null, storageOptions);
  const [, setUser, removeUser] = useLocalStorage<User | null>("user", null, storageOptions);

  useEffect(() => {
    if (!isChecking) return;

    const checkAuth = async () => {
      if (!authToken) {
        // No token found
        if (pathname === "/signup") {
          // On signup page without token - allow access
          setIsChecking(false);
          return;
        }

        if (requireAuth) {
          // Protected page without token - redirect to signup
          router.push("/signup");
          return;
        }

        setIsChecking(false);
        return;
      }

      // Validate token with server
      try {
        const result = await validateAuthToken(authToken);

        if (result.valid && result.user) {
          // Token is valid - update user in localStorage
          setUser(result.user);

          // If on signup page and authenticated, redirect to home
          if (pathname === "/signup") {
            router.push("/");
            return;
          }

          setIsChecking(false);
        } else {
          // Token is invalid - clear storage
          removeAuthToken();
          removeUser();
          removeAuthCreatedAt();

          // If on protected page, redirect to signup
          if (pathname !== "/signup" && requireAuth) {
            router.push("/signup");
            return;
          }

          setIsChecking(false);
        }
      } catch (error) {
        console.error("Error validating auth:", error);

        if (pathname !== "/signup" && requireAuth) {
          router.push("/signup");
          return;
        }

        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, router, requireAuth, authToken, setUser, isChecking, removeAuthToken, removeUser, removeAuthCreatedAt]);

  // Show nothing while checking to avoid flash of content
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  return <>{children}</>;
};
