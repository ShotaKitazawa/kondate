import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { ShoppingItem } from "../api";
import { ShoppingItemRow } from "./ShoppingItem";

interface Props {
  items: ShoppingItem[];
  onAdd: (name: string) => void;
  onToggle: (id: string, checked: boolean) => void;
  onUpdateNote: (id: string, note: string | null) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  disabled?: boolean;
}

export function ShoppingSection({
  items,
  onAdd,
  onToggle,
  onUpdateNote,
  onDelete,
  onReorder,
  disabled,
}: Props) {
  const [input, setInput] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const handleAdd = () => {
    const name = input.trim();
    if (!name) return;
    onAdd(name);
    setInput("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered.map((i) => i.id));
  };

  return (
    <section>
      <h2>買い物リスト</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="shopping-list">
            {items.map((item) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onToggle={onToggle}
                onUpdateNote={onUpdateNote}
                onDelete={onDelete}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="shopping-add">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="アイテムを追加..."
          disabled={disabled}
        />
        <button disabled={disabled || !input.trim()} onClick={handleAdd}>
          +
        </button>
      </div>
    </section>
  );
}
