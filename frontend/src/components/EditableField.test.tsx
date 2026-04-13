import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditableField } from "./EditableField";

describe("EditableField", () => {
  it("表示モード: 値があれば表示する", () => {
    render(<EditableField value="カレー" placeholder="入力..." onSave={vi.fn()} />);
    expect(screen.getByText("カレー")).toBeInTheDocument();
  });

  it("表示モード: 値がなければプレースホルダーを薄く表示する", () => {
    render(<EditableField value="" placeholder="入力..." onSave={vi.fn()} />);
    expect(screen.getByText("入力...")).toBeInTheDocument();
  });

  it("タップで編集モードに切り替わりテキストが入力できる", async () => {
    const user = userEvent.setup();
    render(<EditableField value="カレー" placeholder="入力..." onSave={vi.fn()} />);

    await user.click(screen.getByText("カレー"));

    expect(screen.getByRole("textbox")).toHaveValue("カレー");
  });

  it("Enter キーで onSave が呼ばれ表示モードに戻る", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EditableField value="" placeholder="入力..." onSave={onSave} />);

    await user.click(screen.getByText("入力..."));
    await user.type(screen.getByRole("textbox"), "肉じゃが");
    await user.keyboard("{Enter}");

    expect(onSave).toHaveBeenCalledWith("肉じゃが");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("フォーカスアウトで onSave が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EditableField value="" placeholder="入力..." onSave={onSave} />);

    await user.click(screen.getByText("入力..."));
    await user.type(screen.getByRole("textbox"), "シチュー");
    await user.tab();

    expect(onSave).toHaveBeenCalledWith("シチュー");
  });

  it("disabled のとき編集モードに切り替わらない", async () => {
    const user = userEvent.setup();
    render(<EditableField value="カレー" placeholder="入力..." onSave={vi.fn()} disabled />);

    await user.click(screen.getByText("カレー"));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
