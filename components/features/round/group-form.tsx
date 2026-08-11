"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGroup, updateGroup } from "@/server/actions/round";

interface GroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string;
  nextOrder: number;
  editData?: { id: string; name: string; order: number };
}

interface FormData {
  name: string;
  order: number;
}

export default function GroupForm({
  open,
  onOpenChange,
  roundId,
  nextOrder,
  editData,
}: GroupFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: editData?.name ?? "",
      order: editData?.order ?? nextOrder,
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      if (editData) {
        await updateGroup(editData.id, data);
      } else {
        await createGroup({ roundId, ...data });
        window.location.reload();
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kloter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} key={editData?.id ?? "new"}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editData ? "Edit Kloter" : "Tambah Kloter"}
          </DialogTitle>
          <DialogDescription>
            {editData ? "Ubah nama atau urutan kloter." : "Tambah kloter baru ke babak ini."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5 flex flex-col">
            <label className="labelCls">Nama Kloter</label>
            <Input
              {...register("name", { required: "Nama kloter wajib diisi" })}
              placeholder="Contoh: Kloter 1"
              className="h-9"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="labelCls">Urutan</label>
            <Input
              type="number"
              {...register("order", {
                valueAsNumber: true,
                required: true,
                min: { value: 1, message: "Minimal urutan 1" },
              })}
              className="h-9 w-28"
            />
            {errors.order && (
              <p className="text-xs text-destructive">{errors.order.message}</p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={loading} className="h-8 px-4 text-xs font-bold">
              {loading ? "Menyimpan..." : editData ? "Perbarui" : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
