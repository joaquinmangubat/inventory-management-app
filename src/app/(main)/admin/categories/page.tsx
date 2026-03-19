"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategory,
} from "@/hooks/use-categories";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Loader2,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import type { CategoryWithCount } from "@/types/items";

// ─── Category Row ─────────────────────────────────────────

interface CategoryRowProps {
  category: CategoryWithCount;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isReordering: boolean;
}

function CategoryRow({
  category,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  isReordering,
}: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateCategory = useUpdateCategory(category.id);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    setEditName(category.name);
    setEditing(true);
  }

  function cancelEdit() {
    setEditName(category.name);
    setEditing(false);
  }

  async function saveEdit() {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (trimmed === category.name) {
      setEditing(false);
      return;
    }
    try {
      await updateCategory.mutateAsync({ name: trimmed });
      setEditing(false);
      toast.success("Category renamed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename category");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-3 pr-12">
      {/* Reorder buttons */}
      <div className="flex flex-col">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={isFirst || isReordering || editing}
          onClick={onMoveUp}
          aria-label="Move up"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={isLast || isReordering || editing}
          onClick={onMoveDown}
          aria-label="Move down"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Name (view or edit) */}
      {editing ? (
        <Input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 flex-1"
          maxLength={100}
        />
      ) : (
        <span className="flex-1 font-medium">{category.name}</span>
      )}

      {/* Item count badge */}
      {!editing && (
        <Badge variant="secondary" className="shrink-0">
          {category._count.items} {category._count.items === 1 ? "item" : "items"}
        </Badge>
      )}

      {/* Actions */}
      {editing ? (
        <div className="flex gap-1">
          <Button
            size="icon"
            className="h-8 w-8"
            onClick={saveEdit}
            disabled={updateCategory.isPending || !editName.trim()}
            aria-label="Save"
          >
            {updateCategory.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={cancelEdit}
            disabled={updateCategory.isPending}
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={startEdit}
            aria-label="Edit category name"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────

export default function CategoriesAdminPage() {
  const router = useRouter();
  const { isOwner, isLoading: authLoading } = useAuth();

  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);

  const { data: categories = [], isLoading } = useAdminCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategory = useReorderCategory();

  // Redirect non-owners after auth resolves
  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.replace("/dashboard");
    }
  }, [authLoading, isOwner, router]);

  if (authLoading || !isOwner) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await createCategory.mutateAsync({ name: trimmed });
      setNewName("");
      toast.success(`"${trimmed}" added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add category");
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    try {
      await reorderCategory.mutateAsync({ id, direction });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeleteTarget(null);
    }
  }

  const hasItems = (deleteTarget?._count.items ?? 0) > 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Category Management"
        description="Add, rename, and reorder inventory categories."
      />

      {/* Add category form */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleAdd} className="flex gap-3">
            <Input
              placeholder="New category name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={createCategory.isPending || !newName.trim()}
            >
              {createCategory.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Category
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Category list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Tags className="h-10 w-10 opacity-40" />
          <p className="text-sm">No categories yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {categories.length} {categories.length === 1 ? "category" : "categories"} · drag up/down to reorder
          </p>
          {categories.map((cat, index) => (
            <div key={cat.id} className="group relative">
              <CategoryRow
                category={cat}
                isFirst={index === 0}
                isLast={index === categories.length - 1}
                onMoveUp={() => handleReorder(cat.id, "up")}
                onMoveDown={() => handleReorder(cat.id, "down")}
                isReordering={reorderCategory.isPending}
              />
              {/* Delete button — outside CategoryRow to keep row props minimal */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                onClick={() => setDeleteTarget(cat)}
                aria-label="Delete category"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasItems ? "Cannot delete category" : `Delete "${deleteTarget?.name}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasItems ? (
                <>
                  <strong>{deleteTarget?.name}</strong> has{" "}
                  {deleteTarget?._count.items}{" "}
                  {deleteTarget?._count.items === 1 ? "item" : "items"} assigned to
                  it. Reassign or remove all items before deleting this category.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {hasItems ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {!hasItems && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteCategory.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
