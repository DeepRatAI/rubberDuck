import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const primaryRoutes = [
  { path: "/?lang=en", name: "landing" },
  { path: "/app?lang=en", name: "home" },
  { path: "/binnacle?lang=en", name: "binnacle" },
  { path: "/courses?lang=en", name: "courses" },
  { path: "/u/alexchen?lang=en", name: "identity hub" },
  {
    path: "/courses/building-an-llm-app-with-rag?lang=en",
    name: "course reader",
  },
];

test.describe("accessibility and mobile layout", () => {
  for (const route of primaryRoutes) {
    test(`${route.name} has no critical automated accessibility issues`, async ({
      page,
    }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude("iframe")
        .analyze();

      expect(results.violations, {
        message: JSON.stringify(
          results.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.map((node) => node.target),
          })),
          null,
          2,
        ),
      }).toEqual([]);
    });

    test(`${route.name} does not create horizontal overflow`, async ({
      page,
    }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        const viewport = root.clientWidth;
        const offenders = [...document.querySelectorAll("body *")]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              target:
                element.id ||
                element.getAttribute("aria-label") ||
                element.tagName.toLowerCase(),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
            };
          })
          .filter((item) => item.right > viewport + 2 || item.left < -2);

        return {
          pixels: root.scrollWidth - viewport,
          offenders,
        };
      });

      if (overflow.pixels > 2) {
        expect(overflow.offenders, {
          message: `Horizontal overflow: ${overflow.pixels}px`,
        }).toEqual([]);
      }
      expect(overflow.pixels).toBeLessThanOrEqual(16);
    });
  }
});

test.describe("performance budgets", () => {
  const budgets = [
    { path: "/?lang=en", name: "landing", dclMs: 4500, bytes: 6_000_000 },
    { path: "/app?lang=en", name: "home", dclMs: 6500, bytes: 8_500_000 },
    {
      path: "/binnacle?lang=en",
      name: "binnacle",
      dclMs: 6500,
      bytes: 8_500_000,
    },
    {
      path: "/courses?lang=en",
      name: "courses",
      dclMs: 6000,
      bytes: 7_500_000,
    },
    {
      path: "/courses/new?lang=en",
      name: "course studio",
      dclMs: 8500,
      bytes: 12_000_000,
    },
  ];

  for (const budget of budgets) {
    test(`${budget.name} stays inside initial load budget`, async ({
      page,
    }) => {
      await page.goto(budget.path, { waitUntil: "networkidle" });

      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined;
        const resources = performance.getEntriesByType(
          "resource",
        ) as PerformanceResourceTiming[];

        return {
          domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? 0,
          transferBytes: resources.reduce(
            (total, resource) => total + (resource.transferSize || 0),
            navigation?.transferSize ?? 0,
          ),
        };
      });

      expect(metrics.domContentLoadedMs).toBeLessThanOrEqual(budget.dclMs);
      expect(metrics.transferBytes).toBeLessThanOrEqual(budget.bytes);
    });
  }
});
