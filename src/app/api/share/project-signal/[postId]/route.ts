import { NextResponse } from "next/server";

import { buildProjectSignalShareSvg } from "@/lib/share-card";
import { getFeedItemById } from "@/server/repositories/feed";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const post = await getFeedItemById(postId);

  if (!post?.projectSignal || post.contentType !== "project_signal") {
    return NextResponse.json(
      { error: "Project Signal not found." },
      { status: 404 },
    );
  }

  return new NextResponse(
    buildProjectSignalShareSvg({
      title: post.title,
      authorName: post.authorName,
      projectSignal: post.projectSignal,
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    },
  );
}
