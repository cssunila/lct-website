"use client";

import React from 'react'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ImportQuestionRow, importQuestions } from '@/server/actions/question';
import { ChevronDown } from 'lucide-react';

interface QuestionImportProps {
    tournamentId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    setImporting: (importing: boolean) => void;
    importing: boolean;
}

const QuestionImport = ({ tournamentId, open, onOpenChange, setImporting, importing }: QuestionImportProps) => {
    const [file, setFile] = React.useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const rows: ImportQuestionRow[] = JSON.parse(text);
            if (!Array.isArray(rows)) throw new Error("Format tidak valid");
            const result = await importQuestions(tournamentId, rows);
            alert(`${result.count} soal berhasil diimpor.`);
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Gagal mengimpor file");
        } finally {
            setImporting(false);
            onOpenChange(false);
            setFile(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold">
                        Import Soal
                    </DialogTitle>
                    <DialogDescription>
                        Pilih file JSON yang berisi daftar soal untuk turnamen ini.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleImport} className="space-y-4">
                    <details className='group bg-accent/60 border border-border rounded-xl p-3 text-xs'>
                        <summary className='font-bold text-sm text-foreground list-none flex items-center justify-between cursor-pointer select-none'>
                            Panduan Format JSON
                            <ChevronDown className="size-4 transition-transform group-open:rotate-180 text-muted-foreground" />
                        </summary>
                        <div className="mt-2.5 space-y-2 text-muted-foreground leading-relaxed">
                            <p>
                                File harus berupa <strong>Array JSON</strong> berisi objek soal. Kolom image bersifat opsional dan hanya menerima tautan URL gambar.
                            </p>
                            <div className="grid grid-cols-2 gap-1 text-[11px] bg-background/80 p-2 rounded-lg border border-border/50">
                                <div><strong>difficulty:</strong> MUDAH | SEDANG | SUSAH</div>
                                <div><strong>session:</strong> WAJIB | REBUTAN</div>
                                <div><strong>kind:</strong> BIASA | HITUNGAN</div>
                                <div><strong>image:</strong> URL (http/https) atau kosong</div>
                            </div>
                            <div className='bg-black/20 text-foreground p-3 rounded-lg overflow-x-auto max-h-52'>
                                <pre className="font-mono text-[11px]">
{JSON.stringify([
  {
    "question": "Berapakah hasil dari 2 + 2?",
    "answer": "4",
    "explanation": "Penjelasan jawaban (opsional)",
    "difficulty": "MUDAH",
    "session": "WAJIB",
    "kind": "BIASA",
    "timeLimit": 30,
    "image": "https://contoh.com/gambar-soal.png"
  },
  {
    "question": "Siapakah penemu bola lampu?",
    "answer": "Thomas Alva Edison",
    "explanation": "",
    "difficulty": "SEDANG",
    "session": "REBUTAN",
    "kind": "BIASA",
    "timeLimit": 20,
    "image": ""
  }
], null, 2)}
                                </pre>
                            </div>
                        </div>
                    </details>
                    <input
                        type="file"
                        accept=".json"
                        disabled={importing}
                        required
                        onChange={handleFileChange}
                        className="w-full text-sm text-muted-foreground file:mr-4 file:h-8 file:rounded-full file:border-0 file:px-4 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />

                    <DialogFooter showCloseButton>
                        <Button type="submit" disabled={importing} className="h-8 px-4 text-xs font-bold">
                            Import Soal
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default QuestionImport;