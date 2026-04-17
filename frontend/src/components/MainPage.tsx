import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../api";
import type { Block, BlockSummary } from "../api";
import { MealSection } from "./MealSection";
import { ShoppingSection } from "./ShoppingSection";
import { AddDayDialog } from "./AddDayDialog";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  getToken?: () => Promise<string | null>;
}

const toLocalDateString = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function MainPage({ getToken }: Props) {
  const [blockList, setBlockList] = useState<BlockSummary[]>([]);
  const [blockIndex, setBlockIndex] = useState(-1);
  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDayDialog, setAddDayDialog] = useState<{
    defaultDate: string;
  } | null>(null);
  const [confirmDeleteDay, setConfirmDeleteDay] = useState<string | null>(null);
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState(false);

  // Auth middleware
  useEffect(() => {
    if (!getToken) return;
    const middleware = {
      async onRequest({ request }: { request: Request }) {
        const token = await getToken();
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
        return request;
      },
    };
    apiClient.use(middleware);
    return () => apiClient.eject(middleware);
  }, [getToken]);

  // ブロック一覧を読み込む
  const loadBlockList = useCallback(
    async (opts: { goToLast?: boolean; goToOldestNonArchived?: boolean } = {}) => {
      const { data } = await apiClient.GET("/api/blocks");
      if (!data) return;

      if (data.length === 0) {
        // 初回アクセス: ブロックを自動作成
        await apiClient.GET("/api/blocks/current");
        const { data: data2 } = await apiClient.GET("/api/blocks");
        if (!data2) return;
        setBlockList(data2);
        setBlockIndex(0);
        return;
      }

      setBlockList(data);

      if (opts.goToLast) {
        setBlockIndex(data.length - 1);
      } else if (opts.goToOldestNonArchived) {
        const idx = data.findIndex((b) => !b.archived_at);
        setBlockIndex(idx >= 0 ? idx : 0);
      }
      // それ以外はblockIndexを維持（setBlockListの変更でuseEffectが再実行される）
    },
    [],
  );

  // 初回ロード: 未アーカイブの最古ブロックへ移動
  useEffect(() => {
    loadBlockList({ goToOldestNonArchived: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // blockIndex変更時にブロック詳細を取得
  useEffect(() => {
    if (blockIndex < 0 || blockList.length === 0) return;
    const id = blockList[blockIndex].id;
    setLoading(true);
    apiClient.GET("/api/blocks/{id}", { params: { path: { id } } }).then(({ data }) => {
      if (data) setBlock(data);
      setLoading(false);
    });
  }, [blockIndex, blockList]);

  const refresh = useCallback(async () => {
    if (blockIndex < 0 || blockList.length === 0) return;
    const id = blockList[blockIndex].id;
    const { data } = await apiClient.GET("/api/blocks/{id}", {
      params: { path: { id } },
    });
    if (data) setBlock(data);
  }, [blockIndex, blockList]);

  // 10秒ごとに自動リフレッシュ（タブが表示中のみ）
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  // 計算値
  const isFirst = blockIndex === 0;
  const isLast = blockIndex === blockList.length - 1;
  const isArchived = !!block?.archived_at;
  const oldestNonArchivedIdx = blockList.findIndex((b) => !b.archived_at);
  const isOldestNonArchived = oldestNonArchivedIdx >= 0 && blockIndex === oldestNonArchivedIdx;
  const newestArchivedIdx = (() => {
    for (let i = blockList.length - 1; i >= 0; i--) {
      if (blockList[i].archived_at) return i;
    }
    return -1;
  })();
  const isNewestArchived = newestArchivedIdx >= 0 && blockIndex === newestArchivedIdx;
  const canEditDays = isLast && !isArchived;
  const canEditShopping = !isArchived;

  // Navigation
  const handleGoLeft = () => setBlockIndex((i) => Math.max(0, i - 1));

  const handleGoRight = async () => {
    if (isLast) {
      // ＋ボタン: 新しいブロックを作成（アーカイブなし）
      const lastDay = block?.days[block.days.length - 1]?.date ?? null;
      const { data: newBlock } = await apiClient.POST("/api/blocks", {});
      if (newBlock && lastDay) {
        const d = new Date(lastDay + "T00:00:00");
        d.setDate(d.getDate() + 1);
        await apiClient.POST("/api/days", {
          body: { block_id: newBlock.id, date: toLocalDateString(d) },
        });
      }
      await loadBlockList({ goToLast: true });
    } else {
      setBlockIndex((i) => i + 1);
    }
  };

  // アーカイブ・アーカイブ解除
  const handleArchiveBlock = async () => {
    if (!block) return;
    await apiClient.POST("/api/blocks/{id}/archive", {
      params: { path: { id: block.id } },
    });
    const { data } = await apiClient.GET("/api/blocks");
    if (data) setBlockList(data);
    await refresh();
  };

  const handleUnarchiveBlock = async () => {
    if (!block) return;
    await apiClient.POST("/api/blocks/{id}/unarchive", {
      params: { path: { id: block.id } },
    });
    const { data } = await apiClient.GET("/api/blocks");
    if (data) setBlockList(data);
    await refresh();
  };

  // ブロック削除
  const handleDeleteBlock = async () => {
    if (!block) return;
    await apiClient.DELETE("/api/blocks/{id}", {
      params: { path: { id: block.id } },
    });
    setConfirmDeleteBlock(false);
    const { data } = await apiClient.GET("/api/blocks");
    if (!data) return;
    setBlockList(data);
    if (data.length === 0) {
      setBlockIndex(-1);
      setBlock(null);
    } else {
      setBlockIndex(data.length - 1);
    }
  };

  // Day operations
  const handleAddDay = async () => {
    if (!block) return;
    const days = block.days;

    if (days.length === 0) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setAddDayDialog({ defaultDate: toLocalDateString(d) });
      return;
    }

    const d = new Date(days[days.length - 1].date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    await apiClient.POST("/api/days", {
      body: { block_id: block.id, date: toLocalDateString(d) },
    });
    refresh();
  };

  const handleConfirmAddDay = async (date: string) => {
    if (!block) return;
    await apiClient.POST("/api/days", { body: { block_id: block.id, date } });
    setAddDayDialog(null);
    refresh();
  };

  const handleUpdateDay = async (
    id: string,
    fields: {
      note?: string | null;
      lunch?: string | null;
      dinner?: string | null;
    },
  ) => {
    await apiClient.PUT("/api/days/{id}", {
      params: { path: { id } },
      body: fields,
    });
    refresh();
  };

  const handleDeleteDay = async (id: string) => {
    await apiClient.DELETE("/api/days/{id}", { params: { path: { id } } });
    setConfirmDeleteDay(null);
    refresh();
  };

  // Shopping operations
  const handleAddShopping = async (name: string) => {
    if (!block) return;
    await apiClient.POST("/api/shopping", {
      body: { block_id: block.id, name },
    });
    refresh();
  };

  const handleToggleShopping = async (id: string, checked: boolean) => {
    await apiClient.PUT("/api/shopping/{id}", {
      params: { path: { id } },
      body: { checked },
    });
    refresh();
  };

  const handleUpdateShoppingNote = async (id: string, note: string | null) => {
    await apiClient.PUT("/api/shopping/{id}", {
      params: { path: { id } },
      body: { note },
    });
    refresh();
  };

  const handleReorderShopping = async (ids: string[]) => {
    await apiClient.POST("/api/shopping/reorder", { body: { ids } });
    refresh();
  };

  const handleDeleteShopping = async (id: string) => {
    await apiClient.DELETE("/api/shopping/{id}", { params: { path: { id } } });
    refresh();
  };

  // Header label
  const periodLabel = (() => {
    if (!block || block.days.length === 0) return "献立なし";
    const dates = block.days.map((d) => d.date);
    const first = dates[0];
    const last = dates[dates.length - 1];
    const fmt = (s: string) => {
      const d = new Date(s + "T00:00:00");
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };
    return first === last ? fmt(first) : `${fmt(first)} 〜 ${fmt(last)}`;
  })();

  if (loading && !block) return <div className="loading-screen">読み込み中...</div>;

  return (
    <>
      <header>
        <div className="header-nav">
          <button
            className="nav-btn"
            onClick={handleGoLeft}
            disabled={isFirst}
            aria-label="前の期間"
          >
            ←
          </button>
          <div className="header-center">
            <span className="period-label">{periodLabel}</span>
            {isArchived && <span className="archived-badge">済</span>}
          </div>
          <button
            className={`nav-btn${isLast ? " nav-btn-new" : ""}`}
            onClick={handleGoRight}
            disabled={
              isLast && (!block || (block.days.length === 0 && block.shopping_items.length === 0))
            }
            aria-label={isLast ? "次の期間を作成" : "次の期間"}
          >
            {isLast ? "＋" : "→"}
          </button>
        </div>

        {(!isArchived || isNewestArchived) && (
          <div className="header-actions">
            {isNewestArchived && (
              <button className="complete-btn" onClick={handleUnarchiveBlock}>
                アーカイブを取り消し
              </button>
            )}
            {!isArchived && (
              <>
                <button
                  className="complete-btn"
                  onClick={handleArchiveBlock}
                  disabled={!isOldestNonArchived}
                  title={
                    !isOldestNonArchived ? "完了できるのは一番古い未完了ページのみです" : undefined
                  }
                >
                  このページを完了
                </button>
                <button
                  className="btn-danger-text"
                  onClick={() => setConfirmDeleteBlock(true)}
                  disabled={!isLast}
                  title={!isLast ? "削除できるのは最新ページのみです" : undefined}
                >
                  このページを削除
                </button>
              </>
            )}
          </div>
        )}
      </header>

      <MealSection
        days={block?.days ?? []}
        onAddDay={handleAddDay}
        onUpdateDay={handleUpdateDay}
        onDeleteDay={(id) => setConfirmDeleteDay(id)}
        canAdd={canEditDays}
        disabled={isArchived}
      />

      <ShoppingSection
        items={block?.shopping_items ?? []}
        onAdd={handleAddShopping}
        onToggle={handleToggleShopping}
        onUpdateNote={handleUpdateShoppingNote}
        onReorder={handleReorderShopping}
        onDelete={handleDeleteShopping}
        disabled={!canEditShopping}
      />

      {addDayDialog && (
        <AddDayDialog
          defaultDate={addDayDialog.defaultDate}
          onConfirm={handleConfirmAddDay}
          onCancel={() => setAddDayDialog(null)}
        />
      )}

      {confirmDeleteDay && (
        <ConfirmDialog
          message="この日の献立を削除しますか？"
          onConfirm={() => handleDeleteDay(confirmDeleteDay)}
          onCancel={() => setConfirmDeleteDay(null)}
        />
      )}

      {confirmDeleteBlock && (
        <ConfirmDialog
          message="このページを削除しますか？"
          onConfirm={handleDeleteBlock}
          onCancel={() => setConfirmDeleteBlock(false)}
        />
      )}
    </>
  );
}
