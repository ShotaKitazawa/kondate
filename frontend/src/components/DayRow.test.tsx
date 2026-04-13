import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DayRow } from "./DayRow";
import type { DayEntry } from "../api";

const baseDay: DayEntry = {
  id: "day-1",
  block_id: "block-1",
  date: "2026-04-11",
  note: null,
  lunch: null,
  dinner: null,
};

describe("DayRow", () => {
  it("日付をフォーマットして表示する", () => {
    render(<DayRow day={baseDay} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/4\/11/)).toBeInTheDocument();
  });

  it("昼と夜のフィールドを表示する", () => {
    render(<DayRow day={baseDay} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("昼")).toBeInTheDocument();
    expect(screen.getByText("夜")).toBeInTheDocument();
  });

  it("日メモがある場合は目立つ表示になる", () => {
    const dayWithNote = { ...baseDay, note: "各自" };
    render(<DayRow day={dayWithNote} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("各自")).toBeInTheDocument();
  });

  it("昼フィールドを編集して保存すると onUpdate が呼ばれる", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<DayRow day={baseDay} onUpdate={onUpdate} onDelete={vi.fn()} />);

    const lunchPlaceholder = screen.getAllByText("入力...")[0];
    await user.click(lunchPlaceholder);
    await user.type(screen.getByRole("textbox"), "カレー");
    await user.keyboard("{Enter}");

    expect(onUpdate).toHaveBeenCalledWith("day-1", { lunch: "カレー" });
  });

  it("削除ボタンで onDelete が呼ばれる", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<DayRow day={baseDay} onUpdate={vi.fn()} onDelete={onDelete} canDelete={true} />);

    await user.click(screen.getByRole("button", { name: /削除/ }));

    expect(onDelete).toHaveBeenCalledWith("day-1");
  });
});
