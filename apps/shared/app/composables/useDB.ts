import { RankifyDB } from '#layers/shared/db'

let db: RankifyDB | null = null
export default () => {
  if (!db)
    db = new RankifyDB()
  return db
}
