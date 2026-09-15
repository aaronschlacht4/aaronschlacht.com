import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { SphereDef } from '../data/spheres';

/**
 * What each project's page shows: a live window (its 3D scene) and three
 * interactive snippets. Keyed by sphere id; anything not listed gets the
 * generic object window and placeholder snippets. Lazy so a project's
 * renderer only loads when its page opens.
 */
export type ProjectUI = {
  Window: LazyExoticComponent<ComponentType<{ def: SphereDef }>>;
  Snippets: LazyExoticComponent<ComponentType<{ def: SphereDef }>>;
};

const generic: ProjectUI = {
  Window: lazy(() => import('./shared/ObjectWindow')),
  Snippets: lazy(() => import('./shared/SoonSnippets')),
};

const PROJECT_UI: Record<string, ProjectUI> = {
  physica: {
    Window: lazy(() => import('./physica/PhysicaWindow')),
    Snippets: lazy(() => import('./physica/PhysicaSnippets')),
  },
  books: {
    Window: lazy(() => import('./books/BooksWindow')),
    Snippets: lazy(() => import('./books/BooksSnippets')),
  },
};

export const projectUI = (id: string): ProjectUI => PROJECT_UI[id] ?? generic;
