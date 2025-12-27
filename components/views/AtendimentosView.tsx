import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, addDays, startOfWeek, endOfWeek, startOfDay, addMinutes, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
// Ajuste este import para o seu projeto:
import { supabase } from "../services/supabaseClient";

/**
 * ✅ Tela de Atendimentos (Agenda)
 * - Visões: Dia / Semana / Mês / Lista (Mês aqui é simplificado como placeholder)
 * - Colunas por profissional
 * - Grid por horário (08:00 a 21:00, step 30min)
 * - Cards de agendamentos
 * - Drag & drop entre colunas e horários
 * - Modal simples (inline) para criar atendimento
 *
 * ⚠️ Requer: tailwind no projeto.
 */

type ViewMode = "dia" | "semana" | "mes" | "lista";

type Professional = {
  id: string;
  name: string;
  avatar_url?: string | null;
};

type AppointmentStatus = "confirmado" | "pendente" | "cancelado";

type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  duration_min: number;
  professional_id: string;
  client_name: string;
  service_name: string;
  price_cents?: number | null;
  status: AppointmentStatus;
  notes?: string | null;
};

const START_HOUR = 8;
const END_HOUR = 21;
const STEP_MIN = 30;

// px por minuto (altura do card) — ajuste fino aqui
const PX_PER_MIN = 1.2;
// largura mínima de coluna
const MIN_COL_W = 220;

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function yToTimeMinutes(yPx: number) {
  // converte posição y em minutos do dia
  const minutes = Math.round(yPx / PX_PER_MIN);
  return minutes;
}
function minutesToHHmm(totalMin: number) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function snapToStep(mins: number, step = STEP_MIN) {
  return Math.round(mins / step) * step;
}
function dateToISO(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function AtendimentosView() {
  const [view, setView] = useState<ViewMode>("dia");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros (simples)
  const [filterProfessionalIds, setFilterProfessionalIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // modal criar atendimento
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<Partial<Appointment>>({
    date: dateToISO(new Date()),
    start_time: "08:00",
    duration_min: 60,
    status: "pendente",
  });

  // drag
  const dragRef = useRef<{
    apptId: string;
    originProfessionalId: string;
    originStart: string;
    originDate: string;
  } | null>(null);

  const dayStart = useMemo(() => startOfDay(currentDate), [currentDate]);

  const weekRange = useMemo(() => {
    const s = startOfWeek(currentDate, { weekStartsOn: 1 });
    const e = endOfWeek(currentDate, { weekStartsOn: 1 });
    return { start: s, end: e };
  }, [currentDate]);

  const visibleDates = useMemo(() => {
    if (view === "dia") return [currentDate];
    if (view === "semana") {
      const days: Date[] = [];
      let d = weekRange.start;
      while (d <= weekRange.end) {
        days.push(d);
        d = addDays(d, 1);
      }
      return days;
    }
    // "mes" e "lista": simplificado (use currentDate como base)
    return [currentDate];
  }, [view, currentDate, weekRange]);

  const timeSlots = useMemo(() => {
    const slots: { label: string; minutes: number }[] = [];
    const startMin = START_HOUR * 60;
    const endMin = END_HOUR * 60;
    for (let m = startMin; m <= endMin; m += STEP_MIN) {
      slots.push({ label: minutesToHHmm(m), minutes: m });
    }
    return slots;
  }, []);

  const filteredProfessionals = useMemo(() => {
    if (filterProfessionalIds.size === 0) return professionals;
    return professionals.filter((p) => filterProfessionalIds.has(p.id));
  }, [professionals, filterProfessionalIds]);

  const visibleAppointments = useMemo(() => {
    const isoDates = new Set(visibleDates.map(dateToISO));
    let list = appointments.filter((a) => isoDates.has(a.date));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.client_name.toLowerCase().includes(q) ||
          a.service_name.toLowerCase().includes(q)
      );
    }
    if (filterProfessionalIds.size > 0) {
      list = list.filter((a) => filterProfessionalIds.has(a.professional_id));
    }
    return list;
  }, [appointments, visibleDates, search, filterProfessionalIds]);

  // --- Supabase fetch ---
  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) profissionais
      const { data: profs, error: pErr } = await supabase
        .from("professionals")
        .select("id, name, avatar_url")
        .order("name", { ascending: true });

      if (!pErr && profs) setProfessionals(profs as Professional[]);

      // 2) atendimentos (puxa uma janela baseada na view)
      // Ajuste: se quiser, troque por server-side RPC de range
      const startISO =
        view === "semana" ? dateToISO(weekRange.start) : dateToISO(currentDate);
      const endISO =
        view === "semana" ? dateToISO(weekRange.end) : dateToISO(currentDate);

      const { data: appts, error: aErr } = await supabase
        .from("appointments")
        .select(
          "id, date, start_time, duration_min, professional_id, client_name, service_name, price_cents, status, notes"
        )
        .gte("date", startISO)
        .lte("date", endISO);

      if (!aErr && appts) setAppointments(appts as Appointment[]);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentDate]);

  async function refreshAppointments() {
    const startISO =
      view === "semana" ? dateToISO(weekRange.start) : dateToISO(currentDate);
    const endISO =
      view === "semana" ? dateToISO(weekRange.end) : dateToISO(currentDate);

    const { data: appts } = await supabase
      .from("appointments")
      .select(
        "id, date, start_time, duration_min, professional_id, client_name, service_name, price_cents, status, notes"
      )
      .gte("date", startISO)
      .lte("date", endISO);

    if (appts) setAppointments(appts as Appointment[]);
  }

  function toggleProfessional(id: string) {
    setFilterProfessionalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goPrev() {
    setCurrentDate((d) => (view === "semana" ? addDays(d, -7) : addDays(d, -1)));
  }
  function goNext() {
    setCurrentDate((d) => (view === "semana" ? addDays(d, 7) : addDays(d, 1)));
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  // --- Drag handlers ---
  function onDragStart(appt: Appointment) {
    dragRef.current = {
      apptId: appt.id,
      originProfessionalId: appt.professional_id,
      originStart: appt.start_time,
      originDate: appt.date,
    };
  }

  async function onDropOnColumn(e: React.DragEvent, targetProfessionalId: string, targetDateISO: string) {
    e.preventDefault();
    const drag = dragRef.current;
    if (!drag) return;

    // descobrir o horário pelo Y do drop
    const col = e.currentTarget as HTMLDivElement;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // y -> minutos desde START_HOUR
    const minutesFromStart = yToTimeMinutes(y);
    const baseMin = START_HOUR * 60;
    const dayMin = baseMin + snapToStep(minutesFromStart);

    const snapped = clamp(dayMin, START_HOUR * 60, END_HOUR * 60);
    const newStart = minutesToHHmm(snapped);

    // update supabase
    await supabase
      .from("appointments")
      .update({
        professional_id: targetProfessionalId,
        date: targetDateISO,
        start_time: newStart,
      })
      .eq("id", drag.apptId);

    dragRef.current = null;
    await refreshAppointments();
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  // --- Criar atendimento ---
  async function createAppointment() {
    const payload: Partial<Appointment> = {
      ...newForm,
    };

    if (!payload.client_name || !payload.service_name || !payload.professional_id || !payload.date || !payload.start_time) {
      alert("Preencha Cliente, Serviço, Profissional, Data e Horário.");
      return;
    }

    await supabase.from("appointments").insert({
      date: payload.date,
      start_time: payload.start_time,
      duration_min: payload.duration_min ?? 60,
      professional_id: payload.professional_id,
      client_name: payload.client_name,
      service_name: payload.service_name,
      price_cents: payload.price_cents ?? null,
      status: payload.status ?? "pendente",
      notes: payload.notes ?? null,
    });

    setNewOpen(false);
    setNewForm({
      date: dateToISO(currentDate),
      start_time: "08:00",
      duration_min: 60,
      status: "pendente",
    });
    await refreshAppointments();
  }

  // --- Render helpers ---
  const headerTitle = useMemo(() => {
    if (view === "dia") return format(currentDate, "EEE, dd/MM/yyyy", { locale: ptBR });
    if (view === "semana")
      return `${format(weekRange.start, "dd/MM", { locale: ptBR })} - ${format(weekRange.end, "dd/MM/yyyy", { locale: ptBR })}`;
    if (view === "lista") return "Lista de atendimentos";
    return format(currentDate, "MMMM yyyy", { locale: ptBR });
  }, [view, currentDate, weekRange]);

  const gridHeightPx = useMemo(() => {
    const totalMin = (END_HOUR - START_HOUR) * 60;
    return totalMin * PX_PER_MIN;
  }, []);

  function apptStyle(appt: Appointment) {
    const startMin = toMinutes(appt.start_time);
    const topMin = startMin - START_HOUR * 60;
    const top = topMin * PX_PER_MIN;
    const height = (appt.duration_min || 30) * PX_PER_MIN;
    return { top, height };
  }

  // Agrupa por dia para semana
  const apptsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of visibleAppointments) {
      const arr = map.get(a.date) ?? [];
      arr.push(a);
      map.set(a.date, arr);
    }
    return map;
  }, [visibleAppointments]);

  return (
    <div className="w-full h-full flex bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-[280px] border-r bg-white p-4 hidden lg:block">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Atendimentos</div>
          <button
            className="px-3 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600"
            onClick={() => {
              setNewForm((f) => ({ ...f, date: dateToISO(currentDate) }));
              setNewOpen(true);
            }}
          >
            Agendar
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-neutral-700">Visualização</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`px-3 py-2 rounded-xl border text-sm ${view === "dia" ? "bg-neutral-900 text-white" : "bg-white"}`}
              onClick={() => setView("dia")}
            >
              Dia
            </button>
            <button
              className={`px-3 py-2 rounded-xl border text-sm ${view === "semana" ? "bg-neutral-900 text-white" : "bg-white"}`}
              onClick={() => setView("semana")}
            >
              Semana
            </button>
            <button
              className={`px-3 py-2 rounded-xl border text-sm ${view === "mes" ? "bg-neutral-900 text-white" : "bg-white"}`}
              onClick={() => setView("mes")}
            >
              Mês
            </button>
            <button
              className={`px-3 py-2 rounded-xl border text-sm ${view === "lista" ? "bg-neutral-900 text-white" : "bg-white"}`}
              onClick={() => setView("lista")}
            >
              Lista
            </button>
          </div>

          <div className="pt-2">
            <div className="text-sm font-semibold text-neutral-700 mb-2">Buscar</div>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="Cliente ou serviço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <div className="text-sm font-semibold text-neutral-700 mb-2">Profissionais</div>
            <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
              {professionals.map((p) => {
                const checked = filterProfessionalIds.size === 0 ? true : filterProfessionalIds.has(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProfessional(p.id)}
                      className="accent-orange-500"
                    />
                    <span className="w-7 h-7 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center text-xs">
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        p.name.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <span className="text-neutral-800">{p.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              Dica: marque/desmarque para filtrar.
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-xl border hover:bg-neutral-50" onClick={goPrev}>
              ‹
            </button>
            <button className="px-3 py-2 rounded-xl border hover:bg-neutral-50" onClick={goToday}>
              Hoje
            </button>
            <button className="px-3 py-2 rounded-xl border hover:bg-neutral-50" onClick={goNext}>
              ›
            </button>
            <div className="ml-2 font-semibold text-neutral-800">{headerTitle}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-xl border hover:bg-neutral-50"
              onClick={() => refreshAppointments()}
              title="Atualizar"
            >
              ↻
            </button>

            <button
              className="px-3 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 lg:hidden"
              onClick={() => {
                setNewForm((f) => ({ ...f, date: dateToISO(currentDate) }));
                setNewOpen(true);
              }}
            >
              Agendar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-6 text-neutral-600">Carregando agenda…</div>
          ) : view === "lista" ? (
            <ListView items={visibleAppointments} professionals={professionals} />
          ) : view === "mes" ? (
            <MonthPlaceholder currentDate={currentDate} />
          ) : (
            <div className="p-4">
              {/* Para semana: repete o grid por dia, um abaixo do outro (simples e útil) */}
              {view === "semana" ? (
                <div className="space-y-8">
                  {visibleDates.map((d) => {
                    const iso = dateToISO(d);
                    return (
                      <div key={iso} className="bg-white border rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b font-semibold">
                          {format(d, "EEEE, dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <AgendaGrid
                          dateISO={iso}
                          professionals={filteredProfessionals}
                          timeSlots={timeSlots}
                          gridHeightPx={gridHeightPx}
                          appointments={(apptsByDate.get(iso) ?? []).filter((a) =>
                            filteredProfessionals.some((p) => p.id === a.professional_id)
                          )}
                          onDragStart={onDragStart}
                          onDragOver={onDragOver}
                          onDropOnColumn={onDropOnColumn}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border rounded-2xl overflow-hidden">
                  <AgendaGrid
                    dateISO={dateToISO(currentDate)}
                    professionals={filteredProfessionals}
                    timeSlots={timeSlots}
                    gridHeightPx={gridHeightPx}
                    appointments={visibleAppointments.filter((a) =>
                      filteredProfessionals.some((p) => p.id === a.professional_id)
                    )}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDropOnColumn={onDropOnColumn}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal - Novo Atendimento */}
      {newOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-2xl border shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">Novo Atendimento</div>
              <button className="px-3 py-1 rounded-lg hover:bg-neutral-100" onClick={() => setNewOpen(false)}>
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm text-neutral-600">Cliente</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={newForm.client_name ?? ""}
                  onChange={(e) => setNewForm((f) => ({ ...f, client_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-neutral-600">Data</label>
                  <input
                    type="date"
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                    value={newForm.date ?? dateToISO(currentDate)}
                    onChange={(e) => setNewForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-600">Horário</label>
                  <input
                    type="time"
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                    value={newForm.start_time ?? "08:00"}
                    onChange={(e) => setNewForm((f) => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-neutral-600">Profissional</label>
                <select
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                  value={newForm.professional_id ?? ""}
                  onChange={(e) => setNewForm((f) => ({ ...f, professional_id: e.target.value }))}
                >
                  <option value="">Selecione…</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-600">Serviço</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={newForm.service_name ?? ""}
                  onChange={(e) => setNewForm((f) => ({ ...f, service_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-neutral-600">Duração (min)</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                    value={newForm.duration_min ?? 60}
                    onChange={(e) => setNewForm((f) => ({ ...f, duration_min: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-600">Status</label>
                  <select
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                    value={newForm.status ?? "pendente"}
                    onChange={(e) => setNewForm((f) => ({ ...f, status: e.target.value as AppointmentStatus }))}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-neutral-600">Observação</label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  rows={3}
                  value={newForm.notes ?? ""}
                  onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button className="px-4 py-2 rounded-xl border hover:bg-neutral-50" onClick={() => setNewOpen(false)}>
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600"
                onClick={createAppointment}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaGrid(props: {
  dateISO: string;
  professionals: Professional[];
  timeSlots: { label: string; minutes: number }[];
  gridHeightPx: number;
  appointments: Appointment[];
  onDragStart: (appt: Appointment) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDropOnColumn: (e: React.DragEvent, professionalId: string, dateISO: string) => void;
}) {
  const { dateISO, professionals, timeSlots, gridHeightPx, appointments, onDragStart, onDragOver, onDropOnColumn } = props;

  const colWidth = useMemo(() => Math.max(MIN_COL_W, Math.floor(1200 / Math.max(1, professionals.length))), [professionals.length]);

  const apptsByProf = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const arr = map.get(a.professional_id) ?? [];
      arr.push(a);
      map.set(a.professional_id, arr);
    }
    // ordenar por horário
    for (const [k, arr] of map.entries()) {
      arr.sort((x, y) => toMinutes(x.start_time) - toMinutes(y.start_time));
      map.set(k, arr);
    }
    return map;
  }, [appointments]);

  return (
    <div className="w-full overflow-x-auto">
      {/* Header row */}
      <div className="flex border-b bg-white sticky top-0 z-10">
        <div className="w-[80px] shrink-0 border-r bg-white" />
        {professionals.map((p) => (
          <div
            key={p.id}
            className="shrink-0 border-r px-3 py-2 flex items-center gap-2"
            style={{ width: colWidth }}
            title={p.name}
          >
            <div className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center text-xs">
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                p.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="font-semibold text-sm text-neutral-800 truncate">{p.name}</div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex">
        {/* Time axis */}
        <div className="w-[80px] shrink-0 border-r bg-white">
          <div style={{ height: gridHeightPx }} className="relative">
            {timeSlots.map((t) => (
              <div
                key={t.label}
                className="absolute left-0 right-0 text-xs text-neutral-500 px-2"
                style={{ top: (t.minutes - START_HOUR * 60) * PX_PER_MIN - 8 }}
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Columns */}
        {professionals.map((p) => (
          <div
            key={p.id}
            className="shrink-0 border-r bg-white relative"
            style={{ width: colWidth }}
          >
            {/* grid lines */}
            <div
              className="relative"
              style={{ height: gridHeightPx }}
              onDragOver={onDragOver}
              onDrop={(e) => onDropOnColumn(e, p.id, dateISO)}
            >
              {timeSlots.map((t) => (
                <div
                  key={t.label}
                  className="absolute left-0 right-0 border-t border-neutral-100"
                  style={{ top: (t.minutes - START_HOUR * 60) * PX_PER_MIN }}
                />
              ))}

              {/* appointments */}
              {(apptsByProf.get(p.id) ?? []).map((a) => (
                <AppointmentCard key={a.id} appt={a} onDragStart={onDragStart} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentCard({ appt, onDragStart }: { appt: Appointment; onDragStart: (appt: Appointment) => void }) {
  const top = (toMinutes(appt.start_time) - START_HOUR * 60) * PX_PER_MIN;
  const height = (appt.duration_min || 30) * PX_PER_MIN;

  const statusBadge =
    appt.status === "confirmado"
      ? "bg-emerald-100 text-emerald-700"
      : appt.status === "cancelado"
      ? "bg-rose-100 text-rose-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(appt)}
      className="absolute left-2 right-2 rounded-xl border bg-sky-50 hover:bg-sky-100 cursor-grab active:cursor-grabbing shadow-sm"
      style={{ top, height, minHeight: 34 }}
      title={`${appt.client_name} • ${appt.service_name}`}
    >
      <div className="p-2 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-sm text-neutral-900 truncate">{appt.client_name}</div>
          <div className={`text-[10px] px-2 py-0.5 rounded-full ${statusBadge}`}>{appt.status}</div>
        </div>
        <div className="text-xs text-neutral-700 truncate">{appt.service_name}</div>
        <div className="text-[11px] text-neutral-500">
          {appt.start_time} • {appt.duration_min}min
        </div>
      </div>
    </div>
  );
}

function ListView({ items, professionals }: { items: Appointment[]; professionals: Professional[] }) {
  const profMap = useMemo(() => new Map(professionals.map((p) => [p.id, p.name])), [professionals]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return toMinutes(a.start_time) - toMinutes(b.start_time);
    });
  }, [items]);

  return (
    <div className="p-4">
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Atendimentos</div>
        <div className="divide-y">
          {sorted.map((a) => (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-neutral-900 truncate">
                  {a.client_name} • {a.service_name}
                </div>
                <div className="text-sm text-neutral-600">
                  {a.date} • {a.start_time} • {a.duration_min}min • {profMap.get(a.professional_id) ?? "—"}
                </div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full border bg-neutral-50 text-neutral-700">
                {a.status}
              </div>
            </div>
          ))}
          {sorted.length === 0 && <div className="px-4 py-6 text-neutral-600">Sem atendimentos no período.</div>}
        </div>
      </div>
    </div>
  );
}

function MonthPlaceholder({ currentDate }: { currentDate: Date }) {
  return (
    <div className="p-6 text-neutral-700">
      <div className="bg-white border rounded-2xl p-5">
        <div className="font-semibold mb-2">Visão “Mês” (placeholder)</div>
        <div className="text-sm text-neutral-600">
          Aqui você pode evoluir depois para um calendário mensal (grid 7x5).
          <br />
          Por enquanto, a tela está focada em <b>Dia</b>, <b>Semana</b> e <b>Lista</b>.
        </div>
        <div className="mt-3 text-sm">
          Mês atual: <b>{format(currentDate, "MMMM yyyy", { locale: ptBR })}</b>
        </div>
      </div>
    </div>
  );
}
