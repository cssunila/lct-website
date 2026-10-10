"use client";

import { useState, useEffect, useRef } from "react";
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
import { createQuestion, updateQuestion, uploadQuestionImage } from "@/server/actions/question";
import { Image as ImageIcon, Upload, Link as LinkIcon, Trash2, Loader2 } from "lucide-react";

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
        watch,
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
            image: "",
        },
    });

    const [serverError, setServerError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [imageMode, setImageMode] = useState<"none" | "upload" | "url">("none");
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const watchedImage = watch("image");

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
                image: editData.image ?? "",
            });
            if (editData.image && editData.image.trim() !== "") {
                if (editData.image.startsWith("http://") || editData.image.startsWith("https://")) {
                    setImageMode("url");
                } else {
                    setImageMode("upload");
                }
            } else {
                setImageMode("none");
            }
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
                image: "",
            });
            setImageMode("none");
        }
        setUploadError(null);
        setServerError(null);
        setLocalPreview(null);
        setImgError(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [editData, tournamentId, reset, open]);

    const handleModeChange = (mode: "none" | "upload" | "url") => {
        setImageMode(mode);
        setUploadError(null);
        setLocalPreview(null);
        setImgError(false);
        if (mode === "none") {
            setValue("image", "");
            if (fileInputRef.current) fileInputRef.current.value = "";
        } else if (mode === "upload") {
            if (watchedImage && (watchedImage.startsWith("http://") || watchedImage.startsWith("https://"))) {
                setValue("image", "");
            }
        } else if (mode === "url") {
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (watchedImage && !watchedImage.startsWith("http://") && !watchedImage.startsWith("https://")) {
                setValue("image", "");
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview langsung via object URL agar tidak menunggu network
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);
        setImgError(false);
        setUploading(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await uploadQuestionImage(formData);
            setValue("image", res.url);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar");
        } finally {
            setUploading(false);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setValue("image", val);
        setLocalPreview(null);
        setImgError(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveImage = () => {
        setValue("image", "");
        setImageMode("none");
        setLocalPreview(null);
        setUploadError(null);
        setImgError(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

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
            <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
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

                    {/* Gambar Soal */}
                    <div className="space-y-2.5 rounded-xl border border-border p-3.5 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <ImageIcon className="h-4 w-4 text-primary" />
                                Gambar Soal (Opsional)
                            </label>
                        </div>

                        {/* Mode Selector (Mutually Exclusive) */}
                        <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => handleModeChange("none")}
                                className={`rounded-md py-1.5 font-bold transition-all ${imageMode === "none"
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Tanpa Gambar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeChange("upload")}
                                className={`rounded-md py-1.5 font-bold transition-all flex items-center justify-center gap-1 ${imageMode === "upload"
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Upload File
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeChange("url")}
                                className={`rounded-md py-1.5 font-bold transition-all flex items-center justify-center gap-1 ${imageMode === "url"
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <LinkIcon className="h-3.5 w-3.5" />
                                Gunakan URL
                            </button>
                        </div>

                        {imageMode === "upload" && (
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                                    />
                                    {uploading && (
                                        <span className="flex items-center gap-1 text-xs text-primary font-medium">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Mengunggah...
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Format: JPG, PNG, WebP, GIF, SVG (Maks. 5MB).
                                </p>
                                {uploadError && (
                                    <p className="text-xs text-destructive font-medium">{uploadError}</p>
                                )}
                            </div>
                        )}

                        {imageMode === "url" && (
                            <div className="space-y-1.5 pt-1">
                                <Input
                                    type="url"
                                    placeholder="https://example.com/gambar-soal.png"
                                    value={watchedImage || ""}
                                    onChange={handleUrlChange}
                                    className="text-xs h-9"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Tempelkan URL langsung gambar yang dapat diakses publik.
                                </p>
                            </div>
                        )}

                        {(localPreview || (watchedImage && watchedImage.trim() !== "")) && (
                            <div className="mt-2 rounded-lg border border-border bg-card p-2.5 flex flex-col sm:flex-row items-start gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={localPreview || watchedImage}
                                    alt="Preview Soal"
                                    onError={() => setImgError(true)}
                                    onLoad={() => setImgError(false)}
                                    className="max-h-28 max-w-full rounded-md object-contain border border-border bg-black/5 dark:bg-white/5"
                                />
                                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                                    {imgError ? (
                                        <p className="text-xs text-destructive font-semibold">
                                            Gambar gagal dimuat. Pastikan URL gambar valid atau file tidak korup.
                                        </p>
                                    ) : (
                                        <>
                                            <p className="text-xs text-muted-foreground max-w-xs font-mono">
                                                {watchedImage || "File gambar dipilih"}
                                            </p>
                                            {watchedImage && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleRemoveImage}
                                                    className="h-7 px-2 text-xs text-destructive bg-destructive/10 hover:bg-destructive/30 hover:text-destructive flex items-center gap-1"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Hapus Gambar
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
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
