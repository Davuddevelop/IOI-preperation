import { useSyncExternalStore } from 'react'

/**
 * A tiny hash router: the screen lives in the URL after "#", so links,
 * bookmarks and the back button work on any static host with no server setup.
 */
export const ROUTES = ['overview', 'robot', 'drone', 'radar', 'territories'] as const
export type Route = (typeof ROUTES)[number]

function parse(hash: string): Route {
  const id = hash.replace(/^#\/?/, '')
  return (ROUTES as readonly string[]).includes(id) ? (id as Route) : 'overview'
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => parse(window.location.hash))
}

export const href = (route: Route) => `#/${route}`
