"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { markCourseSectionViewed } from "@/app/actions";

export function CourseProgressTelemetry({
  courseId,
  initialViewedSectionIds,
}: {
  courseId: string;
  initialViewedSectionIds: string[];
}) {
  const router = useRouter();
  const observedRef = useRef(new Set(initialViewedSectionIds));

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-course-section-id]"),
    );

    if (!elements.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) {
            continue;
          }

          const sectionId = entry.target.getAttribute("data-course-section-id");

          if (!sectionId || observedRef.current.has(sectionId)) {
            continue;
          }

          observedRef.current.add(sectionId);
          void markCourseSectionViewed({ courseId, sectionId }).then(() => {
            router.refresh();
          });
        }
      },
      { threshold: [0.55, 0.75, 1] },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [courseId, router]);

  return null;
}
