import { z } from "zod";

// Parâmetros de custo do grupo (a "rota" do grupo). Partilhado entre server actions.
export const groupParamsSchema = z.object({
  fuelPrice: z.coerce.number().nonnegative(),
  totalKm: z.coerce.number().nonnegative(),
  consumptionPer100: z.coerce.number().nonnegative(),
  tolls: z.coerce.number().nonnegative(),
  avgPeople: z.coerce.number().positive("Tem de ser > 0"),
});
