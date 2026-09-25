import { Link } from "react-router";
import { cn } from "@/lib/utils";
import type { BlameLine } from "@/lib/types";

export function CodeView({
  lines,
  blame,
  commitBase,
  className,
}: {
  lines: string[];
  blame?: BlameLine[];
  commitBase?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border bg-code font-mono text-sm", className)}>
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((text, index) => {
            const row = blame?.[index];
            return (
              <tr key={index} className="hover:bg-background/40">
                {row ? (
                  <td className="text-muted-foreground w-48 max-w-48 truncate border-r px-2 py-0.5 align-top text-xs">
                    {commitBase ? (
                      <Link className="text-primary" to={`${commitBase}/${row.sha}`}>
                        {row.sha.slice(0, 8)}
                      </Link>
                    ) : (
                      <span>{row.sha.slice(0, 8)}</span>
                    )}{" "}
                    {row.author}
                  </td>
                ) : null}
                <td className="text-muted-foreground w-12 select-none border-r px-2 py-0.5 text-right align-top">
                  {index + 1}
                </td>
                <td className="whitespace-pre px-3 py-0.5">{text || " "}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DiffView({ diff }: { diff: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-code p-4 font-mono text-sm">
      {diff.split("\n").map((line, i) => (
        <div
          key={i}
          className={
            line.startsWith("+") && !line.startsWith("+++")
              ? "diff-add"
              : line.startsWith("-") && !line.startsWith("---")
                ? "diff-del"
                : ""
          }
        >
          {line || " "}
        </div>
      ))}
    </pre>
  );
}
