import bcrypt from "bcryptjs";
import { pool } from "../lib/db.js";
import { sign } from "../lib/auth.js";

export default async function handler(req,res){
  if(req.method !== "POST") return res.status(405).end();

  const { email,password } = req.body;

  const { rows } = await pool.query(
    "select * from users where email=$1",
    [email.toLowerCase()]
  );

  if(!rows[0]) return res.status(400).json({ ok:false });

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if(!valid) return res.status(400).json({ ok:false });

  const token = sign(rows[0]);

  res.setHeader("Set-Cookie",
    `session=${token}; HttpOnly; Path=/; Max-Age=604800`
  );

  res.json({ ok:true });
}
