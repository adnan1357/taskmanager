import { createTRPCRouter } from "../trpc";
import { tasksRouter } from "./tasks";
import { projectsRouter } from "./projects";

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  projects: projectsRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter; 