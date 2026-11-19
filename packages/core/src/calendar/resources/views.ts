import type { ViewDefinition } from "../navigation/view-definition.js";
import { layoutResourceTimeGrid } from "./resource-time-grid.js";
import { layoutTimeline } from "./timeline-layout.js";

/**
 * The resource view pack (plan 10 R3/R4): plain data. Pass it as `views` to opt
 * in; the base calendar never imports this module, so apps without resources
 * do not pay for it. No top-level code runs here.
 */
export const resourceViews: Record<string, Omit<ViewDefinition, "id">> = {
  resourceDay: {
    layout: "resource-time-grid",
    length: { days: 1 },
    align: "day",
    layoutBuilder: layoutResourceTimeGrid,
  },
  resourceWeek: {
    layout: "resource-time-grid",
    length: { weeks: 1 },
    align: "week",
    layoutBuilder: layoutResourceTimeGrid,
  },
  timelineDay: {
    layout: "timeline",
    length: { days: 1 },
    align: "day",
    slot: { minutes: 60 },
    headerRows: ["day", "hour"],
    layoutBuilder: layoutTimeline,
  },
  timelineWeek: {
    layout: "timeline",
    length: { weeks: 1 },
    align: "week",
    slot: { days: 1 },
    headerRows: ["week", "day"],
    layoutBuilder: layoutTimeline,
  },
  timelineMonth: {
    layout: "timeline",
    length: { months: 1 },
    align: "month",
    slot: { days: 1 },
    headerRows: ["month", "day"],
    layoutBuilder: layoutTimeline,
  },
};
