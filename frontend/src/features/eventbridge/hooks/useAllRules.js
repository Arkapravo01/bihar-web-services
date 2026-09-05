import { useQuery } from '@tanstack/react-query'
import { listAllRules } from '../api/eventbridgeApi'

/**
 * Every rule in the account, with its targets.
 *
 * The backend does the per-bus and per-rule fan-out, so the overview renders from
 * a single request instead of a waterfall that fills in over several seconds.
 * Rules change rarely, but a rule someone just enabled must not look off, so the
 * data is treated as fresh for a minute and re-read when the tab regains focus.
 */
export function useAllRules() {
  return useQuery({
    queryKey: ['eventbridge', 'rules'],
    queryFn: listAllRules,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}
