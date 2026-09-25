import { Button } from "@/components/ui/button";
import type { RepoInfo } from "@/lib/types";

export function isUnbornRepoError(message: string): boolean {
  return /empty repository|Needed a single revision|no default branch/i.test(message);
}

export function EmptyRepo({ info }: { info: RepoInfo }) {
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-lg font-medium">This repository is empty</h2>
        <p className="text-muted-foreground mt-1 text-sm">Push an existing clone, or add a first commit.</p>
      </div>
      <pre className="bg-code overflow-x-auto rounded-md border p-4 text-sm">
        {`git clone ${info.clone_url}
cd ${info.name.split("/").pop()}
git add .
git commit -m "Initial commit"
git push -u origin HEAD`}
      </pre>
      <Button variant="outline" size="sm" className="w-fit" onClick={() => navigator.clipboard.writeText(info.clone_url)}>
        Copy clone URL
      </Button>
    </div>
  );
}
