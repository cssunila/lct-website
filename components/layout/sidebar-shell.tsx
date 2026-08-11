"use client";

import { useState, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import SidebarNav from "./sidebar-nav";

export default function SidebarShell() {
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        (async () => {
            const saved = localStorage.getItem("sidebar-collapsed");
            if (saved === "true") setCollapsed(true);
        })()
    }, []);

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem("sidebar-collapsed", String(next));
    };

    return (
        <aside
            className={`relative flex shrink-0 flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? "w-17" : "w-64"
                }`}
        >
            <SidebarNav collapsed={collapsed} />

            <button
                onClick={toggle}
                className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {collapsed ? (
                    <PanelLeftOpen className="h-3.5 w-3.5" />
                ) : (
                    <PanelLeftClose className="h-3.5 w-3.5" />
                )}
            </button>
        </aside>
    );
}
