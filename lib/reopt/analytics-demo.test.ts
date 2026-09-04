import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ANALYTICS_DEMO_COHORTS,
  buildAnalyticsDemoJourneys,
  summarizeAnalyticsDemo,
} from "./analytics-demo";

function deviceIds() {
  let index = 0;
  return () => `00000000-0000-4000-8000-${String(index++).padStart(12, "0")}`;
}

describe("analytics demo journeys", () => {
  it("creates distinct devices and deliberately different conversion rates", () => {
    const journeys = buildAnalyticsDemoJourneys("test-run", deviceIds());
    const summary = summarizeAnalyticsDemo(journeys);

    assert.equal(
      summary.journeys,
      ANALYTICS_DEMO_COHORTS.reduce((sum, cohort) => sum + cohort.visitors, 0),
    );
    assert.equal(
      new Set(journeys.map((journey) => journey.deviceId)).size,
      journeys.length,
    );
    assert.equal(summary.channels, ANALYTICS_DEMO_COHORTS.length);
    assert.ok(
      summary.eventCounts["product.viewed"] > summary.eventCounts["cart.added"],
    );
    assert.ok(
      summary.eventCounts["cart.added"] >
        summary.eventCounts["checkout.started"],
    );
    assert.ok(
      summary.eventCounts["checkout.started"] >
        summary.eventCounts["order.completed"],
    );
    assert.equal(
      summary.eventCounts["checkout.submitted"],
      summary.eventCounts["order.completed"],
    );
  });

  it("starts every journey with attributable page and product views", () => {
    const journeys = buildAnalyticsDemoJourneys("property-run", deviceIds());

    for (const journey of journeys) {
      assert.equal(journey.events[0]?.name, "$pageview");
      assert.equal(journey.events[1]?.name, "product.viewed");
      assert.equal(journey.events[0]?.properties.demo_run_id, "property-run");
      assert.equal(journey.events[0]?.properties.path, "/products/:slug");
      assert.equal(journey.events[1]?.properties.funnel_stage, "viewed");
      assert.equal(typeof journey.events[1]?.properties.category, "string");
      assert.equal(typeof journey.events[1]?.properties.price_band, "string");
    }
  });

  it("contains no personal-data property vocabulary", () => {
    const keys = new Set(
      buildAnalyticsDemoJourneys("privacy-run", deviceIds()).flatMap(
        (journey) =>
          journey.events.flatMap((event) => Object.keys(event.properties)),
      ),
    );

    for (const forbidden of [
      "email",
      "first_name",
      "last_name",
      "address",
      "phone",
    ]) {
      assert.equal(keys.has(forbidden), false);
    }
  });
});
