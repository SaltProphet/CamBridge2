import { pool } from "../lib/db.js";

export default async function handler(req,res){
  const { slug } = req.query;
  if(!slug) return res.status(400).end();

  const { rows } = await pool.query(
    "select slug from rooms where slug=$1",
    [slug.toLowerCase()]
  );

  if(!rows[0]) return res.status(404).end();

  res.json(rows[0]);
}
