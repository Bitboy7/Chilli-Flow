import { Flame, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useUiStore } from "../../stores/ui-store";
import {
  managementNavigation,
  primaryNavigation,
  type NavigationItem,
} from "./navigation";

function NavigationGroup({
  items,
  label,
  collapsed,
}: {
  items: NavigationItem[];
  label: string;
  collapsed: boolean;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
          {label}
        </p>
      )}
      <nav className="space-y-1" aria-label={label}>
        {items.map(({ icon: Icon, ...item }) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              [
                "group flex h-10 items-center rounded-xl border text-sm font-medium transition",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                isActive
                  ? "border-orange-400/20 bg-orange-400/10 text-orange-100"
                  : "border-transparent text-stone-400 hover:bg-white/[0.04] hover:text-stone-100",
              ].join(" ")
            }
          >
            <Icon className="size-[1.05rem] shrink-0" strokeWidth={1.8} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={[
        "relative flex h-screen shrink-0 flex-col border-r border-white/[0.06] bg-[#11100f] transition-[width] duration-200",
        collapsed ? "w-[4.75rem]" : "w-60",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-[4.5rem] items-center border-b border-white/[0.06]",
          collapsed ? "justify-center" : "gap-3 px-5",
        ].join(" ")}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-stone-950 shadow-[0_0_28px_rgba(251,146,60,0.16)]">
          <Flame className="size-5 fill-current" strokeWidth={1.8} />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-stone-100">
              Chilli Beat
            </p>
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-600">
              Project library
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
        <NavigationGroup
          items={primaryNavigation}
          label="Colección"
          collapsed={collapsed}
        />
        <NavigationGroup
          items={managementNavigation}
          label="Administrar"
          collapsed={collapsed}
        />
      </div>

      <div className="border-t border-white/[0.06] p-3">
        {!collapsed && (
          <div className="mb-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span className="size-1.5 rounded-full bg-lime-400" />
              MVP local
            </div>
            <p className="mt-1 text-[0.65rem] text-stone-600">MVP · 6 de 6</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className={[
            "flex h-9 w-full items-center rounded-lg text-stone-500 transition hover:bg-white/[0.04] hover:text-stone-200",
            collapsed ? "justify-center" : "gap-3 px-3",
          ].join(" ")}
          aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
        >
          <CollapseIcon className="size-4" />
          {!collapsed && <span className="text-xs">Contraer</span>}
        </button>
      </div>
    </aside>
  );
}
