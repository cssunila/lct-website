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
import { ChevronDown } from 'lucide-react';
import { importTeams } from '@/server/actions/team';
import type { ImportTeamRow } from "@/server/actions/team";

interface TeamImportProps {
    tournamentId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    setImporting: (importing: boolean) => void;
    importing: boolean;
}

const TeamImport = ({ tournamentId, open, onOpenChange, setImporting, importing }: TeamImportProps) => {
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
            const rows: ImportTeamRow[] = JSON.parse(text);
            if (!Array.isArray(rows)) throw new Error("Format tidak valid");
            const result = await importTeams(tournamentId, rows);
            alert(`${result.count} tim berhasil diimpor.`);
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
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold">
                        Import Tim
                    </DialogTitle>
                    <DialogDescription>
                        Pilih file Json yang berisi tim.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleImport} className="space-y-4">
                    <details className='group bg-accent rounded-xl p-3'>
                        <summary className='font-bold text-lg text-foreground list-none flex items-center justify-between'>
                            Panduan Import
                            <ChevronDown className="size-5 transition-transform group-open:rotate-180" />
                        </summary>
                        <p>Format soal harus JSON berikut adalah contoh format soal:</p>
                        <div className='bg-black/15 mt-1 p-3 rounded-xl'>
                            <pre>
                                {
                                    JSON.stringify([
                                        {
                                            name: "Radar",
                                            school: "SMK BALAM",
                                        }
                                    ], null, 2)
                                }
                            </pre>
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
                            Import Tim
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default TeamImport;