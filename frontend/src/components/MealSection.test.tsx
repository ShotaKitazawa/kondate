import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MealSection } from "./MealSection";
import type { DayEntry } from "../api";

const baseDay: DayEntry = {
  id: "day-1",
  block_id: "block-1",
  date: "2026-04-11",
  note: null,
  lunch: null,
  dinner: null,
};

describe("MealSection", () => {
  it("日がない場合は「日を追加」ボタンと案内文を表示する", () => {
    render(
      <MealSection
        days={[]}
        onAddDay={vi.fn()}
        onUpdateDay={vi.fn()}
        onDeleteDay={vi.fn()}
        canAdd={true}
      />,
    );
    expect(screen.getByRole("button", { name: /日を追加/ })).toBeInTheDocument();
    expect(screen.getByText(/献立がまだありません/)).toBeInTheDocument();
  });

  it("日がある場合はセクションタイトルを表示する", () => {
    render(
      <MealSection
        days={[baseDay]}
        onAddDay={vi.fn()}
        onUpdateDay={vi.fn()}
        onDeleteDay={vi.fn()}
      />,
    );
    expect(screen.getByText("献立")).toBeInTheDocument();
  });

  it("日が渡されると DayRow を表示する", () => {
    render(
      <MealSection
        days={[baseDay]}
        onAddDay={vi.fn()}
        onUpdateDay={vi.fn()}
        onDeleteDay={vi.fn()}
      />,
    );
    expect(screen.getByText(/4\/11/)).toBeInTheDocument();
  });

  it("複数の日を表示する", () => {
    const days: DayEntry[] = [
      { ...baseDay, id: "day-1", date: "2026-04-11" },
      { ...baseDay, id: "day-2", date: "2026-04-12" },
    ];
    render(
      <MealSection days={days} onAddDay={vi.fn()} onUpdateDay={vi.fn()} onDeleteDay={vi.fn()} />,
    );
    expect(screen.getByText(/4\/11/)).toBeInTheDocument();
    expect(screen.getByText(/4\/12/)).toBeInTheDocument();
  });

  it("「日を追加」ボタンを押すと onAddDay が呼ばれる", async () => {
    const user = userEvent.setup();
    const onAddDay = vi.fn();
    render(
      <MealSection
        days={[]}
        onAddDay={onAddDay}
        onUpdateDay={vi.fn()}
        onDeleteDay={vi.fn()}
        canAdd={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: /日を追加/ }));

    expect(onAddDay).toHaveBeenCalledTimes(1);
  });

  it("disabled のとき「日を追加」ボタンが無効化される", () => {
    render(
      <MealSection
        days={[]}
        onAddDay={vi.fn()}
        onUpdateDay={vi.fn()}
        onDeleteDay={vi.fn()}
        canAdd={true}
        disabled={true}
      />,
    );
    expect(screen.getByRole("button", { name: /日を追加/ })).toBeDisabled();
  });
});
