import bcrypt from "bcryptjs";
import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, ageConfirmed } = req.body;

  // Validate input
  if (!email || !password || ageConfirmed !== true)
    return res.status(400).json({ ok:false, error:"invalid_input" });
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ ok:false, error:"invalid_email" });
  
  // Validate password length
  if (password.length < 8)
    return res.status(400).json({ ok:false, error:"password_too_short" });

  const hash = await bcrypt.hash(password, 12);

  try {
    await pool.query(
      "insert into users (email,password_hash,age_confirmed_at) values ($1,$2,now())",
      [email.toLowerCase(), hash]
    );
  } catch {
    return res.status(400).json({ ok:false, error:"email_exists" });
  }

  return res.json({ ok:true });
}
