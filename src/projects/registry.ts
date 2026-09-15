import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { SphereDef } from '../data/spheres';

/**
 * The live window each project's page opens on. Keyed by sphere id;
 * anything not listed gets the generic object window (its hub model, free
 * to turn). Lazy so a project's renderer only loads when its page opens.
 */
export type ProjectUI = {
  Window: LazyExoticComponent<ComponentType<{ def: SphereDef }>>;
};

const generic: ProjectUI = {
  Window: lazy(() => import('./shared/ObjectWindow')),
};

const PROJECT_UI: Record<string, ProjectUI> = {
  physica: { Window: lazy(() => import('./physica/PhysicaWindow')) },
  books: { Window: lazy(() => import('./books/BooksWindow')) },
};

export const projectUI = (id: string): ProjectUI => PROJECT_UI[id] ?? generic;
