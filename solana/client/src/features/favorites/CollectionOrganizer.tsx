import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useCollectionsStore } from '../../stores/collectionsStore';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { NftTile } from '../../components/NftTile';

const POOL = 'pool';
type Containers = Record<string, string[]>;

/**
 * Multi-container drag-and-drop organizer (dnd-kit). Favorited NFTs start in an
 * "Unsorted" pool and can be dragged into user-created local collections and
 * reordered. Every change persists to the collections store (IndexedDB), and
 * collections are themselves reorderable via their mint lists.
 *
 * Keyboard sensor is wired so the board is fully operable without a mouse.
 */
export function CollectionOrganizer() {
  const favorites = useFavoritesStore((s) => s.mints);
  const collections = useCollectionsStore((s) => s.collections);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);
  const renameCollection = useCollectionsStore((s) => s.renameCollection);
  const setMints = useCollectionsStore((s) => s.setMints);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // Build the live container map: pool = favorites not assigned anywhere.
  const containers = useMemo<Containers>(() => {
    const assigned = new Set(collections.flatMap((c) => c.mints));
    const map: Containers = { [POOL]: favorites.filter((m) => !assigned.has(m)) };
    for (const c of collections) {
      // Only keep mints still favorited so the board stays consistent.
      map[c.id] = c.mints.filter((m) => favorites.includes(m));
    }
    return map;
  }, [favorites, collections]);

  // Local working copy while dragging (committed on drag end).
  const [working, setWorking] = useState<Containers | null>(null);
  const view = working ?? containers;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findContainer = (id: string, map: Containers): string | undefined => {
    if (id in map) return id;
    return Object.keys(map).find((key) => map[key].includes(id));
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setWorking(containers);
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    setWorking((prev) => {
      const map = prev ?? containers;
      const activeContainer = findContainer(String(active.id), map);
      const overContainer = findContainer(String(over.id), map);
      if (!activeContainer || !overContainer || activeContainer === overContainer) return map;

      const activeItems = [...map[activeContainer]];
      const overItems = [...map[overContainer]];
      const movingId = String(active.id);
      const insertIndex =
        over.id in map ? overItems.length : overItems.indexOf(String(over.id));

      return {
        ...map,
        [activeContainer]: activeItems.filter((m) => m !== movingId),
        [overContainer]: [
          ...overItems.slice(0, insertIndex < 0 ? overItems.length : insertIndex),
          movingId,
          ...overItems.slice(insertIndex < 0 ? overItems.length : insertIndex),
        ],
      };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const map = working ?? containers;
    setActiveId(null);

    if (over) {
      const activeContainer = findContainer(String(active.id), map);
      const overContainer = findContainer(String(over.id), map);
      if (activeContainer && overContainer && activeContainer === overContainer) {
        const items = map[activeContainer];
        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over.id));
        if (oldIndex !== newIndex && newIndex >= 0) {
          map[activeContainer] = arrayMove(items, oldIndex, newIndex);
        }
      }
    }

    // Persist every collection's mint list (the pool is implicit).
    for (const c of collections) {
      setMints(c.id, map[c.id] ?? []);
    }
    setWorking(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) {
              createCollection(newName.trim());
              setNewName('');
            }
          }}
        >
          <input
            className="input max-w-xs"
            placeholder="New collection name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="New collection name"
          />
          <button type="submit" className="btn-primary">
            + Add collection
          </button>
        </form>

        <DroppableColumn id={POOL} title="Unsorted favorites" items={view[POOL]} activeId={activeId} />

        {collections.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Create a collection above, then drag favorites into it.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {collections.map((c) => (
              <DroppableColumn
                key={c.id}
                id={c.id}
                title={c.name}
                items={view[c.id] ?? []}
                activeId={activeId}
                onRename={(name) => renameCollection(c.id, name)}
                onDelete={() => deleteCollection(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="w-28 opacity-90">
            <NftTile mint={activeId} linked={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
  id,
  title,
  items,
  activeId,
  onRename,
  onDelete,
}: {
  id: string;
  title: string;
  items: string[];
  activeId: string | null;
  onRename?: (name: string) => void;
  onDelete?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={`card p-3 transition-colors ${isOver ? 'ring-2 ring-brand-400' : ''}`}
      aria-label={`Collection: ${title}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {onRename ? (
          <input
            defaultValue={title}
            onBlur={(e) => e.target.value.trim() && onRename(e.target.value.trim())}
            className="w-full bg-transparent text-sm font-bold focus:outline-none"
            aria-label="Collection name"
          />
        ) : (
          <h3 className="text-sm font-bold">{title}</h3>
        )}
        <span className="shrink-0 text-xs text-zinc-400">{items.length}</span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-red-500 hover:underline"
            aria-label={`Delete collection ${title}`}
          >
            Delete
          </button>
        )}
      </div>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid min-h-[6rem] grid-cols-3 gap-2 rounded-lg border border-dashed border-zinc-300 p-2 dark:border-zinc-700 sm:grid-cols-4">
          {items.length === 0 ? (
            <p className="col-span-full py-4 text-center text-xs text-zinc-400">
              Drag NFTs here
            </p>
          ) : (
            items.map((mint) => (
              <SortableTile key={mint} mint={mint} dimmed={activeId === mint} />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableTile({ mint, dimmed }: { mint: string; dimmed: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: mint });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`cursor-grab touch-none active:cursor-grabbing ${dimmed ? 'opacity-30' : ''}`}
      {...attributes}
      {...listeners}
    >
      <NftTile mint={mint} linked={false} />
    </div>
  );
}
