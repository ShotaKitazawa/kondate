import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShoppingItemRow } from "./ShoppingItem";
import type { ShoppingItem } from "../api";

const baseItem: ShoppingItem = {
  id: "item-1",
  block_id: "block-1",
  name: "豚肉",
  checked: false,
  created_at: "2026-04-11T00:00:00Z",
};

describe("ShoppingItemRow", () => {
  it("アイテム名を表示する", () => {
    render(
      <ShoppingItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onUpdateNote={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("豚肉")).toBeInTheDocument();
  });

  it("未チェックのチェックボックスを表示する", () => {
    render(
      <ShoppingItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onUpdateNote={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("チェック済みアイテムはチェックボックスがチェック状態で打ち消し線が付く", () => {
    const checkedItem = { ...baseItem, checked: true };
    render(
      <ShoppingItemRow
        item={checkedItem}
        onToggle={vi.fn()}
        onUpdateNote={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByText("豚肉")).toHaveClass("checked");
  });

  it("チェックボックスをクリックすると onToggle が呼ばれる", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ShoppingItemRow
        item={baseItem}
        onToggle={onToggle}
        onUpdateNote={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledWith("item-1", true);
  });

  it("削除ボタンをクリックすると onDelete が呼ばれる", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <ShoppingItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onUpdateNote={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: /削除/ }));

    expect(onDelete).toHaveBeenCalledWith("item-1");
  });
});
