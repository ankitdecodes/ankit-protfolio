import { corpus } from '../../content/corpus'
import { buildIndex } from '../../lib/rag'

/** One shared TF-IDF index over the portfolio's case studies (≈100 chunks; built in a few ms). */
export const labIndex = buildIndex(corpus)
