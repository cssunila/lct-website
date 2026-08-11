"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import type { CreateQuestionInput } from "@/server/actions/question";
import { createQuestion, updateQuestion } from "@/server/actions/question";

interface QuestionFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournamentId: string;
    editData?: (CreateQuestionInput & { id: string }) | null;
}

const DIFFICULTY_OPTIONS = [
    { value: "MUDAH", label: "Mudah" },
    { value: "SEDANG", label: "Sedang" },
    { value: "SUSAH", label: "Susah" },
] as const;

const SESSION_OPTIONS = [
    { value: "WAJIB", label: "Wajib Jawab" },
    { value: "REBUTAN", label: "Rebutan" },
] as const;

const KIND_OPTIONS = [
    { value: "BIASA", label: "Biasa" },
    { value: "HITUNGAN", label: "Hitungan" },
] as const;

export default function QuestionForm({
    open,
    onOpenChange,
    tournamentId,
    editData,
}: QuestionFormProps) {
    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
        formState: { errors },
    } = useForm<CreateQuestionInput>({
        defaultValues: {
            tournamentId,
            question: "",
            answer: "",
            explanation: "",
            difficulty: "SEDANG",
            session: "WAJIB",
            kind: "BIASA",
            timeLimit: 15,
        },
    });

    const [serverError, setServerError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editData) {
            reset({
                tournamentId,
                question: editData.question,
                answer: editData.answer,
                explanation: editData.explanation ?? "",
                difficulty: editData.difficulty,
                session: editData.session,
                kind: editData.kind,
                timeLimit: editData.timeLimit,
            });
        } else {
            reset({
                tournamentId,
                question: "",
                answer: "",
                explanation: "",
                difficulty: "SEDANG",
                session: "WAJIB",
                kind: "BIASA",
                timeLimit: 15,
            });
        }
    }, [editData, tournamentId, reset, open]);

    const onSubmit = async (data: CreateQuestionInput) => {
        setLoading(true);
        setServerError(null);
        try {
            if (editData) {
                await updateQuestion(editData.id, data);
            } else {
                await createQuestion(data);
            }
            onOpenChange(false);
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold">
                        {editData ? "Edit Soal" : "Tambah Soal Baru"}
                    </DialogTitle>
                    <DialogDescription>
                        {editData
                            ? "Ubah detail soal di bawah ini."
                            : "Isi form di bawah untuk menambah soal baru."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Pertanyaan */}
                    <div className="space-y-1.5">
                        <label className="labelCls required">Pertanyaan</label>
                        <textarea
                            {...register("question", { required: "Pertanyaan wajib diisi" })}
                            rows={3}
                            className="inputCls resize-none"
                            placeholder="Tulis pertanyaan..."
                        />
                        {errors.question && (
                            <p className="text-xs text-destructive">{errors.question.message}</p>
                        )}
                    </div>

                    {/* Jawaban + Waktu */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <label className="labelCls required">Jawaban</label>
                            <Input
                                {...register("answer", { required: "Jawaban wajib diisi" })}
                                placeholder="Jawaban benar"
                            />
                            {errors.answer && (
                                <p className="text-xs text-destructive">{errors.answer.message}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="labelCls required">Waktu (detik)</label>
                            <Input
                                type="number"
                                {...register("timeLimit", {
                                    required: true,
                                    valueAsNumber: true,
                                    min: { value: 5, message: "Min 5 detik" },
                                })}
                            />
                            {errors.timeLimit && (
                                <p className="text-xs text-destructive">{errors.timeLimit.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Penjelasan */}
                    <div className="space-y-1.5">
                        <label className="labelCls">Penjelasan Jawaban (opsional)</label>
                        <textarea
                            {...register("explanation")}
                            rows={2}
                            className="inputCls resize-none"
                            placeholder="Penjelasan jawaban..."
                        />
                    </div>

                    {/* Kesulitan + Sesi + Jenis Soal */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <label className="labelCls required">Kesulitan</label>
                            <Controller
                                name="difficulty"
                                control={control}
                                render={({ field }) => (
                                    <Select required value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DIFFICULTY_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                rules={{
                                    required: "Kesulitan wajib diisi",
                                }}
                            />
                            {errors.difficulty && (
                                <p className="text-xs text-destructive">{errors.difficulty.message}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="labelCls required">Sesi</label>
                            <Controller
                                name="session"
                                control={control}
                                render={({ field }) => (
                                    <Select required value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SESSION_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                rules={{
                                    required: "Sesi wajib diisi",
                                }}
                            />
                            {errors.session && (
                                <p className="text-xs text-destructive">{errors.session.message}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="labelCls required">Jenis Soal</label>
                            <Controller
                                name="kind"
                                control={control}
                                render={({ field }) => (
                                    <Select required value={field.value} onValueChange={(v) => {
                                        setValue("timeLimit", v === "BIASA" ? 15 : 30)
                                        return v && field.onChange(v)
                                    }}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {KIND_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                rules={{
                                    required: "Jenis soal wajib diisi",
                                }}
                            />
                            {errors.kind && (
                                <p className="text-xs text-destructive">{errors.kind.message}</p>
                            )}
                        </div>
                    </div>

                    {serverError && (
                        <p className="text-xs text-destructive">{serverError}</p>
                    )}

                    <DialogFooter showCloseButton>
                        <Button type="submit" disabled={loading} className="h-8 px-4 text-xs font-bold">
                            {loading ? "Menyimpan..." : editData ? "Simpan Perubahan" : "Tambah Soal"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
