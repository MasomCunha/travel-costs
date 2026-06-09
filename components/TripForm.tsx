"use client";

import { useState } from "react";
import { createTripAction } from "@/app/actions/trips";
import { SubmitButton } from "@/components/SubmitButton";
import { RIDE_TYPES, RIDE_TYPE_KEYS } from "@/lib/constants";

type RouteParams = {
  fuelPrice: number;
  totalKm: number;
  consumptionPer100: number;
  tolls: number;
  avgPeople: number;
};

const OVERRIDE_FIELDS = [
  { name: "fuelPrice", label: "Combustível €/L", step: "0.01" },
  { name: "totalKm", label: "KM (ida/volta)", step: "1" },
  { name: "consumptionPer100", label: "Consumo L/100", step: "0.1" },
  { name: "tolls", label: "Portagens €", step: "0.01" },
  { name: "avgPeople", label: "Nº médio pessoas", step: "0.5" },
] as const;

export function TripForm({
  group,
  members,
  today,
}: {
  group: RouteParams;
  members: { id: string; name: string }[];
  today: string;
}) {
  const [driverId, setDriverId] = useState(members[0]?.id ?? "");
  const [custom, setCustom] = useState(false);

  return (
    <form action={createTripAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Data</label>
          <input name="date" type="date" defaultValue={today} className="input" required />
        </div>
        <div>
          <label className="label">Condutor</label>
          <select name="driverId" className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="label">Passageiros (quem foi e como devolve)</p>
        <div className="space-y-2">
          {members
            .filter((m) => m.id !== driverId)
            .map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm font-medium">{m.name}</span>
                <select name={`type_${m.id}`} className="input w-48 py-1" defaultValue="">
                  <option value="">— não foi —</option>
                  {RIDE_TYPE_KEYS.map((k) => (
                    <option key={k} value={k}>{RIDE_TYPES[k].label}</option>
                  ))}
                </select>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
          Personalizar parâmetros desta viagem (caso este dia tenha sido diferente)
        </label>
        {custom && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {OVERRIDE_FIELDS.map((f) => (
              <div key={f.name}>
                <label className="label text-xs">{f.label}</label>
                <input
                  name={f.name}
                  type="number"
                  step={f.step}
                  className="input"
                  defaultValue={group[f.name]}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <SubmitButton>Registar boleia</SubmitButton>
    </form>
  );
}
