import { NextResponse } from "next/server";

import {
  buildCourseNotebook,
  buildNotebookFileName,
} from "@/lib/notebook-export";
import { getCurrentUserId } from "@/server/current-user";
import { getCourseBySlug } from "@/server/repositories/courses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const [{ slug }, userId] = await Promise.all([params, getCurrentUserId()]);
  const course = await getCourseBySlug(slug, userId);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const notebook = buildCourseNotebook(course);
  const fileName = buildNotebookFileName(course);

  return new NextResponse(JSON.stringify(notebook, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/x-ipynb+json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
