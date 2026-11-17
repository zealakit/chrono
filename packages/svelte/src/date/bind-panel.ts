import type {
  PanelCell,
  PanelController,
  PanelDay,
  PanelState,
} from "@zealakit/chrono-core/date";
import {
  type WeekdayHeader,
  focusDateCell,
  plainDate,
  toIsoString,
} from "@zealakit/chrono-core/foundation";
import { tick } from "svelte";
import type { Readable } from "../shared/readable.js";
import { type Props, modifiersOf, toProps } from "../shared/props.js";

/** The `data-chrono-key` of the cell that holds the tab stop at the current level. */
function focusKeyOf(state: PanelState): string {
  const { focusedDate, level } = state;
  return level === "day"
    ? toIsoString(focusedDate)
    : level === "month"
      ? `${focusedDate.year}-${String(focusedDate.month).padStart(2, "0")}`
      : String(focusedDate.year);
}

// biome-ignore lint/suspicious/noExplicitAny: the three panels share one binding
export function bindPanel(controller: PanelController<any, any>) {
  const state: Readable<PanelState> = {
    subscribe(run) {
      run(controller.getState());
      return controller.subscribe(run);
    },
  };
  let root: HTMLElement | null = null;
  let keyboardMove = false;
  let focusedOnMount = false;

  controller.subscribe(async (next) => {
    if (!keyboardMove) return;
    await tick();
    if (root) focusDateCell(root, focusKeyOf(next));
    keyboardMove = false;
  });

  const keyHandler = (focus: () => void) => (event: KeyboardEvent) => {
    focus();
    keyboardMove = true;
    if (controller.handleKeyDown(event.key, modifiersOf(event))) {
      event.preventDefault();
      // Escape is stopped only when it cancelled something (A18).
      if (event.key === "Escape") event.stopPropagation();
    } else {
      keyboardMove = false;
    }
  };

  return {
    state,
    controller,
    /** Called from an effect after mount; `autoFocus` is opt-in (A8). */
    setRoot(element: HTMLElement | null) {
      root = element;
      if (element && !focusedOnMount) {
        focusedOnMount = true;
        const first = controller.getState();
        if (first.autoFocus) focusDateCell(element, focusKeyOf(first));
      }
    },
    actions: {
      prev: controller.prev,
      next: controller.next,
      today: controller.today,
      clear: controller.clear,
      commit: controller.commit,
      setLevel: controller.setLevel,
    },
    getRootProps: (): Props => ({
      ...toProps(controller.getRootAttributes()),
      onkeyup: () => {
        keyboardMove = false;
      },
      onmouseleave: () => {
        if (controller.getState().draft) controller.setPreview(null);
      },
    }),
    getTitleProps: (): Props => toProps(controller.getTitleAttributes()),
    getLevelButtonProps: (): Props => ({
      ...toProps(controller.getLevelButtonAttributes()),
      onclick: () => {
        const current = controller.getState();
        if (current.canGoUp) {
          controller.setLevel(current.level === "day" ? "month" : "year");
        }
      },
    }),
    getNavProps: (kind: "prev" | "next"): Props => ({
      ...toProps(controller.getNavAttributes(kind)),
      onclick: controller[kind],
    }),
    getTodayButtonProps: (): Props => ({
      ...toProps(controller.getTodayButtonAttributes()),
      onclick: controller.today,
    }),
    getGridProps: (): Props => toProps(controller.getGridAttributes()),
    getColumnHeaderProps: (header: WeekdayHeader): Props =>
      toProps(controller.getColumnHeaderAttributes(header)),
    getWeekNumberProps: (weekNumber: number): Props =>
      toProps(controller.getWeekNumberAttributes(weekNumber)),
    getCellProps: (day: PanelDay): Props => {
      const attributes = toProps(controller.getCellAttributes(day));
      if (day.hidden) return attributes;
      return {
        ...attributes,
        onclick: (event: MouseEvent) => {
          if (controller.getState().kind === "multi" && event.shiftKey) {
            controller.extendTo(day.date);
          } else {
            controller.pick(day.date, "pointer");
          }
        },
        onmouseenter: () => {
          if (controller.getState().draft) controller.setPreview(day.date);
        },
        onkeydown: keyHandler(() => controller.focusDate(day.date)),
      };
    },
    getLevelCellProps: (cell: PanelCell): Props => {
      const date = plainDate(cell.year, cell.month, 1);
      return {
        ...toProps(controller.getLevelCellAttributes(cell)),
        onclick: () => controller.pick(date, "pointer"),
        onkeydown: keyHandler(() => controller.focusDate(date)),
      };
    },
  };
}
