import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShoppingSection } from "./ShoppingSection";
import type { ShoppingItem } from "../api";

const baseItem = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: "item-1",
  block_id: "block-1",
  name: "豚肉",
  checked: false,
  created_at: "2026-04-11T00:00:00Z",
  ...overrides,
});

describe("ShoppingSection", () => {
  it("セクションタイトルを表示する", () => {
    render(
      <ShoppingSection
        items={[]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onUpdateName={vi.fn()}
        onUpdateNote={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("買い物リスト")).toBeInTheDocument();
  });

  it("アイテムを表示する", () => {
    const item = baseItem({ name: "玉ねぎ" });
    render(
      <ShoppingSection
        items={[item]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onUpdateName={vi.fn()}
        onUpdateNote={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("玉ねぎ")).toBeInTheDocument();
  });

  it("別のアイテムも表示する", () => {
    const item = baseItem({ id: "item-2", name: "シャンプー" });
    render(
      <ShoppingSection
        items={[item]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onUpdateName={vi.fn()}
        onUpdateNote={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("シャンプー")).toBeInTheDocument();
  });

  it("入力フォームで Enter を押すと onAdd が呼ばれる", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <ShoppingSection
        items={[]}
        onAdd={onAdd}
        onToggle={vi.fn()}
        onUpdateName={vi.fn()}
        onUpdateNote={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("アイテムを追加...");
    await user.type(input, "にんじん{Enter}");

    expect(onAdd).toHaveBeenCalledWith("にんじん");
  });

  it("+ ボタンを押すと onAdd が呼ばれる", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <ShoppingSection
        items={[]}
        onAdd={onAdd}
        onToggle={vi.fn()}
        onUpdateName={vi.fn()}
        onUpdateNote={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("アイテムを追加...");
    await user.type(input, "洗剤");
    await user.click(screen.getByRole("button", { name: "+" }));

    expect(onAdd).toHaveBeenCalledWith("洗剤");
  });

  it("追加後に入力フォームがクリアされる", async () => {
    const user = userEvent.setup();
    render(
      <ShoppingSection
        items={[]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onUpdateName={vi.fn()}
        onUpdateNote={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("アイテムを追加...");
    await user.type(input, "にんじん{Enter}");

    expect(input).toHaveValue("");
  });

  it("空文字では onAdd が呼ばれない", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <ShoppingSection
        items={[]}
        onAdd={onAdd}
        onToggle={vi.fn()}
        onUpdateName={vi.fn()}
        onUpdateNote={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("アイテムを追加...");
    await user.type(input, "{Enter}");

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("disabled のときフォームと + ボタンが無効化される", () => {
    render(
      <ShoppingSection
        items={[]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onUpdateName={vi.fn()}
        onUpdateNote={vi.fn()}
        onReorder={vi.fn()}
        onDelete={vi.fn()}
        disabled={true}
      />,
    );

    expect(screen.getByPlaceholderText("アイテムを追加...")).toBeDisabled();
    expect(screen.getByRole("button", { name: "+" })).toBeDisabled();
  });
});
