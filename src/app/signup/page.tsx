"use client";

import { SignupForm } from "@/components/signup-form";
import { AuthGuard } from "@/components/auth-guard";
import { FaGithub } from "react-icons/fa";

export default function SignupPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="bg-background flex min-h-svh flex-col items-center justify-between gap-6 p-6 md:p-10">
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-sm">
            <SignupForm />
          </div>
        </div>
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
    </AuthGuard>
  );
}
