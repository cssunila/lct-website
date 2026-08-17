import { getActiveTournamentWithStats, getRecentGames } from "@/server/queries/dashboard";
import {
    Users,
    Layers,
    Grid3X3,
    BookOpen,
    Plus,
    Settings,
    Swords,
    ExternalLink,
} from "lucide-react";
import Link from "next/link";
import StatCard from "@/components/features/dashboard/stat-card";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
    DRAFT: "Draft",
    ACTIVE: "Aktif",
    FINISHED: "Selesai",
};

const STATUS_COLOR: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    ACTIVE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    FINISHED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

const GAME_STATUS_LABEL: Record<string, string> = {
    SETUP: "Persiapan",
    IN_PROGRESS: "Berlangsung",
    FINISHED: "Selesai",
};

const GAME_STATUS_COLOR: Record<string, string> = {
    SETUP: "bg-muted text-muted-foreground",
    IN_PROGRESS: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    FINISHED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

const DashboardPage = async () => {
    const data = await getActiveTournamentWithStats();

    if (!data) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                    <Swords className="h-10 w-10 text-primary" />
                </div>
                <h2 className="mt-6 text-2xl font-bold">Selamat Datang</h2>
                <p className="mt-2 max-w-sm text-muted-foreground">
                    Belum ada tournament. Buat tournament pertama Anda untuk memulai.
                </p>
                <Link
                    href="/tournament"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" />
                    Buat Tournament
                </Link>
            </div>
        );
    }

    const { tournament, teamCount, roundCount, groupCount, questionCount } = data;
    const tid = tournament!.id;

    const recentGames = await getRecentGames(tid, 5);

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                        Dashboard
                    </p>
                    <h1 className="mt-1 text-3xl font-extrabold">{tournament!.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Tahun {tournament!.year}
                    </p>
                </div>

                <span
                    className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold ${STATUS_COLOR[tournament!.status]}`}
                >
                    {STATUS_LABEL[tournament!.status]}
                </span>
            </header>

            {/* Stats */}
            <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Users} label="Total Tim" value={teamCount} color="blue" />
                <StatCard icon={Layers} label="Total Babak" value={roundCount} color="green" />
                <StatCard icon={Grid3X3} label="Total Kloter" value={groupCount} color="amber" />
                <StatCard icon={BookOpen} label="Total Soal" value={questionCount} color="purple" />
            </section>

            <div className="mt-10 flex items-center justify-between">
                <h2 className="text-lg font-bold">Game Terbaru</h2>
                <Link
                    href={`/tournament/${tid}/game`}
                    className="text-xs font-bold text-primary hover:underline"
                >
                    Lihat Semua
                </Link>
            </div>
            {recentGames.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Belum ada game.</p>
            ) : (
                <div className="mt-4 space-y-2">
                    {recentGames.map((game) => (
                        <div
                            key={game.id}
                            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">
                                        {game.group.round.name} - {game.group.name}
                                    </span>
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${GAME_STATUS_COLOR[game.status] ?? ""}`}>
                                        {GAME_STATUS_LABEL[game.status] ?? game.status}
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {game.teams.map((gt) => (
                                        <span
                                            key={gt.id}
                                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                                        >
                                            {gt.team.name}: {gt.score}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <Link
                                    href={`/tournament/${tid}/game/${game.id}`}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                                    title="Setup"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                </Link>
                                <Link
                                    href={`/display/${game.id}`}
                                    target="_blank"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                                    title="Display"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DashboardPage;