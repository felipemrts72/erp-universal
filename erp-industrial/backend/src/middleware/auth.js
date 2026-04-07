import jwt from 'jsonwebtoken';

const JWT_SECRET = 'segredo_super_simples_por_enquanto';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token não enviado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded; // 🔥 aqui nasce o req.user

    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

export function isAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito' });
  }
  next();
}
