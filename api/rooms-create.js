import { pool } from "../lib/db.js";
import { verify } from "../lib/auth.js";

export default async function handler(req,res){
  if(req.method !== "POST") return res.status(405).end();

  const cookie = req.headers.cookie || "";
  const match = cookie.match(/session=([^;]+)/);
  if(!match) return res.status(401).end();

  const user = verify(match[1]);
  if(!user) return res.status(401).end();

  const { slug } = req.body;
  if(!slug) return res.status(400).end();

  try {
    await pool.query(
      "insert into rooms (owner_id,slug) values ($1,$2)",
      [user.id, slug.toLowerCase()]
    );
  } catch {
    return res.status(400).json({ ok:false });
  }

  res.json({ ok:true });
}
