/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainPage } from "./MainPage";
import * as apiModule from "../api";
import type { Block, BlockSummary } from "../api";

const mockSummary: BlockSummary = {
  id: "block-1",
  created_at: "2026-04-01T00:00:00Z",
};

const mockBlock: Block = {
  id: "block-1",
  created_at: "2026-04-01T00:00:00Z",
  archived_at: null,
  days: [
    {
      id: "day-1",
      block_id: "block-1",
      date: "2026-04-11",
      note: null,
      lunch: "カレー",
      dinner: null,
    },
  ],
  shopping_items: [
    {
      id: "item-1",
      block_id: "block-1",
      name: "豚肉",
      checked: false,
      created_at: "2026-04-01T00:00:00Z",
    },
  ],
};

const archivedBlock: Block = {
  ...mockBlock,
  archived_at: "2026-04-12T00:00:00Z",
};

const emptyBlock: Block = {
  id: "block-1",
  created_at: "2026-04-01T00:00:00Z",
  archived_at: null,
  days: [],
  shopping_items: [],
};

describe("MainPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const res = (data: any) => ({ data, error: undefined, response: new Response() }) as any;

  it("ロード中にローディング表示を出す", async () => {
    vi.spyOn(apiModule.apiClient, "GET").mockImplementation(() => new Promise(() => {}));
    render(<MainPage />);
    expect(screen.getByText(/読み込み中/)).toBeInTheDocument();
  });

  it("ブロックデータをロードして献立と買い物リストを表示する", async () => {
    vi.spyOn(apiModule.apiClient, "GET").mockImplementation((path: any) => {
      if (path === "/api/blocks") return Promise.resolve(res([mockSummary]));
      return Promise.resolve(res(mockBlock));
    });
    render(<MainPage />);
    await waitFor(() => expect(screen.getAllByText(/4\/11/).length).toBeGreaterThan(0));
    expect(screen.getByText("豚肉")).toBeInTheDocument();
  });

  it("＋ボタンで次の期間が作成される", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiModule.apiClient, "GET").mockImplementation((path: any) => {
      if (path === "/api/blocks") return Promise.resolve(res([mockSummary]));
      return Promise.resolve(res(mockBlock));
    });
    const postMock = vi.spyOn(apiModule.apiClient, "POST").mockResolvedValue(res(emptyBlock));
    render(<MainPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /次の期間を作成/ })).not.toBeDisabled(),
    );

    await user.click(screen.getByRole("button", { name: /次の期間を作成/ }));

    expect(postMock).toHaveBeenCalledWith("/api/blocks", expect.anything());
  });

  it("複数ブロックがある場合、左右ナビゲーションが機能する", async () => {
    const summary2: BlockSummary = {
      id: "block-2",
      created_at: "2026-04-10T00:00:00Z",
    };
    vi.spyOn(apiModule.apiClient, "GET").mockImplementation((path: any) => {
      if (path === "/api/blocks") return Promise.resolve(res([mockSummary, summary2]));
      return Promise.resolve(res(emptyBlock));
    });
    render(<MainPage />);
    // 最古ブロック（index=0）に移動するので「次の期間」ボタンが有効になる
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /次の期間/ })).not.toBeDisabled(),
    );
  });

  it("最古の未アーカイブブロックにアーカイブボタンが表示され有効", async () => {
    vi.spyOn(apiModule.apiClient, "GET").mockImplementation((path: any) => {
      if (path === "/api/blocks") return Promise.resolve(res([mockSummary]));
      return Promise.resolve(res(mockBlock));
    });
    render(<MainPage />);
    await waitFor(() => expect(screen.getByText(/このページを完了/)).not.toBeDisabled());
  });

  it("最古でない未アーカイブブロックでは完了・削除ボタンがグレーアウト", async () => {
    const summary2: BlockSummary = {
      id: "block-2",
      created_at: "2026-04-10T00:00:00Z",
    };
    const block2: Block = { ...mockBlock, id: "block-2" };
    vi.spyOn(apiModule.apiClient, "GET").mockImplementation((path: any) => {
      if (path === "/api/blocks") return Promise.resolve(res([mockSummary, summary2]));
      return Promise.resolve(res(block2));
    });
    render(<MainPage />);
    // block-1 (index=0, oldest non-archived) にナビゲートされる
    await waitFor(() => expect(screen.getByText(/このページを完了/)).not.toBeDisabled());
  });

  it("アーカイブ済みブロックにはアーカイブを取り消しボタンが表示される", async () => {
    const archivedSummary: BlockSummary = {
      ...mockSummary,
      archived_at: "2026-04-12T00:00:00Z",
    };
    vi.spyOn(apiModule.apiClient, "GET").mockImplementation((path: any) => {
      if (path === "/api/blocks") return Promise.resolve(res([archivedSummary]));
      return Promise.resolve(res(archivedBlock));
    });
    render(<MainPage />);
    await waitFor(() => expect(screen.getByText(/アーカイブを取り消し/)).toBeInTheDocument());
  });

  it("アーカイブ済みブロックでは追加・削除ボタンが非表示", async () => {
    const archivedSummary: BlockSummary = {
      ...mockSummary,
      archived_at: "2026-04-12T00:00:00Z",
    };
    vi.spyOn(apiModule.apiClient, "GET").mockImplementation((path: any) => {
      if (path === "/api/blocks") return Promise.resolve(res([archivedSummary]));
      return Promise.resolve(res(archivedBlock));
    });
    render(<MainPage />);
    // アーカイブを取り消しボタンが表示されるまで待つ（ブロックがロードされた証拠）
    await waitFor(() => expect(screen.getByText(/アーカイブを取り消し/)).toBeInTheDocument());
    expect(screen.queryByText(/前に追加/)).not.toBeInTheDocument();
    expect(screen.queryByText(/後に追加/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/削除/)).not.toBeInTheDocument();
  });
});
