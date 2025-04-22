import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const tasksRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data: tasks, error } = await ctx.supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }

    return tasks;
  }),
  
  create: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: task, error } = await ctx.supabase
        .from('tasks')
        .insert({
          title: input.title,
          description: input.description,
          project_id: input.projectId,
          user_id: ctx.session.user.id,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return task;
    }),
});