import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const tasksRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Implementation for listing tasks
    return [];
  }),
  
  create: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation for creating a task
      return null;
    }),
});