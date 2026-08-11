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
import { createTeam, updateTeam } from "@/server/actions/team";

interface TeamFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  editData?: { id: string; name: string; school: string };
}

interface FormData {
  name: string;
  school: string;
}

export default function TeamForm({
  open,
  onOpenChange,
  tournamentId,
  editData,
}: TeamFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: editData?.name ?? "",
      school: editData?.school ?? "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      if (editData) {
        await updateTeam(editData.id, data);
      } else {
        await createTeam({ tournamentId, ...data });
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan tim");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} key={editData?.id ?? "new"}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editData ? "Edit Tim" : "Tambah Tim"}
          </DialogTitle>
          <DialogDescription>
            {editData ? "Ubah data tim." : "Daftarkan tim baru ke tournament."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="labelCls">Nama Tim</label>
            <Input
              {...register("name", { required: "Nama tim wajib diisi" })}
              placeholder="Contoh: Tim Alpha"
              className="h-9"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="labelCls">Asal Sekolah</label>
            <Input
              {...register("school", { required: "Sekolah wajib diisi" })}
              placeholder="Contoh: SMK BALAM"
              className="h-9"
            />
            {errors.school && (
              <p className="text-xs text-destructive">{errors.school.message}</p>
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
