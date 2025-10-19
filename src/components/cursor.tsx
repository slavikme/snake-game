import { cn } from "@/lib/utils";
import { MousePointer2 } from "lucide-react";

type CursorProps = {
  className?: string;
  style?: React.CSSProperties;
  color: string;
  name: string;
};

export const Cursor = ({ className, style, color, name }: CursorProps) => (
  <div className={cn("pointer-events-none", className)} style={style}>
    <MousePointer2 color={color} fill={color} size={30} />

    <div className="mt-1 px-2 py-1 rounded text-xs font-bold text-white text-center" style={{ backgroundColor: color }}>
      {name}
    </div>
  </div>
);
