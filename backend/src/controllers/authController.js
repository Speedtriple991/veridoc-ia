import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../lib/supabase.js';

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export async function register(req, res, next) {
  try {
    const { email, password, tenantId, role = 'user' } = req.body;
    if (!email || !password || !tenantId) {
      return res.status(400).json({ error: 'email, password and tenantId are required' });
    }

    const hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({ email, password_hash: hash, tenant_id: tenantId, role })
      .select('id, email, tenant_id, role')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    const token = signToken({ id: data.id, tenantId: data.tenant_id, role: data.role, email: data.email });
    res.status(201).json({ token, user: data });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, tenant_id, role')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, tenantId: user.tenant_id, role: user.role, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, tenantId: user.tenant_id, role: user.role } });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, tenant_id, role')
      .eq('id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}
