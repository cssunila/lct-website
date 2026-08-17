"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import {
  ChevronLeft,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updateTournament, updateTournamentSetting } from "@/server/actions/tournament";
import type { UpdateSettingInput } from "@/server/actions/tournament";

interface SettingFormData extends UpdateSettingInput {
  name: string;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
}

interface TournamentSettingsClientProps {
  tournament: {
    id: string;
    name: string;
    year: number;
    status: "DRAFT" | "ACTIVE" | "FINISHED";
    settings: {
      mandatoryCorrectPoint: number;
      mandatoryWrongPoint: number;
      buzzerCorrectPoint: number;
      buzzerWrongPoint: number;
    };
  };
}

export default function TournamentSettingsClient({ tournament }: TournamentSettingsClientProps) {
  const { id, name, status, settings } = tournament;
  const { register, handleSubmit, formState: { errors } } = useForm<SettingFormData>({
    defaultValues: {
      name,
      status,
      mandatoryCorrectPoint: settings.mandatoryCorrectPoint,
      mandatoryWrongPoint: settings.mandatoryWrongPoint,
      buzzerCorrectPoint: settings.buzzerCorrectPoint,
      buzzerWrongPoint: settings.buzzerWrongPoint,
    },
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSubmit = async (data: SettingFormData) => {
    setSaving(true);
    setSaved(false);
    try {
      await updateTournament(id, { name: data.name, status: data.status });
      await updateTournamentSetting(id, {
        mandatoryCorrectPoint: data.mandatoryCorrectPoint,
        mandatoryWrongPoint: data.mandatoryWrongPoint,
        buzzerCorrectPoint: data.buzzerCorrectPoint,
        buzzerWrongPoint: data.buzzerWrongPoint,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href="/tournament"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            {name}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold">Setting Tournament</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 max-w-2xl space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Informasi Tournament
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="labelCls">Nama</label>
              <Input
                {...register("name", { required: "Nama wajib diisi" })}
                className="h-9"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="labelCls">Status</label>
              <Select
                value={status}
                onValueChange={(v) => v && updateTournament(id, { status: v as "DRAFT" | "ACTIVE" | "FINISHED" })}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="FINISHED">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Poin Wajib Jawab */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Poin — Wajib Jawab
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="labelCls">Poin Benar</label>
              <Input
                type="number"
                {...register("mandatoryCorrectPoint", { valueAsNumber: true })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="labelCls">Poin Salah</label>
              <Input
                type="number"
                {...register("mandatoryWrongPoint", { valueAsNumber: true })}
                className="h-9"
              />
            </div>
          </div>
        </section>

        {/* Poin Rebutan */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Poin — Rebutan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="labelCls">Poin Benar</label>
              <Input
                type="number"
                {...register("buzzerCorrectPoint", { valueAsNumber: true })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="labelCls">Poin Salah</label>
              <Input
                type="number"
                {...register("buzzerWrongPoint", { valueAsNumber: true })}
                className="h-9"
              />
            </div>
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button type="submit" disabled={saving} className="h-9 px-5 text-xs font-bold">
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Setting"}
          </Button>
          {saved && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Tersimpan!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
