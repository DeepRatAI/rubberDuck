"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { followProfile } from "@/app/actions";
import { Button } from "./ui/button";

export function FollowButton({
  profileUserId,
  initiallyFollowing,
  followLabel = "Follow",
  followingLabel = "Following",
  errorLabel = "Follow failed.",
}: {
  profileUserId: string;
  initiallyFollowing: boolean;
  followLabel?: string;
  followingLabel?: string;
  errorLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-1">
      <Button
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(() => {
            void followProfile({ profileUserId })
              .then((result) => {
                setFollowing(result.following);
                router.refresh();
              })
              .catch((caught: unknown) => {
                setError(caught instanceof Error ? caught.message : errorLabel);
              });
          });
        }}
      >
        {following ? followingLabel : followLabel}
      </Button>
      {error ? <p className="text-xs text-amber-700">{error}</p> : null}
    </div>
  );
}
