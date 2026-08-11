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
import { createTournament } from "@/server/actions/tournament";

interface TournamentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  year: number;
}

export default function TournamentForm({ open, onOpenChange }: TournamentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      year: new Date().getFullYear(),
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await createTournament(data);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat tournament");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Buat Tournament Baru</DialogTitle>
          <DialogDescription>
            Masukkan nama dan tahun pelaksanaan tournament.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5 flex flex-col">
            <label className="labelCls">Nama Tournament</label>
            <Input
              {...register("name", { required: "Nama wajib diisi" })}
              placeholder="Contoh: LCT CSS 2026"
              className="h-9"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="labelCls">Tahun</label>
            <Input
              type="number"
              {...register("year", {
                required: true,
                valueAsNumber: true,
                min: { value: 2020, message: "Minimal tahun 2020" },
                max: { value: 2100, message: "Maksimal tahun 2100" },
              })}
              className="h-9 w-32"
            />
            {errors.year && (
              <p className="text-xs text-destructive">{errors.year.message}</p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={loading} className="h-8 px-4 text-xs font-bold">
              {loading ? "Membuat..." : "Buat Tournament"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
