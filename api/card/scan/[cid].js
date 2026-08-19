import { handleScanCid } from '../../../lib/wipe.mjs'

export default async function handler(req, res) {
  await handleScanCid(req, res, req.query.cid)
}
