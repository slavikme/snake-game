import GameBoard from "@/components/GameBoard";
import { FaGithub } from "react-icons/fa";

export default function Home() {
  return (
    <div className="font-sans flex flex-col items-center justify-between min-h-screen gap-16 bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 from-slate-100 via-slate-200 to-slate-100">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="w-250 max-w-screen p-3">
          <GameBoard />
        </div>
      </main>
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
  );
}
