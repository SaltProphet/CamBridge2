import { pool } from "../lib/db.js";
import { verify } from "../lib/auth.js";

export default async function handler(req,res){
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/session=([^;]+)/);
  if(!match) return res.status(401).end();

  const user = verify(match[1]);
  if(!user) return res.status(401).end();

  const { rows } = await pool.query(
    "select slug from rooms where owner_id=$1",
    [user.id]
  );

  res.json(rows);
}
